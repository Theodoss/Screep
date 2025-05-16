// 任務判斷.js
// 根据房间/creep 状态判断各角色是否有任务，以及最终升级任务

const repairManager = require('repairManager');

const taskDecision = {
  /**
   * 判斷是否有 Harvester 工作：
   * 房间中是否有 Extension/Spawn/Tower 等需要补充能量的结构
   * @param {Room} room
   * @returns {boolean}
   */
  hasHarvestWork(room) {
    return room.find(FIND_STRUCTURES, {
      filter: s =>
        (s.structureType === STRUCTURE_EXTENSION ||
         s.structureType === STRUCTURE_SPAWN ||
         s.structureType === STRUCTURE_TOWER) &&
        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }).length > 0;
  },

  /**
   * 判斷是否有 Builder 工作：
   * 房间中是否存在任何建筑工地
   * @param {Room} room
   * @returns {boolean}
   */
  hasBuildWork(room) {
    return room.find(FIND_CONSTRUCTION_SITES).length > 0;
  },

  /**
   * 判斷是否有 Repairer 工作：
   * 房间中是否存在低于阈值的待修复结构
   * @param {Creep} creep
   * @returns {boolean}
   */
  hasRepairWork(creep) {
    // 调用 repairManager.getTarget 来判断是否有修复目标
    return !!repairManager.getTarget(creep);
  },

  /**
   * 最终执行 Upgrader 角色逻辑
   * @param {Creep} creep
   */
  doUpgrade(creep) {
    const roleUpgrader = require('roleUpgrader');
    roleUpgrader.run(creep);
  },

  /**
   * 执行 Repairer 角色逻辑
   * @param {Creep} creep
   */
  doRepair(creep) {
    const roleRepairer = require('role.repairer');
    roleRepairer.run(creep);
  }
};

// 添加别名以兼容误拼写
 taskDecision.hasHarverstWork = taskDecision.hasHarvestWork;

module.exports = taskDecision;