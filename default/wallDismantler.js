

const config = {
    homeRoom: 'W25N47',
    storageId: '68173618154309283cf96ead',
    targets: [
      { roomName: 'W26N47', rally: { x: 39, y: 22 }, wallId: '6693d8f47891e263363d18f1' },
      { roomName: 'W26N47', rally: { x: 39, y: 22 }, wallId: '6693d8e439f17c0eddbea6be' }
    ]
  };
  
  const wallDismantler = {
    run(creep) {
        // creep.memory.targetIndex == null
      // 初始化或获取状态
    //   creep.memory.state = 'dismantle'
      if (creep.memory.targetIndex == null) creep.memory.targetIndex = 0;
      if (!creep.memory.state) creep.memory.state = 'rally';
      const idx = creep.memory.targetIndex;
      if (idx >= config.targets.length) {
        creep.say('Idle');
        return;
      }
      const tc = config.targets[idx];
      const wall = Game.getObjectById(tc.wallId);
      const storage = Game.getObjectById(config.storageId);
      const moveOpts = { reusePath: 10, ignoreCreeps: true };
  
      switch (creep.memory.state) {
        case 'rally': {
        
          const rallyPos = new RoomPosition(tc.rally.x, tc.rally.y, tc.roomName);
          if (creep.room.name !== tc.roomName || !creep.pos.isEqualTo(rallyPos)) {
            creep.moveTo(rallyPos, { reusePath: 50, ignoreCreeps: true, visualizePathStyle: { stroke: '#ff0000' } });
          } else {
            creep.memory.state = 'dismantle';
          }
          break;
        }
  
        case 'dismantle': {
          if (!wall) {
            // 墙拆完，切换下一个目标
            creep.memory.targetIndex++;
            creep.memory.state = 'rally';
            break;
          }
          if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.state = 'deliver';
            break;
          }
          if (creep.dismantle(wall) === ERR_NOT_IN_RANGE) {
            creep.moveTo(wall, { visualizePathStyle: { stroke: '#ffffff' } });
          }
          break;
        }
  
        case 'deliver': {

            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
                console.log("j")
                creep.memory.state = 'dismantle'
            }
          // 路面维护：优先修复附近损坏道路
          const roads = creep.pos.findInRange(FIND_STRUCTURES, 2, { filter: s => s.structureType === STRUCTURE_ROAD });
          for (const r of roads) {
            if (r.hits < r.hitsMax) {
              creep.repair(r);
              return;
            }
          }
          // 路面建设：寻找已有施工点并建造
          const sites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, { filter: s => s.structureType === STRUCTURE_ROAD });
          if (sites.length > 0) {
            if (creep.build(sites[0]) === ERR_NOT_IN_RANGE) {
              creep.moveTo(sites[0], moveOpts);
            }
            return;
          }
          // 运送能量至 Storage
          if (storage && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(storage, moveOpts);
            }
          } else {
            // 能量耗尽，继续拆墙
            creep.memory.state = 'dismantle';
          }
          break;
        }
      }
    }
  };
  
  module.exports = wallDismantler;
  