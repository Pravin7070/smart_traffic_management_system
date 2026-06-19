// ===== EMERGENCY ALERT & INCIDENT DETECTION SYSTEM =====
// Monitors traffic conditions for accidents, congestion, and unusual patterns
// Triggers alerts and recommends manual intervention

const EmergencyAlert = (() => {
    let alerts = [];
    let detectedIncidents = {};
    let stuckVehicles = {};
    let soundEnabled = true;
    let alertHistory = [];

    // Configuration
    const CONFIG = {
        STUCK_VEHICLE_TIME: 5.0,      // Seconds a vehicle stays stationary = stuck
        CONGESTION_DENSITY_THRESHOLD: 0.8, // Vehicles per meter threshold
        CONGESTION_DURATION: 10,       // Seconds of high density = congestion alert
        CHECK_INTERVAL: 0.5            // Update alerts every N seconds
    };

    let checkTimer = 0;

    function init() {
        console.log('[EMERGENCY ALERT] System initialized');
        // Try to preload alert sound
        try {
            createAlertSound();
        } catch (e) {
            console.warn('[EMERGENCY ALERT] Could not initialize sound');
        }
    }

    function createAlertSound() {
        // Create beep sound using Web Audio API
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        window.emergencyAudioContext = audioCtx;
        window.playAlertSound = () => playBeep(audioCtx);
    }

    function playBeep(audioCtx, frequency = 800, duration = 0.3) {
        if (!soundEnabled) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.frequency.value = frequency;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.warn('[EMERGENCY ALERT] Could not play sound:', e);
        }
    }

    function update(dt) {
        checkTimer += dt;

        if (checkTimer >= CONFIG.CHECK_INTERVAL) {
            checkTimer = 0;
            updateAlerts(dt);
        }

        // Update stuck vehicle timers
        updateStuckVehicles(dt);
    }

    function updateAlerts(dt) {
        const detectors = window.SUMODetectors?.e2Data;
        if (!detectors) return;

        // Check each direction for congestion
        ['north', 'south', 'east', 'west'].forEach(dir => {
            const data = detectors[dir];
            if (!data) return;

            const density = data.density || 0;
            const queueLength = data.queueCount || 0;

            // Congestion detection
            if (density > CONFIG.CONGESTION_DENSITY_THRESHOLD && queueLength > 5) {
                addAlert('HEAVY_CONGESTION', dir, {
                    severity: 'warning',
                    density: density,
                    queueLength: queueLength
                });
            }
        });

        // Clean up expired alerts
        alerts = alerts.filter(alert => {
            return (Date.now() - alert.timestamp) < 30000; // Keep for 30 seconds
        });
    }

    function updateStuckVehicles(dt) {
        const vehicles = window.SUMOVehicles?.vehicles || [];

        vehicles.forEach(vehicle => {
            const vId = vehicle.id;
            const speed = vehicle.speed || 0;

            if (speed < 0.5) {
                // Vehicle is stationary
                if (!stuckVehicles[vId]) {
                    stuckVehicles[vId] = 0;
                }
                stuckVehicles[vId] += dt;

                // Trigger accident alert
                if (stuckVehicles[vId] >= CONFIG.STUCK_VEHICLE_TIME && stuckVehicles[vId] < CONFIG.STUCK_VEHICLE_TIME + 0.1) {
                    addAlert('ACCIDENT', vehicle.direction, {
                        severity: 'critical',
                        vehicleId: vId,
                        location: { x: vehicle.x, y: vehicle.y }
                    });
                    playBeep(window.emergencyAudioContext, 1000, 0.5);
                }
            } else {
                // Vehicle is moving
                delete stuckVehicles[vId];
            }
        });
    }

    function addAlert(type, location, data = {}) {
        // Prevent duplicate alerts in short time
        const recentDuplicate = alerts.find(a => 
            a.type === type && 
            a.location === location && 
            (Date.now() - a.timestamp) < 5000
        );

        if (recentDuplicate) return;

        const alert = {
            id: `alert_${Date.now()}_${Math.random()}`,
            type: type,
            location: location,
            data: data,
            timestamp: Date.now(),
            severity: data.severity || 'warning',
            dismissed: false
        };

        alerts.push(alert);
        alertHistory.push(alert);

        console.log(`[ALERT] ${type} at ${location}:`, data);

        // Play sound for critical alerts
        if (data.severity === 'critical' && soundEnabled) {
            playBeep(window.emergencyAudioContext, 1200, 0.4);
        }
    }

    function dismissAlert(alertId) {
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
            alert.dismissed = true;
            console.log('[ALERT] Dismissed:', alertId);
        }
    }

    function getActiveAlerts() {
        return alerts.filter(a => !a.dismissed);
    }

    function getAlertsByType(type) {
        return getActiveAlerts().filter(a => a.type === type);
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        console.log(`[ALERT SOUND] ${soundEnabled ? 'Enabled' : 'Disabled'}`);
        return soundEnabled;
    }

    function getStats() {
        const accidents = getAlertsByType('ACCIDENT');
        const congestion = getAlertsByType('HEAVY_CONGESTION');

        return {
            totalAlerts: getActiveAlerts().length,
            accidents: accidents.length,
            congestion: congestion.length,
            stuckVehicles: Object.keys(stuckVehicles).length,
            soundEnabled: soundEnabled,
            alerts: getActiveAlerts()
        };
    }

    function clear() {
        alerts = [];
        detectedIncidents = {};
        stuckVehicles = {};
        console.log('[EMERGENCY ALERT] Cleared all alerts');
    }

    return {
        init: init,
        update: update,
        addAlert: addAlert,
        dismissAlert: dismissAlert,
        getActiveAlerts: getActiveAlerts,
        getAlertsByType: getAlertsByType,
        toggleSound: toggleSound,
        getStats: getStats,
        clear: clear,
        playBeep: playBeep,
        get soundEnabled() { return soundEnabled; }
    };
})();
