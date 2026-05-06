const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function cleanup() {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'sabilore_db',
            waitForConnections: true,
            connectionLimit: 5
        });

        

        
        const allFiles = fs.readdirSync(UPLOADS_DIR).filter(file => {
            const fullPath = path.join(UPLOADS_DIR, file);
            return fs.statSync(fullPath).isFile();
        });

        

        
        const queries = [
            'SELECT image FROM products',
            'SELECT image2 FROM products',
            'SELECT image3 FROM products',
            'SELECT image4 FROM products',
            'SELECT size_guide_image FROM products',
            'SELECT image FROM categories',
            'SELECT video FROM categories',
            'SELECT image FROM blog_posts',
            'SELECT image FROM payment_methods',
            'SELECT image FROM size_charts',
            'SELECT image_url FROM product_size_options',
            'SELECT image1 FROM product_variants',
            'SELECT image2 FROM product_variants',
            'SELECT image3 FROM product_variants',
            'SELECT image4 FROM product_variants',
            'SELECT setting_value FROM settings'
        ];

        const referencedFiles = new Set();

        for (const sql of queries) {
            try {
                const [rows] = await pool.execute(sql);
                rows.forEach(row => {
                    const val = row[Object.keys(row)[0]];
                    if (val && typeof val === 'string') {
                        
                        const fileName = path.basename(val.split('?')[0]);
                        if (fileName) {
                            referencedFiles.add(fileName);
                            
                            
                        }
                    }
                });
            } catch (e) {
                
                console.warn(`Query failed (probably table/col missing): ${sql.split('FROM')[1].trim()}`);
            }
        }

        

        
        let orphanCount = 0;
        let freedSpace = 0;

        for (const file of allFiles) {
            
            const isVariant = file.includes('-600.') || file.includes('-1920.');
            let isReferenced = referencedFiles.has(file);

            if (!isReferenced && isVariant) {
                
                const baseName = file.replace('-600.', '.').replace('-1920.', '.');
                if (referencedFiles.has(baseName)) {
                    isReferenced = true;
                }
            }

            if (!isReferenced) {
                const fullPath = path.join(UPLOADS_DIR, file);
                const stats = fs.statSync(fullPath);
                freedSpace += stats.size;
                orphanCount++;

                
                if (process.argv.includes('--delete')) {
                    fs.unlinkSync(fullPath);
                    
                } else {

                }
            }
        }

        
        if (process.argv.includes('--delete')) {
            

        } else {
            

            
        }

    } catch (err) {
        console.error('Cleanup error:', err);
    } finally {
        if (pool) await pool.end();
    }
}

cleanup();
