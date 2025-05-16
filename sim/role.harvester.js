// // roleHarvester.js
// // Harvester 角色：负责采集并运送能量，基于房间象限的优先级系统

// /**
//  * 根据 Position 返回四象限索引：
//  * 0: x<25,y<25; 1: x>=25,y<25; 2: x<25,y>=25; 3: x>=25,y>=25
//  */
// function getQuadrant(pos) {
//   return (pos.x < 25 ? 0 : 1) + (pos.y < 25 ? 0 : 2);
// }

// /**
//  * 每 100 tick 扫描一次房间，缓存 Containers 和 Storage 到各象限列表
//  */
// function scanQuadrants(room) {
//   if (!room.memory._quadScanTick || Game.time - room.memory._quadScanTick >= 100) {
//     room.memory._quadScanTick = Game.time;
//     const quadrants = { containers: [[], [], [], []], storage: [[], [], [], []] };
//     // 扫描并分配所有 Containers
//     const conts = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER });
//     for (const c of conts) {
//       const q = getQuadrant(c.pos);
//       quadrants.containers[q].push(c.id);
//     }
//     // 分配 Storage（可能无）
//     if (room.storage) {
//       const q = getQuadrant(room.storage.pos);
//       quadrants.storage[q] = [room.storage.id];
//     }
//     room.memory.harvestQuadrants = quadrants;
//   }
// }

// const roleHarvester = {
//   /** @param {Creep} creep **/
//   run(creep) {
//     const { room, pos } = creep;
//     const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
//     const usedCap = creep.store.getUsedCapacity(RESOURCE_ENERGY);
//     // 1. 状态切换
//     if (creep.memory.delivering === undefined) creep.memory.delivering = false;
//     if (creep.memory.delivering && usedCap === 0) {
//       creep.memory.delivering = false;
//       creep.say('🔄 harvest');
//     }
//     if (!creep.memory.delivering && freeCap === 0) {
//       creep.memory.delivering = true;
//       creep.say('🚚 deliver');
//     }
//     // 2. 扫描象限缓存
//     scanQuadrants(room);
//     const quad = getQuadrant(pos);

//     if (!creep.memory.delivering) {
//       // 采集模式：同象限 Containers -> 同象限 Storage -> 其他象限 Containers -> Storage -> Source
//       let target = null;
//       const mem = room.memory.harvestQuadrants;
//       // 同象限 Containers（只选能提供至少 freeCap 的容器）
//       const ownConts = (mem.containers[quad] || [])
//         .map(id => Game.getObjectById(id))
//         .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap);
//       if (ownConts.length) {
//         target = pos.findClosestByPath(ownConts, { reusePath: 10, ignoreCreeps: true });
//       }
//       // 同象限 Storage
//       if (!target && room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap) {
//         target = room.storage;
//       }
//       // 其他象限 Containers
//       if (!target) {
//         const otherConts = [];
//         for (let q = 0; q < 4; q++) {
//           if (q === quad) continue;
//           otherConts.push(...(mem.containers[q] || []));
//         }
//         const avail = otherConts
//           .map(id => Game.getObjectById(id))
//           .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap);
//         if (avail.length) {
//           target = pos.findClosestByPath(avail, { reusePath: 10, ignoreCreeps: true });
//         }
//       }
//       // Storage fallback
//       if (!target && room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap) {
//         target = room.storage;
//       }
//       // Source fallback
//       if (!target) {
//         target = pos.findClosestByPath(FIND_SOURCES, { reusePath: 10, ignoreCreeps: true });
//       }
//       // 执行取能
//       if (target) {
//         if (target.structureType === STRUCTURE_CONTAINER || target.structureType === STRUCTURE_STORAGE) {
//           if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//             creep.moveTo(target, { reusePath: 10, ignoreCreeps: true });
//           }
//         } else {
//           if (creep.harvest(target) === ERR_NOT_IN_RANGE) {
//             creep.moveTo(target, { reusePath: 10, ignoreCreeps: true });
//           }
//         }
//       }
//     } else {
//       // 运输模式：Spawn/Extension -> Tower -> Storage Overflow
//       let t = pos.findClosestByPath(FIND_MY_STRUCTURES, {
//         filter: s =>
//           (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
//           s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//       });
//       if (t) {
//         if (creep.transfer(t, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(t, { reusePath: 10, ignoreCreeps: true });
//         }
//         return;
//       }
//       t = pos.findClosestByPath(FIND_STRUCTURES, {
//         filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//       });
//       if (t) {
//         if (creep.transfer(t, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(t, { reusePath: 10, ignoreCreeps: true });
//         }
//         return;
//       }
//       const overflow = pos.findClosestByPath(FIND_STRUCTURES, {
//         filter: s =>
//           s.structureType === STRUCTURE_CONTAINER &&
//           s.store.getUsedCapacity(RESOURCE_ENERGY) > freeCap
//       });
//       if (overflow && room.storage && room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
//         if (creep.transfer(room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(room.storage, { reusePath: 10, ignoreCreeps: true });
//         }
//       }
//     }
//   }
// };

