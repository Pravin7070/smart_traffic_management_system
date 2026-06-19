const express = require('express');
const router = express.Router();
const { getSignals, getSignalByIntersection, createSignal, updateSignal } = require('../controllers/signalController');

router.get('/', getSignals);
router.post('/', createSignal);
router.get('/:intersectionId', getSignalByIntersection);
router.patch('/:intersectionId', updateSignal);

module.exports = router;
