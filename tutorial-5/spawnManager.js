// spawnManager.js

function spawnCreeps(spawn) {
  const room = spawn.room;

  // 计算当前房间 container 数量
  const containerCount = room.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  }).length;

  // 统计 extension 数量，用于切换配置
  const extenCount = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION
  }).length;
  
  const minerCount = _.filter(Game.creeps, c =>
  c.memory.role === 'miner' && c.room.name === room.name
).length;

  // 根据 extension 数量选择配置
  let bodyBlueprint, roleTargets;
  if (extenCount < 5) {
    //   console.log("P1")
    bodyBlueprint = ROLE_BODY;
    roleTargets   = { ...ROLE_TARGETS };
  } else if (extenCount < 10) {
    //   console.log("P2")
    bodyBlueprint = ROLE_BODY_P1;
    roleTargets   = { ...ROLE_TARGETS_P1 };
  } else if (extenCount < 15){
    //   console.log("P3")
    bodyBlueprint = ROLE_BODY_P2;
    roleTargets   = { ...ROLE_TARGETS_P2 };
  }

  // 仅当有 container 时才允许 spawn miner 和 carrier
  if (containerCount === 0) {
    roleTargets.miner   = 0;
  }
  if (minerCount === 0) {
  roleTargets.carrier = 0;
}
  

  // 统计现有各角色数量
  const roleCounts = {};
  for (const role in roleTargets) {
    roleCounts[role] = 0;
  }
  for (const creep of Object.values(Game.creeps)) {
    const role = creep.memory.role;
    if (role in roleCounts) roleCounts[role]++;
  }

  // 尝试 spawn 一个最缺的
  for (const role in roleTargets) {
    if (roleCounts[role] < roleTargets[role]) {
      const body = bodyBlueprint[role];
      if (spawn.room.energyAvailable >= calculateCost(body)) {
        const name = `${role}_${Game.time}`;
        if (spawn.spawnCreep(body, name, { memory: { role } }) === OK) {
          console.log(`🧬 Spawning ${role}: ${name}`);
        }
      }
      break;
    }
  }
}

// cost 计算保持不变
function calculateCost(body) {
  let cost = 0;
  for (const part of body) {
    switch (part) {
      case WORK: cost += 100; break;
      case MOVE: cost += 50;  break;
      case CARRY: cost += 50; break;
      case ATTACK: cost += 80; break;
      case RANGED_ATTACK: cost += 150; break;
      case HEAL: cost += 250; break;
      case CLAIM: cost += 600; break;
      case TOUGH: cost += 10; break;
    }
  }
  return cost;
}

// 各种配置定义
const ROLE_TARGETS = { 
  harvester: 4,
  upgrader:  2,
  builder:   4,
  repairer:  0,
  carrier:   0,
  miner:     0
};
const ROLE_TARGETS_P1 = {
  harvester: 3,
  upgrader:  1,
  builder:   3,
  repairer:  1,
  carrier:   0,
  miner:     0,
  worker:    0
};
const ROLE_TARGETS_P2 = { 
  harvester: 3,
  miner:     2,
  builder:   1,
  repairer:  1,
  carrier:   1,
  upgrader:  1,
  worker:    0
};

const ROLE_BODY = {
  harvester: [WORK, WORK, CARRY, MOVE],
  upgrader:  [WORK, WORK, CARRY, MOVE],
  builder:   [WORK, WORK, CARRY, MOVE],
  repairer:  [WORK, WORK, CARRY, MOVE],
  carrier:   [CARRY, CARRY, MOVE],
  miner:     [WORK, WORK, MOVE]
};

const ROLE_BODY_P1 = {
  harvester: Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
  upgrader:  Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
  builder:   Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
  repairer:  Array(2).fill(WORK).concat(Array(4).fill(CARRY), Array(4).fill(MOVE)),
  miner:     Array(5).fill(WORK).concat([MOVE]),
  carrier:   Array(7).fill(CARRY).concat(Array(4).fill(MOVE))
};

const ROLE_BODY_P2 = {
  harvester: Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
  upgrader:  Array(7).fill(WORK).concat(Array(1).fill(CARRY), Array(1).fill(MOVE)),
  builder:   Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
  repairer:  Array(2).fill(WORK).concat(Array(4).fill(CARRY), Array(4).fill(MOVE)),
  miner:     Array(7).fill(WORK).concat(Array(0).fill(CARRY), Array(2).fill(MOVE)),
  carrier:   Array(7).fill(CARRY).concat(Array(4).fill(MOVE))
};

module.exports = { spawnCreeps };
