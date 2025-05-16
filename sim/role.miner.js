const containerManager = require('containerMgr');

const roleMiner = {
    /** @param {Creep} creep **/
    run(creep) {
        const room = creep.room;

        // 1. 获取或分配 container
        if (!creep.memory.containerId) {
            const container = containerManager.assignMiner(room, creep.name);
            if (container) {
                creep.memory.containerId = container.id;
            } else {
                return; // 暂无空闲 container
            }
        }

        const container = Game.getObjectById(creep.memory.containerId);
        if (!container) {
            // 容器失效，释放并清除记忆
            containerManager.releaseMiner(room, creep.name);
            delete creep.memory.containerId;
            return;
        }

        // 2. 绑定容器的 source
        const entry = room.memory.containerData[container.id];
        const source = entry && Game.getObjectById(entry.source);
        if (!source) {
            // 找不到 source，则释放并清除记忆
            containerManager.releaseMiner(room, creep.name);
            delete creep.memory.containerId;
            return;
        }

        // 3. 如果容器能量超过阈值，则原地停止等待，不移动
        if (container.store.getUsedCapacity(RESOURCE_ENERGY) >= 2000) {
            return;
        }

        // 4. 前往 container 位置
        if (!creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // 5. 在 container 上方执行采矿
        const res = creep.harvest(source);
        if (res === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }
};

module.exports = roleMiner;