const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089', {
    origin: 'https://ais-pre-6jshotgi3mewsyvrdbbaen-585809904110.us-west2.run.app'
});

ws.on('open', () => {
    console.log('Opened');
    ws.send(JSON.stringify({ ping: 1 }));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.close();
});

ws.on('error', (err) => {
    console.error('Error:', err.message);
});
