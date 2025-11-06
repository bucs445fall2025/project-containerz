const router = require('express').Router();
const quantController = require('../controllers/quantController.js');
const { identifier } = require('../middlewares/identification.js');

router.use(identifier);

// router.post('/mc/call', quantController.priceCallOption);
router.get('/holdingsAndSecurities', quantController.getHoldingsAndSecurities);
router.post('/financeScore', quantController.financeScore);
router.post('/mc/asset', quantController.simAsset);
router.post('/mc/portfolio', quantController.simPortfolio);


module.exports = router;
