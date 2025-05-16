// controllerContainerScan.js
// 扫描离 controller 最近的非注册、未满的 container，排序并缓存其 ID
const containerManager = require('containerMgr');

const controllerContainerScan = {
  /**
   * 扫描并排序控制器附近的 container，将结果缓存到 room.memory.controllerContainers
   * @param {Room} room
   * @returns {string[]} 按距离排序后的 container ID 列表
   */
  scan(room) {
    // 获取已注册的 container ID 列表
    const registeredIds = containerManager.getContainers(room) || [];
    // 筛选所有非注册 containers
    const containers = room.find(FIND_STRUCTURES, {
      filter: s =>
        s.structureType === STRUCTURE_CONTAINER &&
        !registeredIds.includes(s.id) 
    });
    // 房间必须有 controller
    const controller = room.controller;
    if (!controller) {
      room.memory.controllerContainers = [];
      return [];
    }
    // 按与 controller 的距离升序排序
    containers.sort((a, b) =>
      controller.pos.getRangeTo(a) - controller.pos.getRangeTo(b)
    );
    // 提取 ID 列表并缓存
    const ids = containers.map(c => c.id);
    room.memory.controllerContainers = ids;
    return ids;
  },

  /**
   * 获取缓存的 controller container IDs；如无缓存则执行 scan
   * @param {Room} room
   * @returns {string[]} container ID 列表
   */
  get(room) {
    if (!room.memory.controllerContainers) {
      return this.scan(room);
    }
    return room.memory.controllerContainers;
  }
};

module.exports = controllerContainerScan;