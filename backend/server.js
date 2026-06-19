require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { connectDatabase } = require('./config/database');
const { seedDatabase } = require('./utils/seedDatabase');
const apiRoutes = require('./routes');

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Security headers
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Routes for pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/insights', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'insights.html'));
});

app.get('/event-mode', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'event-mode.html'));
});

// API routes (all under /api prefix)
app.use('/api', apiRoutes);

// Legacy test-events endpoint for backward compatibility
app.get('/api/test-events', async (req, res) => {
    const { collection } = require('./config/database');
    const eventsPath = path.join(__dirname, 'sumo_test', 'events.json');
    
    try {
        const doc = await collection('traffic_events').findOne({}, { sort: { updatedAt: -1 } });
        if (doc && doc.payload) {
            res.type('application/json').send(JSON.stringify(doc.payload, null, 2));
            return;
        }
    } catch (error) {
        // Fall through to file backup
    }

    try {
        const raw = fs.readFileSync(eventsPath, 'utf-8');
        res.type('application/json').send(raw);
    } catch (err) {
        res.status(404).json({
            updated_at: new Date().toISOString(),
            step: 0,
            events: [],
            message: 'No test event file found'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 404 handling
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
const startServer = async () => {
    try {
        await connectDatabase();
        await seedDatabase();

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`\n🚀 Smart Traffic Management System running at http://localhost:${PORT}`);
            console.log(`📊 API Documentation: http://localhost:${PORT}/api/status\n`);
        });
    } catch (error) {
        console.error('✗ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
