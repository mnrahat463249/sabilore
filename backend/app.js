
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');



dotenv.config();

const app = express();
app.set('trust proxy', 1); 

// Canonical Redirect Middleware to avoid multiple hops
app.use((req, res, next) => {
    const host = req.get('host');
    const protocol = req.protocol;
    const isWww = host.startsWith('www.');
    const canonicalHost = 'sabilore.com';
    
    // In production, force https and non-www (or your preferred version)
    // SKIP redirection for localhost/127.0.0.1 or if explicitly disabled in env
    const shouldSkip = process.env.SKIP_HTTPS_REDIRECT === 'true' || 
                       host.includes('localhost') || 
                       host.includes('127.0.0.1');

    if (process.env.NODE_ENV === 'production' && !shouldSkip) {
        if (protocol === 'http' || (isWww && process.env.SKIP_WWW_REDIRECT !== 'true')) {
            return res.redirect(302, `https://${canonicalHost}${req.originalUrl}`);
        }
    }
    next();
});

const pool = require('./config/db');


const globalSettings = { google_pixel_id: '', meta_pixel_id: '', image_display_mode: 'contain', site_logo: '', site_logo_desktop: '', site_name: 'SABILORÉ', site_favicon: '' };
const refreshGlobalSettings = async () => {
    try {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("google_pixel_id", "meta_pixel_id", "image_display_mode", "hero_image", "hero_image_mobile", "hero_video", "hero_video_mobile", "hero_media_type", "site_logo", "site_logo_desktop", "site_name", "site_favicon", "ticker_text_1", "ticker_text_2", "ticker_text_3", "ticker_text_4", "ticker_text_5")');
        rows.forEach(r => globalSettings[r.setting_key] = r.setting_value);
    } catch {  }
};
refreshGlobalSettings();
setInterval(refreshGlobalSettings, 1000); 

global.globalSettings = globalSettings; 



global.invalidatePageCache = () => {
    refreshGlobalSettings().catch(() => {  });
    
    globalSettings._cacheVersion = Date.now();
};







const _apiCache = new Map();
const _API_CACHE_TTL = 5 * 60 * 1000; 

function apiCacheMw(ttl = _API_CACHE_TTL) {
    return (req, res, next) => {
        if (req.method !== 'GET') return next();
        const key = req.originalUrl;
        const entry = _apiCache.get(key);
        if (entry && Date.now() - entry.ts < ttl) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(entry.data);
        }
        const origJson = res.json.bind(res);
        res.json = (data) => {
            if (res.statusCode === 200) _apiCache.set(key, { data, ts: Date.now() });
            return origJson(data);
        };
        next();
    };
}
global.apiCacheMw = apiCacheMw;


global.invalidateApiCache = (pattern) => {
    for (const key of _apiCache.keys()) {
        if (key.includes(pattern)) _apiCache.delete(key);
    }
};


app.disable('x-powered-by'); 

app.use(compression({
    level: 9, // Highest compression level
    threshold: 256, 
    filter: (req, res) => {
        const ct = res.getHeader('Content-Type') || '';
        if (/image\/(webp|jpeg|jpg|png|gif|avif|svg\+xml)|video\/|audio\//.test(ct)) return false;
        return compression.filter(req, res);
    }
}));

const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
const ALLOWED_ORIGINS = [
    'http://localhost:5001',
    'http://localhost:3000',
    'https://sabilore.com',
    'https://www.sabilore.com',
    ...envOrigins
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        callback(null, true); 
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));






app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.quilljs.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.quilljs.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*"],
            connectSrc: ["'self'", "https://*"]
        }
    }
}));

app.use(async (req, res, next) => {
    if (req.url.match(/\.(jpg|jpeg|png)$/i)) {
        const accept = req.get('Accept') || '';
        const supportsWebp = accept.includes('image/webp');
        const fullSourcePath = path.join(__dirname, '..', 'frontend', req.url);
        const baseName = fullSourcePath.replace(/\.(jpg|jpeg|png)$/i, '');
        
        if (supportsWebp) {
            const webpPath = baseName + '.webp';
            const webp600Path = baseName + '-600.webp';
            
            // Check if main webp exists
            if (fs.existsSync(webpPath)) {
                // If main exists, check if 600w variant exists, if not generate it in background
                if (!fs.existsSync(webp600Path) && fs.existsSync(fullSourcePath)) {
                    sharp(fullSourcePath).resize(600).webp({ quality: 80 }).toFile(webp600Path).catch(() => {});
                }
                req.url = req.url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                return next();
            }

            // Generate main and 600w variant if they don't exist
            if (fs.existsSync(fullSourcePath)) {
                try {
                    await sharp(fullSourcePath).toFormat('webp', { quality: 82, effort: 6 }).toFile(webpPath);
                    // Generate 600w variant too
                    sharp(fullSourcePath).resize(600).webp({ quality: 80 }).toFile(webp600Path).catch(() => {});
                    
                    req.url = req.url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                    return next();
                } catch { }
            }
        }
    }
    next();
});


const STATIC_CACHE = { maxAge: '31536000000', etag: true, immutable: true }; // 1 year cache
const STATIC_CACHE_IMGS = { maxAge: '31536000000', etag: true, immutable: true }; // 1 year cache

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), STATIC_CACHE_IMGS));
app.use('/css', express.static(path.join(__dirname, '../frontend/css'), STATIC_CACHE));
app.use('/js',  express.static(path.join(__dirname, '../frontend/js'),  STATIC_CACHE));
app.use('/img', express.static(path.join(__dirname, '../frontend/img'), STATIC_CACHE_IMGS));




app.get('/favicon.ico', (req, res) => {
    if (globalSettings.site_favicon && globalSettings.site_favicon.trim()) {
        const favPath = path.join(__dirname, '..', 'frontend', globalSettings.site_favicon);

        if (!globalSettings.site_favicon.startsWith('http') && require('fs').existsSync(favPath)) {
            
            res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
            res.setHeader('Vary', 'Accept-Encoding');
            const ext = path.extname(favPath).toLowerCase();
            const mimeMap = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
            res.setHeader('Content-Type', mimeMap[ext] || 'image/x-icon');
            return res.sendFile(favPath);
        }
        
        return res.redirect(302, globalSettings.site_favicon);
    }
    res.status(204).end(); 
});


