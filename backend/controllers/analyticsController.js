const { collection, isConnected } = require('../config/database');

const getAnalytics = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('analytics').findOne({}, { sort: { updatedAt: -1 } });
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createAnalytics = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('analytics').insertOne({
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDatabaseStats = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const stats = {
            event_scenarios: await collection('event_scenarios').countDocuments(),
            event_metrics: await collection('event_metrics').countDocuments(),
            traffic_events: await collection('traffic_events').countDocuments(),
            intersections: await collection('intersections').countDocuments(),
            signals: await collection('signals').countDocuments(),
            vehicles: await collection('vehicles').countDocuments(),
            parking: await collection('parking').countDocuments(),
            alerts: await collection('alerts').countDocuments(),
            analytics: await collection('analytics').countDocuments(),
            timestamp: new Date()
        };
        res.json({ connected: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAnalytics, createAnalytics, getDatabaseStats };
