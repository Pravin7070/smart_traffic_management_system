/**
 * Constants and Configuration
 */

const Constants = {
    // API Endpoints
    API: {
        BASE_URL: '/api',
        INTERSECTIONS: '/api/intersections',
        PARKING: '/api/parking',
        SIGNALS: '/api/signals',
        VEHICLES: '/api/vehicles',
        ALERTS: '/api/alerts',
        EVENTS: '/api/event-mode',
        ANALYTICS: '/api/analytics'
    },

    // Event Scenarios
    EVENT_SCENARIOS: {
        CRICKET: 'cricket',
        CONCERT: 'concert',
        FESTIVAL: 'festival',
        SCHOOL: 'school',
        TEMPLE: 'temple',
        VIP: 'vip'
    },

    // Alert Types
    ALERT_TYPES: {
        COLLISION: 'collision-warning',
        CONGESTION: 'congestion',
        EMERGENCY: 'emergency-vehicle'
    },

    // Alert Severities
    ALERT_SEVERITY: {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },

    // Signal Phases
    SIGNAL_PHASES: {
        GREEN: 'green',
        YELLOW: 'yellow',
        RED: 'red'
    },

    // Colors
    COLORS: {
        CYAN: '#00f0ff',
        MAGENTA: '#bf00ff',
        GREEN: '#00ff88',
        YELLOW: '#ffbb00',
        RED: '#ff4444',
        DARK_BG: '#050913',
        CARD_BG: '#0a1221',
        TEXT: '#92abc5'
    },

    // Thresholds
    THRESHOLDS: {
        CONGESTION_HIGH: 0.75,
        CONGESTION_MEDIUM: 0.50,
        SPEED_LOW: 20,
        QUEUE_CRITICAL: 500
    },

    // Page Routes
    ROUTES: {
        HOME: '/',
        INSIGHTS: '/insights',
        EVENT_MODE: '/event-mode'
    }
};
