// Event Scenario Model
const EventScenario = {
    schema: {
        key: 'string',
        label: 'string',
        venue: 'string',
        crowd: 'number',
        startTime: 'string',
        endTime: 'string',
        parkingCapacity: 'number',
        gateCount: 'number',
        launchMessage: 'string',
        order: 'number'
    },
    defaults: [
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
    ]
};

module.exports = EventScenario;