app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, '../frontend/sw.js'));
});


app.get('/manifest.json', (req, res) => {
    const fav = (globalSettings.site_favicon && globalSettings.site_favicon.trim()) ? globalSettings.site_favicon : '/favicon.ico';
    const manifest = {
        "name": globalSettings.site_name || "SABILORÉ",
        "short_name": globalSettings.site_name || "SABILORÉ",
        "description": "Discover premium minimalist clothing from Dhaka. Explore modern essentials, new arrivals, and exclusive collections designed for timeless style.",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#F8F8F6",
        "theme_color": "#6200ee",
        "orientation": "portrait-primary",
        "scope": "/",
        "lang": "en",
        "icons": [
            { "src": fav, "sizes": "any", "type": fav.toLowerCase().endsWith('.png') ? 'image/png' : 'image/x-icon' }
        ]
    };
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(manifest);
});


app.get('/offline.html', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, '../frontend/offline.html'));
});

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts' });

app.use('/api/auth/login', authLimiter);


const LOG_PATH = path.join(__dirname, '../api_access.log');
const ORDER_DEBUG_LOG = path.join(__dirname, '../order_debug.log');



let _logSizeOk = true;
const LOG_MAX_BYTES = 5 * 1024 * 1024; 
setInterval(() => {
    fs.stat(LOG_PATH, (err, stats) => {
        if (err) { _logSizeOk = true; return; }
        if (stats.size > LOG_MAX_BYTES) {
            
            const oldPath = LOG_PATH + '.old';
            fs.rename(LOG_PATH, oldPath, () => {
                _logSizeOk = true;
            });
        } else {
            _logSizeOk = true;
        }
    });
}, 60 * 1000);

app.use((req, res, next) => {
    
    if (req.method === 'POST' && req.originalUrl.includes('/api/orders')) {
        try {
            const debugMsg = `[${new Date().toISOString()}] PAYLOAD: ${JSON.stringify(req.body)}\n`;
            fs.appendFile(ORDER_DEBUG_LOG, debugMsg, () => {  });
        } catch {  }
    }
    next();
    
    if (_logSizeOk) {
        const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
        fs.appendFile(LOG_PATH, logMsg, () => {  });
    }
});




const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const contactRoutes = require('./routes/contactRoutes');
const blogPostsRoutes = require('./routes/blogRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');
const productSizeOptionRoutes = require('./routes/productSizeOptionRoutes'); 

const apiRouter = express.Router();

apiRouter.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Welcome to SABILORÉ API',
        endpoints: [
            '/api/products',
            '/api/auth',
            '/api/orders',
            '/api/blog',
            '/api/health'
        ],
        timestamp: new Date()
    });
});

apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is reachable', timestamp: new Date() });
});


const NO_CACHE_HEADER = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
apiRouter.use((req, res, next) => {
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', NO_CACHE_HEADER);
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});


