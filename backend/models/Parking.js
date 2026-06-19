// Parking Zone Model
const Parking = {
    schema: {
        id: 'string',
        name: 'string',
        capacity: 'number',
        occupancy: 'number',
        type: 'string',
        status: 'string'
    },
    defaults: [
        { id: 'PZ-001', name: 'North Deck', capacity: 2800, occupancy: 0, type: 'multi-level' },
        { id: 'PZ-002', name: 'East Plaza', capacity: 1650, occupancy: 0, type: 'surface' },
        { id: 'PZ-003', name: 'South Overflow', capacity: 1400, occupancy: 0, type: 'surface' },
        { id: 'PZ-004', name: 'VIP Reserve', capacity: 620, occupancy: 0, type: 'reserved' }
    ]
};

module.exports = Parking;
