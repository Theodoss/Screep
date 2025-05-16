// containerMgr.js
// 全局管理靠近 source 的 containers，并分配给矿工
const containerManager = {
    scanInterval: 10,

    /** 每 scanInterval 扫描一次，更新房间 containerData */
    run(room) {
        if (!room.memory.containerData) room.memory.containerData = {};
        if (!room.memory._lastContainerScan || Game.time - room.memory._lastContainerScan >= this.scanInterval) {
            room.memory._lastContainerScan = Game.time;
            const sources = room.find(FIND_SOURCES);
            const containers = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                             sources.some(src => s.pos.inRangeTo(src, 1))
            });

            // 保留之前的 miner 分配，并绑定对应 source
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