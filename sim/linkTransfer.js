/**
 * linktransfer.js
 * * 控制 link 的能量傳輸
 * - 檢查 sourceLink 和 targetLink 是否存在且有效。
 * - 只有當 targetLink 有足夠的剩餘容量時才傳輸能量。
 * - 處理 link 的冷卻時間，避免過度傳輸。
 * - 增加日誌記錄，提供更多關於傳輸狀態的資訊。
 * - 模組化，以便於在其他地方重複使用。
 */
const Linkconfig = {
    'W25N47': {transfer: '6822d6ed346e2d429bcd6fef', receive: '6822e8073af8a7d65672e6e5'} // Ensure IDs are strings
    // Add other rooms and their link IDs here if needed
    // Example: 'W24N47': { transfer: 'linkIdTransferRoom2', receive: 'linkIdReceiveRoom2' }
};


const linkTransfer = {
    /**
     * 處理 link 之間的能量傳輸。
     *
     * @param {StructureLink} sourceLink - 傳輸能量的來源 link。
     * @param {StructureLink} targetLink - 接收能量的目標 link。
     * @returns {number} - 傳輸結果的返回值 (OK, ERR_FULL, ERR_NOT_ENOUGH_ENERGY, ERR_INVALID_TARGET, ERR_TIRED)。
     */
     
     
     
    transferEnergy(sourceLink, targetLink) {
        // 檢查 link 是否存在
        if (!sourceLink) {
            console.log(`Link 傳輸錯誤：來源 link 不存在`);
            return ERR_INVALID_ARGS;
        }
        if (!targetLink) {
            console.log(`Link 傳輸錯誤：目標 link 不存在`);
            return ERR_INVALID_ARGS;
        }

        // 檢查目標 link 是否有足夠的剩餘容量
        const targetFreeCapacity = targetLink.store.getFreeCapacity(RESOURCE_ENERGY);
        if (targetFreeCapacity === 0) {
            //console.log(`Link 傳輸：目標 link ${targetLink.id} 已滿`);
            return ERR_FULL;
        }

        // 檢查來源 link 是否有足夠的能量
        const sourceEnergy = sourceLink.store[RESOURCE_ENERGY];
        if (sourceEnergy === 0) {
            //console.log(`Link 傳輸：來源 link ${sourceLink.id} 沒有能量`);
            return ERR_NOT_ENOUGH_ENERGY;
        }

        // 確定要傳輸的能量數量
        const transferAmount = Math.min(sourceEnergy, targetFreeCapacity);

        // 檢查 link 是否處於冷卻中
        if (sourceLink.cooldown > 0) {
           // console.log(`Link 傳輸：來源 link ${sourceLink.id} 仍在冷卻中，剩餘 ${sourceLink.cooldown} ticks`);
            return ERR_TIRED;
        }
        // 執行能量傳輸
        const result = sourceLink.transferEnergy(targetLink, transferAmount);
        if (result === OK) {
            console.log(`Link 傳輸：成功傳輸 ${transferAmount} 能量從 ${sourceLink.id} 到 ${targetLink.id}`);
        } else {
            console.log(`Link 傳輸錯誤：傳輸失敗，錯誤代碼 ${result}`);
        }
        return result;
    }
};

module.exports = { linkTransfer, Linkconfig };