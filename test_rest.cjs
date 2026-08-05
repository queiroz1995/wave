const appId = '36300';
const token = 'dummy_pat'; // or dummy
const url = `https://api.derivws.com/trading/v1/options/accounts`;

fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Deriv-App-ID': appId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://ais-pre-6jshotgi3mewsyvrdbbaen-585809904110.us-west2.run.app'
    }
})
.then(res => res.text())
.then(t => console.log('36300:', t))
.catch(console.error);

fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Deriv-App-ID': '1089',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://ais-pre-6jshotgi3mewsyvrdbbaen-585809904110.us-west2.run.app'
    }
})
.then(res => res.text())
.then(t => console.log('1089:', t))
.catch(console.error);
