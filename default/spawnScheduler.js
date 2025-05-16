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

/**
 * 根据角色和房间能量容量生成 body 数组。
 * @param {string} role - 'attacker' | 'ranger' | 'healer' | 其他
 * @param {number} capacity - 房间最大能量
 * @returns {BodyPartConstant[]} body
 */
function generateBody(role, capacity) {
    const body = [];
    let remainingCapacity = capacity;

    // 根據角色設定部件順序
    const partOrder = [];
    if (role === 'attacker') partOrder.push(TOUGH, ATTACK, MOVE);
    else if (role === 'ranger') partOrder.push(RANGED_ATTACK, MOVE);
    else if (role === 'healer') partOrder.push(HEAL, MOVE);  // 加入 healer 的部件順序
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
            default: return Infinity; // 避免錯誤的部件導致無限迴圈
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

    // 重新排序 body 部件，HEAL 優先級高於 MOVE
    const toughParts = body.filter(part => part === TOUGH);
    const attackParts = body.filter(part => part === ATTACK);
    const rangedAttackParts = body.filter(part => part === RANGED_ATTACK);
    const healParts = body.filter(part => part === HEAL); // 確保 HEAL 被正確處理
    const moveParts = body.filter(part => part === MOVE);
    const carryParts = body.filter(part => part === CARRY);
    const workParts = body.filter(part => part === WORK);

    return [
        ...toughParts,
        ...attackParts,
        ...rangedAttackParts,
        ...healParts, // HEAL 放在 MOVE 前面
        ...moveParts,
        ...carryParts,
        ...workParts,
    ];
}

const spawnScheduler = {
    schedule(role, count) {
        if (!Memory.spawnQueue) Memory.spawnQueue = [];
        Memory.spawnQueue.push({ role, count, priority: 0 }); // 加入優先級，預設為 0
        console.log(`Scheduled spawn: ${count} x ${role}`);
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
            if (spawn.spawning) continue; // 如果 spawn 忙碌，則跳過

            // 找到最高優先級的任務
            const task = Memory.spawnQueue.filter(t => t.count > 0).sort((a, b) => b.priority - a.priority)[0];
            if (!task) continue; // 如果沒有任務，繼續下一個 spawn

            const capacity = spawn.room.energyCapacityAvailable;
            const body = generateBody(task.role, capacity);
            const name = `${task.role}_${Game.time}`;
            const result = spawn.spawnCreep(body, name, { memory: { role: task.role } });
            if (result === OK) {
                task.count -= 1;
                console.log(`Spawning ${task.role}: ${name}, remaining ${task.count}`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                // 如果能量不足，不從佇列中移除任務，等待下次執行
                console.log(`Not enough energy to spawn ${task.role} at ${spawn.name}`);
            } else {
                // 處理其他錯誤
                console.error(`Error spawning ${task.role} at ${spawn.name}: ${result}`);
                task.count -= 1; // 發生其他錯誤，移除任務以避免卡住
            }
        }
        // 清除已完成的任務
        Memory.spawnQueue = Memory.spawnQueue.filter(t => t.count > 0);
    },

    // 新增設定任務優先級的方法
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
