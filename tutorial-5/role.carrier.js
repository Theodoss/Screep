// roleCarrier.js
// 只从 containerMgr 注册的 containers 中取能，并运送到 Spawn/Extension 或其他未满的 Container
const containerManager = require('containerMgr');
const carrierMission = require('carrierMission');

const roleCarrier = {
    /** @param {Creep} creep **/
        run(creep) {
    // 2. 收集阶段
        if (creep.store.getFreeCapacity() > 0) {
        //   if (carrierMission.doPickDropped(creep)) {
        //     creep.say('PD');
        //     return;
        //   }
        //   if (carrierMission.doCollectTombstone(creep)) {
        //     creep.say('PT');
        //     return;
        //   }
        if (carrierMission.doWithdrawContainer(creep)) {
            creep.say('PC');
            return;
          }
        //   // 空闲待机
        //   creep.say('Idle');
        //   carrierMission.doIdle(creep);
        } 
        else {
          // 3. 运输阶段
          creep.say('D');
          carrierMission.doDeliver(creep);
          return;
        }
      }
    };


module.exports = roleCarrier;