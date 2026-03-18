const fs = require('fs');
let content = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');

// 修复损坏的引号 - 使用正确的引号字符
content = content.replace(/工程"\s*,/g, '工程",');
content = content.replace(/分析"\s*,/g, '分析",');
content = content.replace(/销"\s*,/g, '销",');
content = content.replace(/"@大管"\s*,/g, '"@大管家",');
content = content.replace(/"@分析"\s*,/g, '"@分析",');
content = content.replace(/"@工程"\s*,/g, '"@工程",');
content = content.replace(/"@销"\s*,/g, '"@销",');

// 写回文件
fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', content, 'utf8');
console.log('Done');
