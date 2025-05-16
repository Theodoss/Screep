/**
 * attackMission.js
 * 任務分配器：
 * - 手动设置跨房间集结点
 * - 清除手动集结点
 * - 根据角色获取对应任务信息
 * - 控制 creep 行动
 *
 * 1. 將 creep 行動控制單獨分離出來 (creepActions.js)
 * 2. 編寫一個 healer 的行動腳本 (healerActions.js)
 * 3. 結束戰鬥後，以其中一個 creep 為集結點整隊，如果有 healer 將所有 creep 修好，再尋找下一個戰鬥對象
 */

const creepActions = {
    /** 內部輔助函數：執行攻擊或移動到目標 */
    _performAttack(creep, target, role) {
        if (!target) return false;

        if (role === 'ranger') {
            const rangeToTarget = creep.pos.getRangeTo(target);
            if (rangeToTarget > 3) {
                creep.moveTo(target, { range: 3, reusePath: 3, visualizePathStyle: { stroke: '#ffaa00', opacity: 0.7, lineStyle: 'dashed' } });
            }
            if (rangeToTarget <= 3) {
                creep.rangedAttack(target);
            }
        } else { // 'attacker'
            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { reusePath: 3, visualizePathStyle: { stroke: '#ff0000', opacity: 0.7 } });
            }
        }
        return true;
    },

    /**
     * 攻擊單位的行動邏輯
     * @param {Creep} creep - 要控制的 creep
     * @param {string} role - creep 的角色 ('attacker' 或 'ranger')
     * @returns {boolean} - 表示 creep 是否執行了動作
     */
    run(creep, role) {
        // 優先級 1：攻擊 5 格內的敵方單位
        const localHostileCreeps = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5);
        if (localHostileCreeps.length > 0) {
            const target = creep.pos.findClosestByRange(localHostileCreeps);
            return this._performAttack(creep, target, role);
        }

        // 優先級 2：攻擊 5 格內的敵方建築
        const localHostileStructures = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 5, {
            filter: s => s.structureType !== STRUCTURE_CONTROLLER && s.hits > 0
        });
        if (localHostileStructures.length > 0) {
            const target = creep.pos.findClosestByRange(localHostileStructures);
            return this._performAttack(creep, target, role);
        }

        // 優先級 3：攻擊更遠的敵方單位
        const distantHostileCreep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if (distantHostileCreep) {
            return this._performAttack(creep, distantHostileCreep, role);
        }

        // 優先級 4：攻擊更遠的敵方建築
        const distantHostileStructure = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: s => s.structureType !== STRUCTURE_CONTROLLER && s.hits > 0
        });
        if (distantHostileStructure) {
            return this._performAttack(creep, distantHostileStructure, role);
        }

        return false; // 沒有攻擊目標
    }
};

