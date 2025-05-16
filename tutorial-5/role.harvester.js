// roleHarvester.js
// 专注采集并优先从已登记的 container 获取能量，结果列表缓存 10 tick
const containerManager = require('containerMgr');

const roleHarvester = {
  /** @param {Creep} creep **/
  run: function(creep) {
    const room = creep.room;
    // 初始化状态
    if (creep.memory.delivering === undefined) {
      creep.memory.delivering = false;
    }

    // 状态切换：采完满包→运输；运完空包→采集
    if (creep.memory.delivering && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.delivering = false;
    } else if (!creep.memory.delivering && creep.store.getFreeCapacity() === 0) {
      creep.memory.delivering = true;
    }

    if (!creep.memory.delivering) {
      // 采矿模式：优先从已登记的 containers 获取能量
      if (!room.memory._harvContainerTick || Game.time - room.memory._harvContainerTick >= 10) {
        room.memory._harvContainerTick = Game.time;
        // 缓存所有已登记 container 的 ID
        room.memory.harvContainerList = Object.keys(room.memory.containerData || {});
      }
      // 筛选出有能量可取的 container
      const regs = (room.memory.harvContainerList || [])
        .map(id => Game.getObjectById(id))
        .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
      if (regs.length > 0) {
        const cont = creep.pos.findClosestByPath(regs);
        if (creep.withdraw(cont, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(cont, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      } else {
        // 如果没有可用 container，则直接采集
        const source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
          }
        }
      }
    } else {
      // 运输模式：只存入 Extension/Spawn/Tower
      const targets = creep.pos.findClosestByPath(
        creep.room.find(FIND_STRUCTURES, {
          filter: s =>
            (s.structureType === STRUCTURE_EXTENSION ||
             s.structureType === STRUCTURE_SPAWN ||
             s.structureType === STRUCTURE_TOWER) &&
            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })
      );
      if (targets) {
        if (creep.transfer(targets, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(targets, { visualizePathStyle: { stroke: '#ffffff' } });
        }
      }
    }
  }
};

module.exports = roleHarvester;
