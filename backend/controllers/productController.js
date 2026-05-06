const Product = require('../models/Product');
const { serverError } = require('../utils/errorHandler');


exports.clearProductCache = () => {
    if (typeof global.invalidateApiCache === 'function') global.invalidateApiCache('');
    if (typeof global.invalidatePageCache === 'function') global.invalidatePageCache();
    
};

exports.getProducts = async (req, res) => {
    try {
        const { q } = req.query;
        if (q) {
            const products = await Product.searchProducts(q);
            return res.json(products);
        }
        const products = await Product.getAll();
        res.json(products);
    } catch (err) {
        serverError(res, err, 'getProducts');
    }
};

exports.getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        const suggestions = await Product.getSearchSuggestions(q);
        res.json(suggestions);
    } catch (err) {
        serverError(res, err, 'getSearchSuggestions');
    }
};

exports.getProductBySlug = async (req, res) => {
    try {
        const slug = req.params.slug;
        const product = await Product.getBySlug(slug);
        if (product) {
            const [variants, relatedColors] = await Promise.all([
                Product.getVariants(product.id),
                Product.getRelatedColorProducts(product.name, product.category_id)
            ]);
            res.json({ ...product, variants, relatedColors });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        serverError(res, err, 'getProductBySlug');
    }
};

exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.getFeatured();
        res.json(products);
    } catch (err) {
        serverError(res, err, 'getFeaturedProducts');
    }
};

exports.getNewArrivals = async (req, res) => {
    try {
        const limit = Number.parseInt(req.query.limit, 10) || 8;
        const products = await Product.getNewArrivals(limit);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json(products);
    } catch (err) {
        serverError(res, err, 'getNewArrivals');
    }
};

exports.getProductsByCategory = async (req, res) => {
    try {
        let { category } = req.params;
        try { category = decodeURIComponent(category); } catch (err) { console.warn('Malformed category URI:', category, err.message); }
        const products = await Product.getByCategorySlug(category);
        res.json(products);
    } catch (err) {
        serverError(res, err, 'getProductsByCategory');
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Product.getCategories();
        res.json(categories);
    } catch (err) {
        serverError(res, err, 'getCategories');
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        serverError(res, err, 'getProductById');
    }
};

exports.getProductsBulk = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ message: 'Invalid IDs provided' });
        }
        const products = await Product.getByIds(ids);
        res.json(products);
    } catch (err) {
        serverError(res, err, 'getProductsBulk');
    }
};

exports.getSaleProducts = async (req, res) => {
    try {
        const limit = Number.parseInt(req.query.limit, 10) || 100;
        const products = await Product.getSaleProducts(limit);
        res.json(products);
    } catch (err) {
        serverError(res, err, 'getSaleProducts');
    }
};
