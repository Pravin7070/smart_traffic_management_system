const express = require('express');
const router = express.Router();
const { getAlerts, getActiveAlerts, createAlert, resolveAlert } = require('../controllers/alertController');

router.get('/', getAlerts);
router.post('/', createAlert);
router.get('/active', getActiveAlerts);
router.patch('/:id', resolveAlert);

module.exports = router;
