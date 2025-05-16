// tower.js
// 提供 towerRun 方法，实现防御与优先级修理逻辑，并缓存修理目标 15 tick

const towerManager = {
    // 优先级定义：数字越小优先级越高
    priorityOrder: {
      [STRUCTURE_SPAWN]: 1,
      [STRUCTURE_EXTENSION]: 2,
      [STRUCTURE_TOWER]: 3,
      [STRUCTURE_ROAD]: 4,
      [STRUCTURE_CONTAINER]: 5,
      [STRUCTURE_RAMPART]: 6,
      [STRUCTURE_WALL]: 7,
      others: 8
    },
    scanInterval: 100,
  
    /**
     * 扫描并缓存修理队列
     * @param {Room} room
     */
    scan(room) {
      if (!room.memory._lastTowerScan || Game.time - room.memory._lastTowerScan >= this.scanInterval) {
        room.memory._lastTowerScan = Game.time;
        // 找出所有受损且 hits < 500k 的建筑
        const toRepair = room.find(FIND_STRUCTURES, {
            filter: s => {
            //   if (s.structureType === STRUCTURE_WALL) {
            //     return s.hits < 10000000; // 牆壁上限 100 萬
            //   } else {
                return s.hits / s.hitsMax < 0.8 && s.hits < 5000000; // 其他建築修到滿，但不超過 1000 萬
              }
            }
          );
        // 排序：先按优先级，再按生命比例，再按与 controller 距离
        const controllerPos = room.controller && room.controller.pos;
        toRepair.sort((a, b) => {
          const pa = this.priorityOrder[a.structureType] || this.priorityOrder.others;
          const pb = this.priorityOrder[b.structureType] || this.priorityOrder.others;
          if (pa !== pb) return pa - pb;
          const ra = a.hits / a.hitsMax;
          const rb = b.hits / b.hitsMax;
          if (ra !== rb) return ra - rb;
          if (controllerPos) {
            return controllerPos.getRangeTo(a) - controllerPos.getRangeTo(b);
          }
          return 0;
        });
        room.memory.towerRepairQueue = toRepair.map(s => s.id);
      }
    }
  };
  
  /**
   * towerRun: 在每个 tick 调用，自动攻击并修理
   * @param {Room} room
   */
  function towerRun(room) {
    // 更新修理队列缓存
    towerManager.scan(room);
    const queue = room.memory.towerRepairQueue || [];
    // 遍历所有塔
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_TOWER
    });
    for (const tower of towers) {
      // 1. 优先攻击最近的敌人
      const hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
      if (hostile) {
        tower.attack(hostile);
        continue;
      }
      // 2. 按缓存顺序修理目标
      let target = null;
      for (const id of queue) {
        const s = Game.getObjectById(id);
        if (s && s.hits < s.hitsMax) {
          target = s;
          break;
        }
      }
      if (target) {
        tower.repair(target);
      }
    }
  }
  
  module.exports = towerRun;
  