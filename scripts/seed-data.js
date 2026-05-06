const pool = require('../backend/config/db');

async function seed() {
    try {
        

        
        
        
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
        await pool.execute('TRUNCATE TABLE order_items');
        await pool.execute('TRUNCATE TABLE orders');
        await pool.execute('TRUNCATE TABLE product_variants');
        await pool.execute('TRUNCATE TABLE product_colors');
        await pool.execute('TRUNCATE TABLE products');
        await pool.execute('TRUNCATE TABLE categories');
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

        
        
        const categories = [
            ['Men', 'men', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800'],
            ['Women', 'women', 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80&w=800'],
            ['Accessories', 'accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'],
            ['New Arrivals', 'new-arrivals', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=800']
        ];
        
        const catMap = {};
        for (const [name, slug, img] of categories) {
            const [res] = await pool.execute('INSERT INTO categories (name, slug, image) VALUES (?, ?, ?)', [name, slug, img]);
            catMap[name] = res.insertId;
        }

        
        
        const products = [
            {
                name: 'Essential Oversized Hoodie',
                slug: 'essential-oversized-hoodie',
                description: 'Premium heavyweight cotton hoodie with a relaxed fit. Perfect for casual layering.',
                price: 2450,
                sale_price: 1950,
                category_id: catMap['Men'],
                image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
                is_featured: 1,
                is_new_arrival: 1,
                stock_quantity: 50,
                sku: 'SB-HD-001',
                variants: [
                    { size: 'S', color: 'Black', stock: 10 },
                    { size: 'M', color: 'Black', stock: 15 },
                    { size: 'L', color: 'Black', stock: 15 },
                    { size: 'XL', color: 'Black', stock: 10 }
                ]
            },
            {
                name: 'Silk Wrap Midi Dress',
                slug: 'silk-wrap-midi-dress',
                description: 'Elegant silk wrap dress with a subtle sheen. Designed for evening elegance.',
                price: 4800,
                category_id: catMap['Women'],
                image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680ac95?auto=format&fit=crop&q=80&w=800',
                is_featured: 1,
                is_new_arrival: 1,
                stock_quantity: 20,
                sku: 'SB-DR-002',
                variants: [
                    { size: 'S', color: 'Emerald', stock: 5 },
                    { size: 'M', color: 'Emerald', stock: 10 },
                    { size: 'L', color: 'Emerald', stock: 5 }
                ]
            },
            {
                name: 'Urban Leather Backpack',
                slug: 'urban-leather-backpack',
                description: 'Handcrafted genuine leather backpack with padded laptop sleeve and minimal aesthetic.',
                price: 7500,
                category_id: catMap['Accessories'],
                image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800',
                is_featured: 1,
                is_new_arrival: 0,
                stock_quantity: 15,
                sku: 'SB-AC-003',
                variants: [
                    { size: 'OS', color: 'Tan', stock: 15 }
                ]
            }
        ];

        for (const p of products) {
            const [res] = await pool.execute(
                `INSERT INTO products (name, slug, description, price, sale_price, category_id, image, is_featured, is_new_arrival, stock_quantity, sku)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [p.name, p.slug, p.description, p.price, p.sale_price || null, p.category_id, p.image, p.is_featured, p.is_new_arrival, p.stock_quantity, p.sku]
            );
            const productId = res.insertId;

            if (p.variants) {
                for (const v of p.variants) {
                    await pool.execute(
                        'INSERT INTO product_variants (product_id, size, color, stock) VALUES (?, ?, ?, ?)',
                        [productId, v.size, v.color, v.stock]
                    );
                }
            }
        }

        
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
