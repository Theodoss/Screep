const ss = require('spawnScheduler');
/**
 * warSpawn.js - 独立的战争模式生产脚本
 * 仅在主逻辑判定 warMode 为 true 时调用
 */
function spawnWarCreeps(spawn) {
    const room = spawn.room;
    // 矿工优先补充
    const minerCount = _.filter(Game.creeps, c =>
      c.memory.role === 'miner' && c.room.name === room.name
    ).length;
    if (minerCount === 0) {
      const rescueBody = Array(6).fill(WORK).concat(Array(2).fill(MOVE));
      const rescueName = `miner_rescue_${Game.time}`;
      if (spawn.spawnCreep(rescueBody, rescueName, { memory: { role: 'miner' } }) === OK) {
        console.log(`🚨 Rescue Miner spawned: ${rescueName}`);
      }
      return;
    }
  
    // 交替生成 attacker 和 ranger
    Memory.warSpawnIdx = Memory.warSpawnIdx || 0;
    const warRoles = ['attacker', 'ranger'];
    const role = warRoles[Memory.warSpawnIdx % warRoles.length];
    // 身体配置

    const body = ss.generateBody(role, room.energyCapacityAvailable);

  
    // 生产并更新索引
    const name = `${role}_${Game.time}`;
    if (spawn.spawnCreep(body, name, { memory: { role } }) === OK) {
      console.log(`⚔️ War Spawn: ${role} -> ${name}`);
      Memory.warSpawnIdx++;
    }
  }
  
  module.exports = {spawnWarCreeps};