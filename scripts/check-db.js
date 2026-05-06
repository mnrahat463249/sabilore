const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sabilore_db',
  });

  
  const [missing] = await pool.execute("SELECT setting_key, setting_value FROM settings WHERE setting_value LIKE '%1775988%'");
  


  
  const [logoSettings] = await pool.execute("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('site_logo', 'site_logo_desktop', 'site_favicon', 'hero_image', 'hero_image_mobile', 'hero_video', 'hero_media_type', 'site_name')");
  


  
  const [tables] = await pool.execute("SHOW TABLES");
  


  
  try {
    const [products] = await pool.execute("SELECT COUNT(*) as count FROM products");
    
    
    const [cats] = await pool.execute("SELECT COUNT(*) as count FROM categories");
    
  } catch(e) {
    
  }

  await pool.end();
})().catch(e => console.error('DB Error:', e.message));
