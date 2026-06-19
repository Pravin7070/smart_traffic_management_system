const express = require('express');
const router = express.Router();
const { getEventScenarios, saveEventMetrics, getLatestEventMetrics } = require('../controllers/eventController');

router.get('/scenarios', getEventScenarios);
router.post('/metrics', saveEventMetrics);
router.get('/metrics/latest', getLatestEventMetrics);

module.exports = router;
