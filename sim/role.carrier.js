// roleCarrier.js
// 高效版 Carrier：收集墓碑、落地能量、注册容器、储存能量，并按优先级运送到 Spawn/Extension → Tower → Controller 容器 → Storage
const containerManager = require('containerMgr');
const controllerContainerScan = require('controllerContainerScan');

/**
 * 收集能量阶段
 * @returns {boolean} 是否执行过动作
 */
function doWithdraw(creep) {
  const { room, pos } = creep;
  const freeCap = creep.store.getFreeCapacity();

  // 1. 墓碑
  const tomb = pos.findClosestByPath(FIND_TOMBSTONES, { filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
  if (tomb) {
    creep.withdraw(tomb, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(tomb, { reusePath: 10 });
    return true;
  }
  // 2. 地面掉落
  const drop = pos.findClosestByPath(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY });
  if (drop) {
    creep.pickup(drop) === ERR_NOT_IN_RANGE && creep.moveTo(drop, { reusePath: 10 });
    return true;
  }
  // 3. 注册容器
  const regs = containerManager.getContainers(room) || [];
  let best = null;
  for (const id of regs) {
    const cont = Game.getObjectById(id);
    if (cont && cont.store.getUsedCapacity(RESOURCE_ENERGY) >= freeCap) {
      if (!best || pos.getRangeTo(cont) < pos.getRangeTo(best)) best = cont;
    }
  }
  if (best) {
    creep.withdraw(best, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(best, { reusePath: 10 });
    return true;
  }
  // 4. Storage
  if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
    creep.withdraw(room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(room.storage, { reusePath: 10 });
    return true;
  }
  return false;
}

/**
 * 运输能量阶段
 * @returns {boolean} 是否执行过动作
 */
function doDeliver(creep) {
  const { room, pos } = creep;
  const usedCap = creep.store.getUsedCapacity(RESOURCE_ENERGY);

  // 1. Spawn/Extension
  const spawnExts = room.find(FIND_MY_STRUCTURES, { filter: s =>
    (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  });
  if (spawnExts.length) {
    const target = pos.findClosestByPath(spawnExts);
    creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
    return true;
  }
  // 2. Tower
  const towers = room.find(FIND_STRUCTURES, { filter: s =>
    s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 300
  });
  if (towers.length) {
    const target = pos.findClosestByPath(towers);
    creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
    return true;
  }
  // 3. Controller 最近容器，并考虑长距离送能策略
  const contIds = controllerContainerScan.get(room);
  const containers = contIds.map(id => Game.getObjectById(id)).filter(c => c && c.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity());
  if (containers.length) {
    const target = containers[0];
    // 路程过长时优先送能
    const path = creep.pos.findPathTo(target.pos, { reusePath: 20, ignoreCreeps: true });
    if (usedCap > 0 && (path.length > 20 || creep.store.getFreeCapacity() === 0)) {
      creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
      return true;
    }
    return false; // 继续收能
  }
  // 4. Storage
  const storages = room.find(FIND_STRUCTURES, { filter: s =>
    s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  });
  if (storages.length) {
    const target = pos.findClosestByPath(storages);
    creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(target, { reusePath: 10 });
    return true;
  }
  return false;
}

const roleCarrier = {
  /** @param {Creep} creep **/
  run(creep) {
    // 初始化状态
    if (!creep.memory.state) {
      creep.memory.state = creep.store.getFreeCapacity() > 0 ? 'withdraw' : 'deliver';
    }
    const state = creep.memory.state;
    // 执行并切换状态机
    if (state === 'withdraw') {
      if (doWithdraw(creep) === false || creep.store.getFreeCapacity() === 0) {
        creep.memory.state = 'deliver';
      }
    } else {
      if (doDeliver(creep) === false || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.state = 'withdraw';
      }
    }
  }
};

module.exports = roleCarrier;