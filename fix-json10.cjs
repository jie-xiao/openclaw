const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');

// 修复缺少缩进的 botName 行
c = c.replace(/^botName": "分析",$/gm, '          "botName": "分析",');
c = c.replace(/^botName": "工程",$/gm, '          "botName": "工程",');
c = c.replace(/^botName": "销/gm, '          "botName": "销售",');

fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', c);
console.log('Fixed');

// 验证
try {
  JSON.parse(c);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
}
