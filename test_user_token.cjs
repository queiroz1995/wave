const WebSocket = require('ws');

const testToken = (appId, token) => {
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        
        ws.on('open', () => {
            console.log(`[AppID ${appId}] Connected. Authorizing token ${token}...`);
            ws.send(JSON.stringify({ authorize: token }));
        });
        
        ws.on('message', (data) => {
            const resp = JSON.parse(data.toString());
            console.log(`[AppID ${appId}] Response:`, JSON.stringify(resp, null, 2));
            ws.close();
            resolve();
        });
        
        ws.on('error', (err) => {
            console.error(`[AppID ${appId}] Error:`, err.message);
            resolve();
        });
    });
};

(async () => {
    await testToken('1089', '33yxEj8JnVc9XRyM6aB2n');
})();
