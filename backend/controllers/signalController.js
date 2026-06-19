const { collection, isConnected } = require('../config/database');

const getSignals = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('signals').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getSignalByIntersection = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('signals').findOne({ intersectionId: req.params.intersectionId });
        res.json({ data: data || null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createSignal = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('signals').insertOne({
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateSignal = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('signals').updateOne(
            { intersectionId: req.params.intersectionId },
            { $set: { ...req.body, updatedAt: new Date() } }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getSignals, getSignalByIntersection, createSignal, updateSignal };
