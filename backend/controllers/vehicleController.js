const { collection, isConnected } = require('../config/database');

const getVehicles = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('vehicles').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getVehiclesByIntersection = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('vehicles')
            .find({ intersectionId: req.params.intersectionId })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const recordVehicleDetection = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('vehicles').insertOne({
            ...req.body,
            timestamp: new Date(),
            detected_at: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getVehicles, getVehiclesByIntersection, recordVehicleDetection };
