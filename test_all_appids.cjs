const WebSocket = require('ws');

const testTokenWithAppId = (appId, token) => {
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
        
        ws.on('open', () => {
            ws.send(JSON.stringify({ authorize: token }));
        });
        
        ws.on('message', (data) => {
            const resp = JSON.parse(data.toString());
            console.log(`[AppID ${appId}] msg_type: ${resp.msg_type}, error:`, resp.error ? resp.error.message : 'SUCCESS!');
            if (resp.authorize) {
                console.log(`[AppID ${appId}] Authorize output:`, resp.authorize);
            }
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
    const appIds = ['1089', '36300', '60000', '16929', '29864', '31010'];
    const token = '33yxEj8JnVc9XRyM6aB2n';
    for (const id of appIds) {
        await testTokenWithAppId(id, token);
    }
})();
