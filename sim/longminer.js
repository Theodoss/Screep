
// const behaver = require('behaver');

// const config = {
//   homeRoom: 'W25N47',
//   storageId: '68173618154309283cf96ead',
//   targets: [
//     { roomName: 'W26N47', rally: { x: 31, y: 20 }, mineId: '5bbcab779099fc012e63392b' }
//     // { roomName: 'W26N47', rally: { x: 21, y: 41 }, mineId: '5bbcab779099fc012e63392d' } // 多了空格原本錯誤已修正
//   ]
// };

// const longminer = {
//   run(creep) {
//     // 初始化 target 索引與狀態機
//     if (creep.memory.targetIndex == null) creep.memory.targetIndex = 0;
//     if (!creep.memory.state) creep.memory.state = 'rally';

//     // 初始化全局能量統計
//     Memory.longdismine = Memory.longdismine || {};
//     Memory.longdismine.energy_used = Memory.longdismine.energy_used || 0;

//     const idx = creep.memory.targetIndex;
//     if (idx >= config.targets.length) {
//       creep.memory.targetIndex = 0;
//       creep.say('Idle');
//       return;
//     }

//     const tc = config.targets[idx];
//     const mine = Game.getObjectById(tc.mineId);
//     const storage = Game.getObjectById(config.storageId);
//     const moveOpts = { reusePath: 10 };

//     switch (creep.memory.state) {
//       case 'rally': {
//         if (behaver.tryPickupNearbyEnergy(creep, 2)) break;

//         const rallyPos = new RoomPosition(tc.rally.x, tc.rally.y, tc.roomName);
//         if (creep.room.name !== tc.roomName || !creep.pos.isEqualTo(rallyPos)) {
//           creep.moveTo(rallyPos, { reusePath: 12, visualizePathStyle: { stroke: '#ff0000' } });
//         } else {
//           creep.memory.state = 'mineing';
//         }
//         break;
//       }

//       case 'mineing': {
//         if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
//           creep.memory.state = 'deliver';
//           break;
//         }

//         if (creep.harvest(mine) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(mine, { visualizePathStyle: { stroke: '#ffffff' } });
//         }

//         break;
//       }

//       case 'deliver': {
//         if(creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){creep.memory.state = creep.room.name !== config.homeRoom ? 'mineing' : 'rally';}
        
//         if (creep.memory.energyLogged = false){
//           const delta = creep.memory.prevEnergy - creep.store.getUsedCapacity[RESOURCE_ENERGY];
//           if (delta > 0) {
//             Memory.longdismine.energy_used += delta;
//           }
//           creep.memory.energyLogged = true
//         }
//         // 優先修附近道路
//         const roads = creep.pos.findInRange(FIND_STRUCTURES, 2, {
//           filter: s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax
//         });
//         if (roads.length > 0) {
//           creep.repair(roads[0]);
//           creep.memory.energyLogged = false
//           creep.memory.prevEnergy = creep.store.getUsedCapacity[RESOURCE_ENERGY]
//           return;
//         }

//         // 嘗試交付能量給優先結構
//         if (creep.room.name === config.homeRoom && creep.pos.x >= 29) {
//           const targets = creep.pos.findInRange(FIND_STRUCTURES, 2, {
//             filter: s =>
//               (s.structureType === STRUCTURE_EXTENSION ||
//               s.structureType === STRUCTURE_SPAWN ||
//               s.structureType === STRUCTURE_TOWER ||
//               s.structureType === STRUCTURE_CONTAINER) &&
//               s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//           });
//           if (targets.length > 0) {
//             if (creep.transfer(targets[0], RESOURCE_ENERGY) !== OK) {
//               creep.moveTo(targets[0], moveOpts);
//             }
//             else {creep.memory.energyLogged = false
//               creep.memory.prevEnergy = creep.store.getUsedCapacity[RESOURCE_ENERGY]
//             }
//             return;
//           }
//         }

//         // 本基地內才蓋路
        
//           const sites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
//             filter: s => s.structureType === STRUCTURE_ROAD
//           });
//           if (sites.length > 0) {
//             if (creep.build(sites[0]) !== OK) {
//               creep.moveTo(sites[0], moveOpts);
//             }else {creep.memory.energyLogged = false
//               creep.memory.prevEnergy = creep.store.getUsedCapacity[RESOURCE_ENERGY]
//             }
//             return;
//           }
        

//         // 最後送回 storage
//         if (storage && creep.store[RESOURCE_ENERGY] > 0) {
//           if (creep.transfer(storage, RESOURCE_ENERGY) !== OK) {
//             creep.moveTo(storage, moveOpts);
//           } else {creep.memory.energyLogged = false
//             creep.memory.prevEnergy = creep.store.getUsedCapacity[RESOURCE_ENERGY]
//           }
//         } 

//         break;
//       }
//     }

//     // ✅ 單次統計能量交付，避免重複、考慮死亡
//     if (creep.memory.state === 'deliver') {
//       if (creep.memory.prevEnergy == null) {
//         // 第一次進入 deliver 階段，記錄初始能量與設定旗標
//         creep.memory.energyLogged = true;
//       } 
//     } else {
//       // 只要離開 deliver 就清空記錄
//       delete creep.memory.prevEnergy;
//       delete creep.memory.energyLogged;
//     }
//   }
// };

