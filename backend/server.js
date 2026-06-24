require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const app = express();

app.use(express.json({ limit: '1mb' }));

// MongoDB Compass should point at the same server URI as the backend.
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'smart_traffic_management_system';
const mongoClient = new MongoClient(mongoUri);

const DEFAULT_EVENT_SCENARIOS = [
    {
        key: 'cricket',
        label: 'Cricket Match',
        venue: 'City Stadium',
        crowd: 40000,
        startTime: '18:30',
        endTime: '22:30',
        parkingCapacity: 8200,
        gateCount: 4,
        launchMessage: 'Activate outbound green and hold left turns on market road.',
        order: 1
    },
    {
        key: 'concert',
        label: 'Concert Night',
        venue: 'Neon Arena',
        crowd: 28000,
        startTime: '19:00',
        endTime: '22:00',
        parkingCapacity: 6100,
        gateCount: 5,
        launchMessage: 'Stage release corridors for ride-share spikes and VIP arrivals.',
        order: 2
    },
    {
        key: 'festival',
        label: 'City Festival',
        venue: 'Riverside Grounds',
        crowd: 52000,
        startTime: '16:00',
        endTime: '23:00',
        parkingCapacity: 9800,
        gateCount: 6,
        launchMessage: 'Use diversions to separate pedestrian-heavy approaches from vehicle exits.',
        order: 3
    },
    {
        key: 'school',
        label: 'School Rush',
        venue: 'Central School Complex',
        crowd: 8400,
        startTime: '07:15',
        endTime: '08:20',
        parkingCapacity: 1400,
        gateCount: 3,
        launchMessage: 'Keep drop-off lanes short-cycle and prioritize two-way parent traffic release.',
        order: 4
    },
    {
        key: 'temple',
        label: 'Temple / Church Event',
        venue: 'Heritage Zone',
        crowd: 16500,
        startTime: '05:30',
        endTime: '09:00',
        parkingCapacity: 3200,
        gateCount: 4,
        launchMessage: 'Protect pedestrian exits and pace parking release to avoid neighborhood spillback.',
        order: 5
    },
    {
        key: 'vip',
        label: 'VIP Event',
        venue: 'Grand Plaza',
        crowd: 1900,
        startTime: '20:00',
        endTime: '23:30',
        parkingCapacity: 760,
        gateCount: 2,
        launchMessage: 'Reserve the VIP corridor and keep emergency access completely clear.',
        order: 6
    }
];

const DEFAULT_INTERSECTIONS = [
    { id: 'INT-001', name: 'Main Street & Market Road', lat: 28.6139, lng: 77.2090, active: true, lanes: 4 },
    { id: 'INT-002', name: 'Central Ave & Park Street', lat: 28.6140, lng: 77.2091, active: true, lanes: 3 },
    { id: 'INT-003', name: 'Highway 10 & Route 5', lat: 28.6141, lng: 77.2092, active: true, lanes: 6 }
];

const DEFAULT_PARKING_ZONES = [
    { id: 'PZ-001', name: 'North Deck', capacity: 2800, occupancy: 0, type: 'multi-level' },
    { id: 'PZ-002', name: 'East Plaza', capacity: 1650, occupancy: 0, type: 'surface' },
    { id: 'PZ-003', name: 'South Overflow', capacity: 1400, occupancy: 0, type: 'surface' },
    { id: 'PZ-004', name: 'VIP Reserve', capacity: 620, occupancy: 0, type: 'reserved' }
];

let mongoDb = null;
let mongoReady = false;

function collection(name) {
    return mongoDb ? mongoDb.collection(name) : null;
}

function fallbackScenarioList() {
    return DEFAULT_EVENT_SCENARIOS;
}

