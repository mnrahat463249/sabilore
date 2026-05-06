const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testCache() {
    

    
    const fetchArrivals = () => new Promise(res => {
        http.get('http://localhost:5001/api/products/new-arrivals', (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => {
                 let parsed;
                 try { parsed = JSON.parse(data); } catch { parsed = []; }
                 res(parsed);
            });
        });
    });

    const initData = await fetchArrivals();
    

    
    const token = jwt.sign({ id: 1, email: 'sabiloreofficial@gmail.com', role: 'admin' }, process.env.JWT_SECRET || 'fallback', { expiresIn: '1h' });
    

    const cacheClearResponse = await new Promise(res => {
        const req = http.request('http://localhost:5001/api/admin/clear-cache', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => res(data));
        });
        req.end();
    });

    

    
    const newData = await fetchArrivals();
    
}

testCache();
