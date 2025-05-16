/**
 * 模組：roadPlanner
 * 功能：自動在 creep 走過的 swamp 上建造道路
 */

const roadPlanner = {
    /**
     * 自動在 swamp 上建造道路（每5 tick 檢查一次）
     * @param {Creep} creep
     */
    buildOnSwamp(creep) {
        // 每5tick執行一次，避免過度呼叫
        if (Game.time % 10 !== 0) return;

        const terrain = creep.room.lookForAt(LOOK_TERRAIN, creep.pos.x, creep.pos.y)[0];

        if (terrain === 'swamp') {
            // 確認目前位置是否已有道路或施工中
            const hasRoad = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos)
                .some(s => s.structureType === STRUCTURE_ROAD);
            const hasSite = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, creep.pos)
                .some(s => s.structureType === STRUCTURE_ROAD);

            if (!hasRoad && !hasSite) {
                creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
            }
        }
    }
};

module.exports = roadPlanner;
