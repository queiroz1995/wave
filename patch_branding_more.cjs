const fs = require('fs');
let content = fs.readFileSync('src/components/bot/StrategySettings.tsx', 'utf8');
content = content.replace(/Ajustes I\.A WAVE/g, 'Ajustes I.A RICO');
content = content.replace(/núcleo da I\.A WAVE/g, 'núcleo da I.A RICO');
fs.writeFileSync('src/components/bot/StrategySettings.tsx', content);

let dlContent = fs.readFileSync('src/components/DashboardLayout.tsx', 'utf8');
dlContent = dlContent.replace(/PAINEL DE FUNDO NUCLEO WAVE/g, 'PAINEL DE FUNDO NUCLEO RICO');
fs.writeFileSync('src/components/DashboardLayout.tsx', dlContent);
