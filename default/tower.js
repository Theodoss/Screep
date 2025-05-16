// @ts-nocheck
// tower.js
// 提供 towerRun 方法，实现防御与优先级修理逻辑，并缓存修理目标 15 tick

// 导入要拆除的墙列表
const { dismantleList } = require('./selfWallDismantler');

const towerManager = {
    // 优先级定义：数字越小优先级越高
    priorityOrder: {
      [STRUCTURE_SPAWN]: 1,
      [STRUCTURE_EXTENSION]: 2,
      [STRUCTURE_TOWER]: 3,
      [STRUCTURE_ROAD]: 4,
      [STRUCTURE_CONTAINER]: 5,
      [STRUCTURE_RAMPART]: 6,
      [STRUCTURE_WALL]: 6,
      others: 8
    },
    scanInterval: 100,
    enemyCleanInterval: 1500, // 清理敌人缓存的间隔
    minStorageEnergy: 30000, // 存储能量低于此值时，限制维修
    
    // 定义要维修的 rampart 和 wall 的区域
    repairAreas: [
      { x1: 8, y1: 38, x2: 16, y2: 45 },
      { x1: 12, y1: 2, x2: 45, y2: 22 }
    ],
  
    /**
     * 检查结构是否在指定的维修区域内
     * @param {Structure} structure 
     * @returns {boolean}
     */
    isInRepairArea(structure) {
      // 检查结构是否在拆除列表中
      if (dismantleList && dismantleList.has(structure.id)) {
        return false; // 在拆除列表中的结构不修
      }
      
      // 只对 rampart 和 wall 进行区域限制
      if (structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_WALL) {
        return true; // 其他类型的建筑不受区域限制
      }
      
      // 检查结构是否在任一维修区域内
      for (const area of this.repairAreas) {
        if (structure.pos.x >= area.x1 && 
            structure.pos.x <= area.x2 && 
            structure.pos.y >= area.y1 && 
            structure.pos.y <= area.y2) {
          return true;
        }
      }
      
      return false; // 不在任何维修区域内
    },
  
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
                return s.hits / s.hitsMax < 0.8 && s.hits < 200000 && this.isInRepairArea(s); // 其他建築修到滿，但不超過 1000 萬，并且在指定区域内
              }
            }
          );
        // 排序：先按优先级，再按生命比例
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
    },

    /**
     * 初始化敌人缓存系统
     */
    initEnemyMemory() {
      if (!Memory.enemy) {
        Memory.enemy = {
          lastCleanTime: Game.time,
          creeps: {}
        };
      }
    },

    /**
     * 清理过期的敌人记录
     */
    cleanEnemyMemory() {
      if (!Memory.enemy) this.initEnemyMemory();

      // 每1500个tick清理一次
      if (Game.time - Memory.enemy.lastCleanTime >= this.enemyCleanInterval) {
        Memory.enemy.lastCleanTime = Game.time;
        
        // 遍历缓存的敌人，检查是否还存在
        for (const name in Memory.enemy.creeps) {
          if (!Game.creeps[name]) {
            delete Memory.enemy.creeps[name];
          }
        }
      }
    },

    /**
     * 判断敌方creep是否只有TOUGH和MOVE部件，并缓存结果
     * @param {Creep} creep 
     * @returns {boolean}
     */
    hasOnlyToughAndMove(creep) {
      // 初始化敌人内存
      this.initEnemyMemory();

      // 如果已经有缓存，直接返回
      if (Memory.enemy.creeps[creep.name] && Memory.enemy.creeps[creep.name].hasOnlyToughAndMove !== undefined) {
        return Memory.enemy.creeps[creep.name].hasOnlyToughAndMove;
      }

      // 没有缓存，分析body并存储结果
      let hasOnlyToughAndMove = true;
      for (const part of creep.body) {
        if (part.type !== MOVE && part.type !== TOUGH) {
          hasOnlyToughAndMove = false;
          break;
        }
      }

      // 保存到缓存
      if (!Memory.enemy.creeps[creep.name]) {
        Memory.enemy.creeps[creep.name] = {};
      }
      Memory.enemy.creeps[creep.name].hasOnlyToughAndMove = hasOnlyToughAndMove;

      return hasOnlyToughAndMove;
    },

    /**
     * 获取敌方creep的威胁优先级，并缓存结果
     * @param {Creep} creep 
     * @returns {number} 优先级，数字越小优先级越高
     */
    getThreatPriority(creep) {
      // 初始化敌人内存
      this.initEnemyMemory();

      // 如果已经有缓存，直接返回
      if (Memory.enemy.creeps[creep.name] && Memory.enemy.creeps[creep.name].threatPriority !== undefined) {
        return Memory.enemy.creeps[creep.name].threatPriority;
      }

      // 没有缓存，分析body并计算威胁优先级
      let priority = 4; // 默认优先级

      // 检查是否有heal部件
      const hasHeal = creep.body.some(part => part.type === HEAL);
      if (hasHeal) {
        priority = 1;
      } else {
        // 检查是否有ranged_attack部件
        const hasRangedAttack = creep.body.some(part => part.type === RANGED_ATTACK);
        if (hasRangedAttack) {
          priority = 2;
        } else {
          // 检查是否有attack部件
          const hasAttack = creep.body.some(part => part.type === ATTACK);
          if (hasAttack) {
            priority = 3;
          }
        }
      }

      // 保存到缓存
      if (!Memory.enemy.creeps[creep.name]) {
        Memory.enemy.creeps[creep.name] = {};
      }
      Memory.enemy.creeps[creep.name].threatPriority = priority;

      return priority;
    },

    /**
     * 查找需要治疗的友方creep
     * @param {Room} room 
     * @returns {Creep|null} 需要治疗的creep，如果没有则返回null
     */
    findCreepToHeal(room) {
      // 找出受伤的友方creep
      const damagedCreeps = room.find(FIND_MY_CREEPS, {
        filter: creep => creep.hits < creep.hitsMax
      });

      if (damagedCreeps.length === 0) return null;

      // 按受伤程度排序（优先治疗伤势严重的）
      damagedCreeps.sort((a, b) => {
        // 计算生命值百分比
        const aHealthPercent = a.hits / a.hitsMax;
        const bHealthPercent = b.hits / b.hitsMax;
        
        // 生命值百分比越低，越优先治疗
        return aHealthPercent - bHealthPercent;
      });

      return damagedCreeps[0];
    },

    /**
     * 检查房间能量存储情况
     * @param {Room} room 
     * @returns {boolean} 是否有足够能量进行全面维修
     */
    hasEnoughEnergyForFullRepair(room) {
      const storage = room.storage;
      if (!storage) return true; // 没有storage，默认允许全部维修
      
      return storage.store[RESOURCE_ENERGY] >= this.minStorageEnergy;
    }
  };
  
  /**
   * towerRun: 在每个 tick 调用，自动攻击并修理
   * @param {Room} room
   */
  function towerRun(room) {
    // 清理过期的敌人记录
    towerManager.cleanEnemyMemory();
    
    // 更新修理队列缓存
    towerManager.scan(room);
    const queue = room.memory.towerRepairQueue || [];
    
    // 检查房间能量情况
    const allowFullRepair = towerManager.hasEnoughEnergyForFullRepair(room);
    let repairTowerUsed = false; // 追踪是否已有塔进行维修
    
    // 遍历所有塔
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_TOWER
    });
    
    for (const tower of towers) {
      // 1. 优先按威胁级别和生命值攻击敌人
      const hostiles = room.find(FIND_HOSTILE_CREEPS);
      let targetHostile = null;
      
      if (hostiles.length > 0) {
        // 过滤掉只有TOUGH和MOVE的creep
        const validTargets = hostiles.filter(creep => !towerManager.hasOnlyToughAndMove(creep));
        
        if (validTargets.length > 0) {
          // 按威胁级别和生命值排序
          validTargets.sort((a, b) => {
            const priorityA = towerManager.getThreatPriority(a);
            const priorityB = towerManager.getThreatPriority(b);
            
            // 先按优先级排序
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }
            
            // 同一优先级的，按生命值排序（优先攻击血少的）
            return a.hits - b.hits;
          });
          
          targetHostile = validTargets[0];
        }
      }
      
      if (targetHostile) {
        tower.attack(targetHostile);
        continue;
      }

      // 2. 其次，治疗受伤的友方creep
      const creepToHeal = towerManager.findCreepToHeal(room);
      if (creepToHeal) {
        tower.heal(creepToHeal);
        continue;
      }
      
      // 3. 最后，按存储能量情况决定是否维修
      if (!allowFullRepair && repairTowerUsed) {
        // 能量低且已有塔在维修，跳过
        continue;
      }

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
        // 如果能量不足，标记已有塔在维修
        if (!allowFullRepair) {
          repairTowerUsed = true;
        }
      }
    }
  }
  
  module.exports = towerRun;
  