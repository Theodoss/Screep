// repairManager.js
// 全局管理低于指定生命比例的结构，并为 creep 提供优先修复目标
const repairManager = {
  threshold: 0.6,       // 当结构生命比例低于 threshold 时加入队列
  scanInterval: 20,      // 扫描间隔：每隔多少 tick 重建队列和排序

  /**
   * @param {Room} room
   * 每隔 scanInterval 重建 room.memory.repairQueue
   */
  run(room) {
    // 防护：某些房间可能还未安装 controller
    if (!room.controller || !room.controller.pos) return;

    if (!room.memory.repairQueue) room.memory.repairQueue = [];
    // 周期性扫描
    if (!room.memory.lastScanTick || Game.time - room.memory.lastScanTick >= this.scanInterval) {
      room.memory.lastScanTick = Game.time;
      // 找出所有需修复的结构（生命比例 < threshold 或 hits < 50000）
      const toRepair = room.find(FIND_STRUCTURES, {
        filter: s => (s.hits / s.hitsMax < this.threshold) || s.hits < 50000
      });
      // 排序：按优先级和与 controller 距离
      const controllerPos = room.controller.pos;
      function priority(s) {
        if (s.structureType === STRUCTURE_ROAD) return 1;
        if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) return 2;
        return 0;
      }
      toRepair.sort((a, b) => {
        const pa = priority(a), pb = priority(b);
        if (pa !== pb) return pa - pb;
        return controllerPos.getRangeTo(a) - controllerPos.getRangeTo(b);
      });
      // 缓存 ID 列表
      room.memory.repairQueue = toRepair.map(s => s.id);
    }
  },

  /**
   * @param {Creep} creep
   * @returns {Structure|null} 下一个修复目标
   */
  getTarget(creep) {
    const room = creep.room;
    const queue = room.memory.repairQueue || [];
    // 过滤无效或已修复目标
    const valid = queue.filter(id => {
      const s = Game.getObjectById(id);
      return s && (s.hits / s.hitsMax < this.threshold);
    });
    room.memory.repairQueue = valid;
    if (valid.length === 0) return null;
    return Game.getObjectById(valid[0]) || null;
  }
};

module.exports = repairManager;
