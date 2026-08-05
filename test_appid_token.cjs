const WebSocket = require('ws');

const testAppId = (appId) => {
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        
        ws.on('open', () => {
            console.log(`[AppID ${appId}] Connected! Sending ping...`);
            ws.send(JSON.stringify({ ping: 1 }));
        });
        
        ws.on('message', (data) => {
            const resp = JSON.parse(data.toString());
            console.log(`[AppID ${appId}] Response:`, JSON.stringify(resp));
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
    await testAppId('33yxEj8JnVc9XRyM6aB2n');
})();
