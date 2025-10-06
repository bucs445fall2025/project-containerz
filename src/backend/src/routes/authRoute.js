const express = require('express');
const router = express.Router();

const { identifier } = require('../middlewares/identification.js');
const authController = require('../controllers/authController.js');

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/me', identifier, authController.me);
router.post('/signout', identifier, authController.signout);

module.exports = router;
