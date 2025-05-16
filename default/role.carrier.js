

// roleCarrier.js
// 高效版 Carrier：收集墓碑、落地能量、注册容器、储存能量，并按优先级运送到 Spawn/Extension → Tower → Link → Controller 容器 → Storage
const containerManager = require('containerMgr');
const controllerContainerScan = require('controllerContainerScan');
const { Linkconfig } = require('./linkTransfer'); // 导入 Linkconfig

const ENERGY_PRIORITY = { // 此优先级常量已定义，但未在 findEnergySource/Target 中明确用于排序。顺序由 if/else 结构隐含。
    TOMBSTONE: 1,
    DROPPED: 2,
    CONTAINER: 3,
    STORAGE: 4,
    SPAWN_EXTENSION: 1,
    TOWER: 2,
    LINK_DELIVER: 2.5, // 为概念优先级添加，实际优先级按 findEnergyTarget 中的顺序排列
    CONTROLLER_CONTAINER: 3,
    STORAGE_DELIVER: 4,
};



/**
 * 查找能量來源 (使用您提供的版本)
 * @param {Creep} creep
 * @returns {Id<Structure | Ruin | Resource> | null} 能量來源 ID
 */
function findEnergySource(creep) {
    const { room, pos } = creep;
    
    // 1. 墓碑
    const tomb = pos.findClosestByPath(FIND_TOMBSTONES, {
        filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 300,
    });
    if (tomb) return tomb.id;

    // 2. 地面掉落
    const drop = pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: (r) => r.resourceType === RESOURCE_ENERGY,
    });
    if (drop) return drop.id;

    // 3. 註冊容器
    const regs = containerManager.getContainers(room) || []; // 假设 containerManager.getContainers(room) 返回 ID 数组
    let best = null; // best 应该存储找到的 container 对象，以便比较距离
    let bestContainerObject = null; 
    for (const id of regs) {
        const cont = Game.getObjectById(id);
        // 原始逻辑：cont.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getFreeCapacity()
        // 这意味着容器中的能量必须至少能填满 creep 的空余容量。
        // 如果 creep 几乎是满的，这个条件可能很难满足。
        // 考虑修改为：cont.store.getUsedCapacity(RESOURCE_ENERGY) >= Math.min(creep.store.getFreeCapacity(), 50) 
        // 或者 cont.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        if (cont && cont.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
            if (!bestContainerObject || pos.getRangeTo(cont) < pos.getRangeTo(bestContainerObject)) {
                bestContainerObject = cont;
            }
        }
    }
    if (bestContainerObject) return bestContainerObject.id;

    // 4. Storage
    // 原始逻辑：room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    // 这意味着只要 storage 里有任何能量，就可以作为来源。
    // 通常，我们会设置一个阈值，例如 storage 至少有多少能量才从中取。
    if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        return room.storage.id;
    }

    return null;
}

/**
 * 查找能量目標
 * @param {Creep} creep
 * @returns {Id<AnyStoreStructure> | null} 能量目標 ID
 */
function findEnergyTarget(creep) {
    const { room, pos } = creep;

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        return null; // 如果 creep 是空的，应该处于 'withdraw' 状态
    }

    // 1. Spawn/Extension (有条件：当 creep 在特定位置时)
    if (creep.pos.x > 29 && creep.pos.y < 21) {
        const spawnExts = room.find(FIND_MY_STRUCTURES, {
            filter: (s) =>
                (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        });
        if (spawnExts.length > 0) {
            const closestTarget = pos.findClosestByPath(spawnExts);
            if (closestTarget) return closestTarget.id;
        }
    
        // 2. Tower (在相同的位置条件下)
        const towers = room.find(FIND_MY_STRUCTURES, { // 改为 FIND_MY_STRUCTURES 以查找玩家的塔
            filter: (s) =>
                s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 450, // 塔在能量少于700时需要能量 (1000 - 300)
        });
        if (towers.length > 0) {
            const closestTower = pos.findClosestByPath(towers);
            if (closestTower) return closestTower.id;
        }
    }
    
    // 3. Link (运送到当前房间 Linkconfig 中指定的 "transfer" link)
    // 这个 "transfer" link 通常是靠近能量源的 link 或一个中转 link，它会将能量发送到中央/接收 link。
    // carrier 的任务是填满这个发送 link。
    
    if (Linkconfig && Linkconfig[room.name] && Linkconfig[room.name].transfer) {
        const designatedTransferLinkId = Linkconfig[room.name].transfer;
        const targetLink = Game.getObjectById(designatedTransferLinkId);

        if (targetLink && targetLink.structureType === STRUCTURE_LINK && targetLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            // Carrier 将能量运送到此 link。
            // 此 link 随后（根据主循环中的 linkTransfer.js 逻辑）将能量传输到其配对的 "receive" link。
            return targetLink.id;
        }
    }

    // 4. Controller Container
    const contIds = controllerContainerScan.get(room); // 假设 controllerContainerScan.get(room) 返回 ID 数组
    if (contIds && contIds.length > 0) {
        const controllerContainers = contIds
            .map((id) => Game.getObjectById(id))
            // 原始过滤器: c.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY)
            // 这表示目标的空余容量必须大于 creep 自身的空余容量。对于送货目标来说，这个条件不寻常。
            // 通常，送货时会检查目标是否有任何空余空间，或者有足够空间容纳 creep 当前携带的能量。
            .filter((c) => c && c.structureType === STRUCTURE_CONTAINER && c.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY));
            // 建议的替代过滤器:
            // .filter(c => c && c.structureType === STRUCTURE_CONTAINER && c.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY) && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0);


        if (controllerContainers.length > 0) {
            const targetControllerContainer = pos.findClosestByPath(controllerContainers);
            if (targetControllerContainer) {
                const pathLength = creep.pos.findPathTo(targetControllerContainer).length;
                // 条件：如果路径长且 creep 未满，则暂时不选择此类目标。
                if (pathLength > 30 && creep.store.getUsedCapacity(RESOURCE_ENERGY) < creep.store.getCapacity(RESOURCE_ENERGY)) {
                    // 跳过此目标类型，转到 Storage
                } else {
                    return targetControllerContainer.id;
                }
            }
        }
    }

    // 5. Storage
    if (room.storage && room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        return room.storage.id;
    }

    return null; // 未找到合适的目标
}

