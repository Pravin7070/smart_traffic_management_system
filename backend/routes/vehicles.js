const express = require('express');
const router = express.Router();
const { getVehicles, getVehiclesByIntersection, recordVehicleDetection } = require('../controllers/vehicleController');

router.get('/', getVehicles);
router.post('/', recordVehicleDetection);
router.get('/:intersectionId', getVehiclesByIntersection);

module.exports = router;
