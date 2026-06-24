const { collection } = require('../config/database');
const Event = require('../models/Event');
const Intersection = require('../models/Intersection');
const Parking = require('../models/Parking');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');

const seedDatabase = async () => {
    try {
        // If the database connection isn't available, skip seeding.
        if (!collection('event_scenarios')) {
            console.warn('⚠ Database not connected - skipping seeding. Start MongoDB to enable seeding.');
            return;
        }
        // Seed Event Scenarios
        if (await collection('event_scenarios').countDocuments() === 0) {
            const scenarios = Event.defaults.map(s => ({
                ...s,
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await collection('event_scenarios').insertMany(scenarios);
            console.log('✓ Seeded event_scenarios');
        }

        // Seed Intersections
        if (await collection('intersections').countDocuments() === 0) {
            const intersections = Intersection.defaults.map(i => ({
                ...i,
                status: 'operational',
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await collection('intersections').insertMany(intersections);
            console.log('✓ Seeded intersections');
        }

        // Seed Parking Zones
        if (await collection('parking').countDocuments() === 0) {
            const parking = Parking.defaults.map(p => ({
                ...p,
                status: 'available',
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await collection('parking').insertMany(parking);
            console.log('✓ Seeded parking');
        }

        // Seed Signals
        if (await collection('signals').countDocuments() === 0) {
            const signals = Intersection.defaults.map(i => ({
                intersectionId: i.id,
                phase: 'green',
                timing: { green: 60, yellow: 5, red: 60 },
                duration: 125,
                priority: 'normal',
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await collection('signals').insertMany(signals);
            console.log('✓ Seeded signals');
        }

        // Seed Vehicles
        if (await collection('vehicles').countDocuments() === 0) {
            const vehicles = [
                { type: 'car', count: 145, speed_avg: 32.5, intersectionId: 'INT-001' },
                { type: 'truck', count: 28, speed_avg: 25.0, intersectionId: 'INT-001' },
                { type: 'bus', count: 12, speed_avg: 22.5, intersectionId: 'INT-001' },
                { type: 'motorcycle', count: 34, speed_avg: 38.5, intersectionId: 'INT-001' }
            ].map(v => ({
                ...v,
                timestamp: new Date(),
                detected_at: new Date()
            }));
            await collection('vehicles').insertMany(vehicles);
            console.log('✓ Seeded vehicles');
        }

        // Seed Alerts
        if (await collection('alerts').countDocuments() === 0) {
            const alerts = [
                { type: 'collision-warning', severity: 'high', location: 'INT-001', status: 'active' },
                { type: 'congestion', severity: 'medium', location: 'INT-002', status: 'active' },
                { type: 'emergency-vehicle', severity: 'critical', location: 'INT-003', status: 'resolved' }
            ].map(a => ({
                ...a,
                createdAt: new Date(),
                updatedAt: new Date(),
                resolvedAt: a.status === 'resolved' ? new Date() : null
            }));
            await collection('alerts').insertMany(alerts);
            console.log('✓ Seeded alerts');
        }

        // Seed Analytics
        if (await collection('analytics').countDocuments() === 0) {
            await collection('analytics').insertOne({
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
            });
            console.log('✓ Seeded analytics');
        }

        // Create Indexes
        await createIndexes();
        console.log('✓ All collections seeded successfully');
    } catch (error) {
        console.error('✗ Database seeding error:', error);
    }
};

const createIndexes = async () => {
    await collection('event_scenarios').createIndex({ order: 1, key: 1 }, { unique: true });
    await collection('intersections').createIndex({ id: 1 }, { unique: true });
    await collection('parking').createIndex({ id: 1 }, { unique: true });
    await collection('signals').createIndex({ intersectionId: 1 });
    await collection('vehicles').createIndex({ intersectionId: 1, timestamp: -1 });
    await collection('alerts').createIndex({ severity: 1, status: 1 });
    await collection('alerts').createIndex({ createdAt: -1 });
    await collection('analytics').createIndex({ updatedAt: -1 });
};

module.exports = { seedDatabase, createIndexes };
