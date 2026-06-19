const express = require('express');
const router = express.Router();
const { getAnalytics, createAnalytics, getDatabaseStats } = require('../controllers/analyticsController');

router.get('/', getAnalytics);
router.post('/', createAnalytics);
router.get('/stats', getDatabaseStats);

module.exports = router;
