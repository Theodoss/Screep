// roleBuilder.js
// Builder 角色：优先从最近的 Container 获取能量；如果无 Container 则从 Storage 获取；最后采集 Source

const roleBuilder = {
  /** @param {Creep} creep **/
  run(creep) {
    const { room, pos } = creep;
    
    // 初始化状态
    if (creep.memory.building === undefined) {
      creep.memory.building = false;
    }
    // 状态切换：无能量→采集，满包→建造
    if (creep.memory.building && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.building = false;
      creep.say('🔄 harvest');
    }
    if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
      creep.memory.building = true;
      creep.say('🚧 build');
    }

    if (creep.memory.building) {
      // 建造模式
      const sites = room.find(FIND_CONSTRUCTION_SITES);
      if (sites.length > 0) {
        const target = pos.findClosestByPath(sites, { reusePath: 10 });
        if (creep.build(target) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
        }
      }
    } else {
      // 采集模式：
      // 1. 优先从最近的 Container 获取能量
      const containers = room.find(FIND_STRUCTURES, {
        filter: s =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY)
      });
      if (containers.length > 0) {
        const cont = pos.findClosestByPath(containers, { reusePath: 10 });
        if (creep.withdraw(cont, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(cont, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
        }
        return;
      }
      // 2. 容器无能量时，从 Storage 获取
      if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        if (creep.withdraw(room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(room.storage, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
        }
        return;
      }
      // 3. 最后采集 Source
      const sources = room.find(FIND_SOURCES);
      if (sources.length > 0) {
        const source = pos.findClosestByPath(sources, { reusePath: 10 });
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
        }
      }
    }
  }
};

module.exports = roleBuilder;