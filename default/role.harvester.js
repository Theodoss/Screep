// roleHarvester.js
/**
 * 增强型 Harvester 角色:
 * - 优先拾取掉落的能量、墓碑和废墟。
 * - 从较满的容器中提取能量。
 * - 使用简单的任务分配系统以避免对拾取物/容器的重复工作。
 * - 在采集能量源之前，会先从 Storage 中提取。
 * - 按优先级运送能量: Spawn/Extension -> Tower -> Transfer Link -> Storage。
 * - 确保当其他目标都满时，一定会将能量运送至Storage
 */

const containerManager = require('containerMgr'); // 保留您现有的 require
const { Linkconfig } = require('linkTransfer'); // 导入 Linkconfig 以查找 transfer link

const roleHarvester = {
    /** @param {Creep} creep **/
    run(creep) {
        const { room, pos } = creep;
        const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        const usedCap = creep.store.getUsedCapacity(RESOURCE_ENERGY);

        // 如果房间内存中 harvesterTasks 不存在，则初始化
        if (!room.memory.harvesterTasks) {
            room.memory.harvesterTasks = {}; // 存储任务分配者: { taskId: creepId }
        }
        // 简单清理已死亡分配者或目标已消失的任务
        if (Game.time % 10 === 0) { // 定期运行清理
            this._cleanupTasks(room);
        }

        // 决定当前状态: 运送能量或获取能量
        if (creep.memory.delivering && usedCap === 0) {
            creep.memory.delivering = false;
            this._unassignCurrentTask(creep); // 开始获取能量时取消分配任务
            creep.say('🔄');
        } else if (!creep.memory.delivering && freeCap === 0) {
            creep.memory.delivering = true;
            creep.say('🚚');
        } else if (creep.memory.delivering === undefined) {
            creep.memory.delivering = usedCap > 0; // 如果生成时带有能量，则首先运送
        }

        const moveOpts = { reusePath: 5, visualizePathStyle: { stroke: '#ffffff', opacity: 0.5 } };

        if (!creep.memory.delivering) {
            // --- 获取能量 ---
            let currentTaskTargetId = creep.memory.assignedTaskId;
            let currentTaskTarget = currentTaskTargetId ? Game.getObjectById(currentTaskTargetId) : null;

            // 验证当前任务
            if (currentTaskTarget) {
                const taskType = creep.memory.assignedTaskType;
                let taskStillValid = true;
                if (taskType === 'dropped' && (!currentTaskTarget || currentTaskTarget.amount < 10))
                    taskStillValid = false;
                else if ((taskType === 'tombstone' || taskType === 'ruin') &&
                    (!currentTaskTarget || currentTaskTarget.store.getUsedCapacity(RESOURCE_ENERGY) < 10))
                    taskStillValid = false;
                else if (taskType === 'container' &&
                    (!currentTaskTarget || currentTaskTarget.store.getUsedCapacity(RESOURCE_ENERGY) < Math.min(50, freeCap)))
                    taskStillValid = false;

                if (!taskStillValid) {
                    this._unassignCurrentTask(creep, currentTaskTargetId);
                    currentTaskTarget = null;
                }
            }


            // 如果有有效的已分配任务，则执行它
            if (currentTaskTarget) {
                creep.say(`🎯 ${creep.memory.assignedTaskType[0]}`);
                const taskType = creep.memory.assignedTaskType;
                let actionResult;
                if (taskType === 'dropped') {
                    actionResult = creep.pickup(currentTaskTarget);
                } else if (taskType === 'tombstone' || taskType === 'ruin' || taskType === 'container') {
                    actionResult = creep.withdraw(currentTaskTarget, RESOURCE_ENERGY);
                }

                if (actionResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(currentTaskTarget, moveOpts);
                } else if (actionResult === OK && (taskType === 'dropped' || taskType === 'tombstone' || taskType === 'ruin')) {
                    if ((currentTaskTarget.amount && currentTaskTarget.amount <= creep.store.getFreeCapacity()) ||
                        (currentTaskTarget.store && currentTaskTarget.store.getUsedCapacity(RESOURCE_ENERGY) <= creep.store.getFreeCapacity())) {
                        this._unassignCurrentTask(creep, currentTaskTarget.id);
                    }
                }
                return; // 专注于当前任务
            }

            // 如果当前未分配任务或任务变得无效，则尝试查找新任务
            // 1. 拾取掉落的资源、墓碑或废墟
            if (this._findAndAssignDynamicPickup(creep)) return;

            // 2. 从容器中提取能量
            if (this._findAndAssignContainer(creep)) return;

            // 3. 从 Storage 中提取能量
            if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.say('🏦 Storage');
                if (creep.withdraw(room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(room.storage, { ...moveOpts, reusePath: 10 });
                }
                return;
            }

            // 4. 备用方案: 从能量源采集
            creep.say('⛏️ Src');
            const source = pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { ...moveOpts, reusePath: 10 });
                }
            }
        } else {
            // --- 运送能量 ---
            let deliveryTarget = null;
            let deliveryTargetType = ''; // 用于日志记录/说话
            
            // 检查storage是否存在，用于之后的判断
            const hasStorage = room.storage && room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

            // 优先级 1: Spawn 和 Extension
            deliveryTarget = pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (deliveryTarget) deliveryTargetType = 'Spawn/Ext';


            // 优先级 2: Tower
            if (!deliveryTarget) {
                deliveryTarget = pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TOWER &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY) * 0.5 &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 200
                });
                if (deliveryTarget) deliveryTargetType = 'Tower';
            }

            // 优先级 3: Transfer Link (指定用于发送能量的 Link)
            if (!deliveryTarget && Linkconfig && Linkconfig[room.name] && Linkconfig[room.name].transfer) {
                const transferLinkId = Linkconfig[room.name].transfer;
                const link = Game.getObjectById(transferLinkId);
                if (link && link.structureType === STRUCTURE_LINK && link.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    deliveryTarget = link;
                    deliveryTargetType = 'Link';
                }
            }

            // 优先级 4: Storage (始终检查，确保能量可以送到storage)
            if (!deliveryTarget && hasStorage) {
                deliveryTarget = room.storage;
                deliveryTargetType = 'Storage';
            }

            if (deliveryTarget) {
                creep.say(`🚚 ${deliveryTargetType}`);
                const transferResult = creep.transfer(deliveryTarget, RESOURCE_ENERGY);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(deliveryTarget, moveOpts);
                }
            } else {
                // 如果没有可用的目标，检查是否有storage
                if (hasStorage) {
                    // 确保再次尝试送到storage，可能前面因为路径问题找不到
                    creep.say('🚚 Storage');
                    const transferResult = creep.transfer(room.storage, RESOURCE_ENERGY);
                    if (transferResult === ERR_NOT_IN_RANGE) {
                        creep.moveTo(room.storage, moveOpts);
                    }
                } else {
                    creep.say('🚚 空闲');
                    // 找不到送能量的目标，且没有storage，移动到闲置旗帜
                    const flag = Game.flags[creep.room.name + '_Idle'];
                    if (flag) {
                        creep.moveTo(flag, { ...moveOpts, range: 1 });
                    } else {
                        // 没有闲置旗帜，考虑移动到固定位置或房间中心
                        // 尝试寻找一个中心点，比如控制器
                        if (room.controller) {
                            creep.moveTo(new RoomPosition(25, 25, room.name), { range: 5 });
                        }
                    }
                }
            }
        }
    },

    /**
     * 查找并分配拾取掉落资源、墓碑或废墟的任务。
     * @param {Creep} creep
     * @returns {boolean} 如果已分配任务并启动操作，则返回 true，否则返回 false。
     */
    _findAndAssignDynamicPickup(creep) {
        const { room, pos } = creep;
        const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        if (freeCap === 0) return false;

        const taskTypePriorities = [
            {
                type: 'dropped',
                findConstant: FIND_DROPPED_RESOURCES,
                resourceCheck: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > Math.min(20, freeCap)
            },
            {
                type: 'tombstone',
                findConstant: FIND_TOMBSTONES,
                resourceCheck: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > Math.min(20, freeCap)
            },
            {
                type: 'ruin',
                findConstant: FIND_RUINS,
                resourceCheck: (r) => r.store.getUsedCapacity(RESOURCE_ENERGY) > Math.min(20, freeCap)
            }
        ];

        for (const taskInfo of taskTypePriorities) {
            const targets = room.find(taskInfo.findConstant, { filter: taskInfo.resourceCheck });

            if (targets.length > 0) {
                targets.sort((a, b) => {
                    const amountA = taskInfo.type === 'dropped' ? a.amount : a.store.getUsedCapacity(RESOURCE_ENERGY);
                    const amountB = taskInfo.type === 'dropped' ? b.amount : b.store.getUsedCapacity(RESOURCE_ENERGY);
                    if (amountB !== amountA) return amountB - amountA;
                    return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
                });

                for (const target of targets) {
                    if (!room.memory.harvesterTasks[target.id]) {
                        this._assignTask(creep, target.id, taskInfo.type);
                        creep.say(`🎯 ${taskInfo.type[0]}`);
                        let actionResult;
                        if (taskInfo.type === 'dropped') {
                            actionResult = creep.pickup(target);
                        } else {
                            actionResult = creep.withdraw(target, RESOURCE_ENERGY);
                        }
                        if (actionResult === ERR_NOT_IN_RANGE) {
                            creep.moveTo(target, { reusePath: 3, visualizePathStyle: { stroke: '#ffff00', opacity: 0.7 } });
                        }
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * 查找并分配从容器中提取能量的任务。
     * @param {Creep} creep
     * @returns {boolean} 如果已分配任务并启动操作，则返回 true，否则返回 false。
     */
    _findAndAssignContainer(creep) {
        const { room, pos } = creep;
        const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        if (freeCap === 0) return false;

        let potentialContainers = [];
        try {
            if (containerManager && typeof containerManager.getContainers === 'function') {
                const registeredContainerIds = containerManager.getContainers(room) || [];
                registeredContainerIds.forEach(id => {
                    const cont = Game.getObjectById(id);
                    // Harvester 应该从能装满它或有大量能量的容器中提取
                    if (cont && cont.structureType === STRUCTURE_CONTAINER && cont.store.getUsedCapacity(RESOURCE_ENERGY) >= Math.min(freeCap, 200)) {
                        potentialContainers.push(cont);
                    }
                });
            }
        } catch (e) { console.log(`访问 containerManager 时出错: ${e}`); }
     
        // 不再需要备用查找非注册容器的逻辑
        // if (potentialContainers.length === 0) { 
        // ... (移除的备用逻辑) ...
        // }

        if (potentialContainers.length > 0) {
            potentialContainers.sort((a, b) => {
                const amountDiff = b.store.getUsedCapacity(RESOURCE_ENERGY) - a.store.getUsedCapacity(RESOURCE_ENERGY);
                if (amountDiff !== 0) return amountDiff;
                return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
            });

            for (const container of potentialContainers) {
                if (!room.memory.harvesterTasks[container.id]) {
                    this._assignTask(creep, container.id, 'container');
                    creep.say('📦 Cont');
                    if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, { reusePath: 3, visualizePathStyle: { stroke: '#00ff00', opacity: 0.7 } });
                    }
                    return true;
                }
            }
        }
        return false;
    },

    /** 将任务分配给 creep 并在房间内存中记录。 */
    _assignTask(creep, targetId, taskType) {
        creep.memory.assignedTaskId = targetId;
        creep.memory.assignedTaskType = taskType;
        if (!creep.room.memory.harvesterTasks) creep.room.memory.harvesterTasks = {};
        creep.room.memory.harvesterTasks[targetId] = creep.id; // 将任务标记为此 creep 已接取
    },

    /** 取消分配 creep 的当前任务。 */
    _unassignCurrentTask(creep, specificTaskId = null) {
        const taskIdToUnassign = specificTaskId || creep.memory.assignedTaskId;
        if (taskIdToUnassign && creep.room.memory.harvesterTasks && creep.room.memory.harvesterTasks[taskIdToUnassign] === creep.id) {
            delete creep.room.memory.harvesterTasks[taskIdToUnassign];
        }
        delete creep.memory.assignedTaskId;
        delete creep.memory.assignedTaskType;
    },

    /** 简单清理房间内存中过时的任务。 */
    _cleanupTasks(room) {
        if (!room.memory.harvesterTasks) return;
        for (const taskId in room.memory.harvesterTasks) {
            const assigneeId = room.memory.harvesterTasks[taskId];
            const target = Game.getObjectById(taskId);
            const assignee = Game.creeps[assigneeId];

            if (!assignee || !target || // 分配者或目标不再存在
                (target.amount === 0) || // 掉落的资源已空
                (target.store && target.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && target.structureType !== STRUCTURE_CONTAINER && target.structureType !== STRUCTURE_STORAGE) || // 墓碑/废墟已空 (允许 Storage 为 0)
                (target.structureType === STRUCTURE_CONTAINER && target.store.getUsedCapacity(RESOURCE_ENERGY) < 50) // 容器几乎为空
            ) {
                delete room.memory.harvesterTasks[taskId];
            }
        }
    }
};

module.exports = roleHarvester;
