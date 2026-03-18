const fs = require('fs');

let content = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');

// 修复各种编码导致的引号问题
// 匹配 "name": "X", 格式中缺少右引号的情况
content = content.replace(/"@大管[^"]+",/g, '"@大管家",');
content = content.replace(/"@分析[^"]+",/g, '"@分析",');
content = content.replace(/"@工程[^"]+",/g, '"@工程",');
content = content.replace(/"@销[^"]+",/g, '"@销",');
content = content.replace(/"@技[^"]+",/g, '"@技术",');
content = content.replace(/"name": "[^"]+",$/gm, (match) => {
  // 确保引号闭合
  return match;
});

// 写回文件
fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', content, 'utf8');
console.log('Done');

// 验证 JSON
try {
  JSON.parse(content);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
  console.log('Position:', e.message.match(/position (\d+)/)?.[1]);
}
