const express = require('express');
const router = express.Router();

// Import route modules
const intersectionsRouter = require('./intersections');
const parkingRouter = require('./parking');
const signalsRouter = require('./signals');
const vehiclesRouter = require('./vehicles');
const alertsRouter = require('./alerts');
const eventsRouter = require('./events');
const analyticsRouter = require('./analytics');

// Mount routes
router.use('/intersections', intersectionsRouter);
router.use('/parking', parkingRouter);
router.use('/signals', signalsRouter);
router.use('/vehicles', vehiclesRouter);
router.use('/alerts', alertsRouter);
router.use('/event-mode', eventsRouter);
router.use('/analytics', analyticsRouter);

// Database status endpoint
router.get('/status', (req, res) => {
    const { isConnected } = require('../config/database');
    res.json({
        connected: isConnected(),
        database: process.env.MONGODB_DB || 'smart_traffic_management_system',
        uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
        backend: 'Smart Traffic Management System',
        timestamp: new Date()
    });
});

module.exports = router;
