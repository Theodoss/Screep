// @ts-nocheck
/**
 * memory_restore.js
 * 
 * 内存备份和恢复系统，用于防止内存丢失
 * 会定期备份关键内存数据，并在检测到内存丢失时恢复
 */

const spawnManager = require('spawnManager');
const containerManager = require('containerMgr');

// 上次备份的时间
if (!Memory._lastBackupTime) {
    Memory._lastBackupTime = 0;
}

// 备份间隔（ticks）
const BACKUP_INTERVAL = 1000;

// 备份存储空间
if (!Memory._memoryBackup) {
    Memory._memoryBackup = {
        creeps: {},
        roles: {},
        timestamp: 0
    };
}

/**
 * 创建内存备份
 */
function createBackup() {
    if (Game.time - Memory._lastBackupTime < BACKUP_INTERVAL) {
        return; // 未到备份时间
    }

    console.log('📦 创建内存备份...');
    
    // 备份creep内存
    const creepsBackup = {};
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        creepsBackup[name] = {
            role: creep.memory.role,
            working: creep.memory.working,
            targetId: creep.memory.targetId,
            sourceId: creep.memory.sourceId,
            state: creep.memory.state,
            targetIndex: creep.memory.targetIndex,
            targetWallIndex: creep.memory.targetWallIndex
        };
    }
    
    // 备份角色统计数据
    const roleStats = {};
    const roles = [
        'harvester', 'miner', 'carrier', 'upgrader', 
        'builder', 'repairer', 'ldminer', 'scout', 'selfwdis'
    ];
    
    // 计算每种角色的creep数量
    for (const role of roles) {
        roleStats[role] = _.filter(Game.creeps, c => c.memory.role === role).length;
    }
    
    // 保存备份
    Memory._memoryBackup = {
        creeps: creepsBackup,
        roles: roleStats,
        timestamp: Game.time
    };
    
    Memory._lastBackupTime = Game.time;
    console.log(`📦 内存备份完成 (Game.time: ${Game.time})`);
}

/**
 * 检查单个creep的内存是否丢失
 * @param {Creep} creep 要检查的creep
 * @returns {boolean} 是否丢失
 */
function isCreepMemoryLost(creep) {
    // 检查Memory.creeps是否存在
    if (!Memory.creeps) {
        return true;
    }
    
    // 检查这个creep的memory是否存在
    if (!Memory.creeps[creep.name]) {
        return true;
    }
    
    // 检查是否有role属性
    if (Memory.creeps[creep.name].role === undefined) {
        return true;
    }
    
    return false;
}

/**
 * 检查是否需要初始化Memory结构
 * @returns {boolean} 是否需要初始化
 */
function needsMemoryStructureInit() {
    return !Memory.creeps || !Memory.rooms || !Memory.enemy || !Memory.minerStats;
}

/**
 * 恢复单个creep的内存
 * @param {Creep} creep 需要恢复内存的creep
 */
function restoreCreepMemory(creep) {
    if (!isCreepMemoryLost(creep)) {
        return; // 内存正常，不需要恢复
    }
    
    // 第一个检测到内存丢失的creep，初始化Memory结构并记录日志
    if (needsMemoryStructureInit()) {
        console.log('⚠️ 检测到内存丢失，正在恢复...');
        initializeMemoryStructures();
    }
    
    // 确保Memory.creeps存在
    if (!Memory.creeps) {
        Memory.creeps = {};
    }
    
    // 初始化当前creep的memory
    if (!Memory.creeps[creep.name]) {
        Memory.creeps[creep.name] = {};
    }
    
    // 尝试从备份恢复
    if (Memory._memoryBackup && Memory._memoryBackup.timestamp > 0 && Memory._memoryBackup.creeps[creep.name]) {
        Memory.creeps[creep.name] = Memory._memoryBackup.creeps[creep.name];
        console.log(`🔄 已恢复 ${creep.name} 的内存数据`);
    } else {
        // 如果没有备份，尝试从名称猜测角色
        guessCreepRole(creep);
    }
}

/**
 * 从creep的名称猜测其角色
 * @param {Creep} creep 要猜测角色的creep
 */
function guessCreepRole(creep) {
    const name = creep.name;
    if (!Memory.creeps[name]) {
        Memory.creeps[name] = {};
    }
    
    // 初始化基本状态
    Memory.creeps[name].working = false;
    
    // 根据名称猜测角色
    if (name.includes('harvester')) {
        Memory.creeps[name].role = 'harvester';
    } else if (name.includes('miner')) {
        Memory.creeps[name].role = 'miner';
    } else if (name.includes('carrier')) {
        Memory.creeps[name].role = 'carrier';
    } else if (name.includes('upgrader')) {
        Memory.creeps[name].role = 'upgrader';
    } else if (name.includes('builder')) {
        Memory.creeps[name].role = 'builder';
    } else if (name.includes('repair')) {
        Memory.creeps[name].role = 'repairer';
    } else if (name.includes('ldminer')) {
        Memory.creeps[name].role = 'ldminer';
    } else if (name.includes('scout')) {
        Memory.creeps[name].role = 'scout';
    } else if (name.includes('selfwdis')) {
        Memory.creeps[name].role = 'selfwdis';
    } else {
        // 查看creep的身体部件来猜测角色
        const workParts = creep.getActiveBodyparts(WORK);
        const carryParts = creep.getActiveBodyparts(CARRY);
        const moveParts = creep.getActiveBodyparts(MOVE);
        
        if (workParts >= 5 && moveParts <= 2) {
            Memory.creeps[name].role = 'miner';
        } else if (carryParts >= 6 && workParts === 0) {
            Memory.creeps[name].role = 'carrier';
        } else if (workParts >= 4 && carryParts <= 2) {
            Memory.creeps[name].role = 'upgrader';
        } else {
            Memory.creeps[name].role = 'harvester'; // 默认
        }
    }
    
    console.log(`🔍 根据名称为 ${name} 分配角色: ${Memory.creeps[name].role}`);
}

/**
 * 初始化必要的内存结构
 */
function initializeMemoryStructures() {
    // 初始化Memory中必需的对象
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.spawns) Memory.spawns = {};
    if (!Memory.flags) Memory.flags = {};
    if (!Memory.stats) Memory.stats = {};
    if (!Memory.enemy) Memory.enemy = { creeps: {}, lastCleanTime: Game.time };
    if (!Memory.containerManager) Memory.containerManager = { containers: [] };
    if (!Memory.minerStats) Memory.minerStats = { miners: {}, miningLocations: {} };
    if (!Memory.longdismine) Memory.longdismine = { count: 0 };
    
    console.log('🏗️ Memory结构初始化完成');
}

/**
 * 主函数，在main.js中每tick调用
 */
function run() {
    // 只执行备份，检测和恢复由main.js在creep循环中执行
    createBackup();
}

module.exports = {
    run,
    createBackup,
    restoreCreepMemory,
    isCreepMemoryLost,
    initializeMemoryStructures
}; 