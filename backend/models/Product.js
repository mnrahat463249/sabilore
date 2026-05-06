const db = require('../config/db');

class Product {
    static async getAll() {
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                   p.image, p.image2, p.image3, p.image4,
                   p.category_id, p.is_featured, p.is_top_selling, p.is_new_arrival,
                   p.discount_percentage, p.stock_quantity, p.tags, p.sku, p.created_at,
                   p.image1_color, p.image2_color, p.image3_color, p.image4_color,
                   p.is_free_delivery,
                   GROUP_CONCAT(DISTINCT v.size) as available_sizes,
                   GROUP_CONCAT(DISTINCT v.color) as available_colors,
                   GROUP_CONCAT(CONCAT(v.color, ':', v.size, ':', v.stock)) as variants_summary
            FROM products p
            LEFT JOIN product_variants v ON p.id = v.product_id
            GROUP BY p.id
        `);
        return rows;
    }

    static async getSearchSuggestions(query) {
        if (!query || query.length < 1) return [];
        const pattern = `%${query.toLowerCase()}%`;
        const [rows] = await db.execute(`
            SELECT DISTINCT name, 'product' as type FROM products WHERE LOWER(name) LIKE ?
            UNION
            SELECT DISTINCT name, 'category' as type FROM categories WHERE LOWER(name) LIKE ?
            LIMIT 10
        `, [pattern, pattern]);
        return rows;
    }

    static async searchProducts(query) {
        if (!query) return this.getAll();
        const pattern = `%${query.toLowerCase()}%`;
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                   p.image, p.image2, p.image3, p.image4,
                   p.category_id, p.is_featured, p.is_top_selling, p.is_new_arrival,
                   p.is_on_sale, p.sale_start, p.sale_end,
                   p.discount_percentage, p.stock_quantity, p.tags, p.sku, p.created_at,
                   p.image1_color, p.image2_color, p.image3_color, p.image4_color,
                   p.is_free_delivery,
                   GROUP_CONCAT(DISTINCT v.size) as available_sizes,
                   GROUP_CONCAT(DISTINCT v.color) as available_colors,
                   GROUP_CONCAT(CONCAT(v.color, ':', v.size, ':', v.stock)) as variants_summary
            FROM products p
            LEFT JOIN product_variants v ON p.id = v.product_id
            WHERE LOWER(p.name) LIKE ? 
               OR LOWER(p.description) LIKE ? 
               OR LOWER(COALESCE(p.tags, '')) LIKE ?
            GROUP BY p.id
            ORDER BY 
                CASE 
                    WHEN LOWER(p.name) LIKE ? THEN 1 -- Exact/Start name match priority
                    WHEN LOWER(p.name) LIKE ? THEN 2 -- Partial name match
                    ELSE 3 
                END ASC
        `, [pattern, pattern, pattern, query.toLowerCase(), pattern]);
        return rows;
    }

    static async getBySlug(slug) {
        const [rows] = await db.execute('SELECT * FROM products WHERE slug = ?', [slug]);
        return rows[0];
    }

    static async getFeatured() {
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                   p.image, p.image2, p.image3, p.image4,
                   p.category_id, p.is_featured, p.is_top_selling, p.is_new_arrival,
                   p.discount_percentage, p.stock_quantity, p.tags, p.sku,
                   p.image1_color, p.image2_color, p.image3_color, p.image4_color,
                   p.is_free_delivery,
                   GROUP_CONCAT(DISTINCT v.size) as available_sizes,
                   GROUP_CONCAT(DISTINCT v.color) as available_colors,
                   GROUP_CONCAT(CONCAT(v.color, ':', v.size, ':', v.stock)) as variants_summary
            FROM products p
            LEFT JOIN product_variants v ON p.id = v.product_id
            WHERE p.is_featured = 1
            GROUP BY p.id
        `);
        return rows;
    }

    static async getNewArrivals(limit = 8) {
        const safeLimit = Math.max(1, Math.min(50, parseInt(limit) || 8));
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                   p.image, p.image2, p.is_featured, p.is_top_selling, p.is_new_arrival,
                   p.discount_percentage, p.stock_quantity, p.tags, p.sku, p.created_at,
                   p.image1_color, p.image2_color, p.image3_color, p.image4_color,
                   p.is_free_delivery,
                   GROUP_CONCAT(DISTINCT v.size) as available_sizes,
                   GROUP_CONCAT(DISTINCT v.color) as available_colors
            FROM products p
            LEFT JOIN product_variants v ON p.id = v.product_id
            WHERE p.is_new_arrival = 1
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ?
        `, [safeLimit]);
        return rows;
    }

    static async getByCategory(categoryId) {
        const [rows] = await db.execute('SELECT * FROM products WHERE category_id = ?', [categoryId]);
        return rows;
    }

    static async getByCategorySlug(slug) {
        const searchSlug = `%${slug.toLowerCase()}%`;
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                   p.image, p.image2, p.image3, p.image4,
                   p.category_id, p.is_featured, p.is_top_selling, p.is_new_arrival,
                   p.discount_percentage, p.stock_quantity, p.tags, p.sku,
                   p.image1_color, p.image2_color, p.image3_color, p.image4_color,
                   p.is_free_delivery,
                   GROUP_CONCAT(DISTINCT v.size) as available_sizes,
                   GROUP_CONCAT(DISTINCT v.color) as available_colors,
                   GROUP_CONCAT(CONCAT(v.color, ':', v.size, ':', v.stock)) as variants_summary
            FROM products p
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_variants v ON p.id = v.product_id
            WHERE LOWER(c.name) LIKE ?
            GROUP BY p.id
        `, [searchSlug]);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0];
    }

    static async getCategories() {
        const [rows] = await db.execute('SELECT id, name, slug, image, video, active_media FROM categories ORDER BY name ASC');
        return rows;
    }

    static async getByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.execute(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
        return rows;
    }

    static async getVariants(productId) {
        const [rows] = await db.execute('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
        return rows;
    }

    static async getRelatedColorProducts(name, categoryId) {
        const baseName = name.split(' - ')[0].trim();
        const searchPattern = `%${baseName}%`;
        const [rows] = await db.execute(
            'SELECT id, name, slug, image FROM products WHERE name LIKE ? AND category_id = ? AND name != ? LIMIT 10',
            [searchPattern, categoryId, name]
        );
        return rows;
    }

    static async getSaleProducts(limit = 100) {
        const safeLimit = Math.max(1, Math.min(200, parseInt(limit) || 100));
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                   p.image, p.image2, p.image3, p.image4,
                   p.category_id, p.is_featured, p.is_top_selling, p.is_new_arrival,
                   p.is_on_sale, p.sale_start, p.sale_end,
                   p.discount_percentage, p.stock_quantity, p.tags, p.sku, p.created_at,
                   p.image1_color, p.image2_color, p.image3_color, p.image4_color,
                   p.is_free_delivery,
                   GROUP_CONCAT(DISTINCT v.size) as available_sizes,
                   GROUP_CONCAT(DISTINCT v.color) as available_colors,
                   GROUP_CONCAT(CONCAT(v.color, ':', v.size, ':', v.stock)) as variants_summary
            FROM products p
            LEFT JOIN product_variants v ON p.id = v.product_id
            WHERE p.is_on_sale = 1
              AND (p.sale_start IS NULL OR p.sale_start <= NOW())
              AND (p.sale_end IS NULL OR p.sale_end > NOW())
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ?
        `, [safeLimit]);
        return rows;
    }
}

module.exports = Product;
