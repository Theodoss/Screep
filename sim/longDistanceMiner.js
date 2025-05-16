// longDistanceMiner.js
// 长距离矿工：使用 PathFinder.search 跨房间移动，自动分配矿工采集远程矿点并返回主房间 Storage

const config = {
    homeRoom: 'W25N47',           // 主房间名称
    homeStorageId: '68173618154309283cf96ead',// 主房间 Storage 的 ID
    remotes: [                  // 远程矿点配置列表
      { roomName: 'W26N47', sourceId: '5bbcab779099fc012e63392b', containerPos: { x:29, y:17 }, minerCount: 2 },
      { roomName: 'W7N5', sourceId: '57eae1d5077f3a8260dc2a8f', containerPos: { x:22, y:15 }, minerCount: 1 }
    ]
  };

/**
 * 为每个矿工分配一个远程任务索引
 * @param {Creep} creep
 * @returns {number} remotes 数组索引
 */
function assignRemote(creep) {
  if (!Memory.ldMinerAssignment) Memory.ldMinerAssignment = {};
  // 如果已分配则直接返回
  if (Memory.ldMinerAssignment[creep.name] !== undefined) {
    return Memory.ldMinerAssignment[creep.name];
  }
  // 否则获取所有同房间 ldminer，按名字排序分配
  const miners = _.filter(Game.creeps, c =>
    c.memory.role === 'ldminer' && c.room.name === config.homeRoom
  ).map(c => c.name).sort();
  const idx = miners.indexOf(creep.name);
  const remoteIdx = idx % config.remotes.length;
  Memory.ldMinerAssignment[creep.name] = remoteIdx;
  return remoteIdx;
}

const longDistanceMiner = {
  /** @param {Creep} creep **/
  run(creep) {

    // 初始化运输状态
    if (creep.memory.delivering === undefined) creep.memory.delivering = false;
    
    // 获取分配结果和配置
    const remoteIdx = assignRemote(creep);
    const remote = config.remotes[remoteIdx];
    const source = Game.getObjectById(remote.sourceId);
    // 容器上方的 RoomPosition 用于矿工集结与挖矿
    const containerPos = new RoomPosition(
      remote.containerPos.x,
      remote.containerPos.y,
      remote.roomName
    );

    if (!creep.memory.delivering) {
      // ---- 采集阶段 ----
      // 如果不在目标 containerPos，使用 PathFinder 跨房间寻路
      if (!creep.pos.isEqualTo(containerPos)) {
        creep.moveTo(new RoomPosition(remote.containerPos.x, remote.containerPos.y, remote.roomName), { visualizePathStyle: { stroke: '#00ff00' } });
        // const result = PathFinder.search(
        //   creep.pos,
        //   { pos: containerPos, range: 0 },
        //   { ignoreCreeps: true }
        // };
        
        // 如果路径找到，则按路径移动
        // if (result.path.length > 0) {
        //   creep.moveByPath(result.path, { visualizePathStyle: { stroke: '#00ff00' } });
        // }
        return;
        };
      
      // 在 containerPos 位置：先采矿
      if (source) {
        // harvest 返回 ERR_NOT_IN_RANGE 则靠近目标再 harvest
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          creep.moveTo(source, { reusePath: 20 });
        }
      }
      // 如果满载能量，切换到运输模式
      if (creep.store.getFreeCapacity() === 0) {
        creep.memory.delivering = true;
      }
    } else {
      // ---- 运输阶段 ----
      const storage = Game.getObjectById(config.homeStorageId);
      // 如果不在主房间，使用 PathFinder 返回
      if (creep.room.name !== config.homeRoom) {
        const homePos = new RoomPosition(storage.pos.x, storage.pos.y, config.homeRoom);
        const result = PathFinder.search(
          creep.pos,
          { pos: homePos, range: 0 },
          { ignoreCreeps: true }
        );
        if (result.path.length > 0) {
          creep.moveByPath(result.path, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return;
      }
      // 到达主房间后，将能量传给 Storage
      if (storage && creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(storage, { reusePath: 20 });
        return;
      }
      // 传送完毕后切回采集模式
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.delivering = false;
      }
    }
  }
};

module.exports = longDistanceMiner;
