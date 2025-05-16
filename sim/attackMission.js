// /**
//  * attackMission.js (Flag-based & Manual Rally Position Command System)
//  *
//  * 指令方式：
//  *  1. 使用旗帜 'a' 或 'r' 自动设置 rallyPos 和角色：
//  *     - 'a' ➔ attacker（近战）
//  *     - 'r' ➔ ranger（远程）
//  *  2. 也可通过控制台手动设置跨房间 rally 位置：
//  *     am.setRallyPos(x, y, roomName);
//  *  3. 可通过控制台清除手动设置：
//  *     am.clearRallyPos();
//  *  4. flag 与手动设置同时存在时，手动设置优先。
//  *  5. 在 rallyPos 上可以放置目标（结构或 creep）以自动识别 target。
//  *  6. 移除 flag / clearRallyPos() 即结束对应任务。
//  *
//  * 主循环调用：
//  *   const attackMission = require('attackMission');
//  *   attackMission.run(creep);
//  */

// const attackMission = {
//     /** 手动设置跨房间集结点 */
//     setRallyPos(x, y, roomName) {
//       if (!Memory.attackMission) Memory.attackMission = {};
//       Memory.attackMission.manualRally = { x, y, roomName: roomName.toUpperCase() };
//       console.log(`Manual rally set to ${x},${y} in ${roomName.toUpperCase()}`);
//     },
  
//     /** 清除手动集结点 */
//     clearRallyPos() {
//       if (Memory.attackMission) delete Memory.attackMission.manualRally;
//       console.log('Manual rally position cleared');
//     },
  
//     /** 根据角色获取对应任务信息 */
//     getMissionForRole(role) {
//       // 使用手动集结优先
//       let rallyPos;
//       if (Memory.attackMission && Memory.attackMission.manualRally) {
//         const m = Memory.attackMission.manualRally;
//         rallyPos = new RoomPosition(m.x, m.y, m.roomName);
//       } else {
//         const flagName = role === 'attacker' ? 'a' : role === 'ranger' ? 'r' : null;
//         if (!flagName || !Game.flags[flagName]) return null;
//         rallyPos = Game.flags[flagName].pos;
//       }
//       const roomName = rallyPos.roomName;
  
//       // 识别 target，仅当房间可见时
//       let targetId = null;
//       if (Game.rooms[roomName]) {
//         const hits = rallyPos.lookFor(LOOK_STRUCTURES).concat(rallyPos.lookFor(LOOK_CREEPS));
//         if (hits.length > 0) targetId = hits[0].id;
//       }
  
//       return { roomName, role, rallyPos, targetId };
//     },
  
//     /** 每 tick 调用，执行任务 */
//     run(creep) {
// ㄑㄑ
//       const mission = this.getMissionForRole(role);
//       if (!mission) return false;
  
//       const { roomName, rallyPos, targetId } = mission;
  
//       // 阶段1：前往集结点
//       if (creep.room.name !== roomName || !creep.pos.isEqualTo(rallyPos)) {
//         creep.moveTo(rallyPos, { reusePath: 10 });
//         return true;
//       }
  
//       // 阶段2：清除敌对 Creep
//       const hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
//       if (hostile) {
//         if (role === 'ranger') {
//           if (creep.pos.getRangeTo(hostile) < 3) creep.moveTo(hostile, { range: 3, reusePath: 10 });
//           creep.rangedAttack(hostile);
//         } else {
//           if (creep.attack(hostile) === ERR_NOT_IN_RANGE) creep.moveTo(hostile, { reusePath: 10 });
//         }
//         return true;
//       }
  
//       // 阶段3：清除敌对建筑（非 controller）
//       const hostileStruct = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
//         filter: s => s.structureType !== STRUCTURE_CONTROLLER
//       });
//       if (hostileStruct) {
//         if (role === 'ranger') {
//           if (creep.pos.getRangeTo(hostileStruct) < 3) creep.moveTo(hostileStruct, { range: 3, reusePath: 10 });
//           creep.rangedAttack(hostileStruct);
//         } else {
//           if (creep.attack(hostileStruct) === ERR_NOT_IN_RANGE) creep.moveTo(hostileStruct, { reusePath: 10 });
//         }
//         return true;
//       }
  
