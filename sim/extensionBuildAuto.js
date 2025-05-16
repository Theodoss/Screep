function planExtensions(roomName, spawnName) {
    const room = Game.rooms[roomName];
    const spawn = Game.spawns[spawnName];

    if (!room || !spawn) {
        console.log('❌ 找不到房間或 spawn');
        return;
    }

    const maxExtensionsByRCL = {
        2: 5,
        3: 10,
        4: 20,
        5: 30,
        6: 40,
        7: 50,
        8: 60
    };

    const maxExtensions = maxExtensionsByRCL[room.controller.level] || 0;
    const currentExtensions = room.find(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_EXTENSION
    }).length;

    const constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
        filter: (s) => s.structureType === STRUCTURE_EXTENSION
    }).length;

    const extensionsNeeded = maxExtensions - (currentExtensions + constructionSites);

    if (extensionsNeeded <= 0) {
        console.log('✅ Extensions 已經足夠了');
        return;
    }

    console.log(`⚙️ 需要新增 ${extensionsNeeded} 個 Extensions`);

    // 以 Spawn 為中心，螺旋狀找空格子來放 Extension
    const directions = [
        [0, -1], [1, 0], [0, 1], [-1, 0], // 上右下左
        [1, -1], [1, 1], [-1, 1], [-1, -1] // 斜向
    ];

    let range = 2; // 從 spawn 周圍第2圈開始找

    let built = 0;

    while (built < extensionsNeeded && range < 10) {
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (Math.abs(dx) !== range && Math.abs(dy) !== range) continue; // 只建最外層

                const x = spawn.pos.x + dx;
                const y = spawn.pos.y + dy;

                if (x < 0 || x >= 50 || y < 0 || y >= 50) continue; // 避免超出地圖

                const terrain = Game.map.getRoomTerrain(roomName).get(x, y);
                const structures = room.lookAt(x, y);

                // 只在平地或沼澤，而且沒有建築物的地方建
                if ((terrain === 'plain' || terrain === 'swamp') &&
                    !structures.some(s => s.type === 'structure' || s.type === 'constructionSite')) {

                    let result = room.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (result === OK) {
                        console.log(`✅ 建立 Extension 工地在 (${x}, ${y})`);
                        built++;
                        if (built >= extensionsNeeded) return;
                    }
                }
            }
        }
        range++;
    }
}
module.exports = {
    planExtensions
};