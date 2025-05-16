// @ts-nocheck
// 自己房间内拆墙脚本 - 在W25N47拆除特定的墙

// 配置：自己房间内要拆除的墙的ID列表
const config = {
  homeRoom: 'W25N47',
  storageId: '68173618154309283cf96ead',
  // 要拆除的墙列表 - 按照这个顺序依次拆除
  // 这里只是示例ID，使用时请替换为实际的墙和rampart的ID
  wallsToDismantle: [
    '669cc39c78ffaa79be594cd0', // 示例ID，请替换
    '669cc3a46b6319355ff8be92', // 示例ID，请替换
    '669cc39159af15a1fad0dc88',
    '669cc38c9ad2cd6699b762b5',
    '669cc387f8c80c0f850efb73',
    '669cc338e15607fc803f840e',
    '669cc2cd7a55b14e962c081c',
    '66a191f58fbe6e33e9519569',
    '6817dcdc01f140130f55184c'
  ]
};

// 将拆墙列表导出，供tower.js使用
const dismantleList = new Set(config.wallsToDismantle);

const selfWallDismantler = {
  run(creep) {
    // 初始化状态和目标墙索引
    if (creep.memory.targetWallIndex === undefined) creep.memory.targetWallIndex = 0;
    if (!creep.memory.state) creep.memory.state = 'dismantle';
    
    // 获取当前目标墙的ID
    const idx = creep.memory.targetWallIndex;
    if (idx >= config.wallsToDismantle.length) {
      creep.say('完成');
      return; // 所有墙都拆完了
    }
    
    const wallId = config.wallsToDismantle[idx];
    const wall = Game.getObjectById(wallId);
    const storage = Game.getObjectById(config.storageId);
    
    switch (creep.memory.state) {
      case 'dismantle': {
        if (!wall) {
          // 墙拆完或不存在，切换到下一个目标
          creep.memory.targetWallIndex++;
          creep.say('下一个');
          break;
        }
        
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
          creep.memory.state = 'deliver';
          creep.say('🚚');
          break;
        }
        
        const dismantleResult = creep.dismantle(wall);
        if (dismantleResult === ERR_NOT_IN_RANGE) {
          creep.moveTo(wall, { 
            visualizePathStyle: { stroke: '#ffffff' },
            reusePath: 5
          });
          creep.say('🔜');
        } else if (dismantleResult === OK && Game.time % 10 == 0) {
          creep.say('🔨');
        }
        break;
      }
      
      case 'deliver': {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
          creep.memory.state = 'dismantle';
          creep.say('🔨');
          break;
        }
        
        // 寻找最近的需要能量的建筑（spawn, extension, tower）
        const target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
          filter: structure => {
            // 对于tower，只有当空余能量大于200时才填充
            if (structure.structureType === STRUCTURE_TOWER) {
              return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 200;
            }
            // 对于spawn和extension，任何空余能量都填充
            return (structure.structureType === STRUCTURE_SPAWN ||
                   structure.structureType === STRUCTURE_EXTENSION) &&
                   structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        });
        
        // 如果找到了需要能量的建筑，就把能量送过去
        if (target) {
          const transferResult = creep.transfer(target, RESOURCE_ENERGY);
          if (transferResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {
              visualizePathStyle: { stroke: '#ffaa00' },
              reusePath: 5
            });
            creep.say('🚚');
          }
          return;
        }
        
        // 如果没有找到需要能量的建筑，则送到storage
        if (storage) {
          const transferResult = creep.transfer(storage, RESOURCE_ENERGY);
          if (transferResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(storage, { 
              visualizePathStyle: { stroke: '#ffaa00' },
              reusePath: 5
            });
            creep.say('🚚');
          }
        } else {
          // 没有storage，或者已经送完能量，回到拆墙状态
          creep.memory.state = 'dismantle';
          creep.say('🔨');
        }
        break;
      }
    }
  }
};

module.exports = {
  run: selfWallDismantler.run,
  dismantleList: dismantleList
}; 