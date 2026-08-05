const WebSocket = require('ws');

const testAuth = (appId) => {
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`, {
            origin: 'https://www.google.com'
        });
        
        ws.on('open', () => {
            console.log(`[${appId}] Connected. Sending authorize...`);
            ws.send(JSON.stringify({ authorize: 'dummy_token_12345' }));
        });
        
        ws.on('message', (data) => {
            console.log(`[${appId}] Response:`, data.toString());
            ws.close();
            resolve();
        });
        
        ws.on('error', (err) => {
            console.error(`[${appId}] Error:`, err.message);
            resolve();
        });
    });
};

(async () => {
    await testAuth('36300');
    await testAuth('1089');
})();
