const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();


const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sabilore_db',
    waitForConnections: true,
    connectionLimit: 30,           
    maxIdle: 10,                   
    idleTimeout: 30000,            
    queueLimit: 100,               
    connectTimeout: 8000,          
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,  
    multipleStatements: false,     
    timezone: '+06:00',            
    charset: 'utf8mb4',            
    decimalNumbers: true,          
});


(async () => {
    try {
        const connection = await pool.getConnection();
        
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed. Ensure MySQL is running!');
        console.error('Error:', err.message);
        
    }
})();


pool.on('error', (err) => {
    console.error('⚠️  DB Pool Error:', err.code, '-', err.message);
    
});

module.exports = pool;
