// containerMgr.js
const containerManager = {
    /** 运行容器管理器的主循环 */
    run(room) {
        try {
            // 扫描并更新容器数据
            this.scan(room);

            // 清理已死亡矿工的分配
            const data = room.memory.containerData || {};
            for (const id in data) {
                const container = data[id];
                if (container.miner && !Game.creeps[container.miner]) {
                    container.miner = null;
                    console.log(`Container ${id} 的矿工已死亡，释放分配`);
                }
            }
        } catch (error) {
            console.log(`Error in containerManager.run: ${error.message}`);
        }
    },

    /** 扫描房间内的 container 并更新数据 */
    scan(room) {
        if (!room.memory.containerData) {
            room.memory.containerData = {};
        }

        const sources = room.find(FIND_SOURCES);
        const containers = /** @type {StructureContainer[]} */ (room.find(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER &&
                sources.some(src => s.pos.inRangeTo(src, 1))
        }));

        // 清理已不存在的 container 数据
        for (const id in room.memory.containerData) {
            if (!containers.find(c => c.id === id)) {
                console.log(`Container ${id} 不再存在，清理数据`);
                delete room.memory.containerData[id];
            }
        }

        // 更新或添加新的 container 数据
        containers.forEach(c => {
            const linkedSource = sources.find(src => c.pos.inRangeTo(src, 1));
            if (!room.memory.containerData[c.id]) {
                room.memory.containerData[c.id] = {
                    miner: null,  // 当前分配的矿工名称
                    source: linkedSource.id,
                    lastAssignTime: Game.time,  // 记录分配时间
                    priority: this._calculatePriority(c, linkedSource)  // 容器优先级
                };
            } else if (!room.memory.containerData[c.id].miner) {
                // 只更新未分配矿工的容器优先级
                room.memory.containerData[c.id].source = linkedSource.id;
                room.memory.containerData[c.id].priority = this._calculatePriority(c, linkedSource);
            }
        });

        return containers.length;
    },

    /** 计算容器优先级 */
    _calculatePriority(container, source) {
        // 优先级基于：
        // 1. 能量源剩余能量
        // 2. 到 spawn 的距离
        // 3. 容器状态
        const spawns = container.room.find(FIND_MY_SPAWNS);
        if (!spawns.length) return 0;

        const distanceToSpawn = container.pos.getRangeTo(spawns[0]);
        const sourceEnergy = source.energy;
        const containerHealth = container.hits / container.hitsMax;

        return (sourceEnergy / 3000) * 0.4 +  // 能量权重 40%
               (1 - distanceToSpawn / 50) * 0.4 +  // 距离权重 40%
               containerHealth * 0.2;  // 容器健康度权重 20%
    },

    /** 返回所有注册容器的 ID 数组 */
    getContainers(room) {
        return room.memory.containerData
            ? Object.keys(room.memory.containerData)
            : [];
    },

    /**
     * 分配一个空闲的 container 给矿工
     * @param {Room} room - 房间对象
     * @param {string} minerName - 矿工名称
     * @returns {StructureContainer|null} 分配的 container 或 null
     */
    assignMiner(room, minerName) {
        try {
            // 新矿工出生时扫描一次
            this.scan(room);
            
            const data = room.memory.containerData || {};
            
            // 1. 检查矿工是否已有分配
            for (const id in data) {
                if (data[id].miner === minerName) {
                    const container = /** @type {StructureContainer|null} */ (Game.getObjectById(id));
                    return container;
                }
            }

            // 2. 按优先级排序并寻找空闲的 container
            const availableContainers = Object.entries(data)
                .filter(([_, info]) => !info.miner)
                .sort(([_, a], [__, b]) => b.priority - a.priority);

            for (const [id, info] of availableContainers) {
                const container = /** @type {StructureContainer|null} */ (Game.getObjectById(id));
                if (container) {
                    info.miner = minerName;
                    info.lastAssignTime = Game.time;
                    console.log(`分配矿工 ${minerName} 到 container ${id} (优先级: ${info.priority.toFixed(2)})`);
                    return container;
                }
            }

            return null;
        } catch (error) {
            console.log(`Error in assignMiner: ${error.message}`);
            return null;
        }
    },

    /** 释放矿工的分配 */
    releaseMiner(room, minerName) {
        try {
            const data = room.memory.containerData || {};
            for (const id in data) {
                if (data[id].miner === minerName) {
                    data[id].miner = null;
                    console.log(`释放矿工 ${minerName} 从 container ${id}`);
                }
            }
        } catch (error) {
            console.log(`Error in releaseMiner: ${error.message}`);
        }
    }
};

module.exports = containerManager;

