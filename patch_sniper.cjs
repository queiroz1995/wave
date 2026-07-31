const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardLayout.tsx', 'utf8');
content = content.replace(/WAVE SNIPER/g, 'RICO SNIPER');
content = content.replace(/Wave Intelligence v2\.4/g, 'Rico Intelligence v2.0');
fs.writeFileSync('src/components/DashboardLayout.tsx', content);
