// @ts-nocheck
// dataCollector.js
// 数据收集模块：定期收集关键性能指标并缓存/计算平均值

/**
 * 计算数组对象的某个属性平均值
 * @param {Array<Object>} arr
 * @param {string} key
 */
function avg(arr, key) {
    if (!arr || arr.length === 0) return 0;
    return _.sum(arr, o => o[key]) / arr.length;
  }
  
  const dataCollector = {
    /** 初始化 Memory.statistics 结构 */
    init() {
      if (!Memory.statistics) {
        Memory.statistics = {
          raw: [],      // 每 tick 原始数据（至多 300 条）
          avg10: [],    // 每 10 tick 平均（至多 100 条）
          avg100: [],   // 每 100 tick 平均（至多 10 条）
          snapshots: [] // 每 300 tick 快照
        };
      }
    },
  
    /**
     * 记录各模块调用的能量、次数等数据
     * @param {string} key 数据字段名
     * @param {number} amount 累加值，默认为 1
     */
    record(key, amount = 1) {
      const mem = Memory._collector || (Memory._collector = {});
      mem[key] = (mem[key] || 0) + amount;
    },
  
    /**
     * 每 tick 调用：汇总临时数据，更新 raw / avg10 / avg100 / snapshots
     */
    run() {
      this.init();
      const memRaw = Memory.statistics.raw;
      const temp = Memory._collector || {};
  
      // 构造当前 tick 数据
      const entry = {
        tick: Game.time,
        harvestTicks:  temp.harvestTicks    || 0,
        harvestedEnergy: temp.harvestedEnergy || 0,
        spawnEnergy:    temp.spawnEnergy     || 0,
        upgradeEnergy:  temp.upgradeEnergy   || 0,
        repairEnergy:   temp.repairEnergy    || 0,
        towerEnergy:    temp.towerEnergy     || 0,
        enemyCount:     temp.enemyCount      || 0,
        emergencyCount: temp.emergencyCount  || 0
        // 可扩展：更多自定义指标
      };
  
      // 清理临时记录
      delete Memory._collector;
  
      // 1. raw 数据入队
      memRaw.push(entry);
      if (memRaw.length > 300) memRaw.shift();
  
      // 2. 每 10 tick 计算 avg10
      if (Game.time % 10 === 0) {
        const last10 = memRaw.slice(-10);
        Memory.statistics.avg10.push({ tick: Game.time, 
          harvestTicks:    avg(last10, 'harvestTicks'),
          harvestedEnergy: avg(last10, 'harvestedEnergy'),
          spawnEnergy:     avg(last10, 'spawnEnergy'),
          upgradeEnergy:   avg(last10, 'upgradeEnergy'),
          repairEnergy:    avg(last10, 'repairEnergy'),
          towerEnergy:     avg(last10, 'towerEnergy'),
          enemyCount:      avg(last10, 'enemyCount'),
          emergencyCount:  avg(last10, 'emergencyCount')
        });
        if (Memory.statistics.avg10.length > 100) Memory.statistics.avg10.shift();
      }
  
      // 3. 每 100 tick 计算 avg100
      if (Game.time % 100 === 0) {
        const blocks = Memory.statistics.avg10.slice(-100);
        Memory.statistics.avg100.push({ tick: Game.time, 
          harvestTicks:    avg(blocks, 'harvestTicks'),
          harvestedEnergy: avg(blocks, 'harvestedEnergy'),
          spawnEnergy:     avg(blocks, 'spawnEnergy'),
          upgradeEnergy:   avg(blocks, 'upgradeEnergy'),
          repairEnergy:    avg(blocks, 'repairEnergy'),
          towerEnergy:     avg(blocks, 'towerEnergy'),
          enemyCount:      avg(blocks, 'enemyCount'),
          emergencyCount:  avg(blocks, 'emergencyCount')
        });
        if (Memory.statistics.avg100.length > 10) Memory.statistics.avg100.shift();
      }
  
      // 4. 每 300 tick 存快照
      if (Game.time % 300 === 0) {
        Memory.statistics.snapshots.push(entry);
        if (Memory.statistics.snapshots.length > 20) Memory.statistics.snapshots.shift();
      }
    }
  };
  
  module.exports = dataCollector;
  if (typeof global.dc === 'undefined') global.dc = dataCollector;
  
  // 使用示例：
  // const dc = require('dataCollector');
  // dc.record('harvestedEnergy', amount);
  // ...
  // dc.run();
  