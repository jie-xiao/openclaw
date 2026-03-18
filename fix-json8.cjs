const fs = require('fs');

let c = fs.readFileSync('C:/Users/Administrator/.openclaw/openclaw.json', 'utf8');
let changed = true;
let iterations = 0;

while (changed && iterations < 20) {
  iterations++;
  changed = false;
  
  // 检查并修复各种问题
  const lines = c.split('\n');
  let fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 跳过已经是正确格式的行
    if (line.includes('@大管家') || line.includes('@分析",') || line.includes('@工程",') || 
        line.includes('@销售",') || line.includes('@技术",')) {
      fixedLines.push(line);
      continue;
    }
    
    // 修复 mentionPatterns 中的问题
    if (line.includes('@大管') && line.includes(',')) {
      line = '            "@大管家",';
      changed = true;
    }
    else if (line.includes('@分析') && line.includes(',')) {
      line = '            "@分析",';
      changed = true;
    }
    else if (line.includes('@工程') && line.includes(',')) {
      line = '            "@工程",';
      changed = true;
    }
    else if (line.includes('@销') && line.includes(',')) {
      line = '            "@销售",';
      changed = true;
    }
    else if (line.includes('@技') && line.includes(',')) {
      line = '            "@技术",';
      changed = true;
    }
    // 修复 botName 中的问题
    else if (line.includes('"botName":') && line.includes('分析') && line.includes(',')) {
      line = '          "botName": "分析",';
      changed = true;
    }
    else if (line.includes('"botName":') && line.includes('工程') && line.includes(',')) {
      line = '          "botName": "工程",';
      changed = true;
    }
    else if (line.includes('"botName":') && line.includes('销') && line.includes(',')) {
      line = '          "botName": "销售",';
      changed = true;
    }
    
    fixedLines.push(line);
  }
  
  c = fixedLines.join('\n');
}

fs.writeFileSync('C:/Users/Administrator/.openclaw/openclaw.json', c);
console.log('Fixed in', iterations, 'iterations');

// 验证
try {
  JSON.parse(c);
  console.log('JSON is valid!');
} catch(e) {
  console.log('Invalid:', e.message);
  const pos = e.message.match(/position (\d+)/);
  if (pos) {
    const charPos = parseInt(pos[1]);
    const lines = c.split('\n');
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= charPos) {
        console.log('Error at line', i+1, 'column', charPos - currentPos);
        console.log('Line content:', lines[i]);
        break;
      }
      currentPos += lines[i].length + 1;
    }
  }
}
