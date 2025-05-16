const containerManager = require('containerMgr');

// Withdrawal thresholds for hysteresis
const HIGH_THRESHOLD = 350;
const LOW_THRESHOLD = 100;

const carrierMission = {
  /**
   * 扫描并缓存在 room 内需要取能的容器
   */
  scanTasks(room) {
    if (!Memory.carrierMission) Memory.carrierMission = { containers: [] };
    const mem = Memory.carrierMission;

    // 1) 添加高于 HIGH_THRESHOLD 的容器
    const highReady = room.find(FIND_STRUCTURES, {
      filter: s =>
        s.structureType === STRUCTURE_CONTAINER &&
        s.store.getUsedCapacity(RESOURCE_ENERGY) >= HIGH_THRESHOLD
    }).map(s => s.id);
    highReady.forEach(id => {
      if (!mem.containers.includes(id)) mem.containers.push(id);
    });

    // 2) 清理低于 LOW_THRESHOLD 的容器
    mem.containers = mem.containers.filter(id => {
      const c = Game.getObjectById(id);
      return c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= LOW_THRESHOLD;
    });
  },

  /**
   * 取能逻辑：状态机为 'withdraw'
   */
  doWithdraw(creep) {
    if (creep.memory.state !== 'withdraw') return false;
    const room = creep.room;
    this.scanTasks(room);
    const mem = Memory.carrierMission;
    if (!mem.containers.length) return false;

    const containers = mem.containers
      .map(id => Game.getObjectById(id))
      .filter(c => c);
    const target = creep.pos.findClosestByPath(containers);
    if (!target) return false;

    const res = creep.withdraw(target, RESOURCE_ENERGY);
    if (res === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { reusePath: 10 });
    } else if (res === OK && creep.store.getFreeCapacity() === 0) {
      creep.memory.state = 'deliver';
    }
    return true;
  },

  /**
   * 交付逻辑：状态机为 'deliver'
   * 排除 containerMgr 注册的采矿容器
   */
  doDeliver(creep) {
    if (creep.memory.state !== 'deliver') return false;
    const room = creep.room;
    const registered = room.memory.containerData || {};
    let target;

    if (!creep.memory.deliverTargetId) {
      // 1) 塔
      let targets = room.find(FIND_STRUCTURES, {
        filter: s =>
          s.structureType === STRUCTURE_TOWER &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });
      if (targets.length) {
        target = creep.pos.findClosestByPath(targets);
      } else {
        // 2) 非注册容器，按距离 controller 排序
        targets = room.find(FIND_STRUCTURES, {
          filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            !registered[s.id]
        }).sort((a, b) =>
          a.pos.getRangeTo(room.controller) - b.pos.getRangeTo(room.controller)
        );
        if (targets.length) {
          target = targets[0];
        } else {
          // 3) Spawn/Extension
          targets = room.find(FIND_STRUCTURES, {
            filter: s =>
              (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
              s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          });
          if (targets.length) {
            target = creep.pos.findClosestByPath(targets);
          }
        }
      }

      if (target) {
        creep.memory.deliverTargetId = target.id;
      } else {
        // 无交付目标
        return false;
      }
    }

    const t = Game.getObjectById(creep.memory.deliverTargetId);
    if (!t || t.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      delete creep.memory.deliverTargetId;
      creep.memory.state = 'withdraw';
      return false;
    }

    const res = creep.transfer(t, RESOURCE_ENERGY);
    if (res === ERR_NOT_IN_RANGE) {
      creep.moveTo(t, { reusePath: 10 });
    } else if (res === OK && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      delete creep.memory.deliverTargetId;
      creep.memory.state = 'withdraw';
    }
    return true;
  }

};

module.exports = carrierMission;