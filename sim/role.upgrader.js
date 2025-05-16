// roleUpgrader.js
// 专门负责升级 Controller，优先从最近的 Container 获取能量，列表由 controllerContainerScan 缓存

const controllerContainerScan = require('controllerContainerScan');

const roleUpgrader = {
  /** @param {Creep} creep **/
  run(creep) {
    const room = creep.room;
    const controller = room.controller;

    // 切换状态：有能量时升级，无能量时采集
    if (creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.upgrading = false;
      creep.say('UH');
    }
    else {
      creep.memory.upgrading = true;
      creep.say('UU');
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
    else {
      // 采集阶段：优先从最近的 Container 获取能量
      const ids = controllerContainerScan.get(room);
      // console.log(ids)
      const containers = ids
        .map(id => Game.getObjectById(id))
        .filter(c => c  && c.store[RESOURCE_ENERGY] > 100);
      // console.log(containers)
      if (containers.length > 0) {
        const target = containers[0];
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
  }
};

module.exports = roleUpgrader;