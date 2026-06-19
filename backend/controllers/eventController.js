const { collection, isConnected } = require('../config/database');

const getEventScenarios = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const scenarios = await collection('event_scenarios')
            .find({}, { projection: { _id: 0 } })
            .sort({ order: 1, key: 1 })
            .toArray();
        res.json({ connected: true, count: scenarios.length, scenarios });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const saveEventMetrics = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('event_metrics').insertOne({
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({
            connected: true,
            stored: true,
            insertedId: result.insertedId.toString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getLatestEventMetrics = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const latest = await collection('event_metrics').findOne({}, { sort: { updatedAt: -1 } });
        if (!latest) {
            return res.status(404).json({ message: 'No stored event metrics found yet' });
        }
        res.json({ connected: true, metric: latest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getEventScenarios, saveEventMetrics, getLatestEventMetrics };
