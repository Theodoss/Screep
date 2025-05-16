const containerManager = require('containerMgr');

const CONTAINER_FULL_THRESHOLD = 0.9;  // 容器满载阈值
const LIFETIME_THRESHOLD = 1;  // 生命临界值，提前几个tick释放绑定

const roleMiner = {
    /** @param {Creep} creep **/
    run(creep) {
        try {
            // 检查生命周期，提前释放绑定
            if (creep.ticksToLive <= LIFETIME_THRESHOLD) {
                if (creep.memory.containerId) {
                    containerManager.releaseMiner(creep.room, creep.name);
                    delete creep.memory.containerId;
                    creep.say('🕯️ 告别');
                }
                return;
            }

            const room = creep.room;

            // 1. 获取或分配 container
            if (!creep.memory.containerId) {
                const container = containerManager.assignMiner(room, creep.name);
                if (container) {
                    creep.memory.containerId = container.id;
                    creep.say('⛏️ 分配');
                } else {
                    creep.say('⚠️ 等待');
                    return; // 暂无空闲 container
                }
            }

            // 获取对象
            const container = Game.getObjectById(creep.memory.containerId);
            if (!container) {
                this._handleInvalidContainer(creep);
                return;
            }

            const entry = room.memory.containerData[container.id];
            const source = Game.getObjectById(entry.source);
            if (!source) {
                this._handleInvalidSource(creep);
                return;
            }

            // 2. 前往 container 位置并执行采矿
            if (!creep.pos.isEqualTo(container.pos)) {
                this._moveToContainer(creep, container);
            } else {
                // 3. 检查并处理 container 状态
                const containerStatus = this._checkContainerStatus(container);
                if (containerStatus.isFull) {
                    creep.say('📦 已满');
                    return;
                }

                // 4. 执行采矿
                if (!source.energy) {
                    return;  // 等待能量源重生
                }

                const result = creep.harvest(source);
                if (result === OK) {
                    if (Game.time % 5 === 0) creep.say('⛏️');
                } else if (result !== ERR_NOT_ENOUGH_RESOURCES) {
                    creep.say(`⚠️ ${result}`);
                }
            }
        } catch (error) {
            console.log(`Error in roleMiner.run for ${creep.name}: ${error.message}`);
            creep.say('❌ 错误');
        }
    },

    /** 处理无效容器 */
    _handleInvalidContainer(creep) {
        containerManager.releaseMiner(creep.room, creep.name);
        delete creep.memory.containerId;
        creep.say('❌ 无效');
    },

    /** 处理无效能量源 */
    _handleInvalidSource(creep) {
        containerManager.releaseMiner(creep.room, creep.name);
        delete creep.memory.containerId;
        creep.say('❌ 无源');
    },

    /** 移动到容器位置 */
    _moveToContainer(creep, container) {
        creep.moveTo(container.pos, {
            visualizePathStyle: {
                stroke: '#ffaa00',
                opacity: 0.3,
                lineStyle: 'dashed'
            },
            reusePath: 5
        });
    },

    /** 检查容器状态 */
    _checkContainerStatus(container) {
        const energy = container.store.getUsedCapacity(RESOURCE_ENERGY);
        const capacity = container.store.getCapacity(RESOURCE_ENERGY);
        return {
            energy,
            capacity,
            freeSpace: container.store.getFreeCapacity(RESOURCE_ENERGY),
            isFull: energy >= capacity * CONTAINER_FULL_THRESHOLD,
            progress: Math.floor((energy / capacity) * 10)
        };
    }
};

module.exports = roleMiner;