// module.exports = roleHarvester;


// roleHarvester.js
// Harvester 角色：负责采集并运送能量，基于房间象限的优先级系统

/**
 * 根据 Position 返回四象限索引：
 * 0: x<25,y<25; 1: x>=25,y<25; 2: x<25,y>=25; 3: x>=25,y>=25
 */
// function getQuadrant(pos) {
//   return (pos.x < 25 ? 0 : 1) + (pos.y < 25 ? 0 : 2);
// }

// /**
//  * 每 100 tick 扫描一次房间，缓存 Containers 和 Storage 到各象限列表
//  */
// function scanQuadrants(room) {
//   if (!room.memory._quadScanTick || Game.time - room.memory._quadScanTick >= 100) {
//     room.memory._quadScanTick = Game.time;
//     const quadrants = { containers: [[], [], [], []], storage: [[], [], [], []] };
//     const conts = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER });
//     for (const c of conts) {
//       const q = getQuadrant(c.pos);
//       quadrants.containers[q].push(c.id);
//     }
//     if (room.storage) {
//       const q = getQuadrant(room.storage.pos);
//       quadrants.storage[q] = [room.storage.id];
//     }
//     room.memory.harvestQuadrants = quadrants;
//   }
// }

// /**
//  * 查找最优取能目标
//  */
// function findHarvestTarget(creep) {
//   const { room, pos } = creep;
//   const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
//   const quad = getQuadrant(pos);
//   const mem = room.memory.harvestQuadrants || { containers: [[], [], [], []], storage: [[], [], [], []] };
//   // 同象限 Containers
//   let candidates = (mem.containers[quad] || [])
//     .map(id => Game.getObjectById(id))
//     .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap);
//   if (candidates.length) {
//     return pos.findClosestByPath(candidates, { reusePath: 10, ignoreCreeps: true });
//   }
//   // 同象限 Storage
//   if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap) {
//     return room.storage;
//   }
//   // 其他象限 Containers
//   candidates = [];
//   for (let q = 0; q < 4; q++) {
//     if (q === quad) continue;
//     candidates.push(...(mem.containers[q] || []));
//   }
//   candidates = candidates
//     .map(id => Game.getObjectById(id))
//     .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap);
//   if (candidates.length) {
//     return pos.findClosestByPath(candidates, { reusePath: 10, ignoreCreeps: true });
//   }
//   // 全局 Storage
//   if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap) {
//     return room.storage;
//   }
//   // 最后退化到 Source
//   return pos.findClosestByPath(room.find(FIND_SOURCES), { reusePath: 10, ignoreCreeps: true });
// }

// /**
//  * 查找最优运输目标
//  */
// function findDeliveryTarget(creep) {
//   const { room, pos } = creep;
//   // 优先 Spawn/Extensions
//   let targets = room.find(FIND_MY_STRUCTURES, {
//     filter: s =>
//       (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
//       s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//   });
//   if (targets.length) {
//     return pos.findClosestByPath(targets, { reusePath: 10, ignoreCreeps: true });
//   }
//   // 其次 Tower
//   targets = room.find(FIND_MY_STRUCTURES, {
//     filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//   });
//   if (targets.length) {
//     return pos.findClosestByPath(targets, { reusePath: 10, ignoreCreeps: true });
//   }
//   // 最后 Storage
//   if (room.storage && room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
//     return room.storage;
//   }
//   return null;
// }

