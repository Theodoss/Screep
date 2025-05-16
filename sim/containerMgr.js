// containerMgr.js
const containerManager = {
    scanInterval: 10,

    /** 每 scanInterval 扫描一次，更新房间 containerData */
    run(room) {
        if (!room.memory.containerData) room.memory.containerData = {};
        if (Game.time %100 == 0) {
            room.memory._lastContainerScan = Game.time;
            const sources = room.find(FIND_SOURCES);
            const containers = room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    sources.some(src => s.pos.inRangeTo(src, 1))
            });

            const prevData = room.memory.containerData;
            const newData = {};
            containers.forEach(c => {
                const linkedSource = sources.find(src => c.pos.inRangeTo(src, 1));
                const prevEntry = prevData[c.id] || {};
                const assigned = (prevEntry.miner && Game.creeps[prevEntry.miner]) ? prevEntry.miner : null;
                newData[c.id] = { miner: assigned, source: linkedSource.id };
            });
            room.memory.containerData = newData;
        }
    },

    /** 返回所有注册容器的 ID 数组 */
    getContainers(room) {
        return room.memory.containerData
            ? Object.keys(room.memory.containerData)
            : [];
    },

    /** 分配一个空闲 container 给矿工，返回 Structure 对象或 null */
    assignMiner(room, minerName) {
        const data = room.memory.containerData || {};
        for (const id in data) {
            if (!data[id].miner) {
                data[id].miner = minerName;
                return Game.getObjectById(id);
            }
        }
        return null;
    },

    /** 释放矿工的分配（死亡或换矿点时调用） */
    releaseMiner(room, minerName) {
        const data = room.memory.containerData || {};
        for (const id in data) {
            if (data[id].miner === minerName) {
                data[id].miner = null;
            }
        }
    }
};

module.exports = containerManager;

// /**
//  * containerMgr.js
//  */
// const containerManager = {
//     scanInterval: 100, // 較長的掃描間隔，例如 100

//     /**
//      * 每 scanInterval 掃描一次，更新房間 containerData
//      */
//     run(room) {
//         if (!room.memory.containerData) {
//             room.memory.containerData = {};
//             room.memory.containerMinerCounts = {}; // 新增：用於追蹤每個 container 的礦工數量
//         }

//         if (Game.time % this.scanInterval === 0) {
//             room.memory._lastContainerScan = Game.time;
//             const sources = room.find(FIND_SOURCES);
//             const containers = room.find(FIND_STRUCTURES, {
//                 filter: s =>
//                     s.structureType === STRUCTURE_CONTAINER &&
//                     sources.some(src => s.pos.inRangeTo(src, 1))
//             });

//             const newData = {};
//             containers.forEach(c => {
//                 const linkedSource = sources.find(src => c.pos.inRangeTo(src, 1));
//                 const prevMiner = room.memory.containerData[c.id] ? room.memory.containerData[c.id].miner : null;
//                 newData[c.id] = { miner: prevMiner, source: linkedSource.id }; // 保留現有的 miner 分配
//             });
//             room.memory.containerData = newData;
//         }
//     },

//     /**
//      * 返回所有註冊容器的 ID 陣列
//      */
//     getContainers(room) {
//         return room.memory.containerData ? Object.keys(room.memory.containerData) : [];
//     },

//     /**
//       * 分配一個 container 給礦工，返回 Structure 對象或 null
//       * 現在會優先分配給礦工數量最少的 container
//       */
//     assignMiner(room, minerName) {
//         const data = room.memory.containerData || {};
//         const containerMinerCounts = room.memory.containerMinerCounts || {};
//         let minMinerCount = Infinity;
//         let targetContainerId = null;
//         let assignedContainerId = null;

//         // 找出是否有已經分配給該 miner 的 container
//         for (const id in data) {
//             if (data[id].miner === minerName) {
//                 assignedContainerId = id;
//                 return Game.getObjectById(assignedContainerId);
//             }
//         }

//         // 找出礦工數量最少的 container
//         for (const id in data) {
//             const container = Game.getObjectById(id);
//             if (!container) {
//                 continue; // 容器可能不存在，跳過
//             }
//             const minerCount = containerMinerCounts[id] || 0; // Get current miner count, default to 0
//             if (minerCount < minMinerCount) {
//                 minMinerCount = minerCount;
//                 targetContainerId = id;
//             }
//         }

//         if (targetContainerId) {
//             // Assign the miner to the container
//             data[targetContainerId].miner = minerName;
//             room.memory.containerData[targetContainerId].miner = minerName;  // 确保数据一致
//             // 更新 container 的礦工數量
//             if (!room.memory.containerMinerCounts[targetContainerId]) {
//                 room.memory.containerMinerCounts[targetContainerId] = 0;
//             }
//             room.memory.containerMinerCounts[targetContainerId]++;

//             return Game.getObjectById(targetContainerId);
//         }
//         return null;
//     },

//     /**
//      * 釋放礦工的分配（死亡或換礦點時調用）
//      */
//     releaseMiner(room, minerName) {
//         const data = room.memory.containerData || {};
//         for (const id in data) {
//             if (data[id].miner === minerName) {
//                 data[id].miner = null;
//                 // 更新 container 的礦工數量
//                 if (room.memory.containerMinerCounts && room.memory.containerMinerCounts[id]) {
//                     room.memory.containerMinerCounts[id]--;
//                     if (room.memory.containerMinerCounts[id] <= 0) {
//                         delete room.memory.containerMinerCounts[id]; // Clean up if count is 0
//                     }
//                 }
//             }
//         }
//     }
// };

// module.exports = containerManager;

