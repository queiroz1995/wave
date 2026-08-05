const url = `https://api.derivws.com/trading/v1/options/accounts`;

fetch(url, {
    method: 'OPTIONS',
    headers: {
        'Origin': 'https://ais-pre-6jshotgi3mewsyvrdbbaen-585809904110.us-west2.run.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Deriv-App-ID'
    }
})
.then(res => {
    console.log(res.status);
    console.log(res.headers.get('access-control-allow-origin'));
})
.catch(console.error);