// module.exports = longminer;



// const behaver = require('behaver');

// const config = {
//     homeRoom: 'W25N47',
//     storageId: '68173618154309283cf96ead',
//     targets: [
//         { roomName: 'W26N47', rally: { x: 31, y: 20 }, mineId: '5bbcab779099fc012e63392b' }
//         // { roomName: 'W26N47', rally: { x: 21, y: 41 }, mineId: '5bbcab779099fc012e63392d' }
//     ]
// };

// const longminer = {
//     run(creep) {
//         // 初始化 target 索引與狀態機
//         if (creep.memory.targetIndex == null) creep.memory.targetIndex = 0;
//         if (!creep.memory.state) creep.memory.state = 'rally';

//         // 初始化全局能量統計
//         Memory.longdismine = Memory.longdismine || {};
//         Memory.longdismine.energy_used = Memory.longdismine.energy_used || 0;

//         const idx = creep.memory.targetIndex;
//         if (idx >= config.targets.length) {
//             creep.memory.targetIndex = 0;
//             creep.say('Idle');
//             return;
//         }

//         const tc = config.targets[idx];
//         const mine = Game.getObjectById(tc.mineId);
//         const storage = Game.getObjectById(config.storageId);
//         const moveOpts = { reusePath: 10 };

//         switch (creep.memory.state) {
//             case 'rally': {
//                 if (behaver.tryPickupNearbyEnergy(creep, 2)) break;

//                 const rallyPos = new RoomPosition(tc.rally.x, tc.rally.y, tc.roomName);
//                 if (creep.room.name !== tc.roomName || !creep.pos.isEqualTo(rallyPos)) {
//                     creep.moveTo(rallyPos, { reusePath: 12, visualizePathStyle: { stroke: '#ff0000' } });
//                 } else {
//                     creep.memory.state = 'mineing';
//                 }
//                 break;
//             }

//             case 'mineing': {
//                 if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
//                     creep.memory.state = 'deliver';
//                     creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY); // 記錄滿載能量
//                     break;
//                 }

//                 if (creep.harvest(mine) === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(mine, { visualizePathStyle: { stroke: '#ffffff' } });
//                 }

//                 break;
//             }

//             case 'deliver': {
//                 if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
//                     creep.memory.state = creep.room.name !== config.homeRoom ? 'mineing' : 'rally';
//                     delete creep.memory.energyBeforeAction; // 清除臨時能量記錄
//                     break;
//                 }

//                 // 檢查上一個 tick 是否記錄了能量
//                 if (creep.memory.energyBeforeAction !== undefined) {
//                     const currentEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
//                     const delta = creep.memory.energyBeforeAction - currentEnergy;

//                     // 如果能量減少了（delta > 0），則累加到統計中
//                     if (delta > 0) {
//                         Memory.longdismine.energy_used += delta;
//                     }

//                     // 清除臨時能量記錄，為下一個可能的動作做準備
//                     delete creep.memory.energyBeforeAction;
//                 }

//                 // 優先修附近道路
//                 const roads = creep.pos.findInRange(FIND_STRUCTURES, 2, {
//                     filter: s => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax
//                 });
//                 if (roads.length > 0) {
//                     if (creep.repair(roads[0]) === OK) {
//                         // 能量變化將在下一個 tick 處理
//                         creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
//                     }
//                     return;
//                 }

//                 // 嘗試交付能量給優先結構
//                 if (creep.room.name === config.homeRoom && creep.pos.x >= 29) {
//                     const targets = creep.pos.findInRange(FIND_STRUCTURES, 2, {
//                         filter: s =>
//                             (s.structureType === STRUCTURE_EXTENSION ||
//                                 s.structureType === STRUCTURE_SPAWN ||
//                                 s.structureType === STRUCTURE_TOWER ||
//                                 s.structureType === STRUCTURE_CONTAINER) &&
//                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//                     });
//                     if (targets.length > 0) {
//                         if (creep.transfer(targets[0], RESOURCE_ENERGY) === OK) {
//                             // 能量變化將在下一個 tick 處理
//                             creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
//                         } else {
//                             creep.moveTo(targets[0], moveOpts);
//                         }
//                         return;
//                     }
//                 }

//                 // 本基地內才蓋路
//                 const sites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
//                     filter: s => s.structureType === STRUCTURE_ROAD
//                 });
//                 if (sites.length > 0) {
//                     if (creep.build(sites[0]) === OK) {
//                         // 能量變化將在下一個 tick 處理
//                         creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
//                     } else {
//                         creep.moveTo(sites[0], moveOpts);
//                     }
//                     return;
//                 }

//                 // 最後送回 storage
//                 if (storage && creep.store[RESOURCE_ENERGY] > 0) {
//                     if (creep.transfer(storage, RESOURCE_ENERGY) === OK) {
//                         // 能量變化將在下一個 tick 處理
//                         creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
//                     } else {
//                         creep.moveTo(storage, moveOpts);
//                     }
//                 }

