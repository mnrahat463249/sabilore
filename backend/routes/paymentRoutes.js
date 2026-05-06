const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');
const { singleUpload } = require('../middleware/uploadMiddleware');


router.get('/active', paymentController.getActivePaymentMethods);


router.get('/', auth, paymentController.getAllPaymentMethods);
router.post('/', auth, singleUpload('image'), paymentController.addPaymentMethod);
router.put('/:id', auth, singleUpload('image'), paymentController.updatePaymentMethod);
router.delete('/:id', auth, paymentController.deletePaymentMethod);

module.exports = router;
