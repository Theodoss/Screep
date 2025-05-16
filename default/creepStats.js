// @ts-nocheck

/**
 * Creep 效能统计系统 - 专注于矿工效能分析
 */

const { linkTransfer } = require("./linkTransfer");

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
                }
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

        // 检测周期完成
        if (stats.currentCycle.energyCollected > 0 && currentStore === 0) {
            stats.cycleCount++;
            stats.currentCycle = {
                startTime: Game.time,
                startPos: creep.pos,
                energyCollected: 0
            };
        }

        // 更新能量统计
        if (creep.memory.delivering && currentStore === 0) {
            stats.totalEnergyDelivered += stats.currentCycle.energyCollected;
        }
    },

    // 生成效能报告
    generateReport() {
        let report = '=== 矿工效能报告 ===\n';
        report += 'Creep名称 | 身体部件(W/M/C) | 路径距离 | 实际移动Tick | 循环次数 | 净能量收益 | ROI\n';
        report += '---------|----------------|------------|--------------|------------|------------|----\n';

        for (const name in Memory.minerStats.miners) {
            const m = Memory.minerStats.miners[name];
            const lifetime = Game.time - m.birthTime;
            const netEnergy = m.totalEnergyDelivered - m.productionCost;
            const roi = ((netEnergy / m.productionCost) * 100).toFixed(1);
            
            let line = `${name} | ${m.bodyParts.work}/${m.bodyParts.move}/${m.bodyParts.carry} | `;
            line += `${m.pathDistance} | ${m.travelTicks} | ${m.cycleCount} | ${netEnergy} | ${roi}%\n`;
            report += linkTransfer;
        }

        return report;
    },

    // 清理过期数据
    cleanup() {
        for (const name in Memory.minerStats.miners) {
            if (!Game.creeps[name]) {
                delete Memory.minerStats.miners[name];
            }
        }
    }
};

module.exports = MinerStats; 