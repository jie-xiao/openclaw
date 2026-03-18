const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');
const lines = c.split('\n');

const fixedLines = lines.map(line => {
  // 跳过已经修复的行
  if (line.includes('@大管家')) return line;
  
  // 修复各种编码问题
  if (line.includes('@大管') && line.includes(',')) {
    return '            "@大管家",';
  }
  if (line.includes('@分析') && line.includes(',')) {
    return '            "@分析",';
  }
  if (line.includes('@工程') && line.includes(',')) {
    return '            "@工程",';
  }
  if (line.includes('@销') && line.includes(',')) {
    return '            "@销售",';
  }
  if (line.includes('@技') && line.includes(',')) {
    return '            "@技术",';
  }
  
  // 修复 "name": "X" 格式中缺少引号的问题
  // 匹配 "name": " 后跟非引号字符，最后是 , 而不是 "
  if (line.match(/\"name\":\s*\"[^\"]+,\s*$/)) {
    // 找到缺少闭合引号的值
    const match = line.match(/\"name\":\s*\"([^\"]+),/);
    if (match && !line.includes('",')) {
      return line.replace(match[1], match[1] + '"');
    }
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
  const pos = e.message.match(/position (\d+)/);
  if (pos) {
    const charPos = parseInt(pos[1]);
    const before = fixedContent.substring(Math.max(0, charPos-50), charPos);
    const after = fixedContent.substring(charPos, charPos+50);
    console.log('Error around:', before, '|', after);
  }
}