//                 break;
//             }
//         }
//     }
// };

// module.exports = longminer;

const behaver = require('behaver');

const config = {
    homeRoom: 'W25N47',
    storageId: '68173618154309283cf96ead',
    targets: [
        { roomName: 'W26N47', rally: { x: 31, y: 20 }, mineId: '5bbcab779099fc012e63392b' }
        // { roomName: 'W26N47', rally: { x: 21, y: 41 }, mineId: '5bbcab779099fc012e63392d' }
    ]
};

const longminer = {
    run(creep) {
        // 初始化 target 索引與狀態機
        if (creep.memory.targetIndex == null) creep.memory.targetIndex = 0;
        if (!creep.memory.state) creep.memory.state = 'rally';

        // 初始化全局能量統計
        Memory.longdismine = Memory.longdismine || {};
        Memory.longdismine.energy_used = Memory.longdismine.energy_used || 0;

        const idx = creep.memory.targetIndex;
        if (idx >= config.targets.length) {
            creep.memory.targetIndex = 0;
            creep.say('Idle');
            return;
        }

        const tc = config.targets[idx];
        const mine = Game.getObjectById(tc.mineId);
        const storage = Game.getObjectById(config.storageId);
        const moveOpts = { reusePath: 10 };

        switch (creep.memory.state) {
            case 'rally': {
                if (behaver.tryPickupNearbyEnergy(creep, 2)) break;

                const rallyPos = new RoomPosition(tc.rally.x, tc.rally.y, tc.roomName);
                if (creep.room.name !== tc.roomName || !creep.pos.isEqualTo(rallyPos)) {
                    creep.moveTo(rallyPos, { reusePath: 12, visualizePathStyle: { stroke: '#ff0000' } });
                } else {
                    creep.memory.state = 'mineing';
                }
                break;
            }

            case 'mineing': {
                if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                    creep.memory.state = 'deliver';
                    creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY); // 記錄滿載能量
                    break;
                }

                if (creep.harvest(mine) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(mine, { visualizePathStyle: { stroke: '#ffffff' } });
                }

                break;
            }

            case 'deliver': {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                    // 在轉換到 'rally' 或 'mineing' 之前處理能量統計
                    if (creep.memory.energyBeforeAction !== undefined) {
                        const currentEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                        const delta = creep.memory.energyBeforeAction - currentEnergy;
                        if (delta > 0) {
                            Memory.longdismine.energy_used += delta;
                        }
                        delete creep.memory.energyBeforeAction;
                    }
                    creep.memory.state = creep.room.name !== config.homeRoom ? 'mineing' : 'rally';
                    break;
                }

                // 檢查上一個 tick 是否記錄了能量
                if (creep.memory.energyBeforeAction !== undefined) {
                    const currentEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                    const delta = creep.memory.energyBeforeAction - currentEnergy;

                    // 如果能量減少了（delta > 0），則累加到統計中
                    if (delta > 0) {
                        Memory.longdismine.energy_used += delta;
                    }

                    // 清除臨時能量記錄，為下一個可能的動作做準備
                    delete creep.memory.energyBeforeAction;
                }

                // 優先修附近道路
                const roads = creep.pos.findInRange(FIND_STRUCTURES, 2, {
                    filter: s => s.structureType === STRUCTURE_ROAD && s.hits < 3500
                });
                if (roads.length > 0) {
                    if (creep.repair(roads[0]) === OK) {
                        // 能量變化將在下一個 tick 處理
                        creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                    }
                    return;
                }

                // 嘗試交付能量給優先結構
                if (creep.room.name === config.homeRoom && creep.pos.x >= 29) {
                    const targets = creep.pos.findInRange(FIND_STRUCTURES, 2, {
                        filter: s =>
                            (s.structureType === STRUCTURE_EXTENSION ||
                                s.structureType === STRUCTURE_SPAWN ||
                                s.structureType === STRUCTURE_TOWER ||
                                s.structureType === STRUCTURE_CONTAINER) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    });
                    if (targets.length > 0) {
                        if (creep.transfer(targets[0], RESOURCE_ENERGY) === OK) {
                            // 能量變化將在下一個 tick 處理
                            creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                        } else {
                            creep.moveTo(targets[0], moveOpts);
                        }
                        return;
                    }
                }

                // 本基地內才蓋路
                const sites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                    filter: s => s.structureType === STRUCTURE_ROAD
                });
                if (sites.length > 0) {
                    if (creep.build(sites[0]) === OK) {
                        // 能量變化將在下一個 tick 處理
                        creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                    } else {
                        creep.moveTo(sites[0], moveOpts);
                    }
                    return;
                }

                // 最後送回 storage
                if (storage && creep.store[RESOURCE_ENERGY] > 0) {
                    if (creep.transfer(storage, RESOURCE_ENERGY) === OK) {
                        // 能量變化將在下一個 tick 處理
                        creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                    } else {
                        creep.moveTo(storage, moveOpts);
                    }
                }

                break;
            }
        }
    }
};

module.exports = longminer;
