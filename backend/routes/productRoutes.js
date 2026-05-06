const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');


const httpCache = (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
};


const memCache = (ttl) => (req, res, next) => {
    if (typeof apiCacheMw === 'function') return apiCacheMw(ttl)(req, res, next);
    next();
};

const cache = (ttl = 2 * 60 * 1000) => [httpCache, memCache(ttl)];

router.get('/', ...cache(), productController.getProducts);
router.get('/suggestions', productController.getSearchSuggestions); 
router.get('/new-arrivals', ...cache(), productController.getNewArrivals);
router.get('/featured', ...cache(), productController.getFeaturedProducts);
router.get('/categories', ...cache(5 * 60 * 1000), productController.getCategories);
router.get('/category/:category', ...cache(), productController.getProductsByCategory);
router.get('/id/:id', ...cache(), productController.getProductById);
router.post('/bulk', productController.getProductsBulk);
router.get('/season-end-sale', ...cache(60 * 1000), productController.getSaleProducts); 
router.get('/:slug', ...cache(), productController.getProductBySlug);

module.exports = router;
