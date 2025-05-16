/**
 * roadPlanner.js
 * 道路规划工具，用于计算和可视化最优道路路径
 * 考虑实际维护成本：
 * - 平原: 100 能量/1000 ticks
 * - 沼泽: 500 能量/1000 ticks
 * - 墙壁: 15000 能量/1000 ticks
 */

const TERRAIN_COST = {
    PLAIN: 100,
    SWAMP: 500,
    WALL: 15000
};

const COLORS = {
    PLAIN: '#ffffff',
    SWAMP: '#ff00ff',
    WALL: '#ff0000',
    START: '#00ff00',
    END: '#ff0000'
};

const roadPlanner = {
    /**
     * 计算两点之间的最优道路路径
     * @param {String} fromRoom - 起始房间名
     * @param {Number} fromX - 起始X坐标
     * @param {Number} fromY - 起始Y坐标
     * @param {String} toRoom - 目标房间名
     * @param {Number} toX - 目标X坐标
     * @param {Number} toY - 目标Y坐标
     * @param {Object} [opts] - 可选参数
     * @param {String} [opts.color='#ffffff'] - 路径颜色
     * @param {Boolean} [opts.visualize=true] - 是否可视化
     * @param {Number} [opts.timeToLive=100] - 可视化持续时间
     * @returns {Object} 路径结果
     */
    planRoad(fromRoom, fromX, fromY, toRoom, toX, toY, opts = {}) {
        const options = {
            color: opts.color || '#ffffff',
            visualize: opts.visualize !== false,
            timeToLive: opts.timeToLive || 100
        };

        const start = new RoomPosition(fromX, fromY, fromRoom);
        const end = new RoomPosition(toX, toY, toRoom);
        
        const result = PathFinder.search(
            start,
            { pos: end, range: 1 },
            {
                plainCost: TERRAIN_COST.PLAIN,
                swampCost: TERRAIN_COST.SWAMP,
                roomCallback: (roomName) => this._createCostMatrix(roomName)
            }
        );

        if (result.path.length > 0) {
            const analysis = this._analyzePath(result.path);
            if (options.visualize) {
                this._visualizePath(result.path, start, end, options);
            }
            this._printReport(analysis, result);
            return {
                path: result.path,
                analysis: analysis
            };
        } else {
            console.log('找不到有效路径！');
            return null;
        }
    },

    /**
     * 为指定房间创建成本矩阵
     * @private
     */
    _createCostMatrix(roomName) {
        let costs = new PathFinder.CostMatrix;
        const room = Game.rooms[roomName];
        if (!room) return costs;

        // 处理现有建筑
        room.find(FIND_STRUCTURES).forEach(struct => {
            if (struct.structureType === STRUCTURE_ROAD) {
                const pos = struct.pos;
                const terrain = room.getTerrain().get(pos.x, pos.y);
                costs.set(pos.x, pos.y, terrain === TERRAIN_MASK_SWAMP ? TERRAIN_COST.SWAMP : TERRAIN_COST.PLAIN);
            } else if (struct.structureType !== STRUCTURE_CONTAINER && 
                      struct.structureType !== STRUCTURE_RAMPART) {
                costs.set(struct.pos.x, struct.pos.y, 0xff);
            }
        });

        // 处理地形
        const terrain = room.getTerrain();
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    costs.set(x, y, TERRAIN_COST.WALL);
                }
            }
        }

        return costs;
    },

    /**
     * 分析路径的地形分布和成本
     * @private
     */
    _analyzePath(path) {
        const analysis = {
            length: path.length,
            terrainStats: { plain: 0, swamp: 0, wall: 0 },
            totalCost: 0,
            rooms: new Set()
        };

        path.forEach(pos => {
            analysis.rooms.add(pos.roomName);
            const room = Game.rooms[pos.roomName];
            if (room) {
                const terrain = room.getTerrain().get(pos.x, pos.y);
                if (terrain === TERRAIN_MASK_SWAMP) {
                    analysis.terrainStats.swamp++;
                    analysis.totalCost += TERRAIN_COST.SWAMP;
                } else if (terrain === TERRAIN_MASK_WALL) {
                    analysis.terrainStats.wall++;
                    analysis.totalCost += TERRAIN_COST.WALL;
                } else {
                    analysis.terrainStats.plain++;
                    analysis.totalCost += TERRAIN_COST.PLAIN;
                }
            }
        });

        analysis.equivalentPlainTiles = analysis.totalCost / TERRAIN_COST.PLAIN;
        return analysis;
    },

    /**
     * 可视化路径
     * @private
     */
    _visualizePath(path, start, end, options) {
        path.forEach(pos => {
            const room = Game.rooms[pos.roomName];
            if (room) {
                const terrain = room.getTerrain().get(pos.x, pos.y);
                let color = options.color;
                if (terrain === TERRAIN_MASK_SWAMP) color = COLORS.SWAMP;
                if (terrain === TERRAIN_MASK_WALL) color = COLORS.WALL;

                room.visual.circle(pos.x, pos.y, {
                    fill: 'transparent',
                    radius: 0.15,
                    stroke: color,
                    timeToLive: options.timeToLive
                });
            }
        });

        // 标记起点和终点
        const startRoom = Game.rooms[start.roomName];
        const endRoom = Game.rooms[end.roomName];
        
        if (startRoom) {
            startRoom.visual.circle(start.x, start.y, {
                fill: 'transparent',
                radius: 0.25,
                stroke: COLORS.START,
                timeToLive: options.timeToLive
            });
        }
        
        if (endRoom) {
            endRoom.visual.circle(end.x, end.y, {
                fill: 'transparent',
                radius: 0.25,
                stroke: COLORS.END,
                timeToLive: options.timeToLive
            });
        }
    },

    /**
     * 打印路径分析报告
     * @private
     */
    _printReport(analysis, result) {
        console.log(`=== 最优道路规划报告 ===`);
        console.log(`路径长度: ${analysis.length} 格`);
        console.log(`地形统计:`);
        console.log(`- 平原: ${analysis.terrainStats.plain} 格 (维护成本: ${analysis.terrainStats.plain * TERRAIN_COST.PLAIN})`);
        console.log(`- 沼泽: ${analysis.terrainStats.swamp} 格 (维护成本: ${analysis.terrainStats.swamp * TERRAIN_COST.SWAMP})`);
        console.log(`- 墙壁: ${analysis.terrainStats.wall} 格 (维护成本: ${analysis.terrainStats.wall * TERRAIN_COST.WALL})`);
        console.log(`总维护成本: ${analysis.totalCost}`);
        console.log(`等效平原格数: ${analysis.equivalentPlainTiles.toFixed(1)} 格`);
        console.log(`经过房间: ${[...analysis.rooms].join(', ')}`);

        // 检查无视野房间
        const roomsWithoutVision = [...analysis.rooms].filter(roomName => !Game.rooms[roomName]);
        if (roomsWithoutVision.length > 0) {
            console.log(`警告: 以下房间没有视野，路径可能不是最优: ${roomsWithoutVision.join(', ')}`);
        }
    }
};

// 添加全局快捷方式
global.planRoad = function(fromRoom, fromX, fromY, toRoom, toX, toY, opts = {}) {
    return roadPlanner.planRoad(fromRoom, fromX, fromY, toRoom, toX, toY, opts);
};

// 为矿点规划道路的快捷方式
global.planMiningRoads = function(opts = {}) {
    const config = require('longminer').config;
    const homeSpawn = Game.rooms[config.homeRoom].find(FIND_MY_SPAWNS)[0];
    
    if (!homeSpawn) {
        console.log('找不到出生点！');
        return;
    }
    
    config.targets.forEach((target, index) => {
        console.log(`\n=== 矿点 ${index} 道路规划 ===`);
        roadPlanner.planRoad(
            config.homeRoom,
            homeSpawn.pos.x,
            homeSpawn.pos.y,
            target.roomName,
            target.rally.x,
            target.rally.y,
            opts
        );
    });
};

module.exports = roadPlanner; 