const https = require('https');
https.get('https://sabilore.com/css/style.min.css?bust=123', (res) => {
    console.log('Headers:', res.headers);
});
