/**
 * spawnScheduler.js
 * 提供在控制台手动排程生产指定数量的不同角色 creep 的功能
 * 支持根据房间最大能量容量动态设计 body 配置
 * 用法（在控制台执行）：
 * const ss = require('spawnScheduler');
 * ss.schedule('attacker', 3);     // 排程生产 3 个 attacker
 * ss.schedule('ranger', 2);       // 排程生产 2 个 ranger
 * ss.clear();                     // 清空所有排程
 * 在主循环里调用：
 * const ss = require('spawnScheduler');
 * ss.run();                       // 自动根据排程生成 creeps
 */

// 定義各身體部件的成本，使程式碼更易於維護
const COST_TOUGH = 10;
const COST_ATTACK = 80;
const COST_RANGED_ATTACK = 150;
const COST_HEAL = 250;
const COST_MOVE = 50;
const COST_CARRY = 50;
const COST_WORK = 100;

// 固定 body 配置
// ss.schedule('scout', 1, 'tougher');
const fixedBodyConfigs = {
    scout: {
        basic: [MOVE],  // 基础配置：1个MOVE
        tough: [TOUGH, TOUGH, TOUGH, MOVE],  // 带 TOUGH 的配置
        tougher: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE]  // 更多 TOUGH 的配置
    }
};

/**
 * 根据角色和房间能量容量生成 body 数组。
 * @param {string} role - 'attacker' | 'ranger' | 'healer' | 'scout' | 其他
 * @param {number} capacity - 房间最大能量
 * @param {string} [variant] - 对于特定角色的变体配置，如 'tough' 表示带 TOUGH 的 scout
 * @returns {BodyPartConstant[]} body
 */
function generateBody(role, capacity, variant = 'basic') {
    // 如果是 scout 且有固定配置，直接返回对应配置
    if (role === 'scout' && fixedBodyConfigs.scout[variant]) {
        return fixedBodyConfigs.scout[variant];
    }

    const body = [];
    let remainingCapacity = capacity;

    // 根據角色設定部件順序
    const partOrder = [];
    if (role === 'attacker') partOrder.push(TOUGH, ATTACK, MOVE);
    else if (role === 'ranger') partOrder.push(RANGED_ATTACK, MOVE);
    else if (role === 'healer') partOrder.push(HEAL, MOVE);
    else partOrder.push(WORK, CARRY, MOVE);

    // 盡可能添加部件
    while (remainingCapacity >= Math.min(...partOrder.map(part => {
        switch (part) {
            case TOUGH: return COST_TOUGH;
            case ATTACK: return COST_ATTACK;
            case RANGED_ATTACK: return COST_RANGED_ATTACK;
            case HEAL: return COST_HEAL;
            case MOVE: return COST_MOVE;
            case CARRY: return COST_CARRY;
            case WORK: return COST_WORK;
            default: return Infinity;
        }
    }))) {
        for (const part of partOrder) {
            let partCost;
            switch (part) {
                case TOUGH: partCost = COST_TOUGH; break;
                case ATTACK: partCost = COST_ATTACK; break;
                case RANGED_ATTACK: partCost = COST_RANGED_ATTACK; break;
                case HEAL: partCost = COST_HEAL; break;
                case MOVE: partCost = COST_MOVE; break;
                case CARRY: partCost = COST_CARRY; break;
                case WORK: partCost = COST_WORK; break;
            }
            if (remainingCapacity >= partCost) {
                body.push(part);
                remainingCapacity -= partCost;
            }
        }
    }

    // 確保至少有一個 MOVE 部件，除非能量極度不足
    if (body.filter(part => part === MOVE).length === 0 && capacity >= COST_MOVE) {
        body.push(MOVE);
    }

    return body;
}

const spawnScheduler = {
    /**
     * 排程生产指定数量的特定角色 creep
     * @param {string} role - creep 的角色
     * @param {number} count - 要生产的数量
     * @param {string} [variant] - 特定角色的变体配置（如 'tough' 表示带 TOUGH 的 scout）
     */
    schedule(role, count, variant = 'basic') {
        if (!Memory.spawnQueue) Memory.spawnQueue = [];
        Memory.spawnQueue.push({ role, count, priority: 0, variant }); // 加入變體配置
        console.log(`Scheduled spawn: ${count} x ${role}${variant !== 'basic' ? ` (${variant})` : ''}`);
    },

    clear() {
        delete Memory.spawnQueue;
        console.log('Spawn queue cleared');
    },

    run() {
        if (!Memory.spawnQueue || Memory.spawnQueue.length === 0) return;

        // 使用迴圈處理所有 spawn
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            if (spawn.spawning) continue;

            // 找到最高優先級的任務
            const task = Memory.spawnQueue.filter(t => t.count > 0).sort((a, b) => b.priority - a.priority)[0];
            if (!task) continue;

            const capacity = spawn.room.energyCapacityAvailable;
            const body = generateBody(task.role, capacity, task.variant);
            const name = `${task.role}_${Game.time}`;
            const result = spawn.spawnCreep(body, name, { memory: { role: task.role } });
            if (result === OK) {
                task.count -= 1;
                console.log(`Spawning ${task.role}: ${name}, remaining ${task.count}`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`Not enough energy to spawn ${task.role} at ${spawn.name}`);
            } else {
                console.error(`Error spawning ${task.role} at ${spawn.name}: ${result}`);
                task.count -= 1;
            }
        }
        // 清除已完成的任務
        Memory.spawnQueue = Memory.spawnQueue.filter(t => t.count > 0);
    },

    setPriority(role, priority) {
        if (!Memory.spawnQueue) return;
        const task = Memory.spawnQueue.find(t => t.role === role);
        if (task) {
            task.priority = priority;
            console.log(`Priority of ${role} set to ${priority}`);
        } else {
            console.log(`Role ${role} not found in spawn queue`);
        }
    }
};

// 导出 spawnScheduler
module.exports = { spawnScheduler, generateBody };

// 提供简写
if (typeof global.ss === 'undefined') global.ss = spawnScheduler;
