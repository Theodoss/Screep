// roleBuilder.js
// Builder 角色：优先从已注册的 Containers 获取能量，然后建造，结果列表缓存 10 tick
const containerManager = require('containerMgr');

const roleBuilder = {
  /** @param {Creep} creep **/
  run: function(creep) {
    const room = creep.room;
    // 初始化状态
    if (creep.memory.building === undefined) {
      creep.memory.building = false;
    }
    // 状态切换：无能量→采集；满包→建造
    if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
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
        // 选最近的工地
        const target = creep.pos.findClosestByPath(sites);
        if (creep.build(target) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
        }
      }
    } else {
      // 采集模式：优先从已注册的 container 获取能量
      if (!room.memory._builderContainerTick || Game.time - room.memory._builderContainerTick >= 10) {
        room.memory._builderContainerTick = Game.time;
        room.memory.builderContainerList = Object.keys(room.memory.containerData || {});
      }
      const containers = (room.memory.builderContainerList || [])
        .map(id => Game.getObjectById(id))
        .filter(c => c && c.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
      if (containers.length > 0) {
        const cont = creep.pos.findClosestByPath(containers);
        if (creep.withdraw(cont, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(cont, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
        }
      } else {
        // 无可用 container，fallback 到 source
        const sources = room.find(FIND_SOURCES);
        if (sources.length > 0) {
          if (creep.harvest(sources[1] || sources[0]) === ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[1] || sources[0], { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
          }
        }
      }
    }
  }
};

module.exports = roleBuilder;