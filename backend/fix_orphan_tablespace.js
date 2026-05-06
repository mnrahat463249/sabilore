
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');
require('dotenv').config();

const TABLE = 'password_reset_tokens';
const DB    = process.env.DB_NAME || 'sabilore_db';

async function fix() {
    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST || '127.0.0.1',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: DB,
        multipleStatements: false,
    });

    

    
    const [[{ Value: datadir }]] = await conn.query("SHOW VARIABLES LIKE 'datadir'");
    const ibdPath = path.join(datadir, DB, `${TABLE}.ibd`);
    
    

    const fileExists = fs.existsSync(ibdPath);


    
    await conn.query('SET foreign_key_checks = 0');

    
    let dropped = false;
    try {
        await conn.query(`ALTER TABLE \`${TABLE}\` DISCARD TABLESPACE`);
        await conn.query(`DROP TABLE IF EXISTS \`${TABLE}\``);
        
        dropped = true;
    } catch (e1) {

        try {
            await conn.query(`DROP TABLE IF EXISTS \`${TABLE}\``);
            
            dropped = true;
        } catch (e2) {
            
        }
    }

    
    if (!dropped && fileExists) {
        try {
            fs.unlinkSync(ibdPath);
            
            
            try {
                await conn.query(`DROP TABLE IF EXISTS \`${TABLE}\``);
                
            } catch {  }
        } catch (delErr) {
            console.error(`❌ Could not delete file: ${delErr.message}`);
            console.error(`   → Try running this script as Administrator, or manually delete:\n   ${ibdPath}`);
        }
    } else if (!dropped && !fileExists) {
        
    }

    await conn.query('SET foreign_key_checks = 1');
    await conn.end();

    
}

fix().catch(err => {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
});
