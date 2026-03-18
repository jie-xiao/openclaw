const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');
const lines = c.split('\n');

const fixed = lines.map(l => {
  // 修复 botName 行 - 确保有正确的引号
  if (l.includes('"botName":') && l.includes('分析') && !l.endsWith('"')) {
    // 找到并修复
    const match = l.match(/"botName": "([^"]+)/);
    if (match) {
      return `"botName": "${match[1]}",`;
    }
  }
  if (l.includes('"botName":') && l.includes('工程') && !l.endsWith('"')) {
    const match = l.match(/"botName": "([^"]+)/);
    if (match) {
      return `"botName": "${match[1]}",`;
    }
  }
  if (l.includes('"botName":') && l.includes('销') && !l.endsWith('"')) {
    const match = l.match(/"botName": "([^"]+)/);
    if (match) {
      return `"botName": "${match[1]}",`;
    }
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
