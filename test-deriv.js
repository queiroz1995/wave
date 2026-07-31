const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ ticks: '1HZ10V', subscribe: 1 }));
});
ws.on('message', (data) => {
  console.log(data.toString());
  ws.close();
});
