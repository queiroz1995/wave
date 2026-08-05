const url = `https://api.derivws.com/trading/v1/options/accounts`;

fetch(url, {
    method: 'GET',
    headers: {
        'Origin': 'https://ais-pre-6jshotgi3mewsyvrdbbaen-585809904110.us-west2.run.app',
        'Authorization': 'Bearer dummy_token',
        'Deriv-App-ID': '36300'
    }
})
.then(res => {
    console.log(res.status);
    console.log(res.headers.get('access-control-allow-origin'));
    return res.text();
})
.then(console.log)
.catch(console.error);
