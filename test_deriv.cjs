const WebSocket = require('ws');
console.log("Connecting...");
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
    console.log("Connected");
    ws.send(JSON.stringify({ ticks: 'R_100', subscribe: 1 }));
});
ws.on('message', (data) => {
    console.log("Received:", data.toString());
});
ws.on('error', (e) => console.error("Error:", e));
ws.on('close', () => console.log("Disconnected"));
setTimeout(() => { ws.close(); process.exit(0); }, 5000);
