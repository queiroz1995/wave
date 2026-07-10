const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

const proxyConfig = `
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/pumabroker-api': {
        target: 'https://trade.pumabroker.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/pumabroker-api/, ''),
        secure: false
      }
    }
  },`;

content = content.replace(/server:\s*\{[\s\S]*?\},/, proxyConfig);
fs.writeFileSync('vite.config.ts', content);
