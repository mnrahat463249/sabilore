const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

router.get('/', blogController.getAllPosts);
router.get('/:slug', blogController.getPostBySlug);

module.exports = router;
