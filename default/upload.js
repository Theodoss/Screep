// upload.js
const fs = require('fs');
const { ScreepsAPI } = require('screeps-api');

// 用你在 Screeps 网站 “Account → Auth Tokens” 拿到的 token
const api = new ScreepsAPI({
  token: '0d740bec-3205-433e-9472-2e772571923b',
  protocol: 'https',
  hostname: 'screeps.com',
  port: 443
});

(async () => {
  // 1) 扫描所有本地 .js 文件，组装成 { 模块名: 源码 } 对象
  const modules = {};
  fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.js'))
    .forEach(f => {
      const name = f.replace(/\.js$/, '');
      modules[name] = fs.readFileSync(f, 'utf8');
    });

  // 2) 上传到 default 分支
  await api.code.set('default', modules);
  console.log('✅ 上传完成！');
})();
