const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');
const lines = c.split('\n');

const fixedLines = lines.map(line => {
  // 修复 botName 字段
  if (line.includes('"botName":') && line.includes('分析')) {
    return '          "botName": "分析",';
  }
  if (line.includes('"botName":') && line.includes('工程')) {
    return '          "botName": "工程",';
  }
  if (line.includes('"botName":') && line.includes('销')) {
    return '          "botName": "销售",';
  }
  
  return line;
});

const fixedContent = fixedLines.join('\n');
fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', fixedContent);

console.log('Fixed');

// 验证
try {
  JSON.parse(fixedContent);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
}
