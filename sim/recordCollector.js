// recordCollector.js
// 脚本：从 Screeps 服务器获取 Memory.statistics 并写入 record.json
// 使用官方 HTTP API，需要在本地运行

const ScreepsAPI = require('screeps-api');
const fs = require('fs');

// 配置你的 Screeps 帐号和服务器信息
const api = new ScreepsAPI({
  email: 'e0987b0066@gmail.com',      // 填你的注册邮箱
  password: '0d740bec-3205-433e-9472-2e772571923b',            // 填你的登录密码（可用 token 替代）
  branch: 'default',                    // 分支名称
  ptr: false                            // 是否连接 PTR 环境
});

/**
 * 拉取服务器端 Memory.statistics 并写入 record.json
 */
async function fetchAndStore() {
  try {
    // 获取全局 memory
    const memory = await api.raw.get('memory/statistics');
    const data = memory.body; // 服务器返回结构中 body 包含 memory.statistics

    // 写入本地文件
    fs.writeFileSync('record.json', JSON.stringify(data, null, 2));
    console.log(`[${new Date().toISOString()}] record.json 更新成功`);
  } catch (err) {
    console.error('拉取或写入失败：', err.message);
  }
}

// 定时周期（每 5 分钟运行一次）
fetchAndStore();
setInterval(fetchAndStore, 5 * 60 * 1000);
