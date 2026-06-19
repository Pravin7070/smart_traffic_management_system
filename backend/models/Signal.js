// Traffic Signal Model
const Signal = {
    schema: {
        intersectionId: 'string',
        phase: 'string',
        timing: 'object',
        duration: 'number',
        priority: 'string'
    }
};

module.exports = Signal;
