function spawnCreeps(spawn) {
  const room = spawn.room;
  const energyAvailable = room.energyAvailable;

  // ------- 故障排除模式 -------
  // 当所有 harvester and miner 死亡 且 房间能量 = 300 时，优先生成最小 harvester
  const harvesterCount = _.filter(Game.creeps, c =>
    c.memory.role === 'harvester' && c.room.name === room.name
  ).length;
  // 统计 miner 数量
  const minerCount = _.filter(Game.creeps, c =>
    c.memory.role === 'miner' && c.room.name === room.name
  ).length;

  if (harvesterCount === 0 && minerCount ===0 && energyAvailable === 300) {
    const body = [WORK, WORK, CARRY, MOVE];
    const name = `harvester_rescue_${Game.time}`;
    if (spawn.spawnCreep(body, name, { memory: { role: 'harvester' } }) === OK) {
      console.log(`🚨 Rescue Harvester spawned: ${name}`);
    }
    return;  // 跳过后续正常的 spawn 逻辑
  }
  // ------- 故障排除模式结束 -------

  // 计算当前房间 container 数量
  const containerCount = room.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  }).length;


  // 统计 extension 数量，用于切换配置
  const extenCount = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION
  }).length;
  


  // 根据 extension 数量选择配置
  let bodyBlueprint, roleTargets;
  if (extenCount < 5) {
    bodyBlueprint = {
      harvester: [WORK, WORK, CARRY, MOVE],
      upgrader:  [WORK, WORK, CARRY, MOVE],
      builder:   [WORK, WORK, CARRY, MOVE],
      repairer:  [WORK, WORK, CARRY, MOVE],
      carrier:   [CARRY, CARRY, MOVE],
      miner:     [WORK, WORK, MOVE]
    };
    roleTargets  = {
      harvester: 4,
      upgrader:  2,
      builder:   4,
      repairer:  0,
      carrier:   0,
      miner:     0,
      worker:    0
    };
  } else if (extenCount < 10) {
    bodyBlueprint = {
      harvester: Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
      upgrader:  Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
      builder:   Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
      repairer:  Array(2).fill(WORK).concat(Array(4).fill(CARRY), Array(4).fill(MOVE)),
      miner:     Array(5).fill(WORK).concat([MOVE]),
      carrier:   Array(7).fill(CARRY).concat(Array(4).fill(MOVE))
    };
    roleTargets   = {
      harvester: 3,
      upgrader:  1,
      builder:   3,
      repairer:  1,
      carrier:   0,
      miner:     0,
      worker:    0
    };
  } else if (extenCount < 15) {
    bodyBlueprint = {
      harvester: Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
      upgrader:  Array(7).fill(WORK).concat(Array(1).fill(CARRY), Array(1).fill(MOVE)),
      builder:   Array(3).fill(WORK).concat(Array(3).fill(CARRY), Array(3).fill(MOVE)),
      repairer:  Array(2).fill(WORK).concat(Array(4).fill(CARRY), Array(4).fill(MOVE)),
      miner:     Array(7).fill(WORK).concat(Array(2).fill(MOVE)),
      carrier:   Array(7).fill(CARRY).concat(Array(4).fill(MOVE))
    };
    roleTargets  = { 
      harvester: 2,
      miner:     2,
      builder:   0,
      repairer:  0,
      carrier:   3,
      upgrader:  1,
      worker:    0
    };
  } else {
    // 动态生成最优配置，基于最大可用能量（spawn + extensions）并分配剩余能量
    var maxEnergy = room.energyCapacityAvailable;
    // console.log(maxEnergy)
    var maxEnergy = 1300;
    const baseCost = 100 + 50 + 50; // WORK + CARRY + MOVE
    const units = Math.floor(maxEnergy / baseCost);
    const leftover = maxEnergy - units * baseCost;

    // 平衡型：WORK、CARRY、MOVE 各 units
    const balancedBody = [];
    for (let i = 0; i < units; i++) {
      balancedBody.push(WORK);
      balancedBody.push(CARRY);
      balancedBody.push(MOVE);
    }
    // 剩余能量：优先加 WORK，其次加 MOVE
    let rem = leftover;
    if (rem >= 100) {
      balancedBody.push(WORK);
      rem -= 100;
    }
    if (rem >= 50) {
      balancedBody.push(MOVE);
      rem -= 50;
    }

    // 挖矿型：最大化 WORK，仅保留一 MOVE
    const minerWork = Math.max(1, Math.floor((maxEnergy - 50) / 100));
    const minerBody = Array(minerWork).fill(WORK).concat([MOVE]);
    // 挖矿型剩余能量：全部加到 MOVE
    let minerRem = maxEnergy - (minerWork * 100 + 50);
    if (minerRem >= 50) minerBody.push(MOVE);

    // 运输型：CARRY:MOVE = 2:1
    const cycleCount = Math.floor(maxEnergy / (2 * 50 + 50));
    const carrierBody = Array(cycleCount * 2).fill(CARRY).concat(Array(cycleCount).fill(MOVE));
    // 运输型剩余能量：加到 MOVE
    let carryRem = maxEnergy - cycleCount * (2 * 50 + 50);
    if (carryRem >= 50) carrierBody.push(MOVE);

    bodyBlueprint = {
      harvester: Array(1).fill(WORK).concat(Array(6).fill(CARRY), Array(3).fill(MOVE)),
      upgrader: balancedBody,
      builder: balancedBody,
      repairer: balancedBody,
      miner: Array(6).fill(WORK).concat(Array(2).fill(MOVE)),
      carrier: carrierBody,
      b_carrier: carrierBody,
      ldminer: balancedBody,
      scout: [MOVE, MOVE, MOVE]
    };
    roleTargets = { 
      harvester: 1,
      miner:     3,
      builder:   0,
      repairer:  0,
      carrier:   4,
      b_carrier: 0,
      upgrader:  1,
      ldminer:  0,
      scout: 0,
    };
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
    if (role in roleCounts) {
      roleCounts[role]++;
    }
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

module.exports = { spawnCreeps };
