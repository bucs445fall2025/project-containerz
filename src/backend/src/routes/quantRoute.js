const router = require('express').Router();
const { priceCallOption } = require('../controllers/quantController.js');

router.post('/mc/call', priceCallOption);

module.exports = router;
