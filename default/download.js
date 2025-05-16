// download.js
const fs = require('fs');
// ← 这里要解构出 ScreepsAPI
const { ScreepsAPI } = require('screeps-api');

(async () => {
  // 用你的 token（在 Account → Auth Tokens 里拿到）和默认 HTTPS 配置
  const api = new ScreepsAPI({
    token: '0d740bec-3205-433e-9472-2e772571923b',
    protocol: 'https',
    hostname: 'screeps.com',
    port: 443,
    // path 默认就是 '/'，不用改
  });

  try {
    // 拉取 default 分支的所有模块
    const data = await api.code.get('tutorial-5');
    // data.modules 就是 { 模块名: 代码, … }
    Object.entries(data.modules).forEach(([name, code]) => {
      fs.writeFileSync(`${name}.js`, code);
      console.log(`Saved ${name}.js`);
    });
  } catch (err) {
    console.error('下载失败:', err);
  }
})();
