// **
//  * behaver.js
//  * 提供共用的 creep 行為，例如就近撿取能量（掉落物 / 墓碑 / 廢墟）
//  * 可在任何 creep 腳本中調用：
//  *   const behaver = require('behaver');
//  *   behaver.tryPickupNearbyEnergy(creep);
//  */

const behaver = {
  /**
   * 嘗試從 2 格內的資源來源撿取能量（掉落、墓碑、廢墟）
   * @param {Creep} creep
   * @param {number} [range=2]
   * @returns {boolean} 是否有撿成功或正在移動過去
   */
  tryPickupNearbyEnergy(creep, range = 2) {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return false;

    const nearbyTargets = [
      ...creep.pos.findInRange(FIND_DROPPED_RESOURCES, range),
      ...creep.pos.findInRange(FIND_TOMBSTONES, range),
      ...creep.pos.findInRange(FIND_RUINS, range)
    ].filter(target => {
      if (target.resourceType === RESOURCE_ENERGY) {
        return target.amount > 0;
      }
      if (target.store) {
        return target.store[RESOURCE_ENERGY] > 0;
      }
      return false;
    });

    if (nearbyTargets.length === 0) return false;

    const target = creep.pos.findClosestByPath(nearbyTargets);
    let result = ERR_INVALID_TARGET;

    if (target.resourceType === RESOURCE_ENERGY) {
      result = creep.pickup(target);
    } else {
      result = creep.withdraw(target, RESOURCE_ENERGY);
    }

    if (result === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { reusePath: 5 });
    }

    return result === OK || result === ERR_NOT_IN_RANGE;
  }
};

module.exports = behaver;