const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');

// 修复损坏的中文字符 - 使用 Unicode 码点
// @大管 -> @大管家
c = c.replace(/\u0040\u5927\u7ba1[\u00ef\u00bf\u00bd]*[\u002c\u00ef\u00bf\u00bd]/g, '"@大管家",');
// @分析 -> @分析
c = c.replace(/\u0040\u5206\u6790[\u00ef\u00bf\u00bd]*[\u002c\u00ef\u00bf\u00bd]/g, '"@分析",');
// @工程 -> @工程
c = c.replace(/\u0040\u5de5\u7a0b[\u00ef\u00bf\u00bd]*[\u002c\u00ef\u00bf\u00bd]/g, '"@工程",');
// @销 -> @销
c = c.replace(/\u0040\u9500[\u00ef\u00bf\u00bd]*[\u002c\u00ef\u00bf\u00bd]/g, '"@销售",');
// @技 -> @技术
c = c.replace(/\u0040\u6280[\u00ef\u00bf\u00bd]*[\u002c\u00ef\u00bf\u00bd]/g, '"@技术",');

fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', c);
console.log('Done');

// 验证 JSON
try {
  JSON.parse(c);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
}