const roleCarrier = {
    /** @param {Creep} creep **/
    run(creep) {
    
        // 状态机: 'withdraw' 或 'deliver'
        if (creep.memory.state !== 'deliver' && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.state = 'deliver';
            delete creep.memory.sourceId; // 切换到 deliver 时清除 sourceId
            delete creep.memory.targetId; // 同时清除 targetId
        } else if (creep.memory.state !== 'withdraw' && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.state = 'withdraw';
            delete creep.memory.targetId; // 切换到 withdraw 时清除 targetId
            delete creep.memory.sourceId; // 同时清除 sourceId
        } else if (!creep.memory.state) {
            // 如果未设置状态，则进行初始化
            creep.memory.state = creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ? 'withdraw' : 'deliver';
        }


        if (creep.memory.state === 'withdraw') {
            let sourceId = creep.memory.sourceId;
            if (!sourceId) {
                sourceId = findEnergySource(creep);
                if (sourceId) {
                    creep.memory.sourceId = sourceId;
                }
            }
            
            const source = Game.getObjectById(sourceId);

            if (source) {
                let result;
                if (source instanceof Resource) { // 地面掉落的资源
                    result = creep.pickup(source);
                } else { // 墓碑, 废墟, 容器, Storage
                    result = creep.withdraw(source, RESOURCE_ENERGY);
                }

                if (result === OK) {
                    // 如果 creep 现在满了，将在下一个 tick 切换状态 (由上面的状态逻辑处理)
                    // 如果能量源现在空了，或者 creep 已经取了它能取的部分：
                    if (source instanceof Resource || (source.store && source.store.getUsedCapacity(RESOURCE_ENERGY) === 0) || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                        delete creep.memory.sourceId;
                    }
                } else if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
                } else if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_INVALID_TARGET) {
                    // 能量源为空或不再有效
                    delete creep.memory.sourceId;
                }
            } else {
                delete creep.memory.sourceId; // sourceId 无效或对象不存在
                // 保持在 withdraw 状态，如果可用，将在下一个 tick 查找新的能量源
            }
        } else { // state === 'deliver'
            let targetId = creep.memory.targetId;
            if (!targetId) {
                targetId = findEnergyTarget(creep);
                if (targetId) {
                    creep.memory.targetId = targetId;
                }
            }
            
            const target = Game.getObjectById(targetId);

            if (target) {
                const result = creep.transfer(target, RESOURCE_ENERGY);
                if (result === OK) {
                    // 如果 creep 现在空了，将在下一个 tick 切换状态 (由上面的状态逻辑处理)
                    // 如果目标已满或 creep 已空：
                    if ((target.store && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                        delete creep.memory.targetId;
                    }
                } else if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, reusePath: 10 });
                } else if (result === ERR_FULL || result === ERR_INVALID_TARGET) {
                    // 目标已满或不再有效
                    delete creep.memory.targetId;
                }
            } else {
                delete creep.memory.targetId; // targetId 无效或对象不存在
                    // 保持在 deliver 状态，如果可用，将在下一个 tick 查找新的目标
            }
        }
    },
};

module.exports = roleCarrier;



// // roleCarrier.js
// // 高效版 Carrier：收集墓碑、落地能量、注册容器、储存能量，并按优先级运送到 Spawn/Extension → Tower → Controller 容器 → Storage
// const containerManager = require('containerMgr');
// const controllerContainerScan = require('controllerContainerScan');

// const ENERGY_PRIORITY = {
//     TOMBSTONE: 1,
//     DROPPED: 2,
//     CONTAINER: 3,
//     STORAGE: 4,
//     SPAWN_EXTENSION: 1,
//     TOWER: 2,
//     CONTROLLER_CONTAINER: 3,
//     STORAGE_DELIVER: 4,
// };


