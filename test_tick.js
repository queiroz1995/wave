const tickValue = 123.4;
const str = String(tickValue).replace(/[^\d]/g, '').slice(-1);
console.log(str);
