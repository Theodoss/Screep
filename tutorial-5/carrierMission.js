// carrierMission.js
// 简化的 Carrier 任务：
// 1. 从注册的 Container（能量 ≥ 350）取能
// 2. 一旦取满，交付：优先 Tower → 最近 Controller 的 Container → 其他非注册 Container → Spawn/Extension
// 3. 交付目标一旦确定，不会更换，除非失效（满能/不存在）
// 用法：在 roleCarrier 中调用 carrierMission.run(creep)

const containerManager = require('containerMgr');

const carrierMission = {
  /** 更新并缓存所有注册 Container（能量 ≥ 350） */
  scanTasks(room) {
    if (!Memory.carrierMission) Memory.carrierMission = {};
    const mem = Memory.carrierMission;
    mem.containers = mem.containers || [];
    const data = room.memory.containerData || {};
    // 注册符合条件的 containers
    Object.keys(data).forEach(cid => {
      const c = Game.getObjectById(cid);
      if (c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= 350) {
        if (!mem.containers.includes(cid)) mem.containers.push(cid);
      }
    });
    // 清理失效
    mem.containers = mem.containers.filter(cid => {
      const c = Game.getObjectById(cid);
      return c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= 350;
    });
  },

  /** 从注册 Container 取能 */
  doWithdrawContainer(creep) {
    const room = creep.room;
    this.scanTasks(room);
    const mem = Memory.carrierMission;
    if (mem.containers.length === 0) return false;
    const containers = mem.containers.map(id => Game.getObjectById(id)).filter(c => c);
    const c = creep.pos.findClosestByPath(containers);
    if (c) {
      if (creep.withdraw(c, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(c, { reusePath: 10 });
      } else if (creep.store.getFreeCapacity() === 0) {
        creep.memory.delivering = true;
      }
      return true;
    }
    return false;
  },

  /** 交付能量给固定目标 */
  doDeliver(creep) {
    const room = creep.room;
    // 确定目标
    if (!creep.memory.deliverTargetId) {
      let targets;
      // a) Tower
      targets = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 });
      console.log(targets)
      // b) 最近 Controller 的 Container
      if (!targets.length) {
        targets = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 })
          .sort((a, b) => a.pos.getRangeTo(room.controller) - b.pos.getRangeTo(room.controller));
      }
      // c) 其他非注册 Container
      if (!targets.length) {
        const registered = room.memory.containerData || {};
        targets = room.find(FIND_STRUCTURES, { filter: s =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          !registered[s.id]
        });
      }
      // d) Spawn/Extension
      if (!targets.length) {
        targets = room.find(FIND_STRUCTURES, {
          filter: s => (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
      }
      if (targets.length) creep.memory.deliverTargetId = creep.pos.findClosestByPath(targets).id;
    }

    // 执行 transfer
    const t = Game.getObjectById(creep.memory.deliverTargetId);
    // console.log(t)
    if (!t || t.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      delete creep.memory.deliverTargetId;
      creep.memory.delivering = false;
      return;
    }
    if (creep.transfer(t, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      creep.moveTo(t, { reusePath: 10 });
    } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      delete creep.memory.deliverTargetId;
      creep.memory.delivering = false;
    }
  }
};
module.exports = carrierMission;