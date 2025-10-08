const router = require('express').Router();
const { identifier } = require('../middlewares/identification.js');
const plaidController = require('../controllers/plaidController.js');

router.use(identifier);

router.post('/link-token', plaidController.createLinkToken);
router.post('/set-access-token', plaidController.exchangePublicToken);
router.get('/accounts', plaidController.getAccounts);
router.get('/transactions', plaidController.getTransactions);

module.exports = router;

