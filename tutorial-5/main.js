/* main.js
用來全局管理,
*/

var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleMiner = require('role.miner');
const roleCarrier = require('role.carrier');


const repairManager = require('repairManager');
const containerMgr = require('containerMgr');
const spawnManager = require('spawnManager');
const extensionPlanner = require('extensionBuildAuto');
const taskDecision = require('taskDecision')
const carrierMission = require('carrierMission')

global.extensionPlanner= extensionPlanner;



module.exports.loop = function () {
    
    for (let name in Game.rooms) {
    containerMgr.run(Game.rooms[name]); //掃描 container並發布任務
    repairManager.run(Game.rooms[name]);
    carrierMission.scanTasks(Game.rooms[name])//掃描要維修建築
    }
    
    
    // extensionPlanner.planExtensions('sim', 'Spawn1');
    const spawn = Game.spawns['Spawn1'];
    
    if (!spawn.spawning){
        spawnManager.spawnCreeps(spawn);
    }

    // var tower = Game.getObjectById('5e91eaadadd582b775758afc');
    // if(tower) {
    //     var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
    //         filter: (structure) => structure.hits < structure.hitsMax
    //     });
    //     if(closestDamagedStructure) {
    //         tower.repair(closestDamagedStructure);
    //     }

    //     var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    //     if(closestHostile) {
    //         tower.attack(closestHostile);
    //     }
    // }

    for(var name in Game.creeps) {
        // 清理死掉的 creep 内存
        if (!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log(`Memory Cleanup: removed memory of creep ${name}`);
            }
            
            
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            if(taskDecision.hasHarvestWork(creep.room)){
                creep.say("H:H");
                roleHarvester.run(creep);
            }
            else if(taskDecision.hasBuildWork(creep.room)){
                roleBuilder.run(creep);
            }
            else if(taskDecision.hasRepairWork(creep)){
                taskDecision.doRepair(creep);
            }
            else{
                roleUpgrader.run(creep);
            }
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'builder') {
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
        if(creep.memory.role == 'repairer') {
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
        
        if(creep.memory.role == 'miner') {
            roleMiner.run(creep);
        }
        
        if(creep.memory.role == 'carrier') {
            roleCarrier.run(creep);
        }


    }
}