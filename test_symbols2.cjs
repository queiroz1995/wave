const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
    console.log("Connected");
    ws.send(JSON.stringify({ active_symbols: 'brief' }));
});

let allData = "";
ws.on('message', (data) => {
    allData += data.toString();
    try {
        const msg = JSON.parse(allData);
        if (msg.error) {
            console.error("Error:", msg.error);
            process.exit(1);
        }
        if (msg.msg_type === 'active_symbols') {
            const symbols = msg.active_symbols
                .filter(s => s.symbol.startsWith('1HZ') || s.symbol.startsWith('R_'))
                .map(s => s.symbol);
            console.log("Found symbols:", symbols.join(', '));
            process.exit(0);
        }
    } catch (e) {
        // waiting
    }
});
