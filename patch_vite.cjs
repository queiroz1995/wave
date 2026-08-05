const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(/,\s*build:\s*\{\s*rollupOptions:\s*\{\s*output:\s*\{\s*manualChunks[\s\S]*?\}\s*\}\s*\}\s*\}\s*\}/, '\n}');
fs.writeFileSync('vite.config.ts', content);