async function seedMongoCollections() {
    if (!mongoDb) return;

    const scenarios = collection('event_scenarios');
    const metrics = collection('event_metrics');
    const trafficEvents = collection('traffic_events');
    const intersections = collection('intersections');
    const signals = collection('signals');
    const vehicles = collection('vehicles');
    const parking = collection('parking');
    const alerts = collection('alerts');
    const analytics = collection('analytics');

    // Seed Event Scenarios
    if (await scenarios.countDocuments() === 0) {
        await scenarios.insertMany(DEFAULT_EVENT_SCENARIOS.map((scenario) => ({
            ...scenario,
            createdAt: new Date(),
            updatedAt: new Date()
        })));
    }

    // Seed Intersections
    if (await intersections.countDocuments() === 0) {
        await intersections.insertMany(DEFAULT_INTERSECTIONS.map((int) => ({
            ...int,
            status: 'operational',
            createdAt: new Date(),
            updatedAt: new Date()
        })));
    }

    // Seed Parking Zones
    if (await parking.countDocuments() === 0) {
        await parking.insertMany(DEFAULT_PARKING_ZONES.map((zone) => ({
            ...zone,
            status: 'available',
            createdAt: new Date(),
            updatedAt: new Date()
        })));
    }

    // Seed Signal Timing Data
    if (await signals.countDocuments() === 0) {
        const signalData = DEFAULT_INTERSECTIONS.map((int) => ({
            intersectionId: int.id,
            phase: 'green',
            timing: { green: 60, yellow: 5, red: 60 },
            duration: 125,
            priority: 'normal',
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        await signals.insertMany(signalData);
    }

    // Seed Vehicle Detection Data
    if (await vehicles.countDocuments() === 0) {
        const vehicleData = [
            { type: 'car', count: 145, speed_avg: 32.5, intersectionId: 'INT-001' },
            { type: 'truck', count: 28, speed_avg: 25.0, intersectionId: 'INT-001' },
            { type: 'bus', count: 12, speed_avg: 22.5, intersectionId: 'INT-001' },
            { type: 'motorcycle', count: 34, speed_avg: 38.5, intersectionId: 'INT-001' }
        ];
        const docs = vehicleData.map((v) => ({
            ...v,
            timestamp: new Date(),
            detected_at: new Date()
        }));
        await vehicles.insertMany(docs);
    }

    // Seed Collision Alerts
    if (await alerts.countDocuments() === 0) {
        const alertData = [
            { type: 'collision-warning', severity: 'high', location: 'INT-001', status: 'active' },
            { type: 'congestion', severity: 'medium', location: 'INT-002', status: 'active' },
            { type: 'emergency-vehicle', severity: 'critical', location: 'INT-003', status: 'resolved' }
        ];
        const docs = alertData.map((a) => ({
            ...a,
            createdAt: new Date(),
            updatedAt: new Date(),
            resolvedAt: a.status === 'resolved' ? new Date() : null
        }));
        await alerts.insertMany(docs);
    }

    // Seed Analytics Data
    if (await analytics.countDocuments() === 0) {
        const analyticsData = {
            totalVehicles: 1848,
            averageSpeed: 28.5,
            congestionLevel: 0.42,
            trafficEfficiency: 78,
            emissionReduction: 45,
            delayReduction: 36,
            peakHourTime: '18:30-19:30',
            intersectionsActive: 3,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await analytics.insertOne(analyticsData);
    }

    // Create Indexes for all collections
    await scenarios.createIndex({ order: 1, key: 1 }, { unique: true });
    await metrics.createIndex({ profileKey: 1, updatedAt: -1 });
    await metrics.createIndex({ updatedAt: -1 });
    await trafficEvents.createIndex({ updatedAt: -1 });
    await intersections.createIndex({ id: 1 }, { unique: true });
    await parking.createIndex({ id: 1 }, { unique: true });
    await signals.createIndex({ intersectionId: 1 });
    await vehicles.createIndex({ intersectionId: 1, timestamp: -1 });
    await alerts.createIndex({ severity: 1, status: 1 });
    await alerts.createIndex({ createdAt: -1 });
    await analytics.createIndex({ updatedAt: -1 });

    // Seed SUMO Test Events if not exists
    if (await trafficEvents.countDocuments() === 0) {
        const eventsPath = path.join(__dirname, 'sumo_test', 'events.json');
        if (fs.existsSync(eventsPath)) {
            const raw = fs.readFileSync(eventsPath, 'utf-8');
            try {
                const parsed = JSON.parse(raw);
                await trafficEvents.insertOne({
                    source: 'sumo_test',
                    payload: parsed,
                    updatedAt: new Date()
                });
            } catch (error) {
                await trafficEvents.insertOne({
                    source: 'sumo_test',
                    payload: { raw },
                    updatedAt: new Date()
                });
            }
        }
    }

    console.log('✓ All collections seeded successfully');
}

async function connectMongo() {
    try {
        await mongoClient.connect();
        mongoDb = mongoClient.db(mongoDbName);
        await seedMongoCollections();
        mongoReady = true;
        console.log(`MongoDB connected at ${mongoUri} using database ${mongoDbName}`);
    } catch (error) {
        mongoReady = false;
        console.warn(`MongoDB unavailable, continuing with file-backed fallback: ${error.message}`);
    }
}

async function getEventScenarios() {
    if (!mongoReady) {
        return fallbackScenarioList();
    }

    const docs = await collection('event_scenarios')
        .find({}, { projection: { _id: 0 } })
        .sort({ order: 1, key: 1 })
        .toArray();

    return docs.length > 0 ? docs : fallbackScenarioList();
}

async function saveEventMetrics(payload) {
    if (!mongoReady) {
        return null;
    }

    const result = await collection('event_metrics').insertOne({
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    return result.insertedId;
}

async function getLatestEventMetrics() {
    if (!mongoReady) {
        return null;
    }

    return collection('event_metrics').findOne({}, { sort: { updatedAt: -1 } });
}

async function getLatestTrafficEvents() {
    if (!mongoReady) {
        return null;
    }

    return collection('traffic_events').findOne({}, { sort: { updatedAt: -1 } });
}

// Add security headers middleware
app.use((req, res, next) => {
    // Set permissive CSP for local development
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files from frontend folder
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Serve dedicated mock analytics insights page
app.get('/insights', (req, res) => {
    res.sendFile(path.join(frontendPath, 'insights.html'));
});

// Serve the predictive event traffic management dashboard
app.get('/event-mode', (req, res) => {
    res.sendFile(path.join(frontendPath, 'event-mode.html'));
});

app.get('/api/mongodb-status', (req, res) => {
    res.json({
        connected: mongoReady,
        database: mongoDbName,
        uri: mongoUri,
        backend: 'Smart Traffic Management System'
    });
});

app.get('/api/event-mode/scenarios', async (req, res) => {
    try {
        const scenarios = await getEventScenarios();
        res.json({
            connected: mongoReady,
            database: mongoDbName,
            scenarios
        });
    } catch (error) {
        res.status(500).json({
            message: 'Unable to load event scenarios',
            error: error.message
        });
    }
});

app.post('/api/event-mode/metrics', async (req, res) => {
    try {
        const payload = req.body || {};
        const insertedId = await saveEventMetrics(payload);

        res.status(insertedId ? 201 : 503).json({
            connected: mongoReady,
            stored: Boolean(insertedId),
            insertedId: insertedId ? insertedId.toString() : null,
            message: insertedId ? 'Event metrics stored in MongoDB' : 'MongoDB is unavailable; metrics were not persisted'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Unable to store event metrics',
            error: error.message
        });
    }
});

app.get('/api/event-mode/metrics/latest', async (req, res) => {
    try {
        const latest = await getLatestEventMetrics();
        if (!latest) {
            return res.status(404).json({
                message: 'No stored event metrics found yet'
            });
        }

        res.json({
            connected: mongoReady,
            metric: latest
        });
    } catch (error) {
        res.status(500).json({
            message: 'Unable to load latest event metrics',
            error: error.message
        });
    }
});

// Serve SUMO + TraCI generated test events for dashboard integration
app.get('/api/test-events', async (req, res) => {
    if (mongoReady) {
        try {
            const doc = await getLatestTrafficEvents();
            if (doc && doc.payload) {
                res.type('application/json').send(JSON.stringify(doc.payload, null, 2));
                return;
            }
        } catch (error) {
            // Fall through to the file-backed snapshot.
        }
    }

    const eventsPath = path.join(__dirname, 'sumo_test', 'events.json');
    try {
        const raw = fs.readFileSync(eventsPath, 'utf-8');
        res.type('application/json').send(raw);
    } catch (err) {
        res.status(404).json({
            updated_at: new Date().toISOString(),
            step: 0,
            events: [],
            message: 'No test event file found. Run backend/sumo_test/run_sumo_test.py first.'
        });
    }
});

// ============== INTERSECTIONS API ==============
app.get('/api/intersections', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('intersections').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/intersections', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('intersections').insertOne({
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== PARKING ZONES API ==============
app.get('/api/parking', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('parking').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/parking', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('parking').insertOne({
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/parking/:id', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const result = await collection('parking').updateOne(
            { id: req.params.id },
            { $set: { ...req.body, updatedAt: new Date() } }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== SIGNALS API ==============
app.get('/api/signals', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('signals').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/signals/:intersectionId', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('signals').findOne({ intersectionId: req.params.intersectionId });
        res.json({ data: data || null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/signals', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
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
});

// ============== VEHICLES API ==============
app.get('/api/vehicles', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('vehicles').find({}).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/vehicles/:intersectionId', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
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
});

app.post('/api/vehicles', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
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
});

// ============== ALERTS / COLLISION API ==============
app.get('/api/alerts', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('alerts').find({}).sort({ createdAt: -1 }).toArray();
        res.json({ connected: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/alerts/active', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('alerts').find({ status: 'active' }).toArray();
        res.json({ count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/alerts', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
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
});

app.patch('/api/alerts/:id', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        if (req.body.status === 'resolved') {
            updateData.resolvedAt = new Date();
        }
        const result = await collection('alerts').updateOne(
            { _id: new (require('mongodb').ObjectId)(req.params.id) },
            { $set: updateData }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== ANALYTICS API ==============
app.get('/api/analytics', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
    try {
        const data = await collection('analytics').findOne({}, { sort: { updatedAt: -1 } });
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analytics', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
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
});

// ============== DATABASE STATS API ==============
app.get('/api/database/stats', async (req, res) => {
    if (!mongoReady) return res.status(503).json({ message: 'Database unavailable' });
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
});


async function startServer() {
    await connectMongo();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Smart Traffic Management System running at http://localhost:${PORT}`);
    });
}

startServer();
