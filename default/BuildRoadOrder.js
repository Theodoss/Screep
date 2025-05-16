// 1. 载入模块（控制台直接写 require）
const roadBuilder = require('roadBuilder');

// 2. 定义起点和终点 RoomPosition
//    假设要从 Spawn1 到房间控制器修路
const startPos = RoomPosition(30, 17, 'W25N47');
const endPos   = RoomPosition(13, 40, 'W25N47');

// 3. 一次性构造道路工地
roadBuilder.buildRoadBetween(startPos, endPos);
