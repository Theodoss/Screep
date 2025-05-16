// roleUpgrader.js
// 专门负责升级 Controller，优先从最近的 Container 获取能量，结果列表缓存 10 tick

const roleUpgrader = {
  /** @param {Creep} creep **/
  run(creep) {
    const room = creep.room;
    const controller = room.controller;

    // 切换状态：有能量时升级，无能量时采集
    if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.upgrading = false;
      creep.say('🔄 harvest');
    }
    if (!creep.memory.upgrading && creep.store.getFreeCapacity() === 0) {
      creep.memory.upgrading = true;
      creep.say('⚡ upgrade');
    }

    // 升级阶段
    if (creep.memory.upgrading) {
      if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(controller, {
          visualizePathStyle: { stroke: '#ffffff' },
          reusePath: 10
        });
      }
      return;
    }

    // 采集阶段：优先从最近的 Container 获取能量
    // 每 10 tick 刷新一次 container 列表
    if (!creep.memory._lastContainerScan || Game.time - creep.memory._lastContainerScan >= 10) {
      creep.memory._lastContainerScan = Game.time;
      const conts = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
      });
      creep.memory.containerList = conts.map(c => c.id);
    }
    const containers = (creep.memory.containerList || [])
      .map(id => Game.getObjectById(id))
      .filter(c => c && c.store[RESOURCE_ENERGY] > 0);

    if (containers.length > 0) {
      const target = creep.pos.findClosestByPath(containers);
      if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 10
        });
      }
      return;
    }

    // 无可用 Container 则直接采集 Source
    const sources = room.find(FIND_SOURCES);
    if (sources.length > 0) {
      if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
        creep.moveTo(sources[0], {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 10
        });
      }
    }
  }
};

module.exports = roleUpgrader;