apiRouter.use('/products', productRoutes);
apiRouter.use('/blog', blogPostsRoutes);
apiRouter.use('/categories', (req, res, next) => {
    next();
});
apiRouter.use('/auth', authRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/admin/product-size-options', productSizeOptionRoutes);

apiRouter.use('/admin/settings', (req, res, next) => {
    next();
});
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/blog', blogPostsRoutes);
apiRouter.use('/newsletter', newsletterRoutes);
apiRouter.use('/contact', contactRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/coupons', couponRoutes);
apiRouter.use('/gateways', gatewayRoutes);

app.use('/api', apiRouter);


const runMigrations = async () => {
    const db = pool; 

    
    
    
    
    const safeCreate = async (sql, tableName) => {
        try {
            await db.execute(sql);
        } catch (e) {
            const msg = e.message || '';
            const isOrphanedIbd = e.errno === 1813 || msg.includes('DISCARD the tablespace');
            const isOrphanedFrm = e.errno === 1932 || msg.includes("doesn't exist in engine");
            if (!isOrphanedIbd && !isOrphanedFrm) throw e; 

            console.warn(`⚠️  Orphaned InnoDB table '${tableName}' (errno ${e.errno}) — attempting heal...`);
            let healed = false;

            
            if (!healed) {
                try {
                    if (isOrphanedIbd) await db.execute(`ALTER TABLE \`${tableName}\` DISCARD TABLESPACE`);
                    await db.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
                    await db.execute(sql);
                    
                    healed = true;
                } catch {  }
            }

            
            if (!healed) {
                try {
                    await db.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
                    await db.execute(sql);
                    
                    healed = true;
                } catch {  }
            }

            if (!healed) {
                
                
                console.error(
                    `\n❌ Cannot auto-heal '${tableName}' — the .ibd tablespace file exists on disk\n` +
                    `   but MySQL has no table definition for it. Fix this manually:\n\n` +
                    `   OPTION A — MySQL CLI / Workbench:\n` +
                    `     USE sabilore_db;\n` +
                    `     SET foreign_key_checks = 0;\n` +
                    `     DROP TABLE IF EXISTS \`${tableName}\`;\n\n` +
                    `   OPTION B — Delete the orphaned file:\n` +
                    `     Run in MySQL:  SHOW VARIABLES LIKE 'datadir';\n` +
                    `     Delete file:   {datadir}/sabilore_db/${tableName}.ibd\n` +
                    `     Restart MySQL, then run: npm start\n`
                );
                
            }
        }
    };

    try {
        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                token VARCHAR(10) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'password_reset_tokens');

        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS size_guides (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tummy_shape VARCHAR(50) NOT NULL,
                weight_min INT NOT NULL,
                weight_max INT NOT NULL,
                height_min INT NOT NULL,
                height_max INT NOT NULL,
                recommended_size VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'size_guides');

        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                content LONGTEXT NOT NULL,
                excerpt TEXT,
                author VARCHAR(100) DEFAULT 'Admin',
                image VARCHAR(255),
                status ENUM('Draft', 'Published') DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'blog_posts');

        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                discount_type ENUM('percentage', 'flat') DEFAULT 'percentage',
                discount_value DECIMAL(10,2) NOT NULL,
                min_order_value DECIMAL(10,2) DEFAULT 0,
                max_uses INT DEFAULT NULL,
                used_count INT DEFAULT 0,
                expires_at DATETIME DEFAULT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'coupons');

        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'settings');

        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS product_size_options (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                image_url VARCHAR(255) NOT NULL,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'product_size_options');

        
        await safeCreate(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type ENUM('mobile', 'bank', 'cash') NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                instructions TEXT,
                image VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `, 'payment_methods');

        

        
        
        

        
        try {
            await db.execute('ALTER TABLE payment_methods ADD COLUMN image VARCHAR(255) NULL');
            
        } catch {  }

        const columnMigrations = [
            { table: 'return_requests', col: 'product_id', type: 'INT AFTER order_id' },
            { table: 'return_requests', col: 'return_type', type: "ENUM('Refund', 'Exchange') DEFAULT 'Refund' AFTER reason" },
            { table: 'return_requests', col: 'return_method', type: "ENUM('Courier', 'Handover', 'Delivery Man') DEFAULT 'Courier' AFTER return_type" },
            { table: 'return_requests', col: 'payment_method', type: 'VARCHAR(100) AFTER return_method' },
            { table: 'return_requests', col: 'account_number', type: 'VARCHAR(100) AFTER payment_method' },
            { table: 'orders', col: 'order_number', type: 'VARCHAR(50) UNIQUE AFTER id' },
            { table: 'payment_methods', col: 'type', type: "ENUM('mobile', 'bank', 'cash') NOT NULL DEFAULT 'mobile' AFTER name" },
            { table: 'payment_methods', col: 'status', type: "ENUM('active', 'inactive') DEFAULT 'active' AFTER type" },
            { table: 'payment_methods', col: 'instructions', type: 'TEXT AFTER status' },
            { table: 'order_items', col: 'color', type: 'VARCHAR(50) AFTER size' },
            { table: 'order_items', col: 'tummy_shape', type: 'VARCHAR(50) AFTER color' },
            { table: 'products', col: 'is_on_sale', type: 'TINYINT(1) DEFAULT 0 AFTER is_new_arrival' },
            { table: 'products', col: 'sale_start', type: 'DATETIME NULL AFTER is_on_sale' },
            { table: 'products', col: 'sale_end', type: 'DATETIME NULL AFTER sale_start' },
            { table: 'products', col: 'is_free_delivery', type: 'TINYINT(1) DEFAULT 0 AFTER sale_end' }
        ];

        for (const meta of columnMigrations) {
            try {
                await db.execute(`ALTER TABLE ${meta.table} ADD COLUMN ${meta.col} ${meta.type}`);
                
            } catch {  }
        }

        
        try {
            const [existingMethods] = await db.execute('SELECT COUNT(*) as count FROM payment_methods');
            if (existingMethods[0].count === 0) {
                await db.execute(`
                    INSERT INTO payment_methods (name, type, status, instructions) VALUES 
                    ('bKash', 'mobile', 'active', '<p>Send money to our bKash Merchant Account: <b>01812244988</b></p><p>Please enter your Transaction ID below to verify your payment.</p>'),
                    ('Cash on Delivery', 'cash', 'active', '<p>Pay comfortably when the product arrives at your doorstep.</p>')
                `);
                
            }
        } catch (e) {
            console.warn('⚠️  Could not seed payment_methods (table engine issue). Run: REPAIR TABLE payment_methods; in MySQL.', e.message);
        }

        
        
        
        const policies = {
            legal_delivery: `
                <section class="mb-4">
                    <h5 class="fw-bold">1. Delivery Zones & Fees</h5>
                    <ul>
                        <li><strong>Inside Dhaka:</strong> 80 BDT (1–3 business days)</li>
                        <li><strong>Outside Dhaka:</strong> 140 BDT (3–5 business days)</li>
                        <li><strong>Inside Dhaka Express:</strong> 150 BDT (12–24 hours)</li>
                    </ul>
                </section>
                <section class="mb-4">
                    <h5 class="fw-bold">2. Shipment Tracking</h5>
                    <p>Tracking details will be provided via SMS/Email after your shipment is handed over to the courier partner.</p>
                </section>
                <section class="mb-4">
                    <h5 class="fw-bold">3. Verification</h5>
                    <p>Please ensure your name, address, and phone number are correct to avoid delivery delays.</p>
                </section>
            `,
            legal_terms: `
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-info-circle text-primary me-2"></i> 1. Introduction</h5>
                    <p>Welcome to <span class="site-name-text">SABILORÉ</span>. These Terms and Conditions govern your use
                        of our website and services. By accessing or using our platform, you agree to be bound by these
                        terms. If you do not agree, please refrain from using our services.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-user-check text-success me-2"></i> 2. Use of the Site & Eligibility</h5>
                    <p>To use this site, you must be at least 18 years of age or have parental/guardian consent. You agree
                        to provide accurate and complete information when creating an account or placing an order. Any
                        fraudulent or unauthorized use of the site is strictly prohibited.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-tags text-warning me-2"></i> 3. Product Information & Pricing</h5>
                    <p>We strive to display our products, including colors and textures, as accurately as possible. However,
                        actual colors may vary depending on your monitor settings. All prices are listed in BDT and are
                        subject to change without prior notice. We reserve the right to correct any pricing errors that may
                        occur.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-shopping-bag text-info me-2"></i> 4. Order Acceptance & Changes</h5>
                    <p>Receipt of an order confirmation does not signify our acceptance of your order. We reserve the right
                        at any time after receipt of your order to accept or decline it for any reason, including product
                        availability or inaccuracies in pricing/product descriptions.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-truck text-primary me-2"></i> 5. Shipping &amp; Delivery</h5>
                    <p>We provide standard and express delivery options:</p>
                    <ul>
                        <li><strong>Inside Dhaka:</strong> 80 BDT (1-3 business days)</li>
                        <li><strong>Outside Dhaka:</strong> 140 BDT (3-5 business days)</li>
                        <li><strong>Inside Dhaka Express:</strong> 150 BDT (12-24 hours)</li>
                    </ul>
                    <p>Please ensure correct name, address, and phone number. Delivery times are estimates and may be subject to
                        delays beyond our control.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-undo text-danger me-2"></i> 6. Returns & Refunds</h5>
                    <p>Items can be returned within 7 days of delivery if they are unused, unwashed, and in original condition
                        with all tags intact. Original invoice is required. Change of mind or size preference is not accepted
                        for returns.</p>
                    <p>Refunds will be processed within 14 working days after inspection. Shipping charges are non-refundable
                        unless the item is defective or there was an error in our part.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-shield-alt text-secondary me-2"></i> 7. Limitation of Liability</h5>
                    <p><span class="site-name-text">SABILORÉ</span> shall not be liable for any direct, indirect,
                        incidental, or consequential damages resulting from the use or inability to use our services or
                        products.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-gavel text-dark me-2"></i> 8. Governing Law</h5>
                    <p>These terms are governed by the laws of Bangladesh. Any disputes arising from these terms or your use
                        of the site shall be resolved exclusively in the courts of Bangladesh.</p>
                </section>
            `,
            legal_privacy: `
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-database text-primary me-2"></i> 1. Information We Collect</h5>
                    <p>We collect personal information that you voluntarily provide to us when you register on the site,
                        place an order, or contact us. This may include your name, email address, phone number, shipping
                        address, and payment details.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-bullseye text-success me-2"></i> 2. How We Use Your Information</h5>
                    <p>Your information is used to process and fulfill your orders, provide customer support, improve our
                        website and services, and send you occasional promotional emails if you have opted in to receive
                        them.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-lock text-warning me-2"></i> 3. Data Security</h5>
                    <p>We implement a variety of security measures to maintain the safety of your personal information. Your
                        sensitive data is encrypted and protected using industry-standard protocols. However, please be
                        aware that no transmission over the internet is completely secure.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-cookie text-info me-2"></i> 4. Cookies Policy</h5>
                    <p>We use cookies to enhance your browsing experience, remember the items in your cart, and understand
                        how you interact with our site. You can choose to disable cookies through your browser settings,
                        though this may limit your ability to use certain features.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-share-alt text-danger me-2"></i> 5. Third-Party Disclosure</h5>
                    <p>We do not sell, trade, or transfer your personal information to outside parties except for trusted
                        third parties who assist us in operating our website, conducting our business, or servicing you
                        (e.g., delivery partners), so long as those parties agree to keep this information confidential.</p>
                </section>
                <section class="mb-5">
                    <h5 class="fw-bold"><i class="fas fa-user-shield text-secondary me-2"></i> 6. Your Rights</h5>
                    <p>You have the right to access, correct, or delete your personal information at any time. If you wish
                        to exercise these rights, please contact us via the details provided in our header or footer.</p>
                </section>
            `,
            legal_returns: `
                <section class="mb-5">
                    <h4 class="fw-bold border-bottom pb-2 mb-4"><i class="fas fa-undo me-2 text-primary"></i> Return, Refund & Exchange Policy</h4>
                    <p>At SABILORÉ, we aim to deliver quality garments and a smooth shopping experience. If something isn't right, we're here to help.</p>

                    <div class="mt-4 mb-4">
                        <h6 class="fw-bold text-uppercase" style="letter-spacing: 0.5px;">Eligibility (Returns & Exchanges)</h6>
                        <ul class="small text-muted">
                            <li>Request within <strong>7 days</strong> of delivery</li>
                            <li>Item must be unused, unwashed, in original condition</li>
                            <li>Tags, labels, and packaging must be intact</li>
                            <li>Original invoice required</li>
                        </ul>
                        <p class="text-danger small mb-0"><strong>❌ Not accepted:</strong> change of mind, size preference, or personal reasons</p>
                    </div>

                    <div class="row g-4">
                        <div class="col-md-6">
                            <h6 class="fw-bold text-uppercase" style="letter-spacing: 0.5px;">How to Request</h6>
                            <ul class="small text-muted mb-0">
                                <li>Contact support with your order number, issue explanation, and photos</li>
                                <li>Our team will review and guide you through the next steps</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6 class="fw-bold text-uppercase" style="letter-spacing: 0.5px;">Refund Processing</h6>
                            <ul class="small text-muted mb-0">
                                <li>Processed after inspection (up to 14 working days)</li>
                                <li>Refund issued via original payment method</li>
                                <li>Shipping charges are non-refundable unless it's our error</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section class="mb-5">
                    <h4 class="fw-bold border-bottom pb-2 mb-4"><i class="fas fa-exclamation-triangle me-2 text-warning"></i> Incorrect / Defective Items</h4>
                    <ul class="small text-muted mb-0">
                        <li>Notify us within <strong>48 hours</strong> of delivery with photos and order details</li>
                        <li>A replacement or full refund will be arranged at no extra cost</li>
                        <li>Return shipping will be covered by SABILORÉ</li>
                    </ul>
                </section>

                <div class="p-4 bg-light rounded-4 border mt-5 text-center">
                    <h5 class="fw-bold mb-3">Need Help?</h5>
                    <div class="d-flex flex-wrap justify-content-center gap-4">
                        <div class="d-flex align-items-center text-start">
                            <i class="fas fa-envelope fs-3 text-primary me-3"></i>
                            <div>
                                <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.7rem;">Email Us</span>
                                <strong>sabiloreofficial@gmail.com</strong>
                            </div>
                        </div>
                        <div class="d-flex align-items-center text-start">
                            <i class="fab fa-whatsapp fs-3 text-success me-3"></i>
                            <div>
                                <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.7rem;">Phone/WhatsApp</span>
                                <strong>01748 211 022</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };

        for (const [key, value] of Object.entries(policies)) {
            
            await db.execute('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
        }
        

        

        
        
        
        const indexes = [
            { table: 'products', col: 'slug', name: 'idx_products_slug' },
            { table: 'products', col: 'category_id', name: 'idx_products_category_id' },
            { table: 'products', col: 'is_featured', name: 'idx_products_is_featured' },
            { table: 'products', col: 'is_top_selling', name: 'idx_products_is_top_selling' },
            { table: 'products', col: 'is_new_arrival', name: 'idx_products_is_new_arrival' },
            { table: 'products', col: 'is_on_sale', name: 'idx_products_is_on_sale' },
            { table: 'products', col: 'is_free_delivery', name: 'idx_products_is_free_delivery' },
            { table: 'products', col: 'created_at', name: 'idx_products_created_at' },
            { table: 'product_variants', col: 'product_id', name: 'idx_variants_product_id' },
            { table: 'product_variants', col: 'color', name: 'idx_variants_color' },
            { table: 'categories', col: 'slug', name: 'idx_categories_slug' },
            { table: 'orders', col: 'customer_id', name: 'idx_orders_customer_id' },
            { table: 'orders', col: 'created_at', name: 'idx_orders_created_at' },
            { table: 'customers', col: 'email', name: 'idx_customers_email' },
            { table: 'customers', col: 'phone', name: 'idx_customers_phone' },
            { table: 'orders', col: 'shipping_email', name: 'idx_orders_shipping_email' },
            { table: 'orders', col: 'shipping_phone', name: 'idx_orders_shipping_phone' }
        ];
        for (const { table, col, name } of indexes) {
            try {
                await db.execute(`CREATE INDEX ${name} ON ${table} (${col})`);
                
            } catch (e) {
                
                if (e.errno !== 1061 && e.errno !== 1068) {
                    console.warn(`Could not create index ${name}:`, e.message);
                }
            }
        }
    } catch (err) {
        console.warn('❌ DB Migrations failed:', err.message);
    }
};





