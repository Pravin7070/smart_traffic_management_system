// Intersection Model
const Intersection = {
    schema: {
        id: 'string',
        name: 'string',
        lat: 'number',
        lng: 'number',
        active: 'boolean',
        lanes: 'number',
        status: 'string'
    },
    defaults: [
        { id: 'INT-001', name: 'Main Street & Market Road', lat: 28.6139, lng: 77.2090, active: true, lanes: 4 },
        { id: 'INT-002', name: 'Central Ave & Park Street', lat: 28.6140, lng: 77.2091, active: true, lanes: 3 },
        { id: 'INT-003', name: 'Highway 10 & Route 5', lat: 28.6141, lng: 77.2092, active: true, lanes: 6 }
    ]
};

module.exports = Intersection;
