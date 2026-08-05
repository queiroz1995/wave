const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(/build:\s*\{[\s\S]*?\}\,\s*\}\,/g, '');
// just replace the whole build block
content = content.replace(/build:\s*\{\s*rollupOptions:\s*\{\s*output:\s*\{\s*manualChunks\([\s\S]*?\}\s*\}\s*\}\,/g, '');
fs.writeFileSync('vite.config.ts', content);
