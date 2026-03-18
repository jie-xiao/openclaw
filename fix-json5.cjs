const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');
const lines = c.split('\n');

const fixedLines = lines.map(line => {
  if (line.includes('@大管')) {
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
