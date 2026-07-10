const fs = require('fs');
let content = fs.readFileSync('src/components/bot/ConnectionPanel.tsx', 'utf8');

content = content.replace(/        broker, setBroker,\n/g, '');
content = content.replace(/        pumabrokerToken, setPumabrokerToken,\n/g, '');
content = content.replace(/        pumabrokerUserId, setPumabrokerUserId,\n/g, '');

fs.writeFileSync('src/components/bot/ConnectionPanel.tsx', content);
