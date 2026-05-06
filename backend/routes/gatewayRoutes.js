const express = require('express');
const router = express.Router();
const gatewayController = require('../controllers/gatewayController');


router.get('/bkash/callback', gatewayController.bkashCallback);
router.get('/nagad/callback', gatewayController.nagadCallback);


router.post('/ebl/callback', gatewayController.eblCallback);
router.get('/ebl/callback', gatewayController.eblCallback);

module.exports = router;