//       // 阶段4：攻击指定目标
//       if (targetId) {
//         const target = Game.getObjectById(targetId);
//         if (target) {
//           if (role === 'ranger') {
//             if (creep.pos.getRangeTo(target) < 3) creep.moveTo(target, { range: 3, reusePath: 10 });
//             creep.rangedAttack(target);
//           } else {
//             if (creep.attack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 10 });
//           }
//           return true;
//         }
//       }
  
//       return false;
//     }
//   };
  
//   module.exports = attackMission;



  const attackMission = {
    /** 手动设置跨房间集结点 */
    setRallyPos(x, y, roomName) {
      if (!Memory.attackMission) Memory.attackMission = {};
      Memory.attackMission.manualRally = { x, y, roomName: roomName.toUpperCase() };
      console.log(`Manual rally set to ${x},${y} in ${roomName.toUpperCase()}`);
    },
  
    /** 清除手动集结点 */
    clearRallyPos() {
      if (Memory.attackMission) delete Memory.attackMission.manualRally;
      console.log('Manual rally position cleared');
    },
  
    /** 根据角色获取对应任务信息 */
    getMissionForRole(role) {
      let rallyPos;
      if (Memory.attackMission && Memory.attackMission.manualRally) {
        const m = Memory.attackMission.manualRally;
        rallyPos = new RoomPosition(m.x, m.y, m.roomName);
      } else {
        const flagName = role === 'attacker' ? 'a' : role === 'ranger' ? 'r' : null;
        if (!flagName || !Game.flags[flagName]) return null;
        rallyPos = Game.flags[flagName].pos;
      }
      const roomName = rallyPos.roomName;
  
      let targetId = null;
      if (Game.rooms[roomName]) {
        const hits = rallyPos.lookFor(LOOK_STRUCTURES).concat(rallyPos.lookFor(LOOK_CREEPS));
        if (hits.length > 0) targetId = hits[0].id;
      }
  
      return { roomName, role, rallyPos, targetId };
    },
  
    /** 每 tick 调用，执行任务，使用状态机控制：rally -> arm */
    run(creep) {
      const role = creep.memory.role;
      // 默认状态
      if (!creep.memory.attack_state) {
        creep.memory.attack_state = 'rally';
      }
  
      const mission = this.getMissionForRole(role);
      if (!mission) return false;
      const { roomName, rallyPos, targetId } = mission;
  
      switch (creep.memory.attack_state) {
        case 'rally':
          // 阶段1：前往或到达集结范围
          if (creep.room.name !== roomName || creep.pos.getRangeTo(rallyPos) > 4) {
            creep.moveTo(rallyPos, { reusePath: 10 });
            return true;
          }
          // 进入集结范围（4 格以内）后切换到攻击状态
          creep.memory.attack_state = 'arm';
          return true;
  
        case 'arm':
          // 阶段2：清除敌对 Creep
          const hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
          if (hostile) {
            if (role === 'ranger') {
              if (creep.pos.getRangeTo(hostile) > 3) creep.moveTo(hostile, { range: 3, reusePath: 10 });
              creep.rangedAttack(hostile);
            } else {
              if (creep.attack(hostile) === ERR_NOT_IN_RANGE) creep.moveTo(hostile, { reusePath: 10 });
            }
            return true;
          }
  
          // 阶段3：清除敌对建筑（非 controller）
          const hostileStruct = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: s => s.structureType !== STRUCTURE_CONTROLLER
          });
          if (hostileStruct) {
            if (role === 'ranger') {
              if (creep.pos.getRangeTo(hostileStruct) > 3) creep.moveTo(hostileStruct, { range: 3, reusePath: 10 });
              creep.rangedAttack(hostileStruct);
            } else {
              if (creep.attack(hostileStruct) === ERR_NOT_IN_RANGE) creep.moveTo(hostileStruct, { reusePath: 10 });
            }
            return true;
          }
  
          // 阶段4：攻击指定目标
          if (targetId) {
            const target = Game.getObjectById(targetId);
            if (target) {
              if (role === 'ranger') {
                if (creep.pos.getRangeTo(target) > 3) creep.moveTo(target, { range: 3, reusePath: 10 });
                creep.rangedAttack(target);
              } else {
                if (creep.attack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 10 });
              }
              return true;
            }
          }
  
          // 没有目标时可选择重置状态或保持防御
          // creep.memory.attack_state = 'rally'; // 如果想循环集结
          return false;
  
        default:
          creep.memory.attack_state = 'rally';
          return false;
      }
    }
  };
  
  module.exports = attackMission;