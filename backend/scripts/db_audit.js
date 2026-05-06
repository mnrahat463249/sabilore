require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME
    });

    
    const [tables] = await pool.execute('SHOW TABLES');
    const key = Object.keys(tables[0])[0];
    const tableNames = tables.map(r => r[key]);

    
    
    for (const t of tableNames) {
        const [[row]] = await pool.execute('SELECT COUNT(*) as n FROM `' + t + '`');
        
    }

    
    
    for (const t of ['products','orders','customers','users','blog_posts']) {
        if (!tableNames.includes(t)) continue;
        try {
            const [[row]] = await pool.execute('SELECT MIN(created_at) as oldest FROM `' + t + '`');
            
        } catch {  }
    }

    
    
    for (const t of ['products','orders','customers','users','blog_posts']) {
        if (!tableNames.includes(t)) continue;
        const cols = {products: 'name', orders: 'id', customers: 'email', users: 'email', blog_posts: 'title'};
        const col = cols[t];
        try {
            const [[row]] = await pool.execute("SELECT COUNT(*) as n FROM `" + t + "` WHERE `" + col + "` LIKE '%test%' OR `" + col + "` LIKE '%demo%' OR `" + col + "` LIKE '%dummy%'");
            
        } catch {  }
    }

    await pool.end();
}
run().catch(e => console.error('ERROR:', e.message));