const healerActions = {
    /**
     * 治療單位的行動邏輯
     * @param {Creep} creep - 要控制的 creep
     * @returns {boolean} - 表示 creep 是否執行了動作
     */
    run(creep) {
        // 優先級 1：治療 3 格內的受傷友方單位
        const injuredAllies = creep.pos.findInRange(FIND_MY_CREEPS, 3, {
            filter: c => c.hits < c.hitsMax
        });
        if (injuredAllies.length > 0) {
            const target = creep.pos.findClosestByRange(injuredAllies);
            creep.heal(target);
            return true;
        }

        // 優先級 2：治療自身
        if (creep.hits < creep.hitsMax) {
            creep.heal(creep);
            return true;
        }
        return false; // 沒有治療目標
    }
};

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
            if (!flagName || !Game.flags[flagName]) {
                return null;
            }
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

    /** 每 tick 调用，执行任务，使用状态机控制：rally -> arm -> regroup -> arm */
    run(creep) {
        const role = creep.memory.role;
        const missionDetails = this.getMissionForRole(role);

        if (!missionDetails) {
            delete creep.memory.targetRallySignature;
            delete creep.memory.attack_state;
            return false;
        }

        const { rallyPos: liveRallyPos, targetId: liveTargetId } = missionDetails;

        // 初始化状态
        if (!creep.memory.attack_state) {
            creep.memory.attack_state = 'rally';
        }

        const previousRallySignature = creep.memory.targetRallySignature;
        const currentRallySignature = { x: liveRallyPos.x, y: liveRallyPos.y, roomName: liveRallyPos.roomName };

        // 检查集結點是否改變
        if (!previousRallySignature ||
            liveRallyPos.x !== previousRallySignature.x ||
            liveRallyPos.y !== previousRallySignature.y ||
            liveRallyPos.roomName !== previousRallySignature.roomName) {
            if (creep.memory.attack_state !== 'rally' || !previousRallySignature) {
                if (previousRallySignature) {
                    console.log(`${creep.name} (${role}): Rally point changed. Old: ${previousRallySignature.roomName} ${previousRallySignature.x},${previousRallySignature.y}. New: ${liveRallyPos.roomName} ${liveRallyPos.x},${liveRallyPos.y}. Switching to rally.`);
                } else {
                    console.log(`${creep.name} (${role}): Assigned rally: ${liveRallyPos.roomName} ${liveRallyPos.x},${liveRallyPos.y}. Rallying.`);
                }
                creep.memory.attack_state = 'rally';
            }
            creep.memory.targetRallySignature = currentRallySignature;
        }

        if (!creep.memory.targetRallySignature && liveRallyPos) {
            creep.memory.targetRallySignature = currentRallySignature;
            if (creep.memory.attack_state !== 'rally') {
                creep.memory.attack_state = 'rally';
            }
        }

        if (!creep.memory.targetRallySignature) {
            return false;
        }

        const targetRallyInfo = creep.memory.targetRallySignature;
        const rallyObjectivePos = new RoomPosition(targetRallyInfo.x, targetRallyInfo.y, targetRallyInfo.roomName);


        switch (creep.memory.attack_state) {
            case 'rally':
                if (creep.room.name !== rallyObjectivePos.roomName || creep.pos.getRangeTo(rallyObjectivePos) > 4) {
                    creep.moveTo(rallyObjectivePos, { reusePath: 10, visualizePathStyle: { stroke: '#00ff00', opacity: 0.5 } });
                    return true;
                }
                creep.memory.attack_state = 'arm';
                console.log(`${creep.name} (${role}): Reached rally ${rallyObjectivePos.roomName} ${rallyObjectivePos.x},${rallyObjectivePos.y}. Engaging (arm).`);
                return true;

            case 'arm':
                let targetFound = false;
                if (role === 'healer') {
                    targetFound = healerActions.run(creep);
                } else {
                    targetFound = creepActions.run(creep, role);
                }

                if (!targetFound) {
                    // 检查是否需要转移到 regroup 状态
                    const roomCreeps = creep.room.find(FIND_MY_CREEPS);
                    const enemiesNearby = roomCreeps.some(c => c.pos.findInRange(FIND_HOSTILE_CREEPS, 5).length > 0);
                    if (!enemiesNearby) {
                        creep.memory.attack_state = 'regroup';
                        console.log(`${creep.name} (${role}): No enemies nearby, switching to regroup.`);
                        // 找到新的集结点
                        creep.memory.regroupRallyPoint = this.findRegroupRallyPoint(creep);
                        return true;
                    }
                }
                return true;

            case 'regroup':
                const regroupRallyPoint = new RoomPosition(creep.memory.regroupRallyPoint.x, creep.memory.regroupRallyPoint.y, creep.memory.regroupRallyPoint.roomName);
                if (creep.pos.getRangeTo(regroupRallyPoint) > 2) {
                    creep.moveTo(regroupRallyPoint, { reusePath: 10, visualizePathStyle: { stroke: '#00ffff', opacity: 0.5 } });
                    return true;
                }

                // 治疗所有 creep
                const healers = creep.room.find(FIND_MY_CREEPS, { filter: c => c.memory.role === 'healer' });
                if (healers.length > 0) {
                    const allCreeps = creep.room.find(FIND_MY_CREEPS);
                    for (const otherCreep of allCreeps) {
                        if (otherCreep.hits < otherCreep.hitsMax) {
                            healers[0].heal(otherCreep); // 简化：只用一个 healer 治疗
                            return true;
                        }
                    }
                }

                // 检查是否可以重新进入 arm 状态
                const regroupedCreeps = creep.room.find(FIND_MY_CREEPS).filter(c => c.pos.getRangeTo(regroupRallyPoint) <= 2);
                if (regroupedCreeps.length >= 2) { // 至少要有 2 个 creep 才重新进入战斗
                    creep.memory.attack_state = 'arm';
                    console.log(`${creep.name} (${role}): Regrouped, switching to arm.`);
                    return true;
                }
                return true;

            default:
                creep.memory.attack_state = 'rally';
                if (liveRallyPos) {
                    creep.memory.targetRallySignature = { x: liveRallyPos.x, y: liveRallyPos.y, roomName: liveRallyPos.roomName };
                } else {
                    delete creep.memory.targetRallySignature;
                }
                return false;
        }
    },

    /**
     * 找到一个合适的集结点
     * @param {Creep} creep
     * @returns {RoomPosition}
     */
    findRegroupRallyPoint(creep) {
        // 1. 优先选择之前targetRallyPoint
        if (creep.memory.targetRallySignature) {
            return new RoomPosition(creep.memory.targetRallySignature.x, creep.memory.targetRallySignature.y, creep.memory.targetRallySignature.roomName);
        }
        // 2. 否则，选择自己当前位置
        return creep.pos;
    },
};

module.exports = attackMission;
