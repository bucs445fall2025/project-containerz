const express = require('express');
const router = express.Router();

const { identifier } = require('../middlewares/identification.js');
const authController = require('../controllers/authController.js');

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/me', identifier, authController.me);
router.post('/signout', identifier, authController.signout);

router.patch('/send-verification-code', identifier, authController.sendVerificationCode);
router.patch('/verify-verification-code', identifier, authController.verifyVerificationCode);

router.patch('/change-password', identifier, authController.changePassword);
router.patch('/send-forgot-password-code', authController.sendForgotPasswordCode);
router.patch('/verify-forgot-password-code', authController.verifyForgotPasswordCode);

module.exports = router;
