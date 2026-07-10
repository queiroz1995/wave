const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

// Remove the whole build block
code = code.replace(/build:\s*\{\s*rollupOptions:\s*\{\s*output:\s*\{\s*manualChunks\([\s\S]*?\}\s*\}\s*\},/g, '');

fs.writeFileSync('vite.config.ts', code);
