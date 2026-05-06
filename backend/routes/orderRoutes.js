const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const validate = require('../middleware/validateMiddleware');

router.post('/', optionalAuth, validate.order.createOrder, orderController.createOrder);
router.post('/express-checkout', optionalAuth, validate.order.expressCheckout, orderController.expressCheckout);
router.get('/my-orders', auth, orderController.getMyOrders);
router.get('/stats', auth, orderController.getOrderStats);
router.get('/:id', auth, orderController.getOrderDetails);
router.post('/return', auth, orderController.requestReturn);
router.post('/track', validate.order.trackOrder, orderController.trackOrder);


router.post('/public/find', orderController.findPublicOrder);
router.post('/public/return', orderController.submitPublicReturn);

module.exports = router;
