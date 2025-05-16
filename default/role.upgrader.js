// roleUpgrader.js
// 专门负责升级 Controller，优先从 Link (receive) 获取能量，然后是最近的 Container，最后采集 Source
// 列表由 controllerContainerScan 缓存 (用于 Container) 和 Linkconfig (用于 Link)

const controllerContainerScan = require('controllerContainerScan');
const { Linkconfig } = require('linkTransfer'); // 导入 Linkconfig 以获取 receive link ID

const roleUpgrader = {
  /** @param {Creep} creep **/
  run(creep) {
    const room = creep.room;
    const controller = room.controller;

    // --- BEGIN STATIC MEMORY INITIALIZATION ---
    if (!Memory.static) {
      Memory.static = {};
    }
    if (!Memory.static[creep.name]) {
      Memory.static[creep.name] = {
        totalMovementTime: 0,
        totalEnergyUpgraded: 0,
        parts: {}, // Will be populated once
        role: 'upgrader' // Optional: good for general stats
      };

      // Populate parts (only once)
      const bodyParts = {};
      for (const part of creep.body) {
        bodyParts[part.type] = (bodyParts[part.type] || 0) + 1;
      }
      Memory.static[creep.name].parts = bodyParts;
    }
    // For convenience, create a reference to this creep's static memory
    const creepStats = Memory.static[creep.name];
    // --- END STATIC MEMORY INITIALIZATION ---

    // 切换状态：有能量时升级，无能量时采集
    if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) { // 检查是否从 upgrading 状态变为空
      creep.memory.upgrading = false;
      creep.memory.sourceId = null; // 清除之前的采集目标
      creep.say('🔄 收取');
    }
    if (!creep.memory.upgrading && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) { // 检查是否从采集状态变为满载
      creep.memory.upgrading = true;
      creep.memory.sourceId = null; // 清除之前的采集目标
      creep.say('⚡ 升级');
    }
    // 初始化状态
    if (typeof creep.memory.upgrading === 'undefined') {
      creep.memory.upgrading = creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
      creep.memory.sourceId = null;
      creep.say(creep.memory.upgrading ? '⚡ 升级' : '🔄 收取');
    }


    // 升级阶段
    if (creep.memory.upgrading) {
      const upgradeResult = creep.upgradeController(controller);
      if (upgradeResult === OK) {
        // --- TRACK ENERGY UPGRADED ---
        // Each WORK part upgrades 1 energy unit per tick
        creepStats.totalEnergyUpgraded += creep.getActiveBodyparts(WORK);
      } else if (upgradeResult === ERR_NOT_IN_RANGE) {
        if (creep.moveTo(controller, {
          visualizePathStyle: { stroke: '#66ccff' }, // 使用浅蓝色表示去升级的路径
          reusePath: 10
        }) !== ERR_NO_PATH && creep.fatigue === 0) { // Check if moveTo was successful or at least a path exists and creep is not tired
          // --- TRACK MOVEMENT TIME ---
          creepStats.totalMovementTime++;
        }
      }
    }
    else { // 采集阶段
      let targetSource = Game.getObjectById(creep.memory.sourceId);

      // 如果没有缓存的目标，或者缓存的目标无效/没能量了，则重新查找
      if (!targetSource ||
        (targetSource.store && typeof targetSource.store[RESOURCE_ENERGY] !== 'undefined' && targetSource.store[RESOURCE_ENERGY] === 0) || // For containers/links
        (targetSource.energy !== undefined && targetSource.energy === 0)) { // For sources
        creep.memory.sourceId = null; // 清除无效的 sourceId

        // 1. 优先从定义的 "receive" Link 获取能量
        if (Linkconfig && Linkconfig[room.name] && Linkconfig[room.name].receive) {
          const receiveLinkId = Linkconfig[room.name].receive;
          const receiveLink = Game.getObjectById(receiveLinkId);
          if (receiveLink && receiveLink.store[RESOURCE_ENERGY] > 0) {
            targetSource = receiveLink;
            creep.memory.sourceId = targetSource.id;
          }
        }

        // 2. 如果 Link 没有能量或不存在，则从 Controller 附近的 Container 获取能量
        if (!targetSource) {
          const containerIds = controllerContainerScan.get(room) || [];
          const containers = containerIds
            .map(id => Game.getObjectById(id))
            .filter(c => c && c.store[RESOURCE_ENERGY] > 50); // 确保容器中至少有少量能量

          if (containers.length > 0) {
            targetSource = creep.pos.findClosestByPath(containers) || containers[0];
            if (targetSource) creep.memory.sourceId = targetSource.id;
          }
        }

        // 3. 如果 Link 和 Container 都没有能量，则直接采集 Source
        if (!targetSource) {
          const sources = room.find(FIND_SOURCES_ACTIVE); // 只采集活跃的 Source
          if (sources.length > 0) {
            targetSource = creep.pos.findClosestByPath(sources) || sources[0];
            if (targetSource) creep.memory.sourceId = targetSource.id;
          }
        }
      }

      // 如果找到了采集目标
      if (targetSource) {
        let actionResult;
        if (targetSource instanceof Source) { // 如果是 Source
          actionResult = creep.harvest(targetSource);
        } else { // 如果是 Link 或 Container
          actionResult = creep.withdraw(targetSource, RESOURCE_ENERGY);
        }

        if (actionResult === ERR_NOT_IN_RANGE) {
          if (creep.moveTo(targetSource, {
            visualizePathStyle: { stroke: '#ffaa00' }, // 黄色路径表示去采集
            reusePath: 10
          }) !== ERR_NO_PATH && creep.fatigue === 0) {
            // --- TRACK MOVEMENT TIME ---
            creepStats.totalMovementTime++;
          }
        } else if (actionResult === OK) {
          // Successfully harvested or withdrew
          // If the target became empty this tick after this action, it might switch next tick.
        } else if (actionResult !== ERR_BUSY) {
          // 如果发生其他错误 (例如目标空了，但上面已经检查过，这里主要是为了捕获其他意外)
          creep.memory.sourceId = null; // 清除目标，下一 tick 重新寻找
        }
      } else {
        creep.say('🤷 无能量'); // 如果找不到任何能量源
        // Optionally, have the creep wait or move to a designated idle spot
        // To prevent it from rapidly recalculating paths if no sources are available.
        // For now, it will just re-evaluate next tick.
      }
    }
  }
};

