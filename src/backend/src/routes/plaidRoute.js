const router = require('express').Router();
const { identifier } = require('../middlewares/identification.js');
const {
  createLinkToken,
  exchangePublicToken,
  getAccounts
} = require('../controllers/plaidController.js');

router.use(identifier);

router.post('/link-token', createLinkToken);
router.post('/set-access-token', exchangePublicToken);
router.get('/accounts', getAccounts);

module.exports = router;

