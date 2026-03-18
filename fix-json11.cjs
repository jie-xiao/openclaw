const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');
const lines = c.split('\n');

const fixed = lines.map(l => {
  // 修复缺少缩进的 botName 行
  if (l === '"botName": "分析",') {
    return '          "botName": "分析",';
  }
  if (l === '"botName": "工程",') {
    return '          "botName": "工程",';
  }
  if (l.startsWith('"botName": "销')) {
    return '          "botName": "销售",';
  }
  return l;
});

const fixedContent = fixed.join('\n');
fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', fixedContent);
console.log('Fixed');

// 验证
try {
  JSON.parse(fixedContent);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
}
