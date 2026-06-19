const express = require('express');
const router = express.Router();
const { getParkingZones, createParking, updateParking } = require('../controllers/parkingController');

router.get('/', getParkingZones);
router.post('/', createParking);
router.patch('/:id', updateParking);

module.exports = router;
