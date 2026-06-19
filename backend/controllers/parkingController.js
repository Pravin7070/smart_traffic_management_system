const { collection, isConnected } = require('../config/database');

const getParkingZones = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('parking').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createParking = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('parking').insertOne({
            ...req.body,
            status: 'available',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateParking = async (req, res) => {
    if (!isConnected()) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('parking').updateOne(
            { id: req.params.id },
            { $set: { ...req.body, updatedAt: new Date() } }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getParkingZones, createParking, updateParking };
