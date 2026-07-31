const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ active_symbols: 'brief' }));
});
ws.on('message', (data) => {
  const d = JSON.parse(data);
  const v = d.active_symbols.filter(s => s.symbol.includes('R_100') || s.symbol.includes('1HZ10V'));
  console.log(v.map(s => s.symbol));
  ws.close();
});
