const express = require('express');
const router = express.Router();
const NewsletterController = require('../controllers/newsletterController');
const validate = require('../middleware/validateMiddleware');

router.post('/subscribe', validate.newsletter.subscribe, NewsletterController.subscribe);

module.exports = router;
