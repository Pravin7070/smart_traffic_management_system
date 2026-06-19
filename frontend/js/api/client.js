/**
 * API Client Service
 * Centralized API communication for all frontend modules
 */

const APIClient = (() => {
    const BASE_URL = '/api';

    const request = async (endpoint, options = {}) => {
        const url = `${BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Request failed: ${url}`, error);
            throw error;
        }
    };

    return {
        // Status
        getStatus: () => request('/status'),
        getDbStats: () => request('/analytics/stats'),

        // Intersections
        getIntersections: () => request('/intersections'),
        createIntersection: (data) => request('/intersections', { method: 'POST', body: JSON.stringify(data) }),
        updateIntersection: (id, data) => request(`/intersections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

        // Parking
        getParkingZones: () => request('/parking'),
        createParking: (data) => request('/parking', { method: 'POST', body: JSON.stringify(data) }),
        updateParking: (id, data) => request(`/parking/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

        // Signals
        getSignals: () => request('/signals'),
        getSignalByIntersection: (intersectionId) => request(`/signals/${intersectionId}`),
        createSignal: (data) => request('/signals', { method: 'POST', body: JSON.stringify(data) }),
        updateSignal: (intersectionId, data) => request(`/signals/${intersectionId}`, { method: 'PATCH', body: JSON.stringify(data) }),

        // Vehicles
        getVehicles: () => request('/vehicles'),
        getVehiclesByIntersection: (intersectionId) => request(`/vehicles/${intersectionId}`),
        recordVehicleDetection: (data) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),

        // Alerts
        getAlerts: () => request('/alerts'),
        getActiveAlerts: () => request('/alerts/active'),
        createAlert: (data) => request('/alerts', { method: 'POST', body: JSON.stringify(data) }),
        resolveAlert: (id) => request(`/alerts/${id}`, { method: 'PATCH' }),

        // Event Mode
        getEventScenarios: () => request('/event-mode/scenarios'),
        saveEventMetrics: (data) => request('/event-mode/metrics', { method: 'POST', body: JSON.stringify(data) }),
        getLatestEventMetrics: () => request('/event-mode/metrics/latest'),

        // Analytics
        getAnalytics: () => request('/analytics'),
        createAnalytics: (data) => request('/analytics', { method: 'POST', body: JSON.stringify(data) }),

        // Traffic Events
        getTestEvents: () => request('/test-events')
    };
})();
