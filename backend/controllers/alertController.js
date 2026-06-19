const { collection, isConnected } = require('../config/database');
const { ObjectId } = require('mongodb');

const getAlerts = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('alerts').find({}).sort({ createdAt: -1 }).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getActiveAlerts = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('alerts').find({ status: 'active' }).toArray();
        res.json({ count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createAlert = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('alerts').insertOne({
            ...req.body,
            status: req.body.status || 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const resolveAlert = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('alerts').updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: {
                    status: 'resolved',
                    updatedAt: new Date(),
                    resolvedAt: new Date()
                }
            }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAlerts, getActiveAlerts, createAlert, resolveAlert };
