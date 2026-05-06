const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const activityLogger = require('../middleware/activityLogger');
const validate = require('../middleware/validateMiddleware');

router.post('/register', validate.auth.register, authController.register);
router.post('/login', validate.auth.login, activityLogger('User Login'), authController.login);
router.post('/forgot-password', validate.auth.forgotPassword, authController.forgotPassword);
router.get('/me', authMiddleware, authController.getMe);
router.put('/change-password', authMiddleware, validate.auth.changePassword, activityLogger('Password Change'), authController.changePassword);
router.put('/profile', authMiddleware, activityLogger('Profile Update'), authController.updateProfile);
router.get('/test', (req, res) => res.json({ message: 'Auth routes are working' }));

module.exports = router;
