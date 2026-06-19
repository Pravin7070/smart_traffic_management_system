const { collection, isConnected } = require('../config/database');

const getIntersections = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('intersections').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createIntersection = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('intersections').insertOne({
            ...req.body,
            status: 'operational',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateIntersection = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('intersections').updateOne(
            { id: req.params.id },
            { $set: { ...req.body, updatedAt: new Date() } }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getIntersections, createIntersection, updateIntersection };
