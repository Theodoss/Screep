// repairManager.js
// 全局管理低于指定生命比例的结构，并为 creep 提供优先修复目标
const repairManager = {
  // 当结构生命比例低于 threshold 时加入队列
  threshold: 0.6,
  // 扫描间隔：每隔多少 tick 重建队列和排序
  scanInterval: 20,

  /** @param {Room} room **/
  run(room) {
    if (!room.memory.repairQueue) room.memory.repairQueue = [];
    if (!room.memory.lastScanTick || Game.time - room.memory.lastScanTick >= this.scanInterval) {
      room.memory.lastScanTick = Game.time;
      // 找出所有低于阈值的结构
      const toRepair = room.find(FIND_STRUCTURES, {
        filter: s => s.hits / s.hitsMax < this.threshold || s.hits <500000
      });
      // 根据重要性和与 controller 距离排序
      function priority(struct) {
        if (struct.structureType === STRUCTURE_ROAD) return 1;
        if (struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART) return 2;
        return 0; // 其他建筑
      }
      const controllerPos = room.controller.pos;
      const sorted = toRepair.sort((a, b) => {
        const pa = priority(a), pb = priority(b);
        if (pa !== pb) return pa - pb;
        return controllerPos.getRangeTo(a) - controllerPos.getRangeTo(b);
      });
      room.memory.repairQueue = sorted.map(s => s.id);
    }
  },

  /** @param {Creep} creep @returns {Structure|null} **/
  getTarget(creep) {
    const room = creep.room;
    const queueIds = room.memory.repairQueue || [];
    // 清理已修复或不存在的结构
    const validIds = queueIds.filter(id => {
      const s = Game.getObjectById(id);
      return s && (s.hits / s.hitsMax < this.threshold);
    });
    room.memory.repairQueue = validIds;
    if (validIds.length === 0) return null;
    // 直接返回队列首个
    return Game.getObjectById(validIds[0]) || null;
  }
};

module.exports = repairManager;