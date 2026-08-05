const fs = require('fs');
const content = fs.readFileSync('src/components/bot/MultiMarketScreen.tsx', 'utf8');
const lines = content.split('\n');
let round = 0, curly = 0;
for(let i=0; i<lines.length; i++) {
  let lineRound = 0, lineCurly = 0;
  for (let c of lines[i]) {
    if (c === '(') { round++; lineRound++; }
    else if (c === ')') { round--; lineRound--; }
    else if (c === '{') { curly++; lineCurly++; }
    else if (c === '}') { curly--; lineCurly--; }
  }
  if (lineRound !== 0 || lineCurly !== 0) {
      console.log(`Line ${i+1}: ${lines[i].trim()} => round:${round} curly:${curly}`);
  }
}
