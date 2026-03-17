// ===== DASHBOARD CONTROLLER =====
// Updates all DOM dashboard elements with live simulation data
// Draws mini charts on canvas elements

const Dashboard = (() => {
    // DOM element references
    let els = {};

    function init() {
        els = {
            simStep: document.getElementById('simStep'),
            vehicleCount: document.getElementById('vehicleCount'),
            phaseState: document.getElementById('phaseState'),
            phaseIndex: document.getElementById('phaseIndex'),
            phaseTotal: document.getElementById('phaseTotal'),
            // Signal timers
            timerNorth: document.getElementById('timerNorth'),
            timerSouth: document.getElementById('timerSouth'),
            timerEast: document.getElementById('timerEast'),
            timerWest: document.getElementById('timerWest'),
            // Detector readouts
            queueN: document.getElementById('queueN'),
            queueS: document.getElementById('queueS'),
            queueE: document.getElementById('queueE'),
            queueW: document.getElementById('queueW'),
            barN: document.getElementById('barN'),
            barS: document.getElementById('barS'),
            barE: document.getElementById('barE'),
            barW: document.getElementById('barW'),
            densityN: document.getElementById('densityN'),
            densityS: document.getElementById('densityS'),
            densityE: document.getElementById('densityE'),
            densityW: document.getElementById('densityW'),
            speedN: document.getElementById('speedN'),
            speedS: document.getElementById('speedS'),
            speedE: document.getElementById('speedE'),
            speedW: document.getElementById('speedW'),
            // SUMO params
            paramMinDur: document.getElementById('paramMinDur'),
            paramMaxDur: document.getElementById('paramMaxDur'),
            paramMaxGap: document.getElementById('paramMaxGap'),
            paramDetGap: document.getElementById('paramDetGap'),
            // Charts
            densityChart: document.getElementById('densityChart'),
            throughputChart: document.getElementById('throughputChart'),
            // Emergency
            emergencyOverlay: document.getElementById('emergencyOverlay'),
            // Signal cards
            signalCards: document.getElementById('signalCards'),
            // YOLO Detection
            yoloTotal: document.getElementById('yoloTotal'),
            yoloCar: document.getElementById('yoloCar'),
            yoloMotorcycle: document.getElementById('yoloMotorcycle'),
            yoloBus: document.getElementById('yoloBus'),
            yoloTruck: document.getElementById('yoloTruck'),
            yoloFps: document.getElementById('yoloFps'),
            yoloFrame: document.getElementById('yoloFrame'),
            yoloStatus: document.getElementById('yoloStatus'),
            yoloModStatus: document.getElementById('yoloModStatus'),
            yoloSection: document.getElementById('yoloSection')
        };

        // Set SUMO param values
        els.paramMinDur.textContent = '15s';
        els.paramMaxDur.textContent = '60s';
        els.paramMaxGap.textContent = '3.0s';
        els.paramDetGap.textContent = '2.0s';
        els.phaseTotal.textContent = SUMOSignals.phases.length.toString();

        // Start YOLO data polling
        startYoloPolling();
    }

    let updateCounter = 0;

    function update(simStep) {
        updateCounter++;
        // Throttle DOM updates to every 3rd frame for performance
        if (updateCounter % 3 !== 0) return;

        // Header stats
        els.simStep.textContent = simStep.toString().padStart(4, '0');
        els.vehicleCount.textContent = SUMOVehicles.getCount().toString();

        // Phase display
        const phase = SUMOSignals.getCurrentPhase();
        els.phaseState.textContent = phase.state;
        els.phaseIndex.textContent = SUMOSignals.currentPhaseIndex.toString();

        // Signal timers and light states
        const states = SUMOSignals.signalStates;
        const timers = SUMOSignals.timers;
        const dirs = ['north', 'south', 'east', 'west'];
        const dirShort = { north: 'N', south: 'S', east: 'E', west: 'W' };

        dirs.forEach(dir => {
            // Update timer
            const timerEl = els[`timer${capitalize(dir)}`];
            if (timerEl) timerEl.textContent = timers[dir].toString();

            // Update signal card lights
            const card = els.signalCards?.querySelector(`[data-dir="${dir}"]`);
            if (card) {
                const lights = card.querySelectorAll('.light');
                lights.forEach(l => l.classList.remove('active'));
                const state = states[dir];
                if (state === 'red') lights[0]?.classList.add('active');
                else if (state === 'yellow') lights[1]?.classList.add('active');
                else if (state === 'green') lights[2]?.classList.add('active');

                // Update timer color
                if (timerEl) {
                    timerEl.style.color = state === 'green' ? '#00ff88' :
                        state === 'yellow' ? '#ffbb00' : '#ff3355';
                }
            }
        });

        // Detector data
        const detData = SUMODetectors.e2Data;
        dirs.forEach(dir => {
            const d = dirShort[dir];
            const data = detData[dir];

            const queueEl = els[`queue${d}`];
            const barEl = els[`bar${d}`];
            const densityEl = els[`density${d}`];
            const speedEl = els[`speed${d}`];

            if (queueEl) queueEl.textContent = data.queueLength.toString();
            if (barEl) barEl.style.width = `${Math.min(100, data.density * 15)}%`;
            if (densityEl) densityEl.textContent = data.density.toString();
            if (speedEl) speedEl.textContent = parseFloat(data.avgSpeed).toFixed(0);
        });

        // Emergency overlay
        if (SUMOSignals.emergencyActive) {
            els.emergencyOverlay.classList.remove('hidden');
        } else {
            els.emergencyOverlay.classList.add('hidden');
        }

        // Draw charts (throttle further)
        if (updateCounter % 9 === 0) {
            drawDensityChart();
            drawThroughputChart();
        }
    }

    function drawDensityChart() {
        const canvas = els.densityChart;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let y = 0; y < h; y += 20) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        const history = SUMODetectors.densityHistory;
        const colors = {
            north: '#00f0ff',
            south: '#bf00ff',
            east: '#00ff88',
            west: '#ffbb00'
        };

        const maxLen = 30;
        const dirs = ['north', 'south', 'east', 'west'];

        dirs.forEach(dir => {
            const data = history[dir];
            if (data.length < 2) return;

            ctx.strokeStyle = colors[dir];
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();

            const maxVal = Math.max(10, ...data);
            data.forEach((val, i) => {
                const x = (i / (maxLen - 1)) * w;
                const y = h - (val / maxVal) * (h - 10) - 5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Glow effect
            ctx.strokeStyle = colors[dir];
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            data.forEach((val, i) => {
                const x = (i / (maxLen - 1)) * w;
                const y = h - (val / maxVal) * (h - 10) - 5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Legend
        ctx.font = '8px JetBrains Mono';
        let lx = 5;
        dirs.forEach(dir => {
            ctx.fillStyle = colors[dir];
            ctx.fillRect(lx, 5, 8, 3);
            ctx.fillText(dir[0].toUpperCase(), lx + 10, 9);
            lx += 30;
        });
    }

    function drawThroughputChart() {
        const canvas = els.throughputChart;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(0, 0, w, h);

        const data = SUMODetectors.throughputHistory;
        if (data.length < 1) return;

        const maxVal = Math.max(5, ...data);
        const barW = Math.max(4, (w - 10) / 20 - 2);

        data.forEach((val, i) => {
            const barH = (val / maxVal) * (h - 15);
            const x = 5 + i * (barW + 2);
            const y = h - barH - 5;

            // Bar gradient
            const grad = ctx.createLinearGradient(x, y, x, h - 5);
            grad.addColorStop(0, '#00f0ff');
            grad.addColorStop(1, '#3b82f6');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(x, y, barW, barH);
            ctx.globalAlpha = 1;

            // Value label
            if (val > 0) {
                ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
                ctx.font = '7px JetBrains Mono';
                ctx.textAlign = 'center';
                ctx.fillText(val.toString(), x + barW / 2, y - 2);
                ctx.textAlign = 'left';
            }
        });
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // ===== YOLO Detection Data Polling =====
    let yoloConnected = false;
    let yoloLastFrame = -1;
    let yoloRetryCount = 0;

    function startYoloPolling() {
        // Poll YOLO detection data every 1 second
        setInterval(loadYoloData, 1000);
    }

    async function loadYoloData() {
        try {
            const response = await fetch('yolo/traffic_data.json?t=' + Date.now());
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();

            // Check if YOLO is actually running (frame number should change)
            const isRunning = data.frame > 0 && data.frame !== yoloLastFrame;
            yoloLastFrame = data.frame;

            if (isRunning || data.frame > 0) {
                yoloConnected = true;
                yoloRetryCount = 0;
            }

            // Update YOLO UI elements
            if (els.yoloTotal) els.yoloTotal.textContent = data.vehicles || 0;
            if (els.yoloCar) els.yoloCar.textContent = data.counts?.car || 0;
            if (els.yoloMotorcycle) els.yoloMotorcycle.textContent = data.counts?.motorcycle || 0;
            if (els.yoloBus) els.yoloBus.textContent = data.counts?.bus || 0;
            if (els.yoloTruck) els.yoloTruck.textContent = data.counts?.truck || 0;
            if (els.yoloFps) els.yoloFps.textContent = data.fps || 0;
            if (els.yoloFrame) els.yoloFrame.textContent = data.frame || 0;

            // Update connection status
            const statusText = isRunning ? 'LIVE' : (data.frame > 0 ? 'PAUSED' : 'OFFLINE');
            const statusClass = isRunning ? 'live' : (data.frame > 0 ? 'paused' : 'offline');
            updateYoloStatus(statusText, statusClass);

        } catch (err) {
            yoloRetryCount++;
            if (yoloRetryCount > 3) {
                yoloConnected = false;
                updateYoloStatus('OFFLINE', 'offline');
            }
        }
    }

    function updateYoloStatus(text, statusClass) {
        if (els.yoloStatus) {
            els.yoloStatus.textContent = text;
            els.yoloStatus.className = 'yolo-status ' + statusClass;
        }
        if (els.yoloModStatus) {
            els.yoloModStatus.textContent = text === 'LIVE' ? 'ACTIVE' : text;
            els.yoloModStatus.className = text === 'LIVE' ? 'module-status active' : 'module-status';
        }
        if (els.yoloSection) {
            els.yoloSection.classList.toggle('connected', statusClass === 'live');
        }
    }

    return {
        init,
        update
    };
})();
