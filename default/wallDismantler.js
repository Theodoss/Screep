// // wallDismantler.js
// // 简易拆墙脚本：结合状态机，移动至集结点 -> 移动至墙体 -> 拆除

// // 配置：目标点列表，每个目标包含房间名、集结点坐标和墙体 ID
// const config = {
//     Home:[
//         {
//             roomName: 'W25N47'
//         }
//     ],

//     targets: [
//       {
//         roomName: 'W26N47',               // 目标房间
//         rally: { x: 39, y: 22 },            // 集结点坐标
//         wallId: '6693d8e900e47d254d0a2750' // 要拆除的墙体或壁垒 ID
//       },
//       {
//         roomName: 'W26N47',               // 目标房间
//         rally: { x: 39, y: 22 },            // 集结点坐标
//         wallId: '6693d8e439f17c0eddbea6be' // 要拆除的墙体或壁垒 ID
//       }
//       // 如需更多目标，可继续添加配置对象
//     ]
//   };
  
//   const wallDismantler = {
//     /**
//      * @param {Creep} creep
//      * 状态机：'rally' -> 'moveToWall' -> 'dismantle'
//      */
//     run(creep) {
//       Target_Number = 0;
//       const t = config.targets[Target_Number];
//       //如果檢測不到排程ID或是已經大於排程數量,循環跳出
//       if(Target_Number > config.targets.length){
//         creep.say("Idle")
//         return;
//       }
//       if(!t.wallId) 
//       {Target_Number += 1
//         return;
//       }
//       // 如果状态未初始化，默认从 'rally'
//       if (!creep.memory.state) creep.memory.state = 'rally';
//       // 获取墙体对象，一次性
//       const wall = Game.getObjectById(t.wallId);
  
//       switch(creep.memory.state) {
//         case 'rally': {
//           // 移动至集结点
//           const rallyPos = new RoomPosition(t.rally.x, t.rally.y, t.roomName);
//           if (creep.room.name !== t.roomName || !creep.pos.isEqualTo(rallyPos)) {
//             creep.moveTo(rallyPos, { reusePath: 50, visualizePathStyle:{stroke:'#ff0000'}, ignoreCreeps: true });
//           } else {
//             // 到达后切换到下一状态
//             creep.memory.state = 'dismantle';
//           }
//           break;
//         }
//         case 'dismantle': {
//           // 如果找不到墙体打印，并返回
//             if (!wall) {
//                 console.log(`[wallDismantler] ${creep.name} 找不到墙体 ID=${t.wallId}`);
//                 creep.memory.state = null;
//                 break;
//             }
//             // 移动至墙体位置 並拆除
//             const res = creep.dismantle(wall);
//             if (res === ERR_NOT_IN_RANGE) {
//                 creep.moveTo(wall, { visualizePathStyle: { stroke: '#ffffff' } });
//             }
//             if (res === ERR_NOT_OWNER || res === ERR_INVALID_TARGET) {
//                 creep.memory.state = null;
//                 console.log(res)
//                 break;
//             }
//             if (creep.store.getFreeCapacity(RESOURCE_ENERGY)=== 0) {
//                 creep.memory.state = 'deliver';
//                 break;
//                 }

          
          
//             // 如果拆除完成或出错，重置状态
//             if (res === ERR_NOT_OWNER || res === ERR_INVALID_TARGET) {
//                 creep.memory.state = null;
//                 console.log(res)
//                 }
//             break;
//             }
//         case 'deliver': {
//             // 1. Spawn/Extension
//             const room = config.Home.roomName
//             const storages = Game.getObjectById('68173618154309283cf96ead')
//             // const spawnExts = room.find(FIND_MY_STRUCTURES, { filter: s =>
//             //     (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
//             //     s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//             // });
//             // if (spawnExts.length) {
//             //     const target = pos.findClosestByPath(spawnExts);
//             //     creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
//             //     return true;
//             // }
//             // // 2. Tower
//             // const towers = room.find(FIND_STRUCTURES, { filter: s =>
//             //     s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) <= 1000
//             // });
//             // if (towers.length) {
//             //     const target = pos.findClosestByPath(towers);
//             //     creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
//             //     return true;
//             // }
//             // 4. Storage
//             // const storages = room.find(FIND_STRUCTURES, { filter: s =>
//             //     s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//             // });
//             // if (storages.length) {
//             //     const target = pos.findClosestByPath(storages);
//             //     creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
//             //     return true;
//             // }
//             const target = room.pos.findClosestByPath(storages);
//                 creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
//                 return true;
//         }

//         default:
//           // 状态结束，保持待命
//           creep.say('Idle');
//           creep.memory.state = 'rally';
//           break;
//       }
//     }
//   };
  
//   module.exports = wallDismantler;


  // wallDismantler.js

// const config = {
//     homeRoom: 'W25N47',   // 主仓库房间
//     storageId: '68173618154309283cf96ead',  // 主仓库ID
//     targets: [
//       {
//         roomName: 'W26N47',
//         rally: { x: 39, y: 22 },
//         wallId: '6693d8e900e47d254d0a2750'
//       },
//       {
//         roomName: 'W26N47',
//         rally: { x: 39, y: 22 },
//         wallId: '6693d8e439f17c0eddbea6be'
//       }
//     ]
//   };
  
