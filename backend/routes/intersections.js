const express = require('express');
const router = express.Router();
const { getIntersections, createIntersection, updateIntersection } = require('../controllers/intersectionController');

router.get('/', getIntersections);
router.post('/', createIntersection);
router.patch('/:id', updateIntersection);

module.exports = router;
