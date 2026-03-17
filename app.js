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

    // Spawn configuration
    const SPAWN_INTERVAL_BASE = 2.5; // seconds between spawns per direction
    const SPAWN_VARIANCE = 1.5;
    const MAX_VEHICLES = 30;

    function init() {
        // Initialize renderer
        const canvas = document.getElementById('trafficCanvas');
        Renderer.init(canvas);

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
        Dashboard.update(simStep);
    }

    function updateSimulation(dt) {
        // 1. Update detectors (measure current state)
        SUMODetectors.update(dt);

        // 2. Update signals (use detector data for actuated control)
        SUMOSignals.update(dt, SUMODetectors.e2Data);

        // 3. Build signal states for vehicle logic
        const signalStates = SUMOSignals.signalStates;

        // 4. Update vehicles (Krauss car-following + signal compliance)
        SUMOVehicles.update(dt, signalStates);

        // 5. Spawn new vehicles periodically (one at a time)
        spawnTimer += dt;
        const spawnInterval = SPAWN_INTERVAL_BASE + Math.random() * SPAWN_VARIANCE;
        if (spawnTimer >= spawnInterval && SUMOVehicles.getCount() < MAX_VEHICLES) {
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
            return state === 'green' ? 2 : 1;
        });

        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < dirs.length; i++) {
            r -= weights[i];
            if (r <= 0) return dirs[i];
        }
        return dirs[0];
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                btnPause.click();
            } else if (e.code === 'KeyE') {
                btnEmergency.click();
            } else if (e.code === 'KeyS') {
                btnSpeed.click();
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
        get paused() { return paused; }
    };
})();