app.use((req, res, next) => {
    const p = req.path.toLowerCase().replace(/\/$/, ""); 
    if (p === '/admin/index' || p === '/admin/index.html') {
        return res.redirect(301, '/admin/');
    }
    next();
});

app.use('/admin', express.static(path.join(__dirname, '../admin'), {
    extensions: ['html'],
    setHeaders: (res) => {
        
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));


app.use(['/admin', '/api', '/profile', '/orders'], (req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
});






const pages = {
    'home':             'SABILORÉ | Premium Clothing Brand',
    'shop':             'SABILORÉ | Shop All Products',
    'product':          'SABILORÉ | Product Details',
    'categories':       'SABILORÉ | Collections & Categories',
    'cart':             'SABILORÉ | Your Shopping Cart',
    'checkout':         'SABILORÉ | Secure Checkout',
    'favorites':        'SABILORÉ | Your Wishlist',
    'terms':            'SABILORÉ | Terms & Conditions',
    'privacy':          'SABILORÉ | Privacy Policy',
    'delivery':         'SABILORÉ | Delivery Information',
    'login':            'SABILORÉ | Login or Register',
    'profile':          'SABILORÉ | My Profile',
    'orders':           'SABILORÉ | My Orders',
    'return-portal':    'SABILORÉ | Returns & Exchange Portal',
    'track':            'SABILORÉ | Track Your Order',
    'blog':             'SABILORÉ | Fashion & Style Tips Blog',
    'new-arrivals':     'SABILORÉ | New Arrivals — Latest Collections',
    'season-end-sale':  'SABILORÉ | Season End Sale — Huge Discounts on Premium Fashion',
};


const metaDescriptions = {
    'home':             'Discover premium minimalist clothing from Dhaka. Explore modern essentials, new arrivals, and exclusive collections designed for timeless style.',
    'shop':             'Browse all SABILORÉ products. Filter by category, price, or size. Fast delivery inside and outside Dhaka, Bangladesh.',
    'product':          'View full product details, size guide, color variants, and delivery info. Secure checkout with Cash on Delivery or bKash at SABILORÉ.',
    'categories':       'Explore all SABILORÉ collections — premium wear, casual wear, hoodies, and seasonal fashion across Bangladesh.',
    'cart':             'Review your SABILORÉ shopping cart. Adjust quantities and proceed to fast, secure checkout with Cash on Delivery.',
    'checkout':         'Secure checkout at SABILORÉ. Choose your delivery location across Bangladesh and pay via bKash or Cash on Delivery.',
    'favorites':        'Your SABILORÉ wishlist. Save the styles you love and come back to shop them anytime.',
    'login':            'Login or create a free account at SABILORÉ to track orders, manage your profile, and access exclusive member deals.',
    'profile':          'Manage your SABILORÉ account — update personal info, change password, and view full order history.',
    'orders':           'View and manage all your SABILORÉ orders. Check order IDs, status updates, and estimated delivery dates.',
    'return-portal':    'Start a hassle-free exchange or return at SABILORÉ. Submit your request within 7 days of delivery.',
    'terms':            'Read the SABILORÉ Terms & Conditions. Understand your rights, order policies, and responsibilities as a valued customer.',
    'privacy':          'SABILORÉ Privacy Policy — how we collect, use, and protect your personal information in accordance with data protection standards.',
    'delivery':         'SABILORÉ Delivery Info — shipping zones, delivery fees (Inside Dhaka ৳80, Outside ৳140), express 12-24H, and courier details.',
    'track':            'Track your SABILORÉ order in real-time. Enter your order number or registered phone number to see current delivery status.',
    'blog':             'SABILORÉ Fashion Journal — seasonal style trends, outfit guides, capsule wardrobe tips, and exclusive collection previews.',
    'new-arrivals':     'Discover the newest premium fashion additions at SABILORÉ. Fresh drops updated regularly — be the first to shop new styles.',
    'season-end-sale':  'Massive Season End Sale at SABILORÉ — up to 50% off on premium fashion. Limited stock, fast delivery across Bangladesh.',
};


const templateCache = {};


const NAV_ITEMS = ['home', 'shop', 'new-arrivals', 'categories', 'blog', 'track', 'favorites', 'cart'];
const NAV_REGEX = {};
NAV_ITEMS.forEach(item => {
    NAV_REGEX[item] = new RegExp(`\\{\\{active_${item}\\}\\}`, 'g');
});
const PAGE_TITLE_REGEX     = /\{\{page_title\}\}/g;
const CANONICAL_URL_REGEX  = /\{\{canonical_url\}\}/g;
const META_DESC_REGEX      = /\{\{meta_description\}\}/g;
const GOOGLE_PIXEL_REGEX   = /\{\{google_pixel_code\}\}/g;
const META_PIXEL_REGEX     = /\{\{meta_pixel_code\}\}/g;
const TIMESTAMP_REGEX      = /\{\{timestamp\}\}/g;
const URL_CAT_REGEX        = /\{\{url_cat\}\}/g;
const URL_SLUG_REGEX       = /\{\{url_slug\}\}/g;
const SITE_FAVICON_HREF_REGEX = /\{\{site_favicon_href\}\}/g;
const SITE_FAVICON_TYPE_REGEX = /\{\{site_favicon_type\}\}/g;

function getTemplate(filePath) {
    if (process.env.NODE_ENV !== 'development' && templateCache[filePath]) {
        return templateCache[filePath];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    templateCache[filePath] = content;
    return content;
}


function renderPage(pageName, pageTitle, currentPage, queryParams = {}, req = null) {
    const frontendDir = path.join(__dirname, '../frontend');
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';

    try {
        let header = getTemplate(path.join(frontendDir, 'includes/header.html'));
        let pageContent = getTemplate(path.join(frontendDir, `pages/${pageName}.html`));
        let footer = getTemplate(path.join(frontendDir, 'includes/footer.html'));

        
        NAV_ITEMS.forEach(item => {
            header = header.replace(NAV_REGEX[item], currentPage === item ? 'active' : '');
        });

        
        header = header.replace(PAGE_TITLE_REGEX, pageTitle);
        header = header.replace(CANONICAL_URL_REGEX, req ? `${baseUrl}${req.originalUrl.split('?')[0]}` : baseUrl);
        header = header.replace(META_DESC_REGEX, metaDescriptions[pageName] || metaDescriptions['home']);

        
        let googlePixelCode = '';
        if (globalSettings.google_pixel_id) {
            googlePixelCode = `
    
    <script async src="https://www.googletagmanager.com/gtag/js?id=${globalSettings.google_pixel_id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${globalSettings.google_pixel_id}');
    </script>`;
        }

        let metaPixelCode = '';
        if (globalSettings.meta_pixel_id) {
            metaPixelCode = `
    
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${globalSettings.meta_pixel_id}');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${globalSettings.meta_pixel_id}&ev=PageView&noscript=1"/></noscript>`;
        }

        header = header.replace(GOOGLE_PIXEL_REGEX, googlePixelCode);
        header = header.replace(META_PIXEL_REGEX, metaPixelCode);

        
        header = header.replace(/\{\{image_display_mode\}\}/g, globalSettings.image_display_mode || 'contain');
        const logoUrl = (globalSettings.site_logo && globalSettings.site_logo.trim())
            ? (globalSettings.site_logo.startsWith('http') ? globalSettings.site_logo : globalSettings.site_logo)
            : '';
        const logoDesktopUrl = globalSettings.site_logo_desktop || logoUrl;
        header = header.replace(/\{\{site_logo\}\}/g, logoUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        header = header.replace(/\{\{site_logo_desktop\}\}/g, logoDesktopUrl || logoUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        
        header = header.replace(/\{\{site_logo_visible\}\}/g,  logoUrl ? 'inline-block' : 'none');
        header = header.replace(/\{\{site_name_visible\}\}/g,  logoUrl ? 'none' : 'inline-block');
        header = header.replace(/\{\{site_name_text\}\}/g, globalSettings.site_name || 'SABILORÉ');
        header = header.replace(/\{\{site_name\}\}/g, globalSettings.site_name || 'SABILORÉ');


        
        const v = globalSettings._cacheVersion || Date.now();
        header = header.replace(/\{\{cache_version\}\}/g, v);
        footer = footer.replace(/\{\{cache_version\}\}/g, v);
        pageContent = pageContent.replace(/\{\{cache_version\}\}/g, v);

        
        
        if (globalSettings.site_favicon && globalSettings.site_favicon.trim()) {
            const favHref = `${globalSettings.site_favicon}?v=${v}`;
            const favExt = globalSettings.site_favicon.split('.').pop().toLowerCase();
            const favMime = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', ico: 'image/x-icon' }[favExt] || 'image/x-icon';
            header = header.replace(SITE_FAVICON_HREF_REGEX, favHref);
            header = header.replace(SITE_FAVICON_TYPE_REGEX, favMime);
        } else {
            
            header = header.replace(/<link rel="icon"[^>]*>/g, '');
            header = header.replace(/<link rel="apple-touch-icon"[^>]*>/g, '');
            header = header.replace(SITE_FAVICON_HREF_REGEX, '/favicon.ico');
            header = header.replace(SITE_FAVICON_TYPE_REGEX, 'image/x-icon');
        }

        
        footer = footer.replace(TIMESTAMP_REGEX, Date.now());

        
        pageContent = pageContent.replace(URL_CAT_REGEX, (pageName === 'shop' && queryParams.cat) ? queryParams.cat : '');
        pageContent = pageContent.replace(URL_SLUG_REGEX, (pageName === 'product' && queryParams.slug) ? queryParams.slug : '');

        
        
        
        let pageStyles = '';
        const asyncStyle = (href) => `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${href}"></noscript>`;
        
        if (pageName === 'shop' || pageName === 'product' || pageName === 'new-arrivals' || pageName === 'categories' || pageName === 'season-end-sale') {
            pageStyles = asyncStyle(`/css/shop.min.css?v=${v}`);
        } else if (pageName === 'checkout' || pageName === 'cart' || pageName === 'return-portal') {
            pageStyles = asyncStyle(`/css/checkout.min.css?v=${v}`);
        } else if (pageName === 'profile' || pageName === 'orders') {
            pageStyles = asyncStyle(`/css/profile.min.css?v=${v}`);
        } else if (pageName === 'home') {
            pageStyles = asyncStyle(`/css/home-styles.min.css?v=${v}`);
        }
        header = header.replace(/\{\{page_styles\}\}/g, pageStyles);

        
        const criticalCss = getTemplate(path.join(frontendDir, 'css/critical.min.css'));
        header = header.replace(/\{\{critical_css\}\}/g, criticalCss);

        
        let heroPreload = '';
        if (pageName === 'home') {
            const mediaType = globalSettings.hero_media_type || 'image';
            if (mediaType === 'video') {
                const vidMobile = globalSettings.hero_video_mobile || globalSettings.hero_video || '';
                const vidDesktop = globalSettings.hero_video || '';
                
                const vidTarget = req && req.get('user-agent') && /Mobile|Android|iPhone/i.test(req.get('user-agent')) ? vidMobile : vidDesktop;
                if (vidTarget) {
                    heroPreload = `<link rel="preload" as="video" href="${vidTarget}" fetchpriority="high">`;
                }

                pageContent = pageContent.replace(/\{\{hero_media\}\}/g, `
                    <video class="d-md-none w-100 h-100" style="object-fit: ${globalSettings.image_display_mode || 'contain'};" src="${vidMobile}" autoplay muted loop playsinline></video>
                    <video class="d-none d-md-block w-100 h-100" style="object-fit: ${globalSettings.image_display_mode || 'contain'};" src="${vidDesktop}" autoplay muted loop playsinline></video>
                `);
            } else {
                const imgMobile = globalSettings.hero_image_mobile || globalSettings.hero_image || '';
                const imgDesktop = globalSettings.hero_image || '';

                
                if (imgMobile) {
                    heroPreload += `<link rel="preload" as="image" href="${imgMobile}" media="(max-width: 767px)" fetchpriority="high">`;
                }
                if (imgDesktop) {
                    heroPreload += `<link rel="preload" as="image" href="${imgDesktop}" media="(min-width: 768px)" fetchpriority="high">`;
                }

                let heroMediaHtml = `<picture style="width:100%; height:100%; display:block;">`;
                if (imgMobile) {
                    heroMediaHtml += `<source media="(max-width: 480px)" srcset="${imgMobile}">`;
                    heroMediaHtml += `<source media="(max-width: 767px)" srcset="${imgMobile}">`;
                }
                if (imgDesktop) {
                    heroMediaHtml += `<source media="(min-width: 768px)" srcset="${imgDesktop}">`;
                }
                heroMediaHtml += `<img id="hero-main-img" src="${imgDesktop || imgMobile || ''}" alt="Hero" loading="eager" fetchpriority="high" width="1920" height="800" style="width:100%; height:auto; object-fit:${globalSettings.image_display_mode || 'contain'};">`;
                heroMediaHtml += `</picture>`;
                
                pageContent = pageContent.replace(/\{\{hero_media\}\}/g, heroMediaHtml);
            }
        } else if (pageName === 'product' && queryParams.product_img) {
            heroPreload = `<link rel="preload" as="image" href="${queryParams.product_img}" fetchpriority="high">`;
        }
        
        let logoPreload = '';
        if (logoUrl) {
            logoPreload = `<link rel="preload" href="${logoUrl}" as="image" fetchpriority="high">`;
        }
        header = header.replace(/\{\{logo_preload\}\}/g, logoPreload);
        header = header.replace(/\{\{hero_preload\}\}/g, heroPreload);

        
        
        const minifyHtml = (html) => {
            const blocks = [];
            
            html = html.replace(/(<(script|style|pre|textarea)[^>]*>[\s\S]*?<\/\2>)/gi, (m) => {
                blocks.push(m);
                return `BLOCK_PLACEHOLDER_${blocks.length - 1}_END`;
            });
            html = html
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/^\s+/gm, '')
                .replace(/\n+/g, '\n');
            
            html = html.replace(/BLOCK_PLACEHOLDER_(\d+)_END/g, (_, i) => blocks[Number.parseInt(i, 10)]);
            return html;
        };

        const fullHtml = header + '\n' + pageContent + '\n' + footer;
        const shouldMinify = process.env.NODE_ENV === 'production' && !queryParams.nominify;
        return shouldMinify ? minifyHtml(fullHtml) : fullHtml;
    } catch (err) {
        console.error(`Error rendering page "${pageName}":`, err.message);
        return `<html><body><h1>Page Not Found</h1><p>The page "${pageName}" could not be loaded.</p><a href="/">Go Home</a></body></html>`;
    }
}




const _pageCache = new Map();
const _PAGE_CACHE_TTL = 3 * 60 * 1000; 

function _setCachedPage(key, html) {
    const etag = `"pg${Date.now().toString(36)}-${html.length.toString(36)}"`;
    _pageCache.set(key, { html, etag, ts: Date.now() });
    return etag;
}
function _getCachedPage(key) {
    const e = _pageCache.get(key);
    return (e && Date.now() - e.ts < _PAGE_CACHE_TTL) ? e : null;
}
global.invalidatePageCache = (name) => {
    refreshGlobalSettings().catch(() => {});
    globalSettings._cacheVersion = Date.now();

    if (name) { for (const k of _pageCache.keys()) { if (k.startsWith(name)) _pageCache.delete(k); } }
    else _pageCache.clear();
};


function servePage(req, res, pageName, title, currentPage, queryParams = {}) {
    const cacheKey = `${pageName}:${JSON.stringify(queryParams)}`;
    
    
    
    const cc = 'no-cache, must-revalidate';
    const cached = _getCachedPage(cacheKey);
    if (cached) {
        if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
        res.setHeader('ETag', cached.etag);
        res.setHeader('Cache-Control', cc);
        res.setHeader('Vary', 'Accept-Encoding');
        return res.send(cached.html);
    }
    const html = renderPage(pageName, title, currentPage, queryParams, req);
    const etag = _setCachedPage(cacheKey, html);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', cc);
    res.setHeader('Vary', 'Accept-Encoding');
    res.send(html);
}



app.get('/', (req, res) => servePage(req, res, 'home', pages['home'], 'home'));


app.get('/shop', (req, res) => servePage(req, res, 'shop', pages['shop'], 'shop', { cat: req.query.cat || '' }));
app.get('/shop/:category', (req, res) => servePage(req, res, 'shop', pages['shop'], 'shop', { cat: req.params.category }));


app.get('/product/:slug', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    let productImg = '';
    try {
        const [rows] = await pool.query('SELECT image FROM products WHERE slug = ? LIMIT 1', [req.params.slug]);
        if (rows.length > 0) productImg = rows[0].image;
    } catch {  }

    res.send(renderPage('product', pages['product'], 'product', { slug: req.params.slug, product_img: productImg }, req));
});


['home', 'categories', 'cart', 'checkout', 'favorites', 'login', 'profile', 'orders', 'return-portal', 'blog', 'track', 'new-arrivals', 'season-end-sale'].forEach(page => {
    app.get(`/${page}`, (req, res) => servePage(req, res, page, pages[page] || 'SABILORÉ', page));
});


['terms', 'privacy', 'delivery'].forEach(page => {
    app.get(`/${page}`, (req, res) => servePage(req, res, 'legal', pages[page] || 'SABILORÉ', page));
});



app.get('/robots.txt', (req, res) => {
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const sitemapUrl = `${protocol}://${host}/sitemap.xml`;
    const content = [
        'User-agent: *',
        'Allow: /',
        '',
        '# Block backend API (not useful for indexing)',
        'Disallow: /api/',
        '# Block admin panel',
        'Disallow: /admin/',
        '# Block user-specific / transactional pages (no SEO value)',
        'Disallow: /profile/',
        'Disallow: /orders/',
        'Disallow: /checkout/',
        'Disallow: /cart/',
        '# Block raw uploads folder',
        'Disallow: /uploads/',
        '',
        '# Allow major crawlers explicitly',
        'User-agent: Googlebot',
        'Allow: /',
        'User-agent: Bingbot',
        'Allow: /',
        '',
        `Sitemap: ${sitemapUrl}`,
    ].join('\n');
    res.type('text/plain').send(content);
});


let _sitemapCache = null;
let _sitemapCacheTs = 0;
const _SITEMAP_TTL = 10 * 60 * 1000;

app.get('/sitemap.xml', async (req, res) => {
    if (_sitemapCache && Date.now() - _sitemapCacheTs < _SITEMAP_TTL) {
        res.header('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 'public, max-age=600');
        return res.send(_sitemapCache);
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const today = new Date().toISOString().split('T')[0]; 

    
    const staticPages = [
        { loc: '',                  changefreq: 'daily',   priority: '1.0' },
        { loc: 'shop',              changefreq: 'daily',   priority: '0.9' },
        { loc: 'new-arrivals',      changefreq: 'daily',   priority: '0.9' },
        { loc: 'season-end-sale',   changefreq: 'weekly',  priority: '0.85' },
        { loc: 'categories',        changefreq: 'weekly',  priority: '0.8' },
        { loc: 'blog',              changefreq: 'weekly',  priority: '0.7' },
        { loc: 'track',             changefreq: 'monthly', priority: '0.6' },
        { loc: 'return-portal',     changefreq: 'monthly', priority: '0.5' },
        { loc: 'terms',             changefreq: 'yearly',  priority: '0.4' },
        { loc: 'privacy',           changefreq: 'yearly',  priority: '0.4' },
        { loc: 'delivery',          changefreq: 'yearly',  priority: '0.4' },
    ];

    let entries = staticPages.map(p => `
    <url>
        <loc>${baseUrl}/${p.loc}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority}</priority>
    </url>`).join('');

    try {
        
        let products = [];
        try {
            const [rows] = await pool.query('SELECT slug, updated_at FROM products WHERE is_active = 1 OR is_active IS NULL ORDER BY updated_at DESC');
            products = rows;
        } catch {
            console.error('Products missing for sitemap');
        }
        if (products.length > 0) {
            entries += products.map(p => {
                const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : today;
                return `
    <url>
        <loc>${baseUrl}/product/${p.slug}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>`;
            }).join('');
        }

        
        let categories = [];
        try {
            const [rows] = await pool.query('SELECT slug FROM categories');
            categories = rows;
        } catch {
            console.error('Categories missing for sitemap');
        }
        if (categories.length > 0) {
            entries += categories.map(c => `
    <url>
        <loc>${baseUrl}/shop?cat=${c.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`).join('');
        }
    } catch (err) {
        console.error('Error querying for sitemap:', err);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries}
</urlset>`;

    _sitemapCache = xml;
    _sitemapCacheTs = Date.now();
    res.header('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(xml);
});




app.use((req, res) => {
    
    const skip = /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|map|webp)$/.test(req.originalUrl)
               || req.originalUrl.startsWith('/.well-known/');
    if (!skip) {
        
    }

    
    if (req.originalUrl.startsWith('/api/') || req.originalUrl === '/api') {
        return res.status(404).json({
            message: `Route not found: ${req.originalUrl}`,
            hint: "Check your endpoint URL. Base API is at /api"
        });
    }

    
    if (req.originalUrl.startsWith('/admin/')) {
        return res.redirect('/admin/');
    }

    
    res.status(404).send(renderPage('home', 'SABILORÉ | Page Not Found', 'home', {}, req));
});

const logger = require('./utils/logger');





app.use((err, req, res, _next) => { 
    const status = err.status || err.statusCode || 500;
    const isApi  = req.originalUrl.startsWith('/api/');
    const isDev  = process.env.NODE_ENV === 'development';

    
    logger.error(`${req.method} ${req.originalUrl} → ${status}: ${err.message}`, err);

    
    if (err.fields) {
        return res.status(422).json({
            error: true,
            message: 'Validation failed',
            fields: err.fields
        });
    }

    if (isApi) {
        return res.status(status).json({
            error: true,
            message: isDev ? err.message : (status < 500 ? err.message : 'Something went wrong. Please try again.'),
            ...(isDev && { stack: err.stack })
        });
    }

    
    res.status(status).send(renderPage('home', 'SABILORÉ | Server Error', 'home', {}, req));
});



process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION] Keeping Node alive. Error:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION] Keeping Node alive. Reason:', reason);
});






function gracefulShutdown(signal) {
    
    server.close(async () => {
        
        try {
            await pool.end();
            
        } catch (e) {
            console.warn('DB pool close error:', e.message);
        }
        process.exit(0);
    });
    
    setTimeout(() => {
        console.error('❌ Forced shutdown after 10s timeout.');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));






const AdminController = require('./controllers/adminController');
const initApp = async () => {
    await runMigrations();
    await AdminController.initializeSchema();
};
initApp();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});


server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!\n`);
        console.error(`👉 Fix: Run this command first to free the port:`);
        console.error(`\n   Windows CMD:   taskkill /F /IM node.exe`);
        console.error(`   Git Bash:      kill $(lsof -ti:${PORT}) 2>/dev/null`);
        console.error(`\n   Then run: npm start\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err.message);
        process.exit(1);
    }
});
