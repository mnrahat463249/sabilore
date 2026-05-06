const https = require('https');
https.get('https://sabilore.com/', (res) => {
    let html = '';
    res.on('data', (c) => html += c);
    res.on('end', () => {
        const m = html.match(/style\.min\.css\?v=([^']+)/);
 if(m) {
 console.log('Live HTML has v=', m[1]);
 https.get('https://sabilore.com/css/style.min.css?v=' + m[1], (cRes) => {
 let css='';
 cRes.on('data', c => css += c);
 cRes.on('end', () => {
 console.log('Live CSS size:', css.length);
 });
 });
 } else {
 console.log('No match found');
 }
 });
});