// const roleHarvester = {
//   /** @param {Creep} creep **/
//   run(creep) {
//     const { room, pos } = creep;
//     const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
//     const usedCap = creep.store.getUsedCapacity(RESOURCE_ENERGY);

//     // 状态初始化
//     if (creep.memory.delivering === undefined) {
//       creep.memory.delivering = usedCap > 0 && freeCap === 0;
//     }
//     // 状态切换
//     if (creep.memory.delivering && usedCap === 0) {
//       creep.memory.delivering = false;
//       creep.say('🔄 harvest');
//     } else if (!creep.memory.delivering && freeCap === 0) {
//       creep.memory.delivering = true;
//       creep.say('🚚 deliver');
//     }

//     scanQuadrants(room);
//     const moveOpts = { reusePath: 10, ignoreCreeps: true };

//     if (!creep.memory.delivering) {
//       // 采集模式
//       const target = findHarvestTarget(creep);
//       if (target) {
//         if (target.structureType) {
//           if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//             creep.moveTo(target, moveOpts);
//           }
//         } else {
//           if (creep.harvest(target) === ERR_NOT_IN_RANGE) {
//             creep.moveTo(target, moveOpts);
//           }
//         }
//       }
//     } else {
//       // 运输模式
//       const target = findDeliveryTarget(creep);
//       if (target) {
//         if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(target, moveOpts);
//         }
//       }
//     }
//   }
// };

// module.exports = roleHarvester;


/**
 * 简化的 Harvester 角色：
 * - 使用状态机模式：空闲 -> 采集 -> 满载 -> 运输 -> 空闲
 * - 采集：最近的 source
 * - 运输：优先填充 Spawn/Extension -> Tower -> Storage
 */
const containerManager = require('containerMgr');

const roleHarvester = {
  /** @param {Creep} creep **/
  run(creep) {
    const { room, pos } = creep;
    const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
    const usedCap = creep.store.getUsedCapacity(RESOURCE_ENERGY);

    // 状态初始化：如果 delivering 未定义，则根据背包状态初始化
    if (creep.memory.delivering === undefined) {
      creep.memory.delivering = usedCap > 0 && freeCap === 0;
    }

    // 状态切换：满载时切换到运输，能量耗尽时切换到采集
    if (creep.memory.delivering && usedCap === 0) {
      creep.memory.delivering = false;
      creep.say('🔄 ');
    } else if (!creep.memory.delivering && freeCap === 0) {
      creep.memory.delivering = true;
      creep.say('🚚 ');
    }

    const moveOpts = { reusePath: 10, ignoreCreeps: true,visualizePathStyle: { stroke: '#ffffff' } };

    if (!creep.memory.delivering) {
      //采集模式：1. 從註冊容器取
      const regs = containerManager.getContainers(creep.room) || [];
      let best = null;
      for (const id of regs) {
        const cont = Game.getObjectById(id);
        if (cont && cont.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap) {
          if (!best || pos.getRangeTo(cont) < pos.getRangeTo(best)) best = cont;
        }
      }
      if (best) {
        creep.withdraw(best, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(best, { reusePath: 10 });
        return true;
      }

      // 采集模式：2. 从最近的 source 采集能量
      const source = creep.pos.findClosestByPath(room.find(FIND_SOURCES), moveOpts);
      if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          creep.moveTo(source, moveOpts);
        }
      }
    } else {
      // 运输模式：优先 Spawn/Extension -> Tower -> Storage
      let target = creep.pos.findClosestByPath(
        room.find(FIND_MY_STRUCTURES, {
          filter: s =>
            (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }),
        moveOpts
      );

      if (!target) {
        target = creep.pos.findClosestByPath(
          room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 500
          }),
          moveOpts
        );
      }

      if (!target && room.storage && room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        target = room.storage;
      }

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, moveOpts);
        }
      }
    }
  }
};

module.exports = roleHarvester;