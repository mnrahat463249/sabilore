require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function clean() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'sabilore_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        

        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        
        try { await pool.query('TRUNCATE TABLE order_items'); } catch {  }
        try { await pool.query('TRUNCATE TABLE orders'); } catch {  }

        
        try { await pool.query('TRUNCATE TABLE activity_logs'); } catch {  }

        
        try { await pool.query('TRUNCATE TABLE return_requests'); } catch {  }

        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
clean();
