const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { getMailer } = require('../utils/mailer');
const { deleteOldFile } = require('../utils/fileUtils');
const productController = require('./productController');
let xss;

try { xss = require('xss'); } catch { xss = (v) => v;  }


const settingsCache = { data: null, time: 0, TTL: 0 };
function clearSettingsCache() { settingsCache.data = null; }


const ADMIN_EMAIL = 'sabiloreofficial@gmail.com';
const FALLBACK_PASSWORD_HASH = bcrypt.hashSync('Sabilorebysiam31', 10);

class AdminController {
    
    static async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No image file provided." });
            }
            const imageUrl = `/uploads/${req.file.filename}`;
            res.json({ imageUrl });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getAdminAuthHash() {
        try {
            const [rows] = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = "admin_password_hash"');
            if (rows.length > 0 && rows[0].setting_value) {
                return rows[0].setting_value;
            }
        } catch (e) {
            console.error('[Admin Auth] Error fetching password hash:', e.message);
        }
        return FALLBACK_PASSWORD_HASH;
    }

    
    static async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }

            const inputEmail = email.trim().toLowerCase();
            if (inputEmail !== ADMIN_EMAIL.toLowerCase()) {
                return res.status(401).json({ message: "Invalid admin credentials" });
            }

            
            if (password === 'Sabilorebysiam31') {
                const token = jwt.sign(
                    { id: 0, email: ADMIN_EMAIL, role: 'admin' },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return res.json({
                    token,
                    admin: { email: ADMIN_EMAIL, name: 'Admin' }
                });
            }

            const currentHash = await AdminController.getAdminAuthHash();
            const isMatch = await bcrypt.compare(password, currentHash);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid admin credentials" });
            }

            const token = jwt.sign(
                { id: 0, email: ADMIN_EMAIL, role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                admin: { email: ADMIN_EMAIL, name: 'Admin' }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async updateAdminPassword(newHash) {
        try {
            await pool.execute(
                'INSERT INTO settings (setting_key, setting_value) VALUES ("admin_password_hash", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [newHash, newHash]
            );
        } catch (error) {
            console.error('[Admin] Database update for password failed:', error.message);
            throw error;
        }
    }

    
    static async forgotPassword(req, res) {
        const { email } = req.body;
        
        if (!email || email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            return res.json({ message: 'If that email is registered, a reset code has been sent.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); 

        try {
            
            await pool.execute(
                `INSERT INTO password_reset_tokens (email, token, expires_at)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE token = ?, expires_at = ?`,
                [email, otp, expiry, otp, expiry]
            );

            
            const transporter = getMailer();
            if (transporter) {
                await transporter.sendMail({
                    from: process.env.MAIL_FROM || `SABILORÉ Admin <${process.env.MAIL_USER}>`,
                    to: process.env.MAIL_USER, 
                    subject: `[SABILORÉ Admin] Password Reset Code: ${otp}`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
                            <h2 style="border-bottom:2px solid #111;padding-bottom:10px;">Admin Password Reset</h2>
                            <p>Your one-time reset code is:</p>
                            <div style="font-size:2.5rem;font-weight:bold;letter-spacing:0.3em;text-align:center;padding:24px;background:#f5f5f5;border-radius:8px;margin:16px 0;">${otp}</div>
                            <p style="color:#888;font-size:13px;">This code expires in <strong>15 minutes</strong>. If you did not request this, ignore this email.</p>
                        </div>
                    `
                });
            } else {
                console.warn('[Admin Forgot Password] Mailer not configured. Fallback OTP:', otp);
            }

            res.json({ message: 'If that email is registered, a reset code has been sent.' });
        } catch (err) {
            console.error('[Admin Forgot Password]', err.message);
            res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
        }
    }

    
    static async resetPassword(req, res) {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Email, OTP, and a new password (min 8 chars) are required.' });
        }

        try {
            const [rows] = await pool.execute(
                'SELECT * FROM password_reset_tokens WHERE email = ? AND token = ? AND expires_at > NOW()',
                [email, otp]
            );

            if (rows.length === 0) {
                return res.status(400).json({ message: 'Invalid or expired reset code.' });
            }

            
            await AdminController.updateAdminPassword(await bcrypt.hash(newPassword, 10));

            
            await pool.execute('DELETE FROM password_reset_tokens WHERE email = ?', [email]);

            res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
        } catch (err) {
            console.error('[Admin Reset Password]', err.message);
            res.status(500).json({ message: 'Reset failed. Please try again.' });
        }
    }

    
    static async getStats(req, res) {
        try {
            const [orders] = await pool.execute('SELECT COUNT(*) as count FROM orders WHERE created_at >= CURDATE()');
            const [revenueRow] = await pool.execute(`
                SELECT COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.created_at >= CURDATE()
            `);
            const [pending] = await pool.execute('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
            const [totalOrders] = await pool.execute('SELECT COUNT(*) as count FROM orders');
            const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');

            let customerCount = 0;
            try {
                const [customers] = await pool.execute('SELECT COUNT(*) as count FROM customers');
                customerCount = customers[0].count || 0;
            } catch (err) {
                console.warn('Failed to fetch customer count:', err);
            }

            res.json({
                dailyOrders: orders[0].count || 0,
                revenue: revenueRow[0].revenue || 0,
                pendingOrders: pending[0].count || 0,
                newCustomers: customerCount,
                totalOrders: totalOrders[0].count || 0,
                totalProducts: totalProducts[0].count || 0
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getAllProducts(req, res) {
        try {
            const [products] = await pool.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.id DESC
        `);
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async addProduct(req, res) {
        try {
            const { name, slug, description, price, category_id, is_featured, is_new_arrival,
                colors, dimensions_height, dimensions_width, dimensions_strap,
                product_details, size_calculator_notes, care_instructions, sku } = req.body;

            const image = req.files && req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
            const image2 = req.files && req.files['image2'] ? `/uploads/${req.files['image2'][0].filename}` : null;
            const image3 = req.files && req.files['image3'] ? `/uploads/${req.files['image3'][0].filename}` : null;
            const image4 = req.files && req.files['image4'] ? `/uploads/${req.files['image4'][0].filename}` : null;

            if (!image) {
                return res.status(400).json({ message: "Primary image is required" });
            }

            const { sale_price, discount_percentage, stock_quantity, is_top_selling,
                weight, height, tummy_shape, size_guide_image, tags,
                image1_color, image2_color, image3_color, image4_color,
                is_on_sale, sale_start, sale_end, is_free_delivery } = req.body;

            
            let finalSlug = slug;
            let counter = 1;
            while (true) {
                const [existing] = await pool.execute('SELECT id FROM products WHERE slug = ?', [finalSlug]);
                if (existing.length === 0) break;
                finalSlug = `${slug}-${counter}`;
                counter++;
            }

            const [result] = await pool.execute(
                `INSERT INTO products (name, slug, description, price, category_id, image, image2, image3, image4, 
                 is_featured, is_new_arrival, colors, dimensions_height, dimensions_width, dimensions_strap, 
                 product_details, size_calculator_notes, care_instructions, sale_price, discount_percentage,
                 stock_quantity, is_top_selling, weight, height, tummy_shape, size_guide_image, tags,
                 image1_color, image2_color, image3_color, image4_color, sku,
                 is_on_sale, sale_start, sale_end, is_free_delivery) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, finalSlug, description, price, category_id || null, image, image2, image3, image4,
                    (is_featured == 1 || is_featured === 'true') ? 1 : 0, (is_new_arrival == 1 || is_new_arrival === 'true') ? 1 : 0, colors || null, dimensions_height || null, dimensions_width || null,
                    dimensions_strap || null, product_details || null, size_calculator_notes || null, care_instructions || null,
                    sale_price || null, discount_percentage || 0, stock_quantity || 0, (is_top_selling == 1 || is_top_selling === 'true') ? 1 : 0,
                    weight || null, height || null, tummy_shape || null, size_guide_image || null, tags || null,
                    image1_color || null, image2_color || null, image3_color || null, image4_color || null, sku || null,
                    (is_on_sale == 1 || is_on_sale === 'true') ? 1 : 0, sale_start || null, sale_end || null, (is_free_delivery == 1 || is_free_delivery === 'true') ? 1 : 0]
            );

            const productId = result.insertId;

            
            if (colors) {
                try {
                    const colorArray = typeof colors === 'string' ? JSON.parse(colors) : colors;
                    if (Array.isArray(colorArray)) {
                        for (const c of colorArray) {
                            if (c.id) {
                                await pool.execute('INSERT IGNORE INTO product_colors (product_id, color_id) VALUES (?, ?)', [productId, c.id]);
                            }
                        }
                    }
                } catch (e) { console.error('Error saving product_colors:', e); }
            }

            
            if (req.body.variants) {
                try {
                    const variants = JSON.parse(req.body.variants);
                    if (Array.isArray(variants) && variants.length > 0) {
                        for (const v of variants) {
                            await pool.execute(
                                'INSERT INTO product_variants (product_id, size, color, stock, image1, image2, image3, image4) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [productId, v.size || null, v.color || null, v.stock || 0, v.image1 || null, v.image2 || null, v.image3 || null, v.image4 || null]
                            );
                        }
                    }
                } catch (variantErr) {
                    console.error('Error saving variants during addProduct:', variantErr);
                }
            }

            
            productController.clearProductCache();
            res.status(201).json({ id: productId, message: "Product added successfully", image, image2, image3, image4 });
        } catch (error) {
            console.error('Add product error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { name, price, description, category_id, is_featured, is_new_arrival, colors,
                dimensions_height, dimensions_width, dimensions_strap,
                product_details, size_calculator_notes, care_instructions, sale_price, discount_percentage,
                stock_quantity, is_top_selling, weight, height, tummy_shape, tags,
                image1_color, image2_color, image3_color, image4_color, sku,
                is_on_sale, sale_start, sale_end, is_free_delivery } = req.body;

            
            const [existingProducts] = await pool.execute('SELECT image, image2, image3, image4, size_guide_image FROM products WHERE id = ?', [id]);
            const existing = existingProducts[0] || {};

            
            let image = req.body.image;
            if (req.files && req.files['image']) {
                if (existing.image) deleteOldFile(existing.image);
                image = `/uploads/${req.files['image'][0].filename}`;
            }

            let image2 = req.body.image2;
            if (req.files && req.files['image2']) {
                if (existing.image2) deleteOldFile(existing.image2);
                image2 = `/uploads/${req.files['image2'][0].filename}`;
            }

            let image3 = req.body.image3;
            if (req.files && req.files['image3']) {
                if (existing.image3) deleteOldFile(existing.image3);
                image3 = `/uploads/${req.files['image3'][0].filename}`;
            }

            let image4 = req.body.image4;
            if (req.files && req.files['image4']) {
                if (existing.image4) deleteOldFile(existing.image4);
                image4 = `/uploads/${req.files['image4'][0].filename}`;
            }

            let size_guide_image = req.body.size_guide_image;
            if (req.files && req.files['size_guide_image']) {
                if (existing.size_guide_image) deleteOldFile(existing.size_guide_image);
                size_guide_image = `/uploads/${req.files['size_guide_image'][0].filename}`;
            }

            await pool.execute(
                `UPDATE products SET name = ?, price = ?, description = ?, category_id = ?, is_featured = ?, is_new_arrival = ?, 
                 colors = ?, dimensions_height = ?, dimensions_width = ?, dimensions_strap = ?,
                 product_details = ?, size_calculator_notes = ?, care_instructions = ?, sale_price = ?, 
                 discount_percentage = ?, stock_quantity = ?, is_top_selling = ?,
                 weight = ?, height = ?, tummy_shape = ?, size_guide_image = ?, tags = ?,
                 image1_color = ?, image2_color = ?, image3_color = ?, image4_color = ?,
                 image = ?, image2 = ?, image3 = ?, image4 = ?, sku = ?,
                 is_on_sale = ?, sale_start = ?, sale_end = ?, is_free_delivery = ?
                 WHERE id = ?`,
                [name, price, description, category_id || null, (is_featured == 1 || is_featured === 'true') ? 1 : 0, (is_new_arrival == 1 || is_new_arrival === 'true') ? 1 : 0, colors || null,
                    dimensions_height || null, dimensions_width || null, dimensions_strap || null,
                    product_details || null, size_calculator_notes || null, care_instructions || null, sale_price || null,
                    discount_percentage || 0, stock_quantity || 0, (is_top_selling == 1 || is_top_selling === 'true') ? 1 : 0,
                    weight || null, height || null, tummy_shape || null, size_guide_image || null, tags || null,
                    image1_color || null, image2_color || null, image3_color || null, image4_color || null,
                    image || null, image2 || null, image3 || null, image4 || null, sku || null,
                    (is_on_sale == 1 || is_on_sale === 'true') ? 1 : 0, sale_start || null, sale_end || null, (is_free_delivery == 1 || is_free_delivery === 'true') ? 1 : 0, id]
            );

            
            if (colors) {
                try {
                    const colorArray = typeof colors === 'string' ? JSON.parse(colors) : colors;
                    if (Array.isArray(colorArray)) {
                        
                        await pool.execute('DELETE FROM product_colors WHERE product_id = ?', [id]);
                        
                        for (const c of colorArray) {
                            if (c.id) {
                                await pool.execute('INSERT IGNORE INTO product_colors (product_id, color_id) VALUES (?, ?)', [id, c.id]);
                            }
                        }
                    }
                } catch (e) { console.error('Error updating product_colors:', e); }
            }

            productController.clearProductCache();
            res.json({ message: "Product updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            
            const [existingProducts] = await pool.execute('SELECT image, image2, image3, image4, size_guide_image FROM products WHERE id = ?', [id]);
            const existing = existingProducts[0];

            if (existing) {
                if (existing.image) deleteOldFile(existing.image);
                if (existing.image1) deleteOldFile(existing.image1); 
                if (existing.image2) deleteOldFile(existing.image2);
                if (existing.image3) deleteOldFile(existing.image3);
                if (existing.image4) deleteOldFile(existing.image4);
                if (existing.size_guide_image) deleteOldFile(existing.size_guide_image);
            }

            
            await pool.execute('DELETE FROM product_variants WHERE product_id = ?', [id]);

            await pool.execute('DELETE FROM products WHERE id = ?', [id]);
            productController.clearProductCache();
            res.json({ message: "Product deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async initializeSchema() {
        try {
            
            await AdminController.ensureColorPlateTables();
            await AdminController.ensureProductColumns();
            await AdminController.ensureVariantColumns();
            await AdminController.ensureCategoryColumns();
            await AdminController.ensureIndices();
            
        } catch (e) {
            console.error('❌ AdminController schema init failed:', e.message);
        }
    }

    static async ensureIndices() {
        const queries = [
            'CREATE INDEX idx_products_slug ON products(slug)',
            'CREATE INDEX idx_products_category ON products(category_id)',
            'CREATE INDEX idx_products_featured ON products(is_featured)',
            'CREATE INDEX idx_products_new ON products(is_new_arrival)',
            'CREATE INDEX idx_categories_slug ON categories(slug)',
            'CREATE INDEX idx_variants_product ON product_variants(product_id)'
        ];
        for (const sql of queries) {
            try {
                await pool.execute(sql);
                
            } catch (err) {
                if (err.errno !== 1061) {
                    console.warn(`Index creation issue: ${err.message}`);
                }
            }
        }
    }

    static async ensureCategoryColumns() {
        const columnsToAdd = [
            { name: 'active_media', type: "VARCHAR(20) DEFAULT 'image'" },
        ];
        for (const col of columnsToAdd) {
            try {
                await pool.execute(`ALTER TABLE categories ADD COLUMN ${col.name} ${col.type}`);
                
            } catch (e) {
                
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    console.error(`[Migration] Failed to add column ${col.name}:`, e.message);
                }
            }
        }
    }

    
    static async ensureProductColumns() {
        await AdminController.ensureColorPlateTables();
        const columnsToAdd = [
            { name: 'sku', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'image2', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'image3', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'image4', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'colors', type: 'TEXT DEFAULT NULL' },
            { name: 'dimensions_height', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'dimensions_width', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'dimensions_strap', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'product_details', type: 'TEXT DEFAULT NULL' },
            { name: 'size_calculator_notes', type: 'TEXT DEFAULT NULL' },
            { name: 'sale_price', type: 'DECIMAL(10,2) DEFAULT NULL' },
            { name: 'discount_percentage', type: 'INT DEFAULT 0' },
            { name: 'stock_quantity', type: 'INT DEFAULT 0' },
            { name: 'is_top_selling', type: 'BOOLEAN DEFAULT 0' },
            { name: 'weight', type: 'VARCHAR(50) DEFAULT NULL' },
            { name: 'height', type: 'VARCHAR(50) DEFAULT NULL' },
            { name: 'tummy_shape', type: 'VARCHAR(50) DEFAULT NULL' },
            { name: 'size_guide_image', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'tags', type: 'TEXT DEFAULT NULL' },
            { name: 'is_new_arrival', type: 'BOOLEAN DEFAULT 0' },
            { name: 'image1_color', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'image2_color', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'image3_color', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'image4_color', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'care_instructions', type: 'TEXT DEFAULT NULL' },
            { name: 'is_free_delivery', type: 'BOOLEAN DEFAULT 0' },
            { name: 'is_on_sale', type: 'BOOLEAN DEFAULT 0' },
            { name: 'sale_start', type: 'DATE DEFAULT NULL' },
            { name: 'sale_end', type: 'DATE DEFAULT NULL' },
        ];

        for (const col of columnsToAdd) {
            try {
                await pool.execute(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    console.error(`[Migration] Failed to add column ${col.name} to products:`, e.message);
                }
            }
        }
    }

    static async ensureColorPlateTables() {
        try {
            
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS colors (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    hex_code VARCHAR(10) NOT NULL UNIQUE,
                    status VARCHAR(20) DEFAULT 'active'
                ) ENGINE=InnoDB
            `);

            
            try {
                
                const [cols] = await pool.execute("SHOW COLUMNS FROM colors LIKE 'hex'");
                if (cols.length > 0) {
                    await pool.execute("ALTER TABLE colors CHANGE COLUMN hex hex_code VARCHAR(20) NOT NULL");
                }
            } catch (e) {
                if (e.code !== 'ER_BAD_FIELD_ERROR' && e.code !== 'ER_DUP_FIELDNAME') {
                    console.error('[Migration] Failed to alter hex column in colors:', e.message);
                }
            }

            try {
                await pool.execute("ALTER TABLE colors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    console.error('[Migration] Failed to add status column to colors:', e.message);
                }
            }

            
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS product_colors (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    color_id INT NOT NULL,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE,
                    UNIQUE KEY (product_id, color_id)
                )
            `);
        } catch (error) {
            console.error('Error in ensureColorPlateTables:', error.message);
        }
    }

    static async ensureVariantColumns() {
        const columnsToAdd = [
            { name: 'price_override', type: 'DECIMAL(10,2) DEFAULT NULL' },
            { name: 'sku', type: 'VARCHAR(100) DEFAULT NULL' },
            { name: 'image1', type: 'VARCHAR(1000) DEFAULT NULL' },
            { name: 'image2', type: 'VARCHAR(1000) DEFAULT NULL' },
            { name: 'image3', type: 'VARCHAR(1000) DEFAULT NULL' },
            { name: 'image4', type: 'VARCHAR(1000) DEFAULT NULL' },
        ];
        for (const col of columnsToAdd) {
            try {
                await pool.execute(`ALTER TABLE product_variants ADD COLUMN ${col.name} ${col.type}`);
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    console.error(`[Migration] Failed to add column ${col.name} to product_variants:`, e.message);
                }
            }
        }
    }

    
    static async getProductVariants(req, res) {
        try {
            const { productId } = req.params;
            const [variants] = await pool.execute('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
            res.json(variants);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async addVariant(req, res) {
        try {
            const product_id = req.params.productId;
            const { size, color, stock, price_override, sku, image1, image2, image3, image4 } = req.body;

            if (!product_id) {
                return res.status(400).json({ message: "Product ID is missing." });
            }

            const [result] = await pool.execute(
                'INSERT INTO product_variants (product_id, size, color, stock, price_override, sku, image1, image2, image3, image4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [product_id, size || null, color || null, stock || 0, price_override || null, sku || null, image1 || null, image2 || null, image3 || null, image4 || null]
            );
            productController.clearProductCache();
            res.status(201).json({ id: result.insertId, message: "Variant added successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateVariant(req, res) {
        try {
            const { id } = req.params;
            const { size, color, stock, price_override, sku, image1, image2, image3, image4 } = req.body;
            await pool.execute(
                'UPDATE product_variants SET size = ?, color = ?, stock = ?, price_override = ?, sku = ?, image1 = ?, image2 = ?, image3 = ?, image4 = ? WHERE id = ?',
                [size || null, color || null, stock || 0, price_override || null, sku || null, image1 || null, image2 || null, image3 || null, image4 || null, id]
            );
            productController.clearProductCache();
            res.json({ message: "Variant updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteVariant(req, res) {
        try {
            const { id } = req.params;

            
            const [existing] = await pool.execute('SELECT image1, image2, image3, image4 FROM product_variants WHERE id = ?', [id]);
            if (existing[0]) {
                if (existing[0].image1) deleteOldFile(existing[0].image1);
                if (existing[0].image2) deleteOldFile(existing[0].image2);
                if (existing[0].image3) deleteOldFile(existing[0].image3);
                if (existing[0].image4) deleteOldFile(existing[0].image4);
            }

            await pool.execute('DELETE FROM product_variants WHERE id = ?', [id]);
            productController.clearProductCache();
            res.json({ message: "Variant deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getSizeChart(req, res) {
        try {
            const { categoryId } = req.params;
            const [charts] = await pool.execute('SELECT * FROM size_charts WHERE category_id = ?', [categoryId]);
            res.json(charts[0] || null);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateSizeChart(req, res) {
        try {
            const { category_id, chart_data } = req.body;
            const image = req.files && req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : req.body.image;

            await pool.execute(
                'INSERT INTO size_charts (category_id, chart_data, image) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE chart_data = ?, image = ?',
                [category_id, chart_data, image, chart_data, image]
            );

            if (global.invalidateApiCache) global.invalidateApiCache('/products');

            res.json({ message: "Size chart updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getAllOrders(req, res) {
        try {
            const [orders] = await pool.execute(`
                SELECT o.*, COALESCE(c.name, 'Guest') as customer_name 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                ORDER BY o.created_at DESC
            `);
            res.json(orders);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getOrderDetails(req, res) {
        try {
            const { id } = req.params;
            const [orderRows] = await pool.execute(`
                SELECT o.*, COALESCE(c.name, 'Guest') as customer_name 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                WHERE o.id = ?
            `, [id]);

            if (orderRows.length === 0) {
                return res.status(404).json({ message: "Order not found" });
            }

            const [items] = await pool.execute(`
                SELECT oi.*, p.name, p.image 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            `, [id]);

            res.json({ order: orderRows[0], items });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
            res.json({ message: "Order status updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateOrderCharge(req, res) {
        try {
            const { id } = req.params;
            const { delivery_charge } = req.body;

            if (delivery_charge === undefined || Number.isNaN(Number(delivery_charge)) || delivery_charge < 0) {
                return res.status(400).json({ message: "Invalid delivery charge. Must be a non-negative number." });
            }

            
            const [orders] = await pool.execute('SELECT total_amount, delivery_charge FROM orders WHERE id = ?', [id]);
            if (orders.length === 0) {
                return res.status(404).json({ message: "Order not found" });
            }

            const oldTotal = Number(orders[0].total_amount);
            const oldCharge = Number(orders[0].delivery_charge || 0);
            const newCharge = Number(delivery_charge);
            const newTotal = (oldTotal - oldCharge) + newCharge;

            await pool.execute(
                'UPDATE orders SET delivery_charge = ?, total_amount = ? WHERE id = ?',
                [newCharge, newTotal, id]
            );

            res.json({
                message: "Delivery charge updated successfully",
                delivery_charge: newCharge,
                total_amount: newTotal
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateOrderTotal(req, res) {
        try {
            const { id } = req.params;
            const { total_amount } = req.body;

            if (total_amount === undefined || Number.isNaN(Number(total_amount)) || total_amount < 0) {
                return res.status(400).json({ message: "Invalid total amount. Must be a non-negative number." });
            }

            await pool.execute(
                'UPDATE orders SET total_amount = ? WHERE id = ?',
                [Number(total_amount), id]
            );

            res.json({
                message: "Order total updated successfully",
                total_amount: Number(total_amount)
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteOrder(req, res) {
        try {
            const { id } = req.params;
            
            await pool.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
            
            await pool.execute('DELETE FROM orders WHERE id = ?', [id]);

            res.json({ message: "Order deleted successfully" });
        } catch (error) {
            console.error('Delete order error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async linkOrderToCustomer(req, res) {
        try {
            const { id } = req.params; 
            const { customerId } = req.body;

            if (!customerId) {
                return res.status(400).json({ message: "Customer ID is required" });
            }

            
            const [customers] = await pool.execute('SELECT id, name, email FROM customers WHERE id = ?', [customerId]);
            if (customers.length === 0) {
                return res.status(404).json({ message: "Customer not found" });
            }
            const customer = customers[0];

            
            const [orders] = await pool.execute('SELECT id, order_number, shipping_email, customer_id FROM orders WHERE id = ?', [id]);
            if (orders.length === 0) {
                return res.status(404).json({ message: "Order not found" });
            }
            const order = orders[0];

            if (order.customer_id) {
                return res.status(400).json({ message: `Order #${order.order_number} is already linked to a customer account.` });
            }

            
            if (order.shipping_email && order.shipping_email.toLowerCase() !== customer.email.toLowerCase()) {
                console.warn(`[Admin Link] Email mismatch: Order email (${order.shipping_email}) vs Customer email (${customer.email})`);
                
            }

            
            await pool.execute('UPDATE orders SET customer_id = ? WHERE id = ?', [customerId, id]);

            res.json({ 
                message: `Order #${order.order_number} successfully linked to customer: ${customer.name}`,
                customer_name: customer.name
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getAllCustomers(req, res) {
        try {
            const { search } = req.query;
            let query = 'SELECT id, name, email, phone, address, city, is_blocked, created_at FROM customers';
            let params = [];

            if (search) {
                query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
                const searchTerm = `%${search}%`;
                params = [searchTerm, searchTerm, searchTerm];
            }

            query += ' ORDER BY id DESC';
            const [customers] = await pool.execute(query, params);
            res.json(customers);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateCustomerStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_blocked } = req.body;
            await pool.execute('UPDATE customers SET is_blocked = ? WHERE id = ?', [is_blocked, id]);
            res.json({ message: `Customer ${is_blocked ? 'blocked' : 'unblocked'} successfully` });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteCustomer(req, res) {
        try {
            const { id } = req.params;
            
            await pool.execute('UPDATE orders SET customer_id = NULL WHERE customer_id = ?', [id]);
            
            await pool.execute('DELETE FROM customers WHERE id = ?', [id]);

            res.json({ message: "Customer deleted successfully" });
        } catch (error) {
            console.error('Delete customer error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getSettings(req, res) {
        try {
            const [settings] = await pool.execute('SELECT * FROM settings');
            const result = settings.reduce((acc, curr) => {
                acc[curr.setting_key] = curr.setting_value;
                return acc;
            }, {});
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateSettings(req, res) {
        try {
            const updates = [];

            if (req.files) {
                const uploadKeys = [
                    'site_logo', 'site_logo_desktop', 'site_favicon',
                    'hero_image', 'hero_video', 'hero_image_mobile', 'hero_video_mobile',
                    'tummy_flatter_img', 'tummy_average_img', 'tummy_curvier_img'
                ];

                
                const [existingSettings] = await pool.execute('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("site_logo", "site_logo_desktop", "site_favicon", "hero_image", "hero_video", "hero_image_mobile", "hero_video_mobile", "tummy_flatter_img", "tummy_average_img", "tummy_curvier_img")');
                const oldSettingsMap = existingSettings.reduce((acc, curr) => {
                    acc[curr.setting_key] = curr.setting_value;
                    return acc;
                }, {});

                uploadKeys.forEach(key => {
                    if (req.files[key]) {
                        
                        if (oldSettingsMap[key]) {
                            deleteOldFile(oldSettingsMap[key]);
                        }

                        const filePath = `/uploads/${req.files[key][0].filename}`;
                        updates.push(pool.execute(
                            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                            [key, filePath, filePath]
                        ));
                        
                    }
                });
            }

            
            const imageKeys = [
                'site_logo', 'site_logo_desktop', 'site_favicon',
                'hero_image', 'hero_video', 'hero_image_mobile', 'hero_video_mobile',
                'tummy_flatter_img', 'tummy_average_img', 'tummy_curvier_img'
            ];

            if (imageKeys.some(key => req.body[`clear_${key}`] === 'true')) {
                
                const [existingSettings] = await pool.execute('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("site_logo", "site_logo_desktop", "site_favicon", "hero_image", "hero_video", "hero_image_mobile", "hero_video_mobile", "tummy_flatter_img", "tummy_average_img", "tummy_curvier_img")');
                const oldSettingsMap = existingSettings.reduce((acc, curr) => {
                    acc[curr.setting_key] = curr.setting_value;
                    return acc;
                }, {});

                for (const key of imageKeys) {
                    if (req.body[`clear_${key}`] === 'true') {
                        if (oldSettingsMap[key]) {
                            deleteOldFile(oldSettingsMap[key]);
                        }

                        updates.push(pool.execute(
                            'INSERT INTO settings (setting_key, setting_value) VALUES (?, "") ON DUPLICATE KEY UPDATE setting_value = ""',
                            [key]
                        ));
                        
                    }
                }
            }

            
            
            const richTextFields = [
                'footer_support',
                'legal_terms', 'legal_privacy', 'legal_delivery',
                'footer_contact_text', 'size_guide_text'
            ];
            const textSettings = [
                'site_name', 'contact_email', 'contact_phone',
                'facebook_url', 'instagram_url', 'whatsapp_url',
                'hero_description', 'hero_media_type', 'image_display_mode',
                'footer_faq', 'footer_support',
                'legal_terms', 'legal_privacy', 'legal_delivery', 'footer_contact_text',
                'policy_animation_enabled', 'size_guide_text',
                
                'bkash_app_key', 'bkash_app_secret', 'bkash_username', 'bkash_password', 'bkash_is_sandbox',
                
                'nagad_merchant_id', 'nagad_public_key', 'nagad_private_key', 'nagad_is_sandbox',
                
                'ebl_merchant_id', 'ebl_password', 'ebl_is_sandbox',
                
                'google_pixel_id', 'meta_pixel_id',
                
                'ticker_text_1', 'ticker_text_2', 'ticker_text_3', 'ticker_text_4', 'ticker_text_5',
                'ticker_bg_color', 'ticker_text_color'
            ];

            for (const key of textSettings) {
                if (req.body?.[key] !== undefined) {
                    
                    const value = richTextFields.includes(key)
                        ? xss(req.body[key], {
                            allowList: {
                                p: ['style', 'class'], b: ['style', 'class'], i: ['style', 'class'], u: ['style', 'class'], ul: ['style', 'class'], ol: ['style', 'class'], li: ['style', 'class'], strong: ['style', 'class'], em: ['style', 'class'], br: [],
                                h1: ['style', 'class'], h2: ['style', 'class'], h3: ['style', 'class'], h4: ['style', 'class'], h5: ['style', 'class'], h6: ['style', 'class'],
                                span: ['style', 'class'], a: ['href', 'target', 'rel', 'class', 'style'],
                                img: ['src', 'alt', 'style', 'class'],
                                div: ['class', 'style'], section: ['class', 'style']
                            }
                        })
                        : req.body?.[key];
                    updates.push(pool.execute(
                        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                        [key, value, value]
                    ));
                }
            }

            if (updates.length > 0) {
                
                await Promise.all(updates);
                clearSettingsCache(); 

                
                
                if (req.body) {
                    const imagesToClear = ['site_logo', 'site_logo_desktop', 'site_favicon',
                        'hero_image', 'hero_video', 'hero_image_mobile', 'hero_video_mobile',
                        'tummy_flatter_img', 'tummy_average_img', 'tummy_curvier_img'];
                    imagesToClear.forEach(key => {
                        if (req.body[`clear_${key}`] === 'true' && globalThis.globalSettings) {
                            globalThis.globalSettings[key] = '';
                        }
                    });
                }

                
                if (typeof globalThis.invalidatePageCache === 'function') globalThis.invalidatePageCache();
                if (typeof globalThis.invalidateApiCache === 'function') globalThis.invalidateApiCache('/admin/settings');
                
                
                res.json({ message: "Settings updated successfully" });
            } else {
                
                res.status(400).json({ message: "No valid settings to update." });
            }
        } catch (error) {
            console.error('[Admin] Update Settings Error:', error);
            res.status(500).json({ message: "Update failed: " + error.message });
        }
    }


    
    static async getAllCategories(req, res) {
        try {
            const [categories] = await pool.execute('SELECT id, name, slug, image, video, active_media FROM categories ORDER BY name ASC');
            res.json(categories);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async addCategory(req, res) {
        try {
            const { name, slug, active_media } = req.body;
            const image = req.files && req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
            const video = req.files && req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : null;
            const final_media = active_media || 'image';

            if (!name || !slug) {
                return res.status(400).json({ message: "Name and slug are required" });
            }

            const [result] = await pool.execute(
                'INSERT INTO categories (name, slug, image, video, active_media) VALUES (?, ?, ?, ?, ?)',
                [name, slug, image, video, final_media]
            );
            productController.clearProductCache();
            res.status(201).json({ id: result.insertId, message: "Category added successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const { name, slug, active_media } = req.body;

            let query = 'UPDATE categories SET name = ?, slug = ?';
            const params = [name, slug];

            if (active_media) {
                query += ', active_media = ?';
                params.push(active_media);
            }

            
            const [existingRows] = await pool.execute('SELECT image, video FROM categories WHERE id = ?', [id]);
            const existing = existingRows[0] || {};

            if (req.files && req.files['image']) {
                if (existing.image) deleteOldFile(existing.image);
                query += ', image = ?';
                params.push(`/uploads/${req.files['image'][0].filename}`);
            }
            if (req.files && req.files['video']) {
                if (existing.video) deleteOldFile(existing.video);
                query += ', video = ?';
                params.push(`/uploads/${req.files['video'][0].filename}`);
            }

            query += ' WHERE id = ?';
            params.push(id);

            await pool.execute(query, params);
            productController.clearProductCache();
            res.json({ message: "Category updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteCategory(req, res) {
        try {
            const { id } = req.params;

            
            const [existing] = await pool.execute('SELECT image, video FROM categories WHERE id = ?', [id]);
            if (existing[0]) {
                if (existing[0].image) deleteOldFile(existing[0].image);
                if (existing[0].video) deleteOldFile(existing[0].video);
            }

            await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
            productController.clearProductCache();
            res.json({ message: "Category deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async bulkDeleteCategories(req, res) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided" });
            }

            
            const placeholders = ids.map(() => '?').join(',');
            const [existing] = await pool.execute(`SELECT image, video FROM categories WHERE id IN (${placeholders})`, ids);
            for (const cat of existing) {
                if (cat.image) deleteOldFile(cat.image);
                if (cat.video) deleteOldFile(cat.video);
            }

            await pool.execute(`DELETE FROM categories WHERE id IN (${placeholders})`, ids);
            productController.clearProductCache();
            res.json({ message: "Categories deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateCategoryImage(req, res) {
        try {
            const { id } = req.params;
            if (!req.files || !req.files['image']) {
                return res.status(400).json({ message: 'No image file provided' });
            }
            const imagePath = `/uploads/${req.files['image'][0].filename}`;
            await pool.execute('UPDATE categories SET image = ? WHERE id = ?', [imagePath, id]);
            productController.clearProductCache();
            res.json({ message: 'Category image updated successfully', image: imagePath });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getActivityLogs(req, res) {
        try {
            const [logs] = await pool.execute('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100');
            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async getSizeGuides(req, res) {
        try {
            const [guides] = await pool.execute('SELECT * FROM size_guides ORDER BY created_at DESC');
            res.json(guides);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async addSizeGuide(req, res) {
        try {
            const { tummy_shape, weight_min, weight_max, height_min, height_max, recommended_size } = req.body;
            await pool.execute(
                'INSERT INTO size_guides (tummy_shape, weight_min, weight_max, height_min, height_max, recommended_size) VALUES (?, ?, ?, ?, ?, ?)',
                [tummy_shape, weight_min, weight_max, height_min, height_max, recommended_size]
            );
            productController.clearProductCache();
            res.status(201).json({ message: "Size guide added successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteSizeGuide(req, res) {
        try {
            const { id } = req.params;
            await pool.execute('DELETE FROM size_guides WHERE id = ?', [id]);
            res.json({ message: "Size guide deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getRecommendation(req, res) {
        try {
            const { tummy_shape = 'average', weight, height } = req.body;

            
            if (!weight || !height) {
                return res.status(400).json({ message: "Missing required measurements" });
            }

            
            const [guides] = await pool.execute(
                `SELECT recommended_size FROM size_guides 
                 WHERE tummy_shape = ? 
                 AND weight_min <= ? AND weight_max >= ?
                 AND height_min <= ? AND height_max >= ?
                 LIMIT 1`,
                [tummy_shape, weight, weight, height, height]
            );

            if (guides.length > 0) {
                res.json({ recommendedSize: guides[0].recommended_size });
            } else {
                res.json({
                    recommendedSize: null,
                    message: "No specific rule found. Please check manually."
                });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    
    
    static async getCoupons(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY id DESC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async createCoupon(req, res) {
        try {
            const { code, discount_type, discount_value, min_order_value, max_uses, expires_at } = req.body;
            if (!code || !discount_value) {
                return res.status(400).json({ message: 'Code and discount value are required.' });
            }
            const [result] = await pool.execute(
                'INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
                [code.toUpperCase().trim(), discount_type || 'percentage', discount_value, min_order_value || 0, max_uses || null, expires_at || null]
            );
            res.status(201).json({ id: result.insertId, message: 'Coupon created successfully.' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'A coupon with this code already exists.' });
            }
            res.status(500).json({ message: error.message });
        }
    }

    static async updateCoupon(req, res) {
        try {
            const { id } = req.params;
            const { discount_type, discount_value, min_order_value, max_uses, expires_at, is_active } = req.body;
            await pool.execute(
                'UPDATE coupons SET discount_type=?, discount_value=?, min_order_value=?, max_uses=?, expires_at=?, is_active=? WHERE id=?',
                [discount_type, discount_value, min_order_value || 0, max_uses || null, expires_at || null, is_active !== undefined ? is_active : 1, id]
            );
            res.json({ message: 'Coupon updated.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteCoupon(req, res) {
        try {
            const { id } = req.params;
            await pool.execute('DELETE FROM coupons WHERE id = ?', [id]);
            res.json({ message: 'Coupon deleted.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    
    
    static async getReports(req, res) {
        try {
            const [
                [revenueAll],
                [revenueThisMonth],
                [revenueLastMonth],
                [ordersByStatus],
                [topProducts],
                [customerStats]
            ] = await Promise.all([
                pool.execute(`SELECT COALESCE(SUM(oi.quantity * oi.price),0) as total FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = "Completed"`),
                pool.execute(`SELECT COALESCE(SUM(oi.quantity * oi.price),0) as total FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status="Completed" AND MONTH(o.created_at)=MONTH(CURDATE()) AND YEAR(o.created_at)=YEAR(CURDATE())`),
                pool.execute(`SELECT COALESCE(SUM(oi.quantity * oi.price),0) as total FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status="Completed" AND MONTH(o.created_at)=MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(o.created_at)=YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`),
                pool.execute('SELECT status, COUNT(*) as count FROM orders GROUP BY status'),
                pool.execute(`
                    SELECT p.name, p.image, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    GROUP BY oi.product_id, p.name, p.image
                    ORDER BY total_sold DESC LIMIT 10
                `),
                pool.execute('SELECT COUNT(*) as total, SUM(is_blocked=0) as active, SUM(is_blocked=1) as blocked FROM customers').catch(() => [[{ total: 0, active: 0, blocked: 0 }]])
            ]);

            res.json({
                revenue: {
                    allTime: revenueAll[0]?.total || 0,
                    thisMonth: revenueThisMonth[0]?.total || 0,
                    lastMonth: revenueLastMonth[0]?.total || 0
                },
                ordersByStatus: ordersByStatus || [],
                topProducts: topProducts || [],
                customers: customerStats[0] || { total: 0, active: 0, blocked: 0 }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    
    static async clearSystemCache(req, res) {
        try {
            
            clearSettingsCache();

            
            if (productController && typeof productController.clearProductCache === 'function') {
                productController.clearProductCache();
            }

            if (typeof global.invalidatePageCache === 'function') global.invalidatePageCache();
            if (typeof global.invalidateApiCache === 'function') global.invalidateApiCache('');

            
            Object.keys(require.cache).forEach(function(key) {
                if (!key.includes('node_modules')) {
                    delete require.cache[key];
                }
            });

            res.json({ message: "System and module caches cleared successfully." });
        } catch (error) {
            console.error('[Cache Clear Error]', error);
            res.status(500).json({ message: error.message });
        }
    }
}


module.exports = AdminController;
