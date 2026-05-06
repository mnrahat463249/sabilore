require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME
    });

    

    
    try {
        const [cols] = await pool.execute("SHOW COLUMNS FROM customers LIKE 'is_blocked'");
        if (cols.length === 0) {
            await pool.execute("ALTER TABLE customers ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER city");
            
        } else {
            
        }
    } catch (e) {
        console.error('❌ Failed to fix customers.is_blocked:', e.message);
    }

    
    try {
        
        const [tables] = await pool.execute("SHOW TABLES LIKE 'return_requests'");
        if (tables.length === 0) {
            
            await pool.execute(`
                CREATE TABLE return_requests (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT NOT NULL,
                    product_id INT DEFAULT NULL,
                    customer_id INT DEFAULT NULL,
                    reason TEXT NOT NULL,
                    return_type VARCHAR(50) DEFAULT 'Refund',
                    return_method VARCHAR(50) DEFAULT 'Courier',
                    payment_method VARCHAR(50) DEFAULT NULL,
                    account_number VARCHAR(100) DEFAULT NULL,
                    status VARCHAR(50) DEFAULT 'Pending',
                    admin_notes TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
        } else {
            
            const [custIdCols] = await pool.execute("SHOW COLUMNS FROM return_requests LIKE 'customer_id'");
            if (custIdCols.length === 0) {
                await pool.execute("ALTER TABLE return_requests ADD COLUMN customer_id INT DEFAULT NULL AFTER product_id");
                
            } else {
                
            }

            
            const [adminNotesCols] = await pool.execute("SHOW COLUMNS FROM return_requests LIKE 'admin_notes'");
            if (adminNotesCols.length === 0) {
                await pool.execute("ALTER TABLE return_requests ADD COLUMN admin_notes TEXT DEFAULT NULL");
                
            }

            
            const [statusCols] = await pool.execute("SHOW COLUMNS FROM return_requests LIKE 'status'");
            if (statusCols.length === 0) {
                await pool.execute("ALTER TABLE return_requests ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'");
                
            }
        }
    } catch (e) {
        console.error('❌ Failed to fix return_requests.customer_id:', e.message);
    }

    
    
    try {
        const [cols1] = await pool.execute("DESCRIBE customers");
        const hasBlocked = cols1.some(c => c.Field === 'is_blocked');
        
    } catch(e) {  }

    try {
        const [cols2] = await pool.execute("DESCRIBE return_requests");
        const hasCustId = cols2.some(c => c.Field === 'customer_id');
        
    } catch(e) {  }

    await pool.end();
    
}

run().catch(e => console.error('FATAL ERROR:', e.message));
