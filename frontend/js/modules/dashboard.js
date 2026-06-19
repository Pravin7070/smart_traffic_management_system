// ===== DASHBOARD CONTROLLER =====
// Updates simulation side panels and full analytics dashboard with live data.

const Dashboard = (() => {
    let els = {};
    let updateCounter = 0;
    let currentView = 'simulation';

    const violations = [];
    const vehicleLastStopDistance = new Map();
    const crossedStoplineVehicleIds = new Set();
    const vehicleWaitTimes = new Map();
    const flowBuckets = new Map();
    let flowChartBars = [];
    let flowChartSelectedIndex = -1;
    let flowTooltip = null;

    let yoloLastFrame = -1;
    let yoloRetryCount = 0;
    let lastLiveViolation = null;

    function init() {
        els = {
            // Existing simulation UI
            simStep: document.getElementById('simStep'),
            vehicleCount: document.getElementById('vehicleCount'),
            phaseState: document.getElementById('phaseState'),
            phaseIndex: document.getElementById('phaseIndex'),
            phaseTotal: document.getElementById('phaseTotal'),
            timerNorth: document.getElementById('timerNorth'),
            timerSouth: document.getElementById('timerSouth'),
            timerEast: document.getElementById('timerEast'),
            timerWest: document.getElementById('timerWest'),
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
            paramMinDur: document.getElementById('paramMinDur'),
            paramMaxDur: document.getElementById('paramMaxDur'),
            paramMaxGap: document.getElementById('paramMaxGap'),
            paramDetGap: document.getElementById('paramDetGap'),
            densityChart: document.getElementById('densityChart'),
            throughputChart: document.getElementById('throughputChart'),
            emergencyOverlay: document.getElementById('emergencyOverlay'),
            signalCards: document.getElementById('signalCards'),
            yoloTotal: document.getElementById('yoloTotal'),
            yoloCar: document.getElementById('yoloCar'),
            yoloMotorcycle: document.getElementById('yoloMotorcycle'),
            yoloBus: document.getElementById('yoloBus'),
            yoloTruck: document.getElementById('yoloTruck'),
            yoloFps: document.getElementById('yoloFps'),
            yoloFrame: document.getElementById('yoloFrame'),
            yoloStatus: document.getElementById('yoloStatus'),
            yoloModStatus: document.getElementById('yoloModStatus'),
            yoloSection: document.getElementById('yoloSection'),

            // Navigation + view roots
            tabSimulation: document.getElementById('tabSimulation'),
            tabDashboard: document.getElementById('tabDashboard'),
            analyticsDashboard: document.getElementById('analyticsDashboard'),
            trafficCanvas: document.getElementById('trafficCanvas'),
            panelLeft: document.getElementById('panelLeft'),
            panelRight: document.getElementById('panelRight'),
            modulesBar: document.getElementById('modulesBar'),
            manualControlPanel: document.getElementById('manualControlPanel'),
            emergencyAlertPanel: document.getElementById('emergencyAlertPanel'),

            // Full analytics dashboard
            violationLiveFeed: document.getElementById('violationLiveFeed'),
            eventsList: document.getElementById('eventsList'),
            trafficFlowChart: document.getElementById('trafficFlowChart'),
            metricActiveDirection: document.getElementById('metricActiveDirection'),
            metricAvgWait: document.getElementById('metricAvgWait'),
            metricProcessed: document.getElementById('metricProcessed'),
            metricQueueNorth: document.getElementById('metricQueueNorth'),
            metricQueueSouth: document.getElementById('metricQueueSouth'),
            metricQueueEast: document.getElementById('metricQueueEast'),
            metricQueueWest: document.getElementById('metricQueueWest'),
            sumViolationsToday: document.getElementById('sumViolationsToday'),
            sumFinesCollected: document.getElementById('sumFinesCollected'),
            sumPeakViolationTime: document.getElementById('sumPeakViolationTime'),
            filterVehicleInput: document.getElementById('filterVehicleInput'),
            filterDirectionSelect: document.getElementById('filterDirectionSelect'),
            filterSignalSelect: document.getElementById('filterSignalSelect'),
            sortViolationSelect: document.getElementById('sortViolationSelect'),
            violationTableBody: document.getElementById('violationTableBody'),
            btnExportCsv: document.getElementById('btnExportCsv'),
            btnExportJson: document.getElementById('btnExportJson')
        };

        // Static param values for SUMO card
        if (els.paramMinDur) els.paramMinDur.textContent = '15s';
        if (els.paramMaxDur) els.paramMaxDur.textContent = '60s';
        if (els.paramMaxGap) els.paramMaxGap.textContent = '3.0s';
        if (els.paramDetGap) els.paramDetGap.textContent = '2.0s';
        if (els.phaseTotal) els.phaseTotal.textContent = SUMOSignals.phases.length.toString();

        bindViewTabs();
        bindFiltersAndExport();
        bindFlowChartInteraction();
        startYoloPolling();
        setView('simulation');
    }

    function bindFlowChartInteraction() {
        const canvas = els.trafficFlowChart;
        if (!canvas) return;

        const host = canvas.parentElement;
        if (host && getComputedStyle(host).position === 'static') {
            host.style.position = 'relative';
        }

        flowTooltip = document.createElement('div');
        flowTooltip.className = 'chart-tooltip hidden';
        if (host) host.appendChild(flowTooltip);

        canvas.addEventListener('mousemove', (evt) => {
            const hit = getFlowBarAtPointer(evt, canvas);
            canvas.style.cursor = hit ? 'pointer' : 'default';
        });

        canvas.addEventListener('click', (evt) => {
            const hit = getFlowBarAtPointer(evt, canvas);
            if (!hit) {
                flowChartSelectedIndex = -1;
                hideFlowTooltip();
                drawTrafficFlowChart();
                return;
            }

            flowChartSelectedIndex = hit.index;
            showFlowTooltip(hit, canvas);
            drawTrafficFlowChart();
        });
    }

    function getFlowBarAtPointer(evt, canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = ((evt.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((evt.clientY - rect.top) / rect.height) * canvas.height;

        for (const bar of flowChartBars) {
            if (x >= bar.x && x <= bar.x + bar.w && y >= bar.y && y <= bar.y + bar.h) {
                return bar;
            }
        }
        return null;
    }

    function showFlowTooltip(bar, canvas) {
        if (!flowTooltip) return;
        flowTooltip.innerHTML = `<strong>${escapeHtml(bar.label)}</strong><br/>Vehicles: ${bar.count}`;
        flowTooltip.classList.remove('hidden');

        const hostRect = canvas.parentElement.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const px = ((bar.x + bar.w / 2) / canvas.width) * canvasRect.width;
        const py = (bar.y / canvas.height) * canvasRect.height;

        flowTooltip.style.left = `${Math.max(8, px - 58 + (canvasRect.left - hostRect.left))}px`;
        flowTooltip.style.top = `${Math.max(8, py - 42 + (canvasRect.top - hostRect.top))}px`;
    }

    function hideFlowTooltip() {
        if (!flowTooltip) return;
        flowTooltip.classList.add('hidden');
    }

    function update(simStep, dt = 0.016) {
        updateCounter++;

        updateHeaderAndSignalCards(simStep);
        updateDetectorPanel();
        updateEmergencyOverlay();
        detectTrafficEvents(dt);

        if (updateCounter % 9 === 0) {
            drawDensityChart();
            drawThroughputChart();
            drawTrafficFlowChart();
        }

        if (updateCounter % 3 === 0) {
            updateFullDashboardMetrics();
            renderViolationTable();
            renderViolationLiveCard();
            renderEventsPanel();
            renderEnforcementSummary();
        }
    }

    function bindViewTabs() {
        if (els.tabSimulation) {
            els.tabSimulation.addEventListener('click', () => setView('simulation'));
        }
        if (els.tabDashboard) {
            els.tabDashboard.addEventListener('click', () => setView('dashboard'));
        }
    }

    function setView(view) {
        currentView = view;
        const showDashboard = view === 'dashboard';

        if (els.tabSimulation) els.tabSimulation.classList.toggle('active', !showDashboard);
        if (els.tabDashboard) els.tabDashboard.classList.toggle('active', showDashboard);

        if (els.analyticsDashboard) {
            els.analyticsDashboard.classList.toggle('hidden', !showDashboard);
        }

        const simRoots = [
            els.trafficCanvas,
            els.panelLeft,
            els.panelRight,
            els.modulesBar,
            els.emergencyOverlay,
            els.manualControlPanel,
            els.emergencyAlertPanel
        ];

        simRoots.forEach(el => {
            if (!el) return;
            el.classList.toggle('hidden', showDashboard);
        });
    }

    function updateHeaderAndSignalCards(simStep) {
        if (updateCounter % 3 !== 0) return;

        if (els.simStep) els.simStep.textContent = simStep.toString().padStart(4, '0');
        if (els.vehicleCount) els.vehicleCount.textContent = SUMOVehicles.getCount().toString();

        const phase = SUMOSignals.getCurrentPhase();
        if (els.phaseState) els.phaseState.textContent = phase.state;
        if (els.phaseIndex) els.phaseIndex.textContent = SUMOSignals.currentPhaseIndex.toString();

        const states = SUMOSignals.signalStates;
        const timers = SUMOSignals.timers;
        const dirs = ['north', 'south', 'east', 'west'];

        dirs.forEach(dir => {
            const timerEl = els[`timer${capitalize(dir)}`];
            if (timerEl) timerEl.textContent = String(timers[dir]);

            const card = els.signalCards ? els.signalCards.querySelector(`[data-dir="${dir}"]`) : null;
            if (!card) return;
            const lights = card.querySelectorAll('.light');
            lights.forEach(l => l.classList.remove('active'));

            const state = states[dir];
            if (state === 'red') lights[0] && lights[0].classList.add('active');
            if (state === 'yellow') lights[1] && lights[1].classList.add('active');
            if (state === 'green') lights[2] && lights[2].classList.add('active');

            if (timerEl) {
                timerEl.style.color = state === 'green' ? '#00ff88' : state === 'yellow' ? '#ffbb00' : '#ff3355';
            }
        });
    }

    function updateDetectorPanel() {
        if (updateCounter % 3 !== 0) return;

        const detData = SUMODetectors.e2Data;
        const map = {
            north: 'N',
            south: 'S',
            east: 'E',
            west: 'W'
        };

        Object.keys(map).forEach(dir => {
            const suffix = map[dir];
            const data = detData[dir];
            if (!data) return;

            if (els[`queue${suffix}`]) els[`queue${suffix}`].textContent = String(data.queueLength);
            if (els[`bar${suffix}`]) els[`bar${suffix}`].style.width = `${Math.min(100, data.density * 15)}%`;
            if (els[`density${suffix}`]) els[`density${suffix}`].textContent = String(data.density);
            if (els[`speed${suffix}`]) els[`speed${suffix}`].textContent = String(parseFloat(data.avgSpeed).toFixed(0));
        });
    }

    function updateEmergencyOverlay() {
        if (!els.emergencyOverlay) return;
        els.emergencyOverlay.classList.toggle('hidden', !SUMOSignals.emergencyActive || currentView === 'dashboard');
    }

    function detectTrafficEvents(dt) {
        const activeIds = new Set();

        SUMOVehicles.vehicles.forEach(v => {
            if (!v.active) return;
            activeIds.add(v.id);

            if (!v.plateNumber) v.plateNumber = generatePlate(v.id);

            // Wait-time estimation
            const prevWait = vehicleWaitTimes.get(v.id) || 0;
            const waiting = v.speed < 0.5 && !v.inJunction;
            vehicleWaitTimes.set(v.id, waiting ? prevWait + dt : Math.max(0, prevWait - dt * 0.2));

            // Stop-line crossing detection
            const stopDist = getDistanceToStopLine(v);
            const prevDist = vehicleLastStopDistance.has(v.id) ? vehicleLastStopDistance.get(v.id) : stopDist;
            const crossed = prevDist > 0 && stopDist <= 0;

            if (crossed && !crossedStoplineVehicleIds.has(v.id)) {
                crossedStoplineVehicleIds.add(v.id);
                registerFlowPass(new Date());

                const signalState = SUMOSignals.signalStates[v.dir];
                if (signalState === 'red' || signalState === 'yellow') {
                    createViolationRecord(v, signalState);
                }
            }

            vehicleLastStopDistance.set(v.id, stopDist);
        });

        // Cleanup stale records for inactive vehicles.
        vehicleLastStopDistance.forEach((_, id) => {
            if (!activeIds.has(id)) vehicleLastStopDistance.delete(id);
        });
        vehicleWaitTimes.forEach((_, id) => {
            if (!activeIds.has(id)) vehicleWaitTimes.delete(id);
        });
    }

    function getDistanceToStopLine(vehicle) {
        const stopLine = SUMONetwork.getStopLine(vehicle.dir);
        if (vehicle.dir === 'north') return stopLine - vehicle.y;
        if (vehicle.dir === 'south') return vehicle.y - stopLine;
        if (vehicle.dir === 'east') return vehicle.x - stopLine;
        return stopLine - vehicle.x;
    }

    function createViolationRecord(vehicle, signalState) {
        const now = new Date();
        const fineAmount = signalState === 'red' ? 1000 : 500;

        const record = {
            id: `${now.getTime()}-${vehicle.id}`,
            timestamp: now.toISOString(),
            timeLabel: formatTime(now),
            vehicleNumber: vehicle.plateNumber,
            direction: capitalize(vehicle.dir),
            directionKey: vehicle.dir,
            signalState: capitalize(signalState),
            signalStateKey: signalState,
            fineAmount
        };

        violations.unshift(record);
        if (violations.length > 1000) violations.pop();
        lastLiveViolation = record;
    }

    function registerFlowPass(dateObj) {
        const bucketKey = getHalfHourBucketKey(dateObj);
        const existing = flowBuckets.get(bucketKey) || 0;
        flowBuckets.set(bucketKey, existing + 1);

        // keep map bounded
        if (flowBuckets.size > 144) {
            const keys = Array.from(flowBuckets.keys()).sort();
            while (keys.length > 144) {
                const key = keys.shift();
                flowBuckets.delete(key);
            }
        }
    }

    function updateFullDashboardMetrics() {
        const detData = SUMODetectors.e2Data;
        const greenDir = Object.keys(SUMOSignals.signalStates).find(d => SUMOSignals.signalStates[d] === 'green');

        if (els.metricActiveDirection) {
            els.metricActiveDirection.textContent = greenDir ? capitalize(greenDir) : '--';
        }

        if (els.metricQueueNorth) els.metricQueueNorth.textContent = String(detData.north.queueLength);
        if (els.metricQueueSouth) els.metricQueueSouth.textContent = String(detData.south.queueLength);
        if (els.metricQueueEast) els.metricQueueEast.textContent = String(detData.east.queueLength);
        if (els.metricQueueWest) els.metricQueueWest.textContent = String(detData.west.queueLength);

        let totalWait = 0;
        let waitCount = 0;
        vehicleWaitTimes.forEach(v => {
            totalWait += v;
            waitCount++;
        });

        const avgWait = waitCount > 0 ? totalWait / waitCount : 0;
        if (els.metricAvgWait) els.metricAvgWait.textContent = `${avgWait.toFixed(1)} s`;
        if (els.metricProcessed) els.metricProcessed.textContent = String(SUMOVehicles.totalArrived || 0);
    }

    function renderViolationLiveCard() {
        if (!els.violationLiveFeed) return;

        if (!lastLiveViolation) {
            els.violationLiveFeed.innerHTML = '<div class="muted">No live violation</div>';
            return;
        }

        els.violationLiveFeed.innerHTML = `
            <div class="headline">Violation captured by camera</div>
            <div class="row"><span>Vehicle</span><b>${lastLiveViolation.vehicleNumber}</b></div>
            <div class="row"><span>Direction</span><b>${lastLiveViolation.direction}</b></div>
            <div class="row"><span>Signal</span><b>${lastLiveViolation.signalState}</b></div>
            <div class="row"><span>Fine</span><b>Rs ${lastLiveViolation.fineAmount}</b></div>
        `;
    }

    function renderEventsPanel() {
        if (!els.eventsList) return;

        const eventItems = [];

        if (ManualControl && ManualControl.isActive) {
            eventItems.push({ level: 'warning', text: 'Manual override activated by operator' });
        }

        if (SUMOSignals.emergencyActive) {
            eventItems.push({ level: 'critical', text: 'Emergency preemption is active' });
        }

        if (typeof EmergencyAlert !== 'undefined') {
            EmergencyAlert.getActiveAlerts().forEach(alert => {
                const level = alert.severity === 'critical' ? 'critical' : 'warning';
                eventItems.push({ level, text: `${alert.type.replace('_', ' ')} at ${String(alert.location || 'unknown').toUpperCase()}` });
            });
        }

        if (eventItems.length === 0) {
            els.eventsList.innerHTML = '<li class="muted">No active events</li>';
            return;
        }

        els.eventsList.innerHTML = eventItems
            .slice(0, 8)
            .map(e => `<li class="${e.level}">${escapeHtml(e.text)}</li>`)
            .join('');
    }

    function renderEnforcementSummary() {
        const today = new Date().toDateString();
        const todays = violations.filter(v => new Date(v.timestamp).toDateString() === today);

        const totalViolations = todays.length;
        const totalFine = todays.reduce((sum, v) => sum + v.fineAmount, 0);
        const byTime = {};

        todays.forEach(v => {
            const key = v.timeLabel.slice(0, 5);
            byTime[key] = (byTime[key] || 0) + 1;
        });

        let peakTime = '--:--';
        let peakCount = 0;
        Object.entries(byTime).forEach(([time, count]) => {
            if (count > peakCount) {
                peakCount = count;
                peakTime = time;
            }
        });

        if (els.sumViolationsToday) els.sumViolationsToday.textContent = String(totalViolations);
        if (els.sumFinesCollected) els.sumFinesCollected.textContent = `Rs ${totalFine.toLocaleString('en-IN')}`;
        if (els.sumPeakViolationTime) els.sumPeakViolationTime.textContent = peakTime;
    }

    function getFilteredSortedViolations() {
        const search = (els.filterVehicleInput ? els.filterVehicleInput.value : '').trim().toUpperCase();
        const dir = els.filterDirectionSelect ? els.filterDirectionSelect.value : 'all';
        const signal = els.filterSignalSelect ? els.filterSignalSelect.value : 'all';
        const sort = els.sortViolationSelect ? els.sortViolationSelect.value : 'time-desc';

        let rows = violations.filter(v => {
            const matchesVehicle = !search || v.vehicleNumber.toUpperCase().includes(search);
            const matchesDir = dir === 'all' || v.directionKey === dir;
            const matchesSignal = signal === 'all' || v.signalStateKey === signal;
            return matchesVehicle && matchesDir && matchesSignal;
        });

        rows.sort((a, b) => {
            if (sort === 'time-asc') return a.timestamp.localeCompare(b.timestamp);
            if (sort === 'fine-desc') return b.fineAmount - a.fineAmount;
            if (sort === 'fine-asc') return a.fineAmount - b.fineAmount;
            return b.timestamp.localeCompare(a.timestamp);
        });

        return rows;
    }

    function renderViolationTable() {
        if (!els.violationTableBody) return;

        const rows = getFilteredSortedViolations();
        if (rows.length === 0) {
            els.violationTableBody.innerHTML = '<tr><td colspan="5" class="muted">No violations recorded</td></tr>';
            return;
        }

        els.violationTableBody.innerHTML = rows.slice(0, 300).map(v => `
            <tr>
                <td>${v.timeLabel}</td>
                <td>${v.vehicleNumber}</td>
                <td>${v.direction}</td>
                <td>${v.signalState}</td>
                <td>Rs ${v.fineAmount}</td>
            </tr>
        `).join('');
    }

    function bindFiltersAndExport() {
        const rerender = () => renderViolationTable();

        if (els.filterVehicleInput) els.filterVehicleInput.addEventListener('input', rerender);
        if (els.filterDirectionSelect) els.filterDirectionSelect.addEventListener('change', rerender);
        if (els.filterSignalSelect) els.filterSignalSelect.addEventListener('change', rerender);
        if (els.sortViolationSelect) els.sortViolationSelect.addEventListener('change', rerender);

        if (els.btnExportJson) {
            els.btnExportJson.addEventListener('click', () => {
                const rows = getFilteredSortedViolations();
                downloadBlob('violations.json', JSON.stringify(rows, null, 2), 'application/json');
            });
        }

        if (els.btnExportCsv) {
            els.btnExportCsv.addEventListener('click', () => {
                const rows = getFilteredSortedViolations();
                const csvRows = [
                    ['Time', 'Vehicle Number', 'Direction', 'Signal State', 'Fine Amount'].join(','),
                    ...rows.map(r => [
                        r.timeLabel,
                        r.vehicleNumber,
                        r.direction,
                        r.signalState,
                        r.fineAmount
                    ].map(csvEscape).join(','))
                ];
                downloadBlob('violations.csv', csvRows.join('\n'), 'text/csv');
            });
        }
    }

    function drawDensityChart() {
        const canvas = els.densityChart;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let y = 0; y < h; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const history = SUMODetectors.densityHistory;
        const colors = { north: '#00f0ff', south: '#bf00ff', east: '#00ff88', west: '#ffbb00' };
        const maxLen = 30;
        const dirs = ['north', 'south', 'east', 'west'];

        dirs.forEach(dir => {
            const data = history[dir];
            if (!data || data.length < 2) return;

            ctx.strokeStyle = colors[dir];
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();

            const maxVal = Math.max(10, ...data);
            data.forEach((val, i) => {
                const x = (i / (maxLen - 1)) * w;
                const y = h - (val / maxVal) * (h - 10) - 5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.globalAlpha = 1;
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
        if (!data || data.length < 1) return;

        const maxVal = Math.max(5, ...data);
        const barW = Math.max(4, (w - 10) / 20 - 2);

        data.forEach((val, i) => {
            const barH = (val / maxVal) * (h - 15);
            const x = 5 + i * (barW + 2);
            const y = h - barH - 5;

            const grad = ctx.createLinearGradient(x, y, x, h - 5);
            grad.addColorStop(0, '#00f0ff');
            grad.addColorStop(1, '#3b82f6');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(x, y, barW, barH);
            ctx.globalAlpha = 1;
        });
    }

    function drawTrafficFlowChart() {
        const canvas = els.trafficFlowChart;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(9, 15, 27, 0.95)';
        ctx.fillRect(0, 0, w, h);

        const series = getRecentFlowSeries(12);
        const max = Math.max(5, ...series.map(s => s.count));
        const plotX = 44;
        const plotY = 18;
        const plotW = w - 56;
        const plotH = h - 36;

        // Grid
        ctx.strokeStyle = 'rgba(120, 150, 210, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = plotY + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(plotX, y);
            ctx.lineTo(plotX + plotW, y);
            ctx.stroke();
        }

        // Axis labels
        ctx.fillStyle = '#95abcf';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const value = Math.round(max - (max / 4) * i);
            const y = plotY + (plotH / 4) * i + 3;
            ctx.fillText(String(value), plotX - 8, y);
        }

        const barStep = plotW / series.length;
        const barWidth = Math.max(8, barStep - 8);
        flowChartBars = [];

        series.forEach((bucket, i) => {
            const barH = (bucket.count / max) * plotH;
            const x = plotX + i * barStep + (barStep - barWidth) / 2;
            const y = plotY + plotH - barH;

            const grad = ctx.createLinearGradient(0, y, 0, y + barH);
            grad.addColorStop(0, '#00f0ff');
            grad.addColorStop(1, '#4f46e5');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barH);

            flowChartBars.push({
                index: i,
                x,
                y,
                w: barWidth,
                h: barH,
                label: bucket.label,
                count: bucket.count
            });

            if (flowChartSelectedIndex === i) {
                ctx.strokeStyle = '#f8fbff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 1, y - 1, barWidth + 2, barH + 2);
            }

            ctx.fillStyle = '#9db3d8';
            ctx.font = '9px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(bucket.label, x + barWidth / 2, plotY + plotH + 12);
        });
    }

    function getRecentFlowSeries(bucketCount) {
        const out = [];
        const now = new Date();

        for (let i = bucketCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setMinutes(now.getMinutes() - i * 30, 0, 0);
            const key = getHalfHourBucketKey(d);
            out.push({
                key,
                label: formatHalfHourLabel(d),
                count: flowBuckets.get(key) || 0
            });
        }

        return out;
    }

    function startYoloPolling() {
        setInterval(loadYoloData, 1000);
    }

    async function loadYoloData() {
        try {
            const response = await fetch(`yolo/traffic_data.json?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const isRunning = data.frame > 0 && data.frame !== yoloLastFrame;
            yoloLastFrame = data.frame;
            yoloRetryCount = 0;

            if (els.yoloTotal) els.yoloTotal.textContent = String(data.vehicles || 0);
            if (els.yoloCar) els.yoloCar.textContent = String(data.counts?.car || 0);
            if (els.yoloMotorcycle) els.yoloMotorcycle.textContent = String(data.counts?.motorcycle || 0);
            if (els.yoloBus) els.yoloBus.textContent = String(data.counts?.bus || 0);
            if (els.yoloTruck) els.yoloTruck.textContent = String(data.counts?.truck || 0);
            if (els.yoloFps) els.yoloFps.textContent = String(data.fps || 0);
            if (els.yoloFrame) els.yoloFrame.textContent = String(data.frame || 0);

            const statusText = isRunning ? 'LIVE' : (data.frame > 0 ? 'PAUSED' : 'OFFLINE');
            const statusClass = isRunning ? 'live' : (data.frame > 0 ? 'paused' : 'offline');
            updateYoloStatus(statusText, statusClass);
        } catch (_) {
            yoloRetryCount++;
            if (yoloRetryCount > 3) updateYoloStatus('OFFLINE', 'offline');
        }
    }

    function updateYoloStatus(text, statusClass) {
        if (els.yoloStatus) {
            els.yoloStatus.textContent = text;
            els.yoloStatus.className = `yolo-status ${statusClass}`;
        }
        if (els.yoloModStatus) {
            els.yoloModStatus.textContent = text === 'LIVE' ? 'ACTIVE' : text;
            els.yoloModStatus.className = text === 'LIVE' ? 'module-status active' : 'module-status';
        }
        if (els.yoloSection) {
            els.yoloSection.classList.toggle('connected', statusClass === 'live');
        }
    }

    function generatePlate(id) {
        const a = String.fromCharCode(65 + (id % 26));
        const b = String.fromCharCode(65 + ((id * 7) % 26));
        const num = String(1000 + ((id * 37) % 9000));
        return `TS-${a}${b}-${num}`;
    }

    function formatTime(date) {
        return date.toLocaleTimeString('en-IN', { hour12: false });
    }

    function formatHalfHourLabel(date) {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function getHalfHourBucketKey(date) {
        const d = new Date(date);
        const mins = d.getMinutes();
        d.setMinutes(mins < 30 ? 0 : 30, 0, 0);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
    }

    function downloadBlob(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function csvEscape(value) {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    return {
        init,
        update
    };
})();