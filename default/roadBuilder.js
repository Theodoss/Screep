// roadBuilder.js
// 在两个 RoomPosition 之间沿路径创建道路建设工地
// 用法：const roadBuilder = require('roadBuilder'); roadBuilder.buildRoadBetween(startPos, endPos);

const roadBuilder = {
  /**
   * 在两个点之间生成道路施工点
   * @param {RoomPosition} startPos 起点位置
   * @param {RoomPosition} endPos 终点位置
   */
  buildRoadBetween(startPos, endPos) {
    // 确认在同一房间
    if (startPos.roomName !== endPos.roomName) {
      console.log(
        `roadBuilder: startPos 和 endPos 不在同一房间 (${startPos.roomName} vs ${endPos.roomName})`
      );
      return;
    }
    const room = Game.rooms[startPos.roomName];
    if (!room) {
      console.log(`roadBuilder: 房间 ${startPos.roomName} 不可见`);
      return;
    }

    // 使用 PathFinder 查找路径
    const result = PathFinder.search(startPos, { pos: endPos, range: 1 }, {
      // 定义地形权重
      plainCost: 2,
      swampCost: 10,
      roomCallback: (roomName) => {
        const room = Game.rooms[roomName];
        if (!room) return;
        const costs = new PathFinder.CostMatrix();

        // 对现有结构设置权重
        room.find(FIND_STRUCTURES).forEach((s) => {
          if (s.structureType === STRUCTURE_ROAD) {
            // 已有道路成本低
            costs.set(s.pos.x, s.pos.y, 1);
          } else if (
            s.structureType !== STRUCTURE_CONTAINER &&
            (s.structureType !== STRUCTURE_RAMPART || !s.my)
          ) {
            // 阻挡路径
            costs.set(s.pos.x, s.pos.y, 0xff);
          }
        });
        return costs;
      }
    });

    // 在路径每个步骤处创建道路建设工地
    result.path.forEach((step) => {
      const err = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
      if (err === ERR_INVALID_TARGET) {
        // 可能已有建筑，可忽略
      } else if (err !== OK) {
        console.log(`roadBuilder: 在 (${step.x},${step.y}) 创建道路失败: ${err}`);
      }
    });

    console.log(
      `roadBuilder: 在 ${startPos} 到 ${endPos} 共规划 ${result.path.length} 个道路工地`
    );
  }
};

module.exports = roadBuilder;
