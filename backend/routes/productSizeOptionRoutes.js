const express = require('express');
const router = express.Router();
const productSizeOptionController = require('../controllers/productSizeOptionController');
const authMiddleware = require('../middleware/authMiddleware');
const { singleUpload } = require('../middleware/uploadMiddleware');


router.get('/', productSizeOptionController.getAllOptions);


router.post('/', authMiddleware, singleUpload('image'), productSizeOptionController.addOption);
router.put('/:id', authMiddleware, singleUpload('image'), productSizeOptionController.updateOption);
router.delete('/:id', authMiddleware, productSizeOptionController.deleteOption);

module.exports = router;
