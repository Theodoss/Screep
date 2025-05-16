// 任務判斷.js
// 根据房间/creep 状态判断各角色是否有任务，以及最终升级任务

const repairManager = require('repairManager');
const containerMgr = require('containerMgr');

const taskDecision = {
  /**
   * 判斷是否有 Harvester 工作：
   * 房间中是否有 Extension/Spawn/Tower 等需要补充能量的结构，或 harvContainerList 中容器能量过多需要转移
   * @param {Room} room
   * @returns {boolean}
   */
  hasHarvestWork(room) {
    // 获取容器列表，筛选使用量大于阈值的容器
    const regs = (room.memory.harvContainerList || [])
      .map(id => Game.getObjectById(id))
      .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) > 1200);

    // 查找需要补充能量的 spawn/extension/tower
    const structuresNeedEnergy = room.find(FIND_MY_STRUCTURES, {
      filter: s =>
        (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION ||
         (s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 300))
        && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });

    // 如果有目标结构或有过量容器，则认为需要 harvester 工作
    return structuresNeedEnergy.length > 0 || regs.length > 0;
  },
  // 可以在此扩展其他任务判断方法


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