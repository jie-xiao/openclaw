const fs = require('fs');

// 读取文件
let content = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');

// 用正则表达式修复各种编码问题
// 1. 修复 "name": "X", 缺少右引号的问题
content = content.replace(/"name": "([^"]+?)",/g, (match, p1) => {
  // 检查是否已经是完整的
  if (p1.includes('"')) return match;
  return `"name": "${p1}",`;
});

// 2. 修复 mentionPatterns 中的引号问题
content = content.replace(/"@大管([^"]+?)",/g, '"@大管家",');
content = content.replace(/"@分析([^"]+?)",/g, '"@分析",');
content = content.replace(/"@工程([^"]+?)",/g, '"@工程",');
content = content.replace(/"@销([^"]+?)",/g, '"@销",');
content = content.replace(/"@技([^"]+?)",/g, '"@技术",');

// 3. 修复 botName 中的问题
content = content.replace(/"botName": "([^"]+?)" *$/gm, (match, p1) => {
  return `"botName": "${p1}"`;
});

// 写回文件
fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', content, 'utf8');
console.log('Done - checking JSON validity...');

// 尝试解析 JSON
try {
  JSON.parse(content);
  console.log('JSON is valid!');
} catch (e) {
  console.log('JSON is still invalid:', e.message);
}
