// roleRepairer.js
// 专门负责修复由 repairManager 定义的低生命结构，直到恢复至 100%
const repairManager = require('repairManager');
const roleRepairer = {
  /** @param {Creep} creep **/
  run(creep) {
    // 更新并排序全局队列
    repairManager.run(creep.room);

    let target = null;
    // 优先使用 memory 中的目标
    if (creep.memory.repairTargetId) {
      target = Game.getObjectById(creep.memory.repairTargetId);
      if (!target || target.hits >= target.hitsMax) {
        delete creep.memory.repairTargetId;
        target = null;
      }
    }
    // 如果没有存量目标，则获取新目标并存入 memory
    if (!target) {
      target = repairManager.getTarget(creep);
      if (target) {
        creep.memory.repairTargetId = target.id;
      } else {
        return; // 无修复目标
      }
    }

    // 如果有能量，执行修复
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      if (creep.repair(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { reusePath: 15, visualizePathStyle: { stroke: '#ffaa00' } });
      }
      return;
    }

    // 无能量则取能：优先 Container 或 Storage
    const energySource = creep.pos.findClosestByPath(
      creep.room.find(FIND_STRUCTURES, {
        filter: s =>
          (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
          s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      })
    );
    if (energySource) {
      if (creep.withdraw(energySource, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(energySource, { reusePath: 15, visualizePathStyle: { stroke: '#ffffff' } });
      }
      return;
    }

    // 再无可用存储时，去矿区采集
    const sources = creep.room.find(FIND_SOURCES);
    if (sources.length > 0) {
      if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
        creep.moveTo(sources[0], { reusePath: 15, visualizePathStyle: { stroke: '#ffaa00' } });
      }
    }
  }
};
module.exports = roleRepairer;