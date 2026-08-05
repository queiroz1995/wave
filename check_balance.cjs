const fs = require('fs');
const content = fs.readFileSync('src/components/bot/MultiMarketScreen.tsx', 'utf8');
const lines = content.split('\n');
let round = 0, curly = 0;
for(let i=0; i<lines.length; i++) {
  const line = lines[i];
  for (let c of line) {
    if (c === '(') round++;
    else if (c === ')') round--;
    else if (c === '{') curly++;
    else if (c === '}') curly--;
  }
  if (round > 0 || curly > 0) {
      // console.log(`Line ${i+1}: round=${round} curly=${curly}`);
  }
}
console.log({round, curly});
