// @ts-nocheck

/**
 * Creep 效能统计系统 - 专注于矿工效能分析
 */

// const { linkTransfer } = require("./linkTransfer");

const MinerStats = {
    // 初始化统计数据结构
    init() {
        if (!Memory.minerStats) {
            Memory.minerStats = {
                miners: {},
                miningLocations: {}
            };
        }
    },

    // 记录矿工初始信息
    initMinerRecord(creep, sourcePos) {
        if (!Memory.minerStats.miners[creep.name]) {
            // 计算身体部件
            const bodyCount = {
                work: creep.getActiveBodyparts(WORK),
                move: creep.getActiveBodyparts(MOVE),
                carry: creep.getActiveBodyparts(CARRY)
            };

            // 计算从出生点到矿点的路径距离
            const pathToSource = PathFinder.search(
                creep.pos,
                { pos: sourcePos, range: 1 },
                { plainCost: 2, swampCost: 10 }
            );

            Memory.minerStats.miners[creep.name] = {
                birthTime: Game.time,
                bodyParts: bodyCount,
                sourceId: sourcePos.id,
                pathDistance: pathToSource.path.length,
                totalEnergyDelivered: 0,
                cycleCount: 0,
                travelTicks: 0,
                lastPos: creep.pos,
                isMoving: false,
                productionCost: this.calculateCreepCost(creep.body),
                currentCycle: {
                    startTime: Game.time,
                    startPos: creep.pos,
                    energyCollected: 0
                },
                targetIndex: creep.memory.targetIndex
            };
        }
    },

    // 计算 creep 的生产成本
    calculateCreepCost(body) {
        return body.reduce((cost, part) => cost + BODYPART_COST[part.type], 0);
    },

    // 更新矿工统计
    update(creep, sourcePos) {
        // 确保初始化
        this.init();
        
        if (!Memory.minerStats.miners[creep.name]) {
            this.initMinerRecord(creep, sourcePos);
            return;
        }

        const stats = Memory.minerStats.miners[creep.name];
        const currentStore = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        
        // 更新移动统计
        if (!creep.pos.isEqualTo(stats.lastPos)) {
            stats.travelTicks++;
        }
        stats.lastPos = creep.pos;

        // 更新能量统计
        if (creep.memory.delivering && currentStore === 0) {
            stats.cycleCount++;
            
            // If we have energy data from the mining phase, add it to total
            if (creep.memory.minerStats && creep.memory.minerStats.currentCycleEnergy) {
                stats.totalEnergyDelivered += creep.memory.minerStats.currentCycleEnergy;
                // Reset for next cycle
                creep.memory.minerStats.currentCycleEnergy = 0;
            }
        }

        // 更新目标索引
        stats.targetIndex = creep.memory.targetIndex;
    },

    // 生成效能报告
    generateReport() {
        let report = '=== 矿工效能报告 ===\n';
        report += '矿点ID | 身体部件(W/M/C) | 路径距离 | 移动Tick | 循环次数 | 净收益  | ROI\n';
        report += '-------+----------------+----------+----------+----------+---------+-------\n';

        for (const name in Memory.minerStats.miners) {
            const m = Memory.minerStats.miners[name];
            const lifetime = Game.time - m.birthTime;
            const netEnergy = m.totalEnergyDelivered - m.productionCost;
            const roi = ((netEnergy / m.productionCost) * 100).toFixed(1);
            const targetId = m.targetIndex !== undefined ? m.targetIndex : '?';
            
            // 使用 padStart/padEnd 来对齐各列
            const formattedTargetId = targetId.toString().padStart(3, ' ').padEnd(7, ' ');
            const formattedBody = `${m.bodyParts.work}/${m.bodyParts.move}/${m.bodyParts.carry}`.padEnd(16, ' ');
            const formattedPath = m.pathDistance.toString().padStart(8, ' ').padEnd(10, ' ');
            const formattedTicks = m.travelTicks.toString().padStart(8, ' ').padEnd(10, ' ');
            const formattedCycles = m.cycleCount.toString().padStart(8, ' ').padEnd(10, ' ');
            const formattedEnergy = netEnergy.toString().padStart(7, ' ').padEnd(9, ' ');
            const formattedRoi = (roi + '%').padStart(6, ' ');

            let line = `${formattedTargetId}|${formattedBody}|${formattedPath}|${formattedTicks}|${formattedCycles}|${formattedEnergy}|${formattedRoi}\n`;
            report += line;
        }

        return report;
    },

    // 清理过期数据
    cleanup() {
        for (const name in Memory.minerStats.miners) {
            if (!Game.creeps[name]) {
                delete Memory.minerStats.miners[name];
                console.log(`已清理过期矿工数据: ${name}`);
            }
        }
        console.log("矿工统计数据清理完成！");
    }
};

// 添加全局命令（同时提供大写和小写版本）
global.minerStats = {
    cleanup: () => MinerStats.cleanup(),
    report: () => console.log(MinerStats.generateReport())
};

// 添加大写版本的全局命令，方便控制台直接访问
global.MinerStats = MinerStats;

module.exports = MinerStats; 

// minerStats.cleanup()
