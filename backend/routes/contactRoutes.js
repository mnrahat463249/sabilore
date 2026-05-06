const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/contactController');


router.post('/', ContactController.sendMessage);

module.exports = router;
