// @ts-nocheck

// Memory 扩展
const Memory = global.Memory;

const behaver = require('behaver');
const MinerStats = require('creepStats');

const config = {
    homeRoom: 'W25N47',
    storageId: '68173618154309283cf96ead',
    targets: [
        { 
            roomName: 'W26N47', 
            rally: { x: 31, y: 20 }, 
            mineId: '5bbcab779099fc012e63392b',
            minerCount: 2  // 第一个矿点需要 2 个矿工
        },
        { 
            roomName: 'W26N47', 
            rally: { x: 21, y: 41 }, 
            mineId: '5bbcab779099fc012e63392d',
            minerCount: 1  // 第二个矿点需要 1 个矿工
        },
        { 
            roomName: 'W25N48', 
            rally: { x: 23, y: 17 }, 
            mineId: '5bbcab889099fc012e633b76',
            minerCount: 1  // 第三个矿点需要 2 个矿工
        }
    ]
};

/**
 * 计算所有远程矿点需要的总矿工数量
 * @returns {number} 总需求数量
 */
function getTotalMinerCount() {
    return config.targets.reduce((sum, target) => sum + (target.minerCount || 1), 0);
}

/**
 * 获取指定矿点的当前矿工数量
 * @param {number} targetIndex - 矿点索引
 * @returns {number} 当前矿工数量
 */
function getCurrentMinerCount(targetIndex) {
    let count = 0;
    for (let name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.memory.role === 'ldminer' && creep.memory.targetIndex === targetIndex) {
            count++;
        }
    }
    return count;
}

/**
 * 为矿工分配合适的矿点
 * @param {Creep} creep - 需要分配的矿工
 * @returns {number} 分配的矿点索引
 */
function assignMinerToTarget(creep) {
    // 如果已经分配了目标，且目标有效，继续使用当前目标
    if (creep.memory.targetIndex !== undefined && 
        creep.memory.targetIndex < config.targets.length) {
        const currentCount = getCurrentMinerCount(creep.memory.targetIndex);
        const target = config.targets[creep.memory.targetIndex];
        if (currentCount <= target.minerCount) {
            return creep.memory.targetIndex;
        }
    }

    // 寻找人数未满的矿点
    for (let i = 0; i < config.targets.length; i++) {
        const currentCount = getCurrentMinerCount(i);
        const target = config.targets[i];
        if (currentCount < target.minerCount) {
            console.log(`分配矿工 ${creep.name} 到矿点 ${i} (${target.roomName} ${target.rally.x},${target.rally.y})`);
            return i;
        }
    }

    // 如果所有矿点都已满，返回循环分配的位置
    const totalMiners = _.filter(Game.creeps, c => c.memory.role === 'ldminer').length;
    const targetIdx = totalMiners % config.targets.length;
    console.log(`所有矿点都已满，将矿工 ${creep.name} 分配到矿点 ${targetIdx}`);
    return targetIdx;
}

/**
 * 运行矿工逻辑
 * @param {Creep} creep - 需要运行的矿工
 */
function run(creep) {
    // 初始化 target 索引與狀態機
    if (creep.memory.targetIndex == null) {
        creep.memory.targetIndex = assignMinerToTarget(creep);
    }
    if (!creep.memory.state) creep.memory.state = 'rally';

    const idx = creep.memory.targetIndex;
    if (idx >= config.targets.length) {
        creep.memory.targetIndex = 0;
        creep.say('Idle');
        return;
    }

    const tc = config.targets[idx];
    const mine = Game.getObjectById(tc.mineId);
    const storage = Game.getObjectById(config.storageId);
    const moveOpts = { 
        reusePath: 20,
        visualizePathStyle: { 
            stroke: '#ff0000',
            opacity: 0.3,
            lineStyle: 'dashed'
        }
    };

    // 更新统计信息
    if (mine) {  // 确保矿点存在
        MinerStats.update(creep, mine.pos);
    }

    // 检查上一个tick的能量变化
    if (creep.memory.lastEnergy !== undefined) {
        const energyDelta = creep.store.getUsedCapacity(RESOURCE_ENERGY) - creep.memory.lastEnergy;
        if (energyDelta > 0 && creep.memory.state === 'mineing') {
            // 采矿获得能量
            if (!creep.memory.minerStats) creep.memory.minerStats = {};
            creep.memory.minerStats.currentCycleEnergy = (creep.memory.minerStats.currentCycleEnergy || 0) + energyDelta;
        }
    }
    // 记录当前能量用于下一个tick比较
    creep.memory.lastEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);

    switch (creep.memory.state) {
        case 'rally': {
            if (behaver.tryPickupNearbyEnergy(creep, 2)) break;

            const rallyPos = new RoomPosition(tc.rally.x, tc.rally.y, tc.roomName);
            if (creep.room.name !== tc.roomName || !creep.pos.isEqualTo(rallyPos)) {
                creep.moveTo(rallyPos, moveOpts);
            } else {
                creep.memory.state = 'mineing';
            }
            break;
        }

        case 'mineing': {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.state = 'deliver';
                creep.memory.delivering = true;
                break;
            }

            if (creep.harvest(mine) === ERR_NOT_IN_RANGE) {
                creep.moveTo(mine, moveOpts);
            }
            break;
        }

        case 'deliver': {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                // 完成一个周期，更新统计
                if (creep.memory.minerStats && creep.memory.minerStats.currentCycleEnergy) {
                    if (!Memory.minerStats) Memory.minerStats = { miners: {} };
                    if (!Memory.minerStats.miners[creep.name]) Memory.minerStats.miners[creep.name] = { totalEnergyDelivered: 0 };
                    Memory.minerStats.miners[creep.name].totalEnergyDelivered += creep.memory.minerStats.currentCycleEnergy;
                    creep.memory.minerStats.currentCycleEnergy = 0;
                }
                
                creep.memory.delivering = false;
                creep.memory.state = creep.room.name !== config.homeRoom ? 'mineing' : 'rally';
                break;
            }

            // 優先修附近道路
            const roads = creep.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: s => s.structureType === STRUCTURE_ROAD && s.hits < 3500
            });
            if (roads.length > 0) {
                if (creep.repair(roads[0]) === OK) {
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
                    creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                } else {
                    creep.moveTo(sites[0], moveOpts);
                }
                return;
            }

            // 最後送回 storage
            if (storage && creep.store[RESOURCE_ENERGY] > 0) {
                if (creep.transfer(storage, RESOURCE_ENERGY) === OK) {
                    creep.memory.energyBeforeAction = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                } else {
                    creep.moveTo(storage, moveOpts);
                }
            }
            break;
        }
    }
}

module.exports = {
    run,
    getTotalMinerCount,
    config
};
