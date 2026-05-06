const https = require('https');
https.get('https://sabilore.com/css/style.min.css', (cRes) => {
    let css='';
    cRes.on('data', c => css += c);
    cRes.on('end', () => {
        console.log('Live CSS size:', css.length);
        console.log('Start:', css.substring(0, 150));
    });
});