//   const wallDismantler = {
//     run(creep) {
//       // 初始化当前目标索引
//       if (creep.memory.targetIndex == null) {
//         creep.memory.targetIndex = 0;
//       }
//       const idx = creep.memory.targetIndex;
//       // 如果所有目标都处理完，就待命
//       if (idx >= config.targets.length) {
//         creep.say('Idle');
//         return;
//       }
//       const targetCfg = config.targets[idx];
//       // 状态机初始化
//       if (!creep.memory.state) creep.memory.state = 'rally';
  
//       // 获取结构对象
//       const wall = Game.getObjectById(targetCfg.wallId);
//       const storage = Game.getObjectById(config.storageId);
  
//       switch (creep.memory.state) {
//         case 'rally':
//           // 移动到集结点
//           const rallyPos = new RoomPosition(
//             targetCfg.rally.x,
//             targetCfg.rally.y,
//             targetCfg.roomName
//           );
//           if (
//             creep.room.name !== targetCfg.roomName ||
//             !creep.pos.isEqualTo(rallyPos)
//           ) {
//             creep.moveTo(rallyPos, {
//               reusePath: 50,
//               ignoreCreeps: true,
//               visualizePathStyle: { stroke: '#ff0000' }
//             });
//           } else {
//             creep.memory.state = 'dismantle';
//           }
//           break;
  
//         case 'dismantle':
//           if (!wall) {
//             // 墙已拆完或 ID 无效，移动到下一个目标
//             creep.memory.targetIndex++;
//             creep.memory.state = 'rally';
//             break;
//           }
//           // 背包满就去送能量
//           if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
//             creep.memory.state = 'deliver';
//             break;
//           }
//           // 拆墙
//           if (creep.dismantle(wall) === ERR_NOT_IN_RANGE) {
//             creep.moveTo(wall, { visualizePathStyle: { stroke: '#ffffff' } });
//           }
//           break;
  
//         case 'deliver':
//           if (storage && creep.store[RESOURCE_ENERGY] > 0) {
//             if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//               creep.moveTo(storage, { reusePath: 10 });
//             }
//           } else {
//             // 送完了，继续拆同一面墙
//             creep.memory.state = 'dismantle';
//           }
//           break;
//       }
//     }
//   };
  
//   module.exports = wallDismantler;

  // wallDismantler.js
// 简易拆墙脚本：移动至集结点 -> 拆除 -> 运能，同时负责路面维护（修复/建设）

const config = {
    homeRoom: 'W25N47',
    storageId: '68173618154309283cf96ead',
    targets: [
      { roomName: 'W26N47', rally: { x: 39, y: 22 }, wallId: '6693d8f47891e263363d18f1' },
      { roomName: 'W26N47', rally: { x: 39, y: 22 }, wallId: '6693d8e439f17c0eddbea6be' }
    ]
  };
  
  const wallDismantler = {
    run(creep) {
        // creep.memory.targetIndex == null
      // 初始化或获取状态
    //   creep.memory.state = 'dismantle'
      if (creep.memory.targetIndex == null) creep.memory.targetIndex = 0;
      if (!creep.memory.state) creep.memory.state = 'rally';
      const idx = creep.memory.targetIndex;
      if (idx >= config.targets.length) {
        creep.say('Idle');
        return;
      }
      const tc = config.targets[idx];
      const wall = Game.getObjectById(tc.wallId);
      const storage = Game.getObjectById(config.storageId);
      const moveOpts = { reusePath: 10, ignoreCreeps: true };
  
      switch (creep.memory.state) {
        case 'rally': {
        
          const rallyPos = new RoomPosition(tc.rally.x, tc.rally.y, tc.roomName);
          if (creep.room.name !== tc.roomName || !creep.pos.isEqualTo(rallyPos)) {
            creep.moveTo(rallyPos, { reusePath: 50, ignoreCreeps: true, visualizePathStyle: { stroke: '#ff0000' } });
          } else {
            creep.memory.state = 'dismantle';
          }
          break;
        }
  
        case 'dismantle': {
          if (!wall) {
            // 墙拆完，切换下一个目标
            creep.memory.targetIndex++;
            creep.memory.state = 'rally';
            break;
          }
          if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.state = 'deliver';
            break;
          }
          if (creep.dismantle(wall) === ERR_NOT_IN_RANGE) {
            creep.moveTo(wall, { visualizePathStyle: { stroke: '#ffffff' } });
          }
          break;
        }
  
        case 'deliver': {

            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
                console.log("j")
                creep.memory.state = 'dismantle'
            }
          // 路面维护：优先修复附近损坏道路
          const roads = creep.pos.findInRange(FIND_STRUCTURES, 2, { filter: s => s.structureType === STRUCTURE_ROAD });
          for (const r of roads) {
            if (r.hits < r.hitsMax) {
              creep.repair(r);
              return;
            }
          }
          // 路面建设：寻找已有施工点并建造
          const sites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, { filter: s => s.structureType === STRUCTURE_ROAD });
          if (sites.length > 0) {
            if (creep.build(sites[0]) === ERR_NOT_IN_RANGE) {
              creep.moveTo(sites[0], moveOpts);
            }
            return;
          }
          // 运送能量至 Storage
          if (storage && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(storage, moveOpts);
            }
          } else {
            // 能量耗尽，继续拆墙
            creep.memory.state = 'dismantle';
          }
          break;
        }
      }
    }
  };
  
  module.exports = wallDismantler;
  