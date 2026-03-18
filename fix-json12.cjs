const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');

// 读取所有行
const lines = c.split('\n');
let fixedLines = [];
let errors = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // 检查 "name": "X", 格式但缺少结尾引号
  const nameMatch = line.match(/^\s*"name":\s*"([^"]+)"?\s*,\s*$/);
  if (nameMatch && !line.endsWith('",')) {
    // 缺少结尾引号，添加回去
    line = line.replace(/([^"]+)"?\s*,\s*$/, '$1",');
    errors.push(`Line ${i+1}: Fixed name field`);
  }
  
  // 检查 botName 字段
  const botNameMatch = line.match(/^\s*"botName":\s*"([^"]+)"?\s*,\s*$/);
  if (botNameMatch && !line.endsWith('",')) {
    line = line.replace(/([^"]+)"?\s*,\s*$/, '$1",');
    errors.push(`Line ${i+1}: Fixed botName field`);
  }
  
  fixedLines.push(line);
}

const fixedContent = fixedLines.join('\n');
fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', fixedContent);

console.log('Fixed', errors.length, 'errors');
errors.forEach(e => console.log(e));

// 验证
try {
  JSON.parse(fixedContent);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
}
