// Alert/Collision Model
const Alert = {
    schema: {
        type: 'string',
        severity: 'string',
        location: 'string',
        status: 'string',
        createdAt: 'date',
        resolvedAt: 'date'
    }
};

module.exports = Alert;