// /**
//  * 查找能量來源
//  * @param {Creep} creep
//  * @returns {Id | null} 能量來源 ID
//  */
// function findEnergySource(creep) {
//     const { room, pos } = creep;

//     // 1. 墓碑
//     const tomb = pos.findClosestByPath(FIND_TOMBSTONES, {
//         filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
//     });
//     if (tomb) return tomb.id;

//     // 2. 地面掉落
//     const drop = pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
//         filter: (r) => r.resourceType === RESOURCE_ENERGY,
//     });
//     if (drop) return drop.id;

//     // 3. 註冊容器
//     const regs = containerManager.getContainers(room) || [];
//     let best = null;
//     for (const id of regs) {
//         const cont = Game.getObjectById(id);
//         if (cont && cont.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getFreeCapacity()) {
//             if (!best || pos.getRangeTo(cont) < pos.getRangeTo(best)) best = cont;
//         }
//     }
//     if (best) return best.id;

//     // 4. Storage
//     if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
//         return room.storage.id;
//     }

//     return null;
// }

// /**
//  * 查找能量目標
//  * @param {Creep} creep
//  * @returns {Id | null} 能量目標 ID
//  */
// function findEnergyTarget(creep) {
//     const { room, pos } = creep;

//     // 1. Spawn/Extension ##當位置在x> 29, y <21時
//     if (creep.pos.x > 29 && creep.pos.y < 21) { // 新增
//         const spawnExts = room.find(FIND_MY_STRUCTURES, {
//             filter: (s) =>
//                 (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
//                 s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
//         });
//         if (spawnExts.length) return pos.findClosestByPath(spawnExts).id;
    


//         // 2. Tower
//         const towers = room.find(FIND_STRUCTURES, {
//             filter: (s) =>
//                 s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 300,
//         });
//         if (towers.length) return pos.findClosestByPath(towers).id;
//     }
    
//     // // 3. link
//     // const linkIds = 

//     // 4. Controller 最近容器，并考虑长距离送能策略, 距離約50格 ##這個動作為主要任務, 但幾乎
//     const contIds = controllerContainerScan.get(room);
//     const containers = contIds
//         .map((id) => Game.getObjectById(id))
//         .filter((c) => c && c.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity());
//     if (containers.length) {
//         const target = containers[0];
//         const pathLength = creep.pos.findPathTo(target).length; //新增
//         if (pathLength > 30 && creep.store.getUsedCapacity() !== creep.store.getCapacity()) { // 修改
//             return null; // 距離大於30，或滿載，先不運送
//         }
//         return containers[0].id;
//     }

//     // 5. Storage
//     const storages = room.find(FIND_MY_STRUCTURES, { // Change to FIND_MY_STRUCTURES
//         filter: (s) =>
//             s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
//     });
//     if (storages.length) return pos.findClosestByPath(storages).id;

//     return null;
// }

// const roleCarrier = {
//     /** @param {Creep} creep **/
//     run(creep) {
//         // 初始化状态
//         if (!creep.memory.state) {
//             creep.memory.state = creep.store.getFreeCapacity() > 0 ? 'withdraw' : 'deliver';
//         }

//         // 获取当前状态
//         const state = creep.memory.state;
//         let targetId;
//         let target;

//         if (state === 'withdraw') {
//             targetId = creep.memory.sourceId || findEnergySource(creep); // 使用缓存或查找
//             target = Game.getObjectById(targetId);

//             if (target) {
//                 const result = creep.withdraw(target, RESOURCE_ENERGY);
//                 if (result === OK) {
//                     creep.memory.state = 'deliver';
//                     delete creep.memory.sourceId; // 清除
//                 } else if (result === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(target, { reusePath: 10 });
//                 }
//                 //  else { //不处理其他错误，例如资源为空, 下个tick再处理
//                 //     delete creep.memory.sourceId;  // 移除无效的 sourceId
//                 // }
//             } else {
//                 delete creep.memory.sourceId; // 目标不存在，清除缓存
//                 // creep.memory.state = 'deliver'; // 没有目标直接切换是不对的
//             }
//             if (creep.store.getFreeCapacity() === 0) {
//                 creep.memory.state = 'deliver';
//                 delete creep.memory.sourceId;
//             }
//         } else {
//             targetId = creep.memory.targetId || findEnergyTarget(creep); // 使用缓存或查找
//             target = Game.getObjectById(targetId);

//             if (target) {
//                 const result = creep.transfer(target, RESOURCE_ENERGY);
//                 if (result === OK) {
//                     creep.memory.state = 'withdraw';
//                     delete creep.memory.targetId;
//                 } else if (result === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(target, { reusePath: 10 });
//                 }
//                 // else{
//                 //     delete creep.memory.targetId;
//                 // }
//             } else {
//                 delete creep.memory.targetId; // 目标不存在，清除缓存
//                 creep.memory.state = 'withdraw';  //距離太遠返回withdraw
//             }

//             if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
//                 creep.memory.state = 'withdraw';
//                 delete creep.memory.targetId;
//             }
//         }
//     },
// };

// module.exports = roleCarrier;
