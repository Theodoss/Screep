/**
 * spawnScheduler.js
 * 提供在控制台手动排程生产指定数量的不同角色 creep 的功能
 * 支持根据房间最大能量容量动态设计 body 配置
 * 用法（在控制台执行）：
 *   const ss = require('spawnScheduler');
 *   ss.schedule('attacker', 3);     // 排程生产 3 个 attacker
 *   ss.schedule('ranger', 2);       // 排程生产 2 个 ranger
 *   ss.clear();                      // 清空所有排程
 * 在主循环里调用：
 *   const ss = require('spawnScheduler');
 *   ss.run();                        // 自动根据排程生成 creeps
 */

/**
 * 根据角色和房间能量容量生成 body 数组。
 * @param {string} role - 'attacker' | 'ranger' | 其他
 * @param {number} capacity - 房间最大能量
 * @returns {BodyPartConstant[]} body
 */
function generateBody(role, capacity) {
    const body = [];
    if (role === 'attacker') {
      const cycleCost = TOUGH + ATTACK + MOVE + MOVE;
      const unitCost = 10 + 80 + 50 + 50;
      const cycles = Math.floor(capacity / unitCost);
      for (let i = 0; i < cycles; i++) body.push(TOUGH, ATTACK, MOVE, MOVE);
      let rem = capacity - cycles * unitCost;
      if (rem >= 50) body.push(MOVE);
    } else if (role === 'ranger') {
      const unitCost = 150 + 50; // RANGED_ATTACK + MOVE
      const cycles = Math.floor(capacity / unitCost);
      for (let i = 0; i < cycles; i++) body.push(RANGED_ATTACK, MOVE);
      let rem = capacity - cycles * unitCost;
      if (rem >= 50) body.push(MOVE);
    } else {
      const unitCost = 100 + 50 + 50; // WORK + CARRY + MOVE
      const cycles = Math.floor(capacity / unitCost);
      for (let i = 0; i < cycles; i++) body.push(WORK, CARRY, MOVE);
      let rem = capacity - cycles * unitCost;
      if (rem >= 50) body.push(MOVE);
    }
    return body;
  }
  
  const spawnScheduler = {
    schedule(role, count) {
      if (!Memory.spawnQueue) Memory.spawnQueue = [];
      Memory.spawnQueue.push({ role, count });
      console.log(`Scheduled spawn: ${count} x ${role}`);
    },
  
    clear() {
      delete Memory.spawnQueue;
      console.log('Spawn queue cleared');
    },
  
    run() {
      if (!Memory.spawnQueue || Memory.spawnQueue.length === 0) return;
      for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        if (spawn.spawning) continue;
        const task = Memory.spawnQueue.find(t => t.count > 0);
        if (!task) break;
        const capacity = spawn.room.energyCapacityAvailable;
        const body = generateBody(task.role, capacity);
        const name = `${task.role}_${Game.time}`;
        if (spawn.spawnCreep(body, name, { memory: { role: task.role } }) === OK) {
          task.count -= 1;
          console.log(`Spawning ${task.role}: ${name}, remaining ${task.count}`);
        }
      }
      Memory.spawnQueue = Memory.spawnQueue.filter(t => t.count > 0);
    }
  };
  
// // 将 generateBody 挂载到 spawnScheduler 对象
// spawnScheduler.generateBody = generateBody;

// 导出 spawnScheduler
module.exports = spawnScheduler;
  
// 提供简写
if (typeof global.ss === 'undefined') global.ss = {spawnScheduler};
  