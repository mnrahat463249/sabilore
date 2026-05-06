const db = require('../config/db');

class Order {
    static generateOrderNumber() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return `#${result}`;
    }

    static async create(orderData) {
        const {
            customer_id,
            total_amount,
            payment_method,
            bkash_trx_id,
            shipping_name,
            shipping_phone,
            shipping_address,
            shipping_city,
            notes,
            items,
            coupon_code,
            discount_amount,
            delivery_charge,
            shipping_postal
        } = orderData;

        const orderNumber = this.generateOrderNumber();
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            
            try {
                
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE DEFAULT NULL AFTER id`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(255) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_email VARCHAR(255) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0.00`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10, 2) DEFAULT 0.00`);
                await connection.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_postal VARCHAR(20) DEFAULT NULL`);

                
                await connection.execute(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size VARCHAR(50) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color VARCHAR(100) DEFAULT NULL`);
                await connection.execute(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tummy_shape VARCHAR(100) DEFAULT NULL`);
            } catch (err) {
                if (err.errno !== 1060) console.warn('Order migration column error:', err.message);
            }

            
            let orderId;
            try {
                const [result] = await connection.execute(
                    `INSERT INTO orders (order_number, customer_id, total_amount, payment_method, bkash_trx_id, 
                     shipping_name, shipping_phone, shipping_email, shipping_address, shipping_city, shipping_postal, notes, coupon_code, discount_amount, delivery_charge) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [orderNumber, customer_id, total_amount, payment_method, bkash_trx_id,
                        shipping_name || null, shipping_phone || null, orderData.shipping_email || null,
                        shipping_address || null, shipping_city || null, shipping_postal || null, notes || null, coupon_code || null, discount_amount || 0, delivery_charge || 0]
                );
                orderId = result.insertId;
            } catch (colError) {
                console.error('Order insert failed, attempting legacy:', colError.message);
                const [result] = await connection.execute(
                    'INSERT INTO orders (customer_id, total_amount, payment_method, bkash_trx_id) VALUES (?, ?, ?, ?)',
                    [customer_id, total_amount, payment_method, bkash_trx_id]
                );
                orderId = result.insertId;
            }

            if (!items || !Array.isArray(items)) {
                console.error('[ERROR] Order.create: items is not an array!', items);
                throw new Error("Items data is invalid or missing");
            }

            for (const item of items) {


                if (!item.product_id) {
                    console.error('[CRITICAL] Skipping item with NULL product_id:', item);
                    
                    throw new Error(`Cannot create order: Item missing product_id`);
                }

                
                if (item.size || item.color) {
                    try {
                        await connection.execute(
                            `UPDATE product_variants SET stock = GREATEST(0, stock - ?) 
                             WHERE product_id = ? AND (size = ? OR size IS NULL) AND (color = ? OR color IS NULL) 
                             LIMIT 1`,
                            [item.quantity, item.product_id, item.size || null, item.color || null]
                        );
                        
                    } catch (variantErr) {
                        console.error('[ERROR] Variant stock update failed:', variantErr.message);
                    }
                }

                
                try {
                    await connection.execute(
                        'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
                        [item.quantity, item.product_id]
                    );
                    
                } catch (err) {
                    console.warn('[Order.create] Failed to update product stock:', err.message);
                }

                
                try {
                    await connection.execute(
                        'INSERT INTO order_items (order_id, product_id, quantity, price, size, color, tummy_shape) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [orderId, item.product_id, item.quantity, item.price, item.size || null, item.color || null, item.tummy_shape || null]
                    );
                    
                } catch (insertErr) {
                    console.error('[CRITICAL] FAILED TO INSERT ORDER ITEM. item:', item);
                    throw insertErr;
                }
            }

            await connection.commit();
            return { id: orderId, orderNumber };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getByCustomerId(customerId, limit = 50, offset = 0) {
        const [rows] = await db.execute(`
            SELECT o.*, 
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count 
            FROM orders o 
            WHERE o.customer_id = ? 
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [Number(customerId), Number(limit), Number(offset)]);
        return rows;
    }

    static async getOrderItems(orderId) {
        const [rows] = await db.execute(`
            SELECT oi.*, p.name, p.image, p.slug,
                   (SELECT COALESCE(v.image1, v.image2, v.image3, v.image4) FROM product_variants v 
                    WHERE v.product_id = oi.product_id 
                    AND v.color = oi.color 
                    AND (v.image1 IS NOT NULL OR v.image2 IS NOT NULL OR v.image3 IS NOT NULL OR v.image4 IS NOT NULL)
                    LIMIT 1) as variant_image
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [orderId]);
        return rows;
    }

    static async getStats(customerId) {
        const [rows] = await db.execute(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
                SUM(CASE WHEN LOWER(status) IN ('delivered', 'completed') THEN 1 ELSE 0 END) as deliveredOrders,
                COALESCE((
                    SELECT SUM(oi.quantity * oi.price)
                    FROM order_items oi
                    WHERE oi.order_id IN (SELECT id FROM orders WHERE customer_id = ?)
                ), 0) as totalSpent
            FROM orders 
            WHERE customer_id = ?
        `, [customerId, customerId]);
        return rows[0];
    }

    static async findByOrderNumber(orderNumber, phone) {
        const [rows] = await db.execute(
            'SELECT * FROM orders WHERE order_number = ? AND shipping_phone = ?',
            [orderNumber, phone]
        );
        return rows[0];
    }

    static async linkGuestOrders(email, phone, customerId) {
        if (!customerId) return;
        try {
            
            
            const [result] = await db.execute(
                'UPDATE orders SET customer_id = ? WHERE (shipping_email = ? OR shipping_phone = ?) AND customer_id IS NULL',
                [customerId, email || null, phone || null]
            );
            if (result.affectedRows > 0) {
                console.log(`[Order Linking] Linked ${result.affectedRows} orders to customer ${customerId}`);
            }
        } catch (error) {
            console.error('[Order Linking Error]', error.message);
        }
    }
}

module.exports = Order;
