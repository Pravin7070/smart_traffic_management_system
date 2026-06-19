// ===== MAIN APPLICATION CONTROLLER =====
// Initializes all modules, manages the simulation loop,
// handles vehicle spawning, user controls, and coordination

const App = (() => {
    let simStep = 0;
    let paused = false;
    let speedMultiplier = 1;
    let lastTime = 0;
    let spawnTimer = 0;
    let emergencyTimer = 0;
    let helpVisible = false;

    // Spawn configuration
    const SPAWN_INTERVAL_BASE = 5.0; // Reduced load: 50% fewer spawns than before
    const SPAWN_VARIANCE = 2.0;
    const MAX_VEHICLES = 15;

    function init() {
        // Compatibility bridge for manual control integrations.
        window.updateSignalState = (direction, color) => {
            SUMOSignals.updateSignalState(direction, color);
        };

        // Initialize renderer
        const canvas = document.getElementById('trafficCanvas');
        Renderer.init(canvas);

        // Initialize multi-intersection sync
        MultiIntersection.init();

        // Initialize manual control system
        ManualControl.init();

        // Initialize emergency alert system
        EmergencyAlert.init();

        // Initialize dashboard
        Dashboard.init();

        // Setup controls
        setupControls();

        // Start simulation loop
        lastTime = performance.now();
        requestAnimationFrame(loop);

        // Initial vehicle spawn burst (staggered to avoid overlap)
        setTimeout(() => {
            const dirs = ['north', 'south', 'east', 'west'];
            dirs.forEach((dir, idx) => {
                setTimeout(() => {
                    if (SUMOVehicles.getCount() < MAX_VEHICLES) {
                        SUMOVehicles.spawnVehicle(dir);
                    }
                }, idx * 800);
            });
        }, 500);
    }

    function loop(timestamp) {
        requestAnimationFrame(loop);

        if (paused) {
            lastTime = timestamp;
            return;
        }

        const rawDt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        const dt = Math.min(rawDt, 0.05) * speedMultiplier; // Clamp dt, apply speed

        simStep++;

        // Update SUMO simulation
        updateSimulation(dt);

        // Render
        Renderer.render(dt);

        // Update dashboard
        Dashboard.update(simStep, dt);
    }

    function updateSimulation(dt) {
        // 1. Update detectors (measure current state)
        SUMODetectors.update(dt);

        // 2. Update emergency alerts (detect accidents and congestion)
        EmergencyAlert.update(dt);

        // 3. Update signals (use detector data for actuated control OR manual override)
        if (ManualControl.manualMode) {
            // Manual override: single selected direction/signal command.
            SUMOSignals.applyManualControl(
                ManualControl.getSelectedDirection(),
                ManualControl.getSelectedSignal(),
                dt
            );
        } else {
            // Automatic actuated control
            SUMOSignals.update(dt, SUMODetectors.e2Data);
        }

        // 4. Update multi-intersection synchronization
        MultiIntersection.updateSync(dt);

        // 5. Update manual control (timers, etc)
        ManualControl.update(dt);

        // 6. Build signal states for vehicle logic
        const signalStates = SUMOSignals.signalStates;

        // 7. Update vehicles (Krauss car-following + signal compliance)
        SUMOVehicles.update(dt, signalStates);

        // 8. Spawn new vehicles periodically (one at a time)
        spawnTimer += dt;
        const det = SUMODetectors.e2Data;
        const totalQueue = (det.north.queueLength || 0) + (det.south.queueLength || 0) + (det.east.queueLength || 0) + (det.west.queueLength || 0);
        const congestionMultiplier = totalQueue > 10 ? 2.3 : totalQueue > 6 ? 1.6 : 1.0;
        const spawnInterval = (SPAWN_INTERVAL_BASE + Math.random() * SPAWN_VARIANCE) * congestionMultiplier;
        if (spawnTimer >= spawnInterval && SUMOVehicles.getCount() < MAX_VEHICLES) {
            if (totalQueue > 12 && Math.random() < 0.55) {
                spawnTimer = 0;
                return;
            }
            spawnTimer = 0;
            const dir = pickSpawnDirection();
            SUMOVehicles.spawnVehicle(dir);
        }
    }

    function pickSpawnDirection() {
        // Weight spawn by which directions have green (more vehicles approach green)
        const dirs = ['north', 'south', 'east', 'west'];
        const weights = dirs.map(d => {
            const state = SUMOSignals.signalStates[d];
            // More vehicles come from directions that currently have green
            // but also from red (they queue up)
            return state === 'green' ? 1.4 : 1;
        });

        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < dirs.length; i++) {
            r -= weights[i];
            if (r <= 0) return dirs[i];
        }
        return dirs[0];
    }

    function updateAlertPanel() {
        const alertContent = document.getElementById('alertContent');
        if (!alertContent) return;

        const alerts = EmergencyAlert.getActiveAlerts();

        if (alerts.length === 0) {
            alertContent.innerHTML = '<div class="no-alerts">ℹ️ No active alerts</div>';
            return;
        }

        let html = '';
        alerts.forEach((alert, idx) => {
            const severityClass = alert.severity === 'critical' ? '' : 'warning';
            const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
            
            html += `
                <div class="alert-item ${severityClass}">
                    <div class="alert-type">${icon} ${alert.type}</div>
                    <div class="alert-detail">
                        <div class="alert-location">📍 ${(alert.location || 'unknown').toUpperCase()}</div>
                        ${alert.data && alert.data.vehicleId ? `<div>Vehicle: ${alert.data.vehicleId}</div>` : ''}
                        ${alert.data && alert.data.density ? `<div>Density: ${alert.data.density.toFixed(2)} veh/m</div>` : ''}
                    </div>
                </div>
            `;
        });

        alertContent.innerHTML = html;
    }

    function setupControls() {
        // Pause/Resume
        const btnPause = document.getElementById('btnPause');
        btnPause.addEventListener('click', () => {
            paused = !paused;
            const statusEl = document.getElementById('simStatus');
            if (paused) {
                statusEl.textContent = 'PAUSED';
                statusEl.style.color = '#ffbb00';
                btnPause.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
            } else {
                statusEl.textContent = 'SIMULATION ACTIVE';
                statusEl.style.color = '';
                btnPause.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
            }
            // Update the dot pulse
            document.querySelector('.status-dot').classList.toggle('pulse', !paused);
        });

        // Speed toggle
        const btnSpeed = document.getElementById('btnSpeed');
        const speeds = [1, 2, 4, 0.5];
        let speedIndex = 0;
        btnSpeed.addEventListener('click', () => {
            speedIndex = (speedIndex + 1) % speeds.length;
            speedMultiplier = speeds[speedIndex];
            btnSpeed.textContent = `${speeds[speedIndex]}×`;
        });

        // Emergency vehicle trigger
        const btnEmergency = document.getElementById('btnEmergency');
        btnEmergency.addEventListener('click', () => {
            if (SUMOSignals.emergencyActive) return; // Already active

            const dirs = ['north', 'south', 'east', 'west'];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];

            // Spawn emergency vehicle
            SUMOVehicles.spawnEmergency(dir);

            // Activate signal preemption
            SUMOSignals.activateEmergency(dir);

            // Flash the button
            btnEmergency.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.6)';
            btnEmergency.style.borderColor = '#ff0044';
            setTimeout(() => {
                btnEmergency.style.boxShadow = '';
                btnEmergency.style.borderColor = '';
            }, 2000);
        });

        // Manual Control toggle
        const btnManualControl = document.getElementById('btnManualControl');
        const manualPanel = document.getElementById('manualControlPanel');
        btnManualControl.addEventListener('click', () => {
            const isActive = ManualControl.toggle();
            manualPanel.classList.toggle('hidden', !isActive);
            btnManualControl.style.boxShadow = isActive ? '0 0 15px rgba(255, 200, 0, 0.8)' : '';
        });

        // Close Manual Control Panel
        const btnCloseManual = document.getElementById('btnCloseManual');
        btnCloseManual.addEventListener('click', () => {
            ManualControl.deactivate();
            manualPanel.classList.add('hidden');
            btnManualControl.style.boxShadow = '';
        });

        const btnAutoMode = document.getElementById('btnAutoMode');
        if (btnAutoMode) {
            btnAutoMode.addEventListener('click', () => {
                ManualControl.setAutoMode();
            });
        }

        // Direction/signal button handlers are managed in ManualControl.init().

        // Quick action buttons
        document.getElementById('btnClearNorth').addEventListener('click', () => ManualControl.quickClearLane('north'));
        document.getElementById('btnClearSouth').addEventListener('click', () => ManualControl.quickClearLane('south'));
        document.getElementById('btnClearEast').addEventListener('click', () => ManualControl.quickClearLane('east'));
        document.getElementById('btnClearWest').addEventListener('click', () => ManualControl.quickClearLane('west'));

        // Alerts panel toggle
        const btnAlerts = document.getElementById('btnAlerts');
        const alertPanel = document.getElementById('emergencyAlertPanel');
        btnAlerts.addEventListener('click', () => {
            const isHidden = alertPanel.classList.contains('hidden');
            alertPanel.classList.toggle('hidden');
            if (isHidden) {
                updateAlertPanel();
                // Also update every 500ms while panel is open
                const updateInterval = setInterval(() => {
                    if (alertPanel.classList.contains('hidden')) {
                        clearInterval(updateInterval);
                    } else {
                        updateAlertPanel();
                    }
                }, 500);
            }
        });

        // Close Alerts Panel
        const btnCloseAlerts = document.getElementById('btnCloseAlerts');
        btnCloseAlerts.addEventListener('click', () => {
            alertPanel.classList.add('hidden');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                btnPause.click();
            } else if (e.code === 'KeyE') {
                btnEmergency.click();
            } else if (e.code === 'KeyS') {
                btnSpeed.click();
            } else if (e.code === 'KeyG') {
                // G: Green-wave sync mode
                MultiIntersection.switchSyncMode('green-wave');
                console.log('[SYNC] Green-wave mode activated');
            } else if (e.code === 'KeyA' && ManualControl.isActive) {
                // A: Select South (if manual control active, otherwise for sync)
                ManualControl.selectDirection('south');
            } else if (e.code === 'KeyD' && ManualControl.isActive) {
                // D: Select East
                ManualControl.selectDirection('east');
            } else if (e.code === 'KeyW' && ManualControl.isActive) {
                // W: Select West
                ManualControl.selectDirection('west');
            } else if (e.code === 'KeyN' && ManualControl.isActive) {
                // N: Select North
                ManualControl.selectDirection('north');
            } else if (e.code === 'Digit1' && ManualControl.isActive) {
                ManualControl.setSignalState('green');
            } else if (e.code === 'Digit2' && ManualControl.isActive) {
                ManualControl.setSignalState('yellow');
            } else if (e.code === 'Digit3' && ManualControl.isActive) {
                ManualControl.setSignalState('red');
            } else if (!ManualControl.isActive && e.code === 'KeyA') {
                // A: Alternating sync mode (if not in manual control)
                MultiIntersection.switchSyncMode('alternating');
                console.log('[SYNC] Alternating mode activated');
            } else if (e.code === 'KeyO') {
                // O: Offset sync mode
                MultiIntersection.switchSyncMode('offset');
                console.log('[SYNC] Offset mode activated');
            } else if (e.code === 'KeyI') {
                // I: Independent mode
                MultiIntersection.switchSyncMode('independent');
                console.log('[SYNC] Independent mode activated');
            } else if (e.code === 'Period') {
                // . / >: Increase offset
                const current = MultiIntersection.syncMode() === 'independent' ? 0 : 3;
                MultiIntersection.setSyncOffset(current + 1);
            } else if (e.code === 'Comma') {
                // , / <: Decrease offset
                const current = MultiIntersection.syncMode() === 'independent' ? 0 : 3;
                MultiIntersection.setSyncOffset(Math.max(0, current - 1));
            } else if (e.code === 'KeyH') {
                // H: Toggle help overlay
                helpVisible = !helpVisible;
            } else if (e.code === 'KeyM') {
                // M: Manual control toggle
                btnManualControl.click();
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        get simStep() { return simStep; },
        get paused() { return paused; },
        get helpVisible() { return helpVisible; }
    };
})();