module.exports = roleUpgrader;


// // roleUpgrader.js
// // 专门负责升级 Controller，优先从 Link (receive) 获取能量，然后是最近的 Container，最后采集 Source
// // 列表由 controllerContainerScan 缓存 (用于 Container) 和 Linkconfig (用于 Link)

// const controllerContainerScan = require('controllerContainerScan');
// const { Linkconfig } = require('linkTransfer'); // 导入 Linkconfig 以获取 receive link ID

// const roleUpgrader = {
//   /** @param {Creep} creep **/
//   run(creep) {
//     const room = creep.room;
//     const controller = room.controller;

//     // 切换状态：有能量时升级，无能量时采集
//     if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) { // 检查是否从 upgrading 状态变为空
//       creep.memory.upgrading = false;
//       creep.memory.sourceId = null; // 清除之前的采集目标
//       creep.say('🔄 收取');
//     }
//     if (!creep.memory.upgrading && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) { // 检查是否从采集状态变为满载
//       creep.memory.upgrading = true;
//       creep.memory.sourceId = null; // 清除之前的采集目标
//       creep.say('⚡ 升级');
//     }
//     // 初始化状态
//     if (typeof creep.memory.upgrading === 'undefined') {
//         creep.memory.upgrading = creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
//         creep.memory.sourceId = null;
//         creep.say(creep.memory.upgrading ? '⚡ 升级' : '🔄 收取');
//     }


//     // 升级阶段
//     if (creep.memory.upgrading) {
//       if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
//         creep.moveTo(controller, {
//           visualizePathStyle: { stroke: '#66ccff' }, // 使用浅蓝色表示去升级的路径
//           reusePath: 10
//         });
//       }
//     }
//     else { // 采集阶段
//       let targetSource = Game.getObjectById(creep.memory.sourceId);

//       // 如果没有缓存的目标，或者缓存的目标无效/没能量了，则重新查找
//       if (!targetSource || 
//           (targetSource.store && targetSource.store[RESOURCE_ENERGY] === 0) ||
//           (targetSource.energy !== undefined && targetSource.energy === 0)) { // 检查 source 的能量
          
//           creep.memory.sourceId = null; // 清除无效的 sourceId

//           // 1. 优先从定义的 "receive" Link 获取能量
//           if (Linkconfig && Linkconfig[room.name] && Linkconfig[room.name].receive) {
//             const receiveLinkId = Linkconfig[room.name].receive;
//             const receiveLink = Game.getObjectById(receiveLinkId);
//             if (receiveLink && receiveLink.store[RESOURCE_ENERGY] > 0) {
//               targetSource = receiveLink;
//               creep.memory.sourceId = targetSource.id;
//             }
//           }

//           // 2. 如果 Link 没有能量或不存在，则从 Controller 附近的 Container 获取能量
//           if (!targetSource) {
//             const containerIds = controllerContainerScan.get(room) || [];
//             const containers = containerIds
//               .map(id => Game.getObjectById(id))
//               .filter(c => c && c.store[RESOURCE_ENERGY] > 50); // 确保容器中至少有少量能量

//             if (containers.length > 0) {
//               // 可以选择最近的，或者第一个（通常 controllerContainerScan 返回的已经是排序过的）
//               targetSource = creep.pos.findClosestByPath(containers) || containers[0]; 
//               if(targetSource) creep.memory.sourceId = targetSource.id;
//             }
//           }
      
//           // 3. 如果 Link 和 Container 都没有能量，则直接采集 Source
//           if (!targetSource) {
//             const sources = room.find(FIND_SOURCES_ACTIVE); // 只采集活跃的 Source
//             if (sources.length > 0) {
//               // 可以选择最近的 Source，或者按顺序选择
//               targetSource = creep.pos.findClosestByPath(sources) || sources[0]; 
//               if(targetSource) creep.memory.sourceId = targetSource.id;
//             }
//           }
//       }

//       // 如果找到了采集目标
//       if (targetSource) {
//         let actionResult;
//         if (targetSource instanceof Source) { // 如果是 Source
//           actionResult = creep.harvest(targetSource);
//         } else { // 如果是 Link 或 Container
//           actionResult = creep.withdraw(targetSource, RESOURCE_ENERGY);
//         }

//         if (actionResult === ERR_NOT_IN_RANGE) {
//           creep.moveTo(targetSource, {
//             visualizePathStyle: { stroke: '#ffaa00' }, // 黄色路径表示去采集
//             reusePath: 10
//           });
//         } else if (actionResult !== OK && actionResult !== ERR_BUSY) { 
//             // 如果发生其他错误 (例如目标空了，但上面已经检查过，这里主要是为了捕获其他意外)
//             creep.memory.sourceId = null; // 清除目标，下一 tick 重新寻找
//         }
//       } else {
//         creep.say('🤷 无能量'); // 如果找不到任何能量源
//       }
//     }
//   }
// };

// module.exports = roleUpgrader;
