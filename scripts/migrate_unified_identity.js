const db = require('../backend/config/db');

async function migrate() {
    
    try {
        
        
        await db.execute('ALTER TABLE customers MODIFY COLUMN email VARCHAR(255) NULL');
        

        
        
        
        const [indices] = await db.execute('SHOW INDEX FROM customers WHERE Column_name = "phone" AND Non_unique = 0');
        if (indices.length === 0) {
            await db.execute('ALTER TABLE customers ADD UNIQUE (phone)');
            
        } else {
            
        }

        
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
}

migrate();
