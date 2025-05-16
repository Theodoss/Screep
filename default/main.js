// @ts-nocheck
/* main.js
用來全局管理,
*/

//角色相關
var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleMiner = require('role.miner');
const roleCarrier = require('role.carrier');
const towerRun  = require('tower');
const longminer = require('longminer');
const dismantle = require('wallDismantler');
const { linkTransfer, Linkconfig } = require('./linkTransfer');
const selfWallDismantler = require('selfWallDismantler');
//任務相關
const repairManager = require('repairManager');
const containerMgr = require('containerMgr');
const spawnManager = require('spawnManager');
const extensionPlanner = require('extensionBuildAuto');
const taskDecision = require('taskDecision');
const carrierMission = require('carrierMission');
const controllerContainerScan = require('controllerContainerScan');
const dc = require('dataCollector')
const roadPlanner = require('roadPlanner');
const memoryRestore = require('memory_restore'); // 导入内存恢复模块

const warSpawn = require('warSpawn')

//攻擊相關
const { spawnScheduler: ss } = require('spawnScheduler');
const am = require('attackMission');
global.extensionPlanner= extensionPlanner;

const MinerStats = require('creepStats');

const roomName ='W25N47'
const room = Game.rooms['W25N47'];


module.exports.loop = function () {
    // 只运行备份功能，检测和恢复在creep循环中进行
    memoryRestore.run();

//報告生產
    if (Game.time % 100 === 0) {
        console.log(MinerStats.generateReport());
    }


    //初始化長距能量傳輸狀態統計記憶
    if (Memory.longdismine === undefined) Memory.longdismine = {};
    if (Memory.longdismine.energy_used === undefined) Memory.longdismine.energy_used = 0;
    if (Memory.longdismine.count === undefined) Memory.longdismine.count = 0;

    // 初始化矿工统计系统
    MinerStats.init();

    // Game.creeps['scout_69232023'].moveTo(   new RoomPosition(27, 20, 'W26N47'),   { reusePath: 30, visualizePathStyle: { stroke: '#ffffff' } } );
    for (let name in Game.rooms) {
        containerMgr.run(Game.rooms[name]); //掃描 container並發布任務
        repairManager.run(Game.rooms[name]); //掃描要維修建築
        carrierMission.scanTasks(Game.rooms[name]) //掃描要輸送建築
        controllerContainerScan.scan(Game.rooms[name]) //掃描靠近controll的container
        towerRun(Game.rooms[name]) //塔的操作
        
        if(name==='W25N47'){
            const sourceLink = Game.getObjectById('6822d6ed346e2d429bcd6fef');  //  替換為你的來源 link ID
            const targetLink = Game.getObjectById('6822e8073af8a7d65672e6e5');  //  替換為你的目標 link ID
            if (sourceLink && targetLink) {
                linkTransfer.transferEnergy(sourceLink, targetLink);
            }
        }
    }
    

    ss.run();


    // 检测敌人
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    const defenseMode = hostiles.length > 0;


    // extensionPlanner.planExtensions('sim', 'Spawn1');
    const spawn = Game.spawns['Spawn1'];
    
    //Creep生產, 平常生產與戰時生產
    if (!spawn.spawning){
        (defenseMode ? warSpawn.spawnWarCreeps(spawn) : spawnManager.spawnCreeps(spawn));
    }

    // 减少内存清理频率，让备份系统有时间工作，改为每10000个tick清理一次
    if (Game.time % 10000 === 0) { // Run cleanup less frequently
            for (var name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    delete Memory.creeps[name];
                    console.log(`Memory Cleanup: removed memory of dead creep ${name}`);
        }
    }
        }
    

    
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        // 在这里检查和恢复每个creep的内存
        if (memoryRestore.isCreepMemoryLost(creep)) {
            memoryRestore.restoreCreepMemory(creep);
        }
            
        if (creep.room.name === roomName && defenseMode)
            {            
            // 战时守备：除 miner、attacker、ranger 外，其他角色优先运能给塔，再给 spawn/extension
            if (!['miner','attacker','ranger'].includes(creep.memory.role)) {
                const energy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                if (energy > 0) {
                // 优先搬能量给塔
                const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (tower) {
                    if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(tower, { reusePath: 10 });
                    }
                    continue;
                }
                // 再给 spawn/extension
                const spawnExt = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (spawnExt) {
                    if (creep.transfer(spawnExt, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawnExt, { reusePath: 10 });
                    }
                    continue;
                }
                } else {
                // 能量耗尽，采集模式：优先从最近的 Container/Storage 获取
                const withdrawTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s =>
                    (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                    s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                });
                if (withdrawTarget) {
                    if (creep.withdraw(withdrawTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(withdrawTarget, { reusePath: 10 });
                    }
                    continue;
                }
                // 回退到 Source
                const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { reusePath: 10 });
                    }
                    continue;
                        }
                    }
                }   
            }
        else if(creep.memory.role == 'harvester') {

            if(taskDecision.hasHarvestWork(creep.room)){
                creep.say("HH")
                roleHarvester.run(creep);
            }
            else if(taskDecision.hasBuildWork(creep.room)){
                creep.say("HB");
                roleBuilder.run(creep);
            }
            // else if(taskDecision.hasRepairWork(creep)){
            //     creep.say("H:R");
            //     const repairTarget = repairManager.getTarget(creep);
            //     roleRepairer.run(creep, repairTarget);
            // }
            // else{
            //     roleUpgrader.run(creep);
            //     creep.say("HU")
            // }
        }
        else if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        else if(creep.memory.role == 'builder') {
            // roleHarvester.run(creep);
            if(creep.room.find(FIND_CONSTRUCTION_SITES) ===0){
            roleHarvester.run(creep);
            // creep.say("Harvest")
            }
            else if(taskDecision.hasBuildWork(creep.room)){
                roleBuilder.run(creep);
                // creep.say("Build")
            }
            else{
                roleUpgrader.run(creep);
                // creep.say("Upgrade")
            }
        }
        else if(creep.memory.role == 'repairer') {
            const repairTarget = repairManager.getTarget(creep);
                if (repairTarget) {
                    // creep.say('repair')
                    // 如果有需要修的，执行 repairer 任务
                    roleRepairer.run(creep, repairTarget);
                    continue;
                }
        
                // —— 优先级 2：建造 ——  
                const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (sites.length > 0) {
                    // creep.say('build')
                    // 如果有建筑工地，执行 builder 任务
                    roleBuilder.run(creep);
                    continue;
                }
        
                // —— 优先级 3：采矿 ——  
                // 如果既不用修也不用建，就当作 harvester 去采矿
                // creep.say('harverst')
                roleHarvester.run(creep);
                }
        
        else if(creep.memory.role == 'miner') {
            roleMiner.run(creep);
        }
        
        else if(creep.memory.role == 'carrier') {
            roleCarrier.run(creep);
        }
        else if(creep.memory.role == 'ldminer') {
            longminer.run(creep);
        }
        else if (creep.memory.role === 'selfwdis') {
            selfWallDismantler.run(creep);
          }

        else {
            am.run(creep);
        }




    }
}