const EventModeApp = (() => {
    const SIM_MINUTES_PER_SECOND = 0.62;
    const DEMO_START_MINUTE = -12;
    const EVENT_START_MINUTE = 0;
    const EVENT_END_MINUTE = 24;
    const PEAK_EXIT_MINUTE = 19;
    const MAX_HISTORY = 28;

    const EVENT_PROFILES = {
        cricket: {
            id: 'cricket',
            label: 'Cricket Match',
            venue: 'City Stadium',
            crowd: 40000,
            startTime: '18:30',
            endTime: '22:30',
            parkingCapacity: 8200,
            gateCount: 4,
            launchMessage: 'Activate outbound green and hold left turns on market road.'
        },
        concert: {
            id: 'concert',
            label: 'Concert Night',
            venue: 'Neon Arena',
            crowd: 28000,
            startTime: '19:00',
            endTime: '22:00',
            parkingCapacity: 6100,
            gateCount: 5,
            launchMessage: 'Stage release corridors for ride-share spikes and VIP arrivals.'
        },
        festival: {
            id: 'festival',
            label: 'City Festival',
            venue: 'Riverside Grounds',
            crowd: 52000,
            startTime: '16:00',
            endTime: '23:00',
            parkingCapacity: 9800,
            gateCount: 6,
            launchMessage: 'Use diversions to separate pedestrian-heavy approaches from vehicle exits.'
        },
        school: {
            id: 'school',
            label: 'School Rush',
            venue: 'Central School Complex',
            crowd: 8400,
            startTime: '07:15',
            endTime: '08:20',
            parkingCapacity: 1400,
            gateCount: 3,
            launchMessage: 'Keep drop-off lanes short-cycle and prioritize two-way parent traffic release.'
        },
        temple: {
            id: 'temple',
            label: 'Temple / Church Event',
            venue: 'Heritage Zone',
            crowd: 16500,
            startTime: '05:30',
            endTime: '09:00',
            parkingCapacity: 3200,
            gateCount: 4,
            launchMessage: 'Protect pedestrian exits and pace parking release to avoid neighborhood spillback.'
        },
        vip: {
            id: 'vip',
            label: 'VIP Event',
            venue: 'Grand Plaza',
            crowd: 1900,
            startTime: '20:00',
            endTime: '23:30',
            parkingCapacity: 760,
            gateCount: 2,
            launchMessage: 'Reserve the VIP corridor and keep emergency access completely clear.'
        }
    };

    const state = {
        profileKey: 'cricket',
        profile: EVENT_PROFILES.cricket,
        currentMinute: DEMO_START_MINUTE,
        eventActive: true,
        emergencyOverride: false,
        diversionOpen: true,
        oneWayMode: true,
        crowdControl: true,
        vipCorridor: false,
        manualActivated: false,
        trafficPressure: 0.24,
        congestion: 0.28,
        efficiency: 0.79,
        peakExitMinutes: 19,
        totalVehicles: 0,
        queueLength: 0,
        avgSpeed: 0,
        throughput: 0,
        delayReduction: 0,
        emissionReduction: 0,
        gates: [],
        parking: [],
        vehicles: [],
        crowdDots: [],
        history: [],
        feeds: [],
        recommendations: [],
        charts: {},
        canvas: null,
        ctx: null,
        mapDpr: 1,
        lastTs: 0,
        logicAccumulator: 0,
        playing: true,
        backendSyncAt: 0,
        backendSyncInFlight: false
    };

    const el = {};

    function init() {
        cacheElements();
        bindScenarioTabs();
        bindControls();
        bindPhaseButtons();
        setupCharts();
        setupMapCanvas();
        loadProfile(state.profileKey, true);
        seedInitialVehicles();
        emitFeed('Event Mode online', 'Predictive traffic orchestration is active for the current event profile.');
        requestAnimationFrame(tick);
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('beforeunload', () => {
            syncMetricsToBackend('unload', true);
        });
    }

    function cacheElements() {
        el.scenarioTabs = document.getElementById('scenarioTabs');
        el.activeScenarioChip = document.getElementById('activeScenarioChip');
        el.eventTypeLabel = document.getElementById('eventTypeLabel');
        el.eventVenueLabel = document.getElementById('eventVenueLabel');
        el.eventCrowdLabel = document.getElementById('eventCrowdLabel');
        el.eventStartLabel = document.getElementById('eventStartLabel');
        el.eventEndLabel = document.getElementById('eventEndLabel');
        el.parkingCapacityLabel = document.getElementById('parkingCapacityLabel');
        el.gateCountLabel = document.getElementById('gateCountLabel');
        el.eventPhaseChip = document.getElementById('eventPhaseChip');
        el.eventPhaseHero = document.getElementById('eventPhaseHero');
        el.eventSurgeHero = document.getElementById('eventSurgeHero');
        el.eventEfficiencyHero = document.getElementById('eventEfficiencyHero');
        el.trafficPressureLabel = document.getElementById('trafficPressureLabel');
        el.congestionLabel = document.getElementById('congestionLabel');
        el.peakExitLabel = document.getElementById('peakExitLabel');
        el.trafficPressureValue = document.getElementById('eventPressureValue');
        el.peakExitValue = document.getElementById('eventPeakExitValue');
        el.pressureBar = document.getElementById('pressureBar');
        el.congestionBar = document.getElementById('congestionBar');
        el.peakBar = document.getElementById('peakBar');
        el.timelineIndicator = document.getElementById('timelineIndicator');
        el.totalVehiclesLabel = document.getElementById('totalVehiclesLabel');
        el.queueLengthLabel = document.getElementById('queueLengthLabel');
        el.avgSpeedLabel = document.getElementById('avgSpeedLabel');
        el.throughputLabel = document.getElementById('throughputLabel');
        el.delayReductionLabel = document.getElementById('delayReductionLabel');
        el.emissionReductionLabel = document.getElementById('emissionReductionLabel');
        el.trafficEfficiencyLabel = document.getElementById('trafficEfficiencyLabel');
        el.efficiencyHint = document.getElementById('efficiencyHint');
        el.efficiencyRing = document.getElementById('efficiencyRing');
        el.strategyList = document.getElementById('strategyList');
        el.gateTable = document.getElementById('gateTable');
        el.parkingList = document.getElementById('parkingList');
        el.recommendationList = document.getElementById('recommendationList');
        el.aiFeed = document.getElementById('aiFeed');
        el.controlStatusChip = document.getElementById('controlStatusChip');
        el.routeOverlay = document.getElementById('routeOverlay');
        el.corridorOverlay = document.getElementById('corridorOverlay');
        el.eventModeBack = document.getElementById('eventModeBack');
        el.eventModeToggle = document.getElementById('eventModeToggle');
        el.eventModeExport = document.getElementById('eventModeExport');
        el.predictionChart = document.getElementById('predictionChart');
        el.eventTrafficCanvas = document.getElementById('eventTrafficCanvas');
    }

    function bindScenarioTabs() {
        const tabs = Object.values(EVENT_PROFILES).map(profile => {
            const button = document.createElement('button');
            button.className = 'scenario-pill';
            button.dataset.scenario = profile.id;
            button.textContent = profile.label.toUpperCase();
            button.addEventListener('click', () => loadProfile(profile.id));
            el.scenarioTabs.appendChild(button);
            return button;
        });
        state.scenarioButtons = tabs;
    }

    function bindControls() {
        el.eventModeBack.addEventListener('click', () => {
            window.location.href = '/';
        });

        el.eventModeToggle.addEventListener('click', () => {
            state.playing = !state.playing;
            el.eventModeToggle.textContent = state.playing ? 'LIVE' : 'PAUSED';
            emitFeed(state.playing ? 'Event Mode resumed' : 'Event Mode paused', state.playing ? 'Predictive sequence resumed.' : 'Live updates suspended for analysis.');
        });

        el.eventModeExport.addEventListener('click', () => {
            const payload = {
                profile: state.profile,
                phase: getPhaseLabel(),
                trafficPressure: state.trafficPressure,
                congestion: state.congestion,
                efficiency: state.efficiency,
                recommendations: state.recommendations
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `event-mode-${state.profile.id}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
            emitFeed('Event report exported', 'Snapshot downloaded as a structured JSON briefing.');
        });

        document.querySelectorAll('.control-action').forEach(button => {
            button.addEventListener('click', () => handleControl(button.dataset.action, button.textContent));
        });

        document.querySelectorAll('.phase-pill').forEach(button => {
            button.addEventListener('click', () => {
                const phase = button.dataset.phase;
                if (phase === 'pre') state.currentMinute = -8;
                if (phase === 'live') state.currentMinute = 8;
                if (phase === 'post') state.currentMinute = 27;
                emitFeed('Timeline shifted', `${button.textContent} has been staged for the predictive model.`);
                updatePhasePills(phase);
            });
        });

        el.gateTable.addEventListener('click', (event) => {
            const target = event.target.closest('[data-gate-index]');
            if (!target) return;
            const index = Number(target.dataset.gateIndex);
            state.gates[index].released = !state.gates[index].released;
            emitFeed('Gate release toggled', `${state.gates[index].name} is now ${state.gates[index].released ? 'released' : 'held'} manually.`);
            renderGateTable();
        });

        el.parkingList.addEventListener('click', (event) => {
            const target = event.target.closest('[data-parking-index]');
            if (!target) return;
            const index = Number(target.dataset.parkingIndex);
            state.parking[index].releaseHold = !state.parking[index].releaseHold;
            emitFeed('Parking release updated', `${state.parking[index].name} release ${state.parking[index].releaseHold ? 'approved' : 'held'} by the AI.`);
            renderParkingList();
        });
    }

    function bindPhaseButtons() {
        updatePhasePills('pre');
    }

    function handleControl(action, label) {
        switch (action) {
            case 'activate':
                state.eventActive = true;
                state.playing = true;
                el.eventModeToggle.textContent = 'LIVE';
                emitFeed('Event Mode activated', 'AI predictive coordination is now controlling the event perimeter.');
                break;
            case 'emergency':
                state.emergencyOverride = !state.emergencyOverride;
                emitFeed('Emergency override', state.emergencyOverride ? 'Emergency corridor is reserved and outbound conflicts are suppressed.' : 'Emergency corridor returned to standard protection mode.');
                break;
            case 'diversion':
                state.diversionOpen = !state.diversionOpen;
                emitFeed('Diversion routing', state.diversionOpen ? 'Temporary diversion roads are open for surge mitigation.' : 'Diversion routes are closed and recirculation is active.');
                break;
            case 'oneway':
                state.oneWayMode = !state.oneWayMode;
                emitFeed('Temporary one-way mode', state.oneWayMode ? 'Outbound streets have been converted into one-way exit corridors.' : 'Road network restored to mixed-direction flow.');
                break;
            case 'crowd':
                state.crowdControl = !state.crowdControl;
                emitFeed('Crowd control', state.crowdControl ? 'Crowd dispersal logic is pacing the exit release sequence.' : 'Crowd control throttling disabled for diagnostic comparison.');
                break;
            case 'vip':
                state.vipCorridor = !state.vipCorridor;
                emitFeed('VIP corridor', state.vipCorridor ? 'VIP corridor priority is locked through the plaza edge.' : 'VIP corridor returned to normal access scheduling.');
                break;
            default:
                break;
        }
        el.controlStatusChip.textContent = label.toUpperCase();
        syncMetricsToBackend(`control:${action}`, true);
    }

    function loadProfile(profileKey, initial = false) {
        state.profileKey = profileKey;
        state.profile = EVENT_PROFILES[profileKey];
        state.currentMinute = DEMO_START_MINUTE;
        state.manualActivated = true;

        state.gates = createGates(state.profile);
        state.parking = createParkingZones(state.profile);
        state.history = buildForecastSeries();
        state.vehicles = [];
        state.crowdDots = [];
        state.recommendations = [];
        state.feeds = [];

        el.activeScenarioChip.textContent = state.profile.label.toUpperCase();
        el.eventTypeLabel.textContent = state.profile.label;
        el.eventVenueLabel.textContent = state.profile.venue;
        el.eventCrowdLabel.textContent = state.profile.crowd.toLocaleString();
        el.eventStartLabel.textContent = state.profile.startTime;
        el.eventEndLabel.textContent = state.profile.endTime;
        el.parkingCapacityLabel.textContent = state.profile.parkingCapacity.toLocaleString();
        el.gateCountLabel.textContent = String(state.profile.gateCount);

        state.scenarioButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.scenario === profileKey);
        });

        updateStaticStrategyState();
        syncCharts(true);
        renderGateTable();
        renderParkingList();
        renderRecommendations();
        updateFeedPanel();
        updateAnalytics();
        resizeCanvas();

        if (!initial) {
            emitFeed('Scenario changed', `${state.profile.label} loaded for predictive event analysis.`);
        }

        syncMetricsToBackend(initial ? 'initial-load' : 'scenario-change', true);
    }

    function createGates(profile) {
        const gates = ['Gate A', 'Gate B', 'Gate C', 'VIP Exit', 'Emergency'].slice(0, Math.max(profile.gateCount, 2));
        return gates.map((name, index) => ({
            name,
            crowd: Math.max(0, Math.round(profile.crowd / (profile.gateCount * 1.4) + index * 120)),
            status: index === 0 ? 'released' : index === gates.length - 1 ? 'vip' : 'waiting',
            releaseTime: `${Math.max(1, 5 - index)} min`,
            released: index === 0 || index === gates.length - 1
        }));
    }

    function createParkingZones(profile) {
        return [
            { name: 'North Deck', capacity: Math.round(profile.parkingCapacity * 0.34), occupancy: 0.72, releaseHold: false },
            { name: 'East Plaza', capacity: Math.round(profile.parkingCapacity * 0.27), occupancy: 0.58, releaseHold: true },
            { name: 'South Overflow', capacity: Math.round(profile.parkingCapacity * 0.23), occupancy: 0.81, releaseHold: true },
            { name: 'VIP Reserve', capacity: Math.round(profile.parkingCapacity * 0.16), occupancy: 0.44, releaseHold: false }
        ];
    }

    function seedInitialVehicles() {
        state.vehicles = [];
        for (let i = 0; i < 18; i++) {
            state.vehicles.push(createVehicle(i % 4, Math.random(), 0.45 + Math.random() * 0.1));
        }
        for (let i = 0; i < 32; i++) {
            state.crowdDots.push(createCrowdDot(i));
        }
    }

    function createVehicle(laneIndex, t = 0, speed = 0.5) {
        return {
            laneIndex,
            t,
            speed,
            tint: laneIndex === 0 ? '#00f0ff' : laneIndex === 1 ? '#bf00ff' : laneIndex === 2 ? '#00ff88' : '#ffbb00',
            seed: Math.random(),
            route: laneIndex % 2 === 0 ? 'exit-east' : 'exit-west'
        };
    }

    function createCrowdDot(seed) {
        return {
            seed,
            x: 0.44 + Math.random() * 0.16,
            y: 0.34 + Math.random() * 0.16,
            vx: (Math.random() - 0.5) * 0.003,
            vy: (Math.random() - 0.5) * 0.003,
            type: seed % 9 === 0 ? 'vip' : 'regular'
        };
    }

    function setupCharts() {
        if (!window.Chart) return;

        const predictionCtx = el.predictionChart.getContext('2d');
        state.charts.prediction = new Chart(predictionCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    series('Predicted Vehicles', '#00f0ff', 2),
                    series('Actual Vehicles', '#bf00ff', 2),
                    series('Exit Wave Prediction', '#00ff88', 2, 'y1')
                ]
            },
            options: chartOptions({
                y: {
                    beginAtZero: true,
                    ticks: { color: '#92abc5' },
                    grid: { color: 'rgba(155, 180, 200, 0.14)' }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    ticks: { color: '#92abc5' },
                    grid: { drawOnChartArea: false }
                }
            })
        });
    }

    function series(label, color, width, axis = 'y') {
        return {
            label,
            data: [],
            borderColor: color,
            backgroundColor: color,
            borderWidth: width,
            tension: 0.34,
            pointRadius: 1.5,
            pointHoverRadius: 3,
            fill: false,
            yAxisID: axis
        };
    }

    function chartOptions(scales) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    labels: { color: '#d8e6f3' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#92abc5', maxTicksLimit: 8 },
                    grid: { color: 'rgba(155, 180, 200, 0.12)' }
                },
                ...scales
            }
        };
    }

    function buildForecastSeries() {
        const points = [];
        for (let i = -14; i <= 14; i++) {
            const minute = state.currentMinute + i;
            const phaseFactor = getPhaseFactor(minute);
            const eventPulse = gaussian(minute, PEAK_EXIT_MINUTE, 5.5);
            const predicted = Math.round(state.profile.crowd / 720 * phaseFactor + eventPulse * 56 + 12);
            const actual = Math.round(predicted * (0.82 + 0.18 * Math.sin(minute / 3.5)) + noise(minute) * 4);
            const exitWave = Math.round(phaseFactor * 38 + eventPulse * 78);
            points.push({
                label: formatMinute(minute),
                predicted,
                actual: Math.max(0, actual),
                exitWave: Math.max(0, exitWave)
            });
        }
        return points;
    }

    function tick(ts) {
        requestAnimationFrame(tick);
        if (!state.lastTs) state.lastTs = ts;
        const rawDt = (ts - state.lastTs) / 1000;
        state.lastTs = ts;

        if (!state.playing) {
            renderMap(ts / 1000);
            return;
        }

        state.logicAccumulator += Math.min(rawDt, 0.08);
        while (state.logicAccumulator >= 0.2) {
            advanceLogic(0.2);
            state.logicAccumulator -= 0.2;
        }

        renderMap(ts / 1000);
    }

    function advanceLogic(dt) {
        state.currentMinute += dt * SIM_MINUTES_PER_SECOND;

        const phase = getPhaseLabel();
        state.trafficPressure = computeTrafficPressure();
        state.congestion = computeCongestion();
        state.efficiency = computeEfficiency();
        state.peakExitMinutes = computePeakExitMinutes();
        state.totalVehicles = computeTotalVehicles();
        state.queueLength = computeQueueLength();
        state.avgSpeed = computeAverageSpeed();
        state.throughput = computeThroughput();
        state.delayReduction = computeDelayReduction();
        state.emissionReduction = computeEmissionReduction();

        updateVehicleFleet(dt);
        updateCrowdDots(dt);
        updateParkingZones();
        updateGates();
        updateTimeline();
        updateCharts();
        updateAnalytics();
        updateStaticStrategyState();
        renderStrategyPanel();
        renderGateTable();
        renderParkingList();
        renderRecommendations();
        updateFeedPanel();

        if (phase === 'Post-event dispersal' && state.trafficPressure > 0.72) {
            emitFeed('Exit surge detected', 'Outbound wave is peaking; extend green time and hold conflicting turns immediately.');
        }
    }

    function computeTrafficPressure() {
        const crowdFactor = state.profile.crowd / 52000;
        const phaseFactor = getPhaseFactor(state.currentMinute);
        const surgeFactor = gaussian(state.currentMinute, PEAK_EXIT_MINUTE, 5.2);
        const controlFactor = state.oneWayMode ? 0.08 : 0.12;
        const pressure = 0.12 + crowdFactor * 0.56 + phaseFactor * 0.22 + surgeFactor * 0.32 + controlFactor;
        return clamp(pressure, 0.06, 0.99);
    }

    function computeCongestion() {
        const base = state.trafficPressure * 0.85 + (state.emergencyOverride ? 0.05 : 0);
        const relief = state.diversionOpen ? 0.1 : 0;
        return clamp(base - relief, 0, 1);
    }

    function computeEfficiency() {
        const greenBoost = state.oneWayMode ? 0.08 : 0.03;
        const activeBoost = state.eventActive ? 0.06 : 0;
        const congestionPenalty = state.congestion * 0.33;
        return clamp(0.82 + greenBoost + activeBoost - congestionPenalty, 0.32, 0.97);
    }

    function computePeakExitMinutes() {
        const delta = EVENT_END_MINUTE - state.currentMinute;
        if (delta <= 0) return 0;
        return Math.max(0, Math.round(delta * 1.5));
    }

    function computeTotalVehicles() {
        const base = Math.round(state.profile.crowd / 1100);
        return Math.max(0, base + Math.round(state.congestion * 52));
    }

    function computeQueueLength() {
        const pressure = state.trafficPressure;
        const gating = state.gates.filter(gate => gate.released).length;
        return Math.round(pressure * 82 - gating * 4);
    }

    function computeAverageSpeed() {
        const base = 42 - state.congestion * 25;
        const bias = state.diversionOpen ? 4 : 0;
        return clamp(base + bias, 12, 52);
    }

    function computeThroughput() {
        const baseline = state.profile.crowd / 18;
        const relief = state.oneWayMode ? 88 : 40;
        return Math.round(baseline + relief - state.congestion * 70);
    }

    function computeDelayReduction() {
        const value = 18 + (state.diversionOpen ? 14 : 4) + (state.oneWayMode ? 10 : 0) - state.congestion * 12;
        return clamp(Math.round(value), 0, 68);
    }

    function computeEmissionReduction() {
        const value = 12 + state.efficiency * 32 + (state.crowdControl ? 8 : 0);
        return clamp(Math.round(value), 0, 74);
    }

    function updateVehicleFleet(dt) {
        const target = clamp(Math.round(state.totalVehicles * 0.75 + state.congestion * 12), 10, 72);
        while (state.vehicles.length < target) {
            state.vehicles.push(createVehicle(state.vehicles.length % 4, Math.random() * 0.32, 0.4 + Math.random() * 0.25));
        }
        while (state.vehicles.length > target) {
            state.vehicles.shift();
        }

        state.vehicles.forEach((vehicle, index) => {
            const speedBase = 0.0035 + (state.oneWayMode ? 0.0021 : 0.0013);
            const pressureBoost = state.congestion * 0.0028;
            vehicle.speed = clamp(vehicle.speed + pressureBoost - 0.0015, 0.08, 0.9);
            vehicle.t = (vehicle.t + speedBase * (1 + index * 0.02) * (1 + state.efficiency * 0.2)) % 1;
        });
    }

    function updateCrowdDots(dt) {
        state.crowdDots.forEach((dot, index) => {
            const drift = state.currentMinute > EVENT_END_MINUTE ? 0.0022 : 0.0007;
            dot.x += dot.vx * drift * 60;
            dot.y += (dot.vy + (index % 5 === 0 ? -0.0004 : 0.0001)) * drift * 60;
            dot.x = clamp(dot.x, 0.38, 0.67);
            dot.y = clamp(dot.y, 0.22, 0.74);
        });

        if (state.crowdDots.length < 56) {
            state.crowdDots.push(createCrowdDot(Date.now()));
        }
    }

    function updateParkingZones() {
        state.parking.forEach((zone, index) => {
            const pressureShift = state.currentMinute > EVENT_END_MINUTE ? 0.08 : -0.03;
            zone.occupancy = clamp(zone.occupancy + pressureShift + index * 0.005 - (zone.releaseHold ? 0.01 : 0.02), 0.08, 0.98);
        });
    }

    function updateGates() {
        state.gates.forEach((gate, index) => {
            gate.released = index === 0 || index === state.gates.length - 1 || (state.currentMinute > EVENT_END_MINUTE - index * 1.5 && state.crowdControl);
            gate.status = gate.released ? (index === state.gates.length - 1 ? 'vip' : 'released') : 'waiting';
            gate.crowd = Math.max(0, Math.round(state.profile.crowd / (state.gates.length * 1.45) - index * 120 + state.congestion * 40));
            gate.releaseTime = gate.released ? 'Now' : `${Math.max(1, Math.round((state.profile.gateCount - index) * 1.2))} min`;
        });
    }

    function updateTimeline() {
        const totalMinutes = EVENT_END_MINUTE - DEMO_START_MINUTE + 6;
        const ratio = clamp((state.currentMinute - DEMO_START_MINUTE) / totalMinutes, 0, 1);
        el.timelineIndicator.style.left = `${ratio * 100}%`;
        el.timelineIndicator.style.transform = 'translateX(-50%)';
        el.timelineIndicator.style.width = '16px';
    }

    function updateCharts() {
        state.history = buildForecastSeries();
        syncCharts();
    }

    function syncCharts(force = false) {
        if (!state.charts.prediction) return;

        const labels = state.history.map(point => point.label);
        const predicted = state.history.map(point => point.predicted);
        const actual = state.history.map(point => point.actual);
        const exitWave = state.history.map(point => point.exitWave);

        const chart = state.charts.prediction;
        chart.data.labels = labels;
        chart.data.datasets[0].data = predicted;
        chart.data.datasets[1].data = actual;
        chart.data.datasets[2].data = exitWave;
        chart.update(force ? 'none' : undefined);
    }

    function updateAnalytics() {
        const phase = getPhaseLabel();
        const surge = Math.round(state.congestion * 100);
        const pressure = Math.round(state.trafficPressure * 100);
        const efficiencyScore = Math.round(state.efficiency * 100);

        el.eventPhaseHero.textContent = phase;
        el.eventSurgeHero.textContent = `${Math.max(18, Math.round(state.congestion * 100))}%`;
        el.eventEfficiencyHero.textContent = `${efficiencyScore}%`;

        el.eventPhaseChip.textContent = phase.toUpperCase();
        el.trafficPressureLabel.textContent = `${pressure}%`;
        el.congestionLabel.textContent = `${surge}%`;
        el.peakExitLabel.textContent = state.currentMinute < EVENT_END_MINUTE ? `${Math.max(0, Math.round(EVENT_END_MINUTE - state.currentMinute))} min` : 'ACTIVE';
        el.trafficPressureValue.textContent = `${pressure}%`;
        el.peakExitValue.textContent = state.currentMinute < EVENT_END_MINUTE ? `${Math.max(0, Math.round(EVENT_END_MINUTE - state.currentMinute))}m` : 'LIVE';
        el.pressureBar.style.width = `${pressure}%`;
        el.congestionBar.style.width = `${surge}%`;
        el.peakBar.style.width = `${clamp((EVENT_END_MINUTE - state.currentMinute) / 24 * 100, 0, 100)}%`;

        el.totalVehiclesLabel.textContent = state.totalVehicles.toLocaleString();
        el.queueLengthLabel.textContent = state.queueLength.toLocaleString();
        el.avgSpeedLabel.textContent = `${state.avgSpeed.toFixed(0)} km/h`;
        el.throughputLabel.textContent = `${state.throughput.toLocaleString()}/h`;
        el.delayReductionLabel.textContent = `${state.delayReduction}%`;
        el.emissionReductionLabel.textContent = `${state.emissionReduction}%`;
        el.trafficEfficiencyLabel.textContent = efficiencyScore.toString();
        el.efficiencyHint.textContent = phase === 'Post-event dispersal'
            ? 'Outbound prioritization, parking release, and diversion sequencing are active.'
            : 'Predictive smoothing is holding conflicting turns before the surge arrives.';

        const ringAngle = efficiencyScore * 3.6;
        el.efficiencyRing.style.background = `conic-gradient(#00f0ff 0deg ${ringAngle * 0.55}deg, #bf00ff ${ringAngle * 0.55}deg ${ringAngle}deg, rgba(255,255,255,0.05) ${ringAngle}deg 360deg)`;

        state.recommendations = buildRecommendations();

        const routeState = state.diversionOpen ? 'Diversion routes live' : 'Diversion routes closed';
        const corridorState = state.emergencyOverride ? 'Emergency corridor reserved' : 'Emergency corridor ready';
        el.routeOverlay.textContent = routeState;
        el.corridorOverlay.textContent = corridorState;

        syncMetricsToBackend('interval');
    }

    function buildRecommendations() {
        const recommendations = [];

        if (state.currentMinute < EVENT_START_MINUTE) {
            recommendations.push('Increase outbound green timing by 18% before the event closes to stage a clean exit wave.');
            recommendations.push('Hold parking release in Zone B until crowd pressure stabilizes near the gates.');
        } else if (state.currentMinute <= EVENT_END_MINUTE) {
            recommendations.push('Synchronize nearby signals to build a predictive green wave on the stadium perimeter.');
            recommendations.push('Prioritize the outbound corridor and suppress conflicting left turns on market road.');
        } else {
            recommendations.push('Open the temporary one-way loop and accelerate crowd dispersal through Gate A and Gate C.');
            recommendations.push('Release parking in phased waves so spillback does not reach the emergency corridor.');
        }

        if (state.diversionOpen) {
            recommendations.push('Keep diversion routes active until queue length falls below the spillover threshold.');
        }
        if (state.emergencyOverride) {
            recommendations.push('Preserve the emergency corridor and clear all conflicting movements immediately.');
        }
        if (state.vipCorridor) {
            recommendations.push('Maintain VIP corridor priority and isolate guest departure traffic from public exits.');
        }

        return recommendations.slice(0, 4);
    }

    function renderStrategyPanel() {
        const strategies = [
            ['Green Wave Enabled', state.eventActive || state.currentMinute <= EVENT_END_MINUTE, 'active'],
            ['Outbound Priority', state.currentMinute >= EVENT_END_MINUTE - 2 || state.congestion > 0.45, 'active'],
            ['Parking Control', state.crowdControl, state.crowdControl ? 'active' : 'standby'],
            ['Left-Turn Hold', state.oneWayMode || state.congestion > 0.45, 'active'],
            ['Diversion Routes', state.diversionOpen, state.diversionOpen ? 'active' : 'standby'],
            ['Emergency Lane', state.emergencyOverride || state.currentMinute > EVENT_END_MINUTE, state.emergencyOverride ? 'alert' : 'standby']
        ];

        el.strategyList.innerHTML = strategies.map(([label, active, status]) => `
            <div class="strategy-item">
                <strong>${label}</strong>
                <span class="strategy-status ${status}">${active ? 'ACTIVE' : 'STANDBY'}</span>
            </div>
        `).join('');
    }

    function renderGateTable() {
        el.gateTable.innerHTML = state.gates.map((gate, index) => `
            <div class="gate-row" data-gate-index="${index}">
                <div class="gate-row-head">
                    <div>
                        <strong>${gate.name}</strong><br>
                        <small>${gate.crowd.toLocaleString()} crowd</small>
                    </div>
                    <span class="gate-status ${gate.status === 'released' ? 'released' : gate.status === 'vip' ? 'released' : 'waiting'}">${gate.status === 'released' ? 'Released' : gate.status === 'vip' ? 'VIP Exit' : 'Waiting'}</span>
                </div>
                <div class="gate-bar"><span style="width:${clamp((gate.crowd / state.profile.crowd) * 120, 16, 100)}%"></span></div>
                <div class="gate-row-head">
                    <small>Release timing</small>
                    <small>${gate.releaseTime}</small>
                </div>
            </div>
        `).join('');
    }

    function renderParkingList() {
        const occupancyAlert = state.parking.some(zone => zone.occupancy > 0.84);
        document.getElementById('parkingAlertChip').textContent = occupancyAlert ? 'OVERFLOW WATCH' : 'STABLE';
        el.parkingList.innerHTML = state.parking.map((zone, index) => {
            const pct = Math.round(zone.occupancy * 100);
            return `
                <div class="parking-row" data-parking-index="${index}">
                    <div class="parking-row-head">
                        <div>
                            <strong>${zone.name}</strong><br>
                            <small>${zone.capacity.toLocaleString()} spaces</small>
                        </div>
                        <span class="parking-status ${zone.releaseHold ? 'hold' : 'release'}">${zone.releaseHold ? 'Hold' : 'Release'}</span>
                    </div>
                    <div class="parking-bar"><span style="width:${pct}%"></span></div>
                    <div class="parking-row-head">
                        <small>Occupancy</small>
                        <small>${pct}%</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderRecommendations() {
        el.recommendationList.innerHTML = state.recommendations.map(text => `
            <li class="recommendation-item">
                <div class="rec-content">
                    <strong>${text}</strong>
                    <small>${state.profile.label} | ${getPhaseLabel()} | Pressure ${Math.round(state.trafficPressure * 100)}%</small>
                </div>
            </li>
        `).join('');
    }

    function updateFeedPanel() {
        el.aiFeed.innerHTML = state.feeds.slice(0, 4).map(feed => `
            <article class="feed-item">
                <div class="feed-head">
                    <strong>${feed.title}</strong>
                    <small>${feed.time}</small>
                </div>
                <p>${feed.body}</p>
            </article>
        `).join('');
    }

    function syncMetricsToBackend(reason, immediate = false) {
        if (state.backendSyncInFlight || (!immediate && Date.now() - state.backendSyncAt < 10000)) {
            return;
        }

        const payload = {
            reason,
            profileKey: state.profileKey,
            profileLabel: state.profile.label,
            venue: state.profile.venue,
            phase: getPhaseLabel(),
            currentMinute: Number(state.currentMinute.toFixed(2)),
            trafficPressure: Number((state.trafficPressure * 100).toFixed(1)),
            congestion: Number((state.congestion * 100).toFixed(1)),
            efficiency: Number((state.efficiency * 100).toFixed(1)),
            totalVehicles: state.totalVehicles,
            queueLength: state.queueLength,
            avgSpeedKmh: Number(state.avgSpeed.toFixed(1)),
            throughputPerHour: state.throughput,
            delayReduction: state.delayReduction,
            emissionReduction: state.emissionReduction,
            controlFlags: {
                eventActive: state.eventActive,
                emergencyOverride: state.emergencyOverride,
                diversionOpen: state.diversionOpen,
                oneWayMode: state.oneWayMode,
                crowdControl: state.crowdControl,
                vipCorridor: state.vipCorridor
            },
            gateSummary: state.gates.map(gate => ({
                name: gate.name,
                released: gate.released,
                status: gate.status,
                crowd: gate.crowd,
                releaseTime: gate.releaseTime
            })),
            parkingSummary: state.parking.map(zone => ({
                name: zone.name,
                occupancy: Math.round(zone.occupancy * 100),
                releaseHold: zone.releaseHold
            })),
            recommendationCount: state.recommendations.length,
            updatedAt: new Date().toISOString()
        };

        state.backendSyncInFlight = true;
        state.backendSyncAt = Date.now();

        fetch('/api/event-mode/metrics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(() => {
            // The dashboard stays functional even if MongoDB is offline.
        }).finally(() => {
            state.backendSyncInFlight = false;
        });
    }

    function emitFeed(title, body) {
        state.feeds.unshift({ title, body, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        state.feeds = state.feeds.slice(0, 8);
        updateFeedPanel();
    }

    function updateStaticStrategyState() {
        const green = document.getElementById('sigGreenWave');
        const outbound = document.getElementById('sigOutbound');
        const parking = document.getElementById('sigParking');
        green.classList.toggle('active', true);
        outbound.classList.toggle('active', state.currentMinute >= EVENT_END_MINUTE - 2 || state.congestion > 0.45);
        parking.classList.toggle('active', state.crowdControl);
    }

    function updatePhasePills(activePhase) {
        document.querySelectorAll('.phase-pill').forEach(button => {
            button.classList.toggle('active', button.dataset.phase === activePhase);
        });
    }

    function getPhaseLabel() {
        if (state.currentMinute < EVENT_START_MINUTE) return 'Pre-event';
        if (state.currentMinute <= EVENT_END_MINUTE) return 'Live event';
        return 'Post-event dispersal';
    }

    function getPhaseFactor(minute) {
        if (minute < EVENT_START_MINUTE) return 0.42;
        if (minute <= EVENT_END_MINUTE) return 0.88;
        return 1.15;
    }

    function renderMap(timeSeconds) {
        if (!state.ctx) return;

        const canvas = state.canvas;
        const ctx = state.ctx;
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        ctx.clearRect(0, 0, w, h);

        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#050913');
        bg.addColorStop(1, '#0a1221');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        drawGrid(ctx, w, h);
        drawStadium(ctx, w, h);
        drawRoads(ctx, w, h);
        drawParkingZones(ctx, w, h);
        drawHeatmap(ctx, w, h);
        drawRoutes(ctx, w, h, timeSeconds);
        drawCrowdDots(ctx, w, h, timeSeconds);
        drawVehicles(ctx, w, h, timeSeconds);
        drawLabels(ctx, w, h);
    }

    function drawGrid(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = 'rgba(82, 145, 255, 0.16)';
        ctx.lineWidth = 1;
        const step = Math.max(42, Math.round(w / 18));
        for (let x = 0; x < w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawStadium(ctx, w, h) {
        const cx = w * 0.52;
        const cy = h * 0.26;
        const rx = Math.min(w * 0.22, 240);
        const ry = Math.min(h * 0.18, 120);
        const gradient = ctx.createRadialGradient(cx, cy, 20, cx, cy, rx * 1.2);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.24)');
        gradient.addColorStop(0.55, 'rgba(0, 110, 190, 0.14)');
        gradient.addColorStop(1, 'rgba(7, 16, 30, 0.95)');

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.46)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(7, 18, 32, 0.96)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 0.62, ry * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawRoads(ctx, w, h) {
        const lanes = [
            [[w * 0.5, h * 0.42], [w * 0.5, h * 0.9]],
            [[w * 0.28, h * 0.44], [w * 0.78, h * 0.44]],
            [[w * 0.22, h * 0.7], [w * 0.84, h * 0.7]],
            [[w * 0.15, h * 0.18], [w * 0.85, h * 0.18]]
        ];

        ctx.save();
        ctx.lineCap = 'round';
        lanes.forEach(([a, b], index) => {
            ctx.strokeStyle = index === 0 ? 'rgba(0, 240, 255, 0.36)' : 'rgba(99, 146, 255, 0.22)';
            ctx.lineWidth = index === 0 ? 22 : 14;
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            ctx.setLineDash([14, 12]);
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
            ctx.setLineDash([]);
        });
        ctx.restore();
    }

    function drawParkingZones(ctx, w, h) {
        const zones = [
            { x: w * 0.12, y: h * 0.58, w: w * 0.18, h: h * 0.18, color: 'rgba(0, 240, 255, 0.15)' },
            { x: w * 0.72, y: h * 0.56, w: w * 0.16, h: h * 0.18, color: 'rgba(191, 0, 255, 0.16)' },
            { x: w * 0.38, y: h * 0.68, w: w * 0.16, h: h * 0.14, color: 'rgba(255, 187, 0, 0.14)' }
        ];

        ctx.save();
        zones.forEach((zone, index) => {
            const occupancy = state.parking[index] ? state.parking[index].occupancy : 0.5;
            ctx.fillStyle = zone.color;
            ctx.strokeStyle = 'rgba(130, 198, 255, 0.24)';
            ctx.lineWidth = 1.2;
            roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 16, true, true);

            ctx.fillStyle = `rgba(0, 255, 136, ${0.08 + occupancy * 0.18})`;
            ctx.fillRect(zone.x + 6, zone.y + 6, zone.w - 12, zone.h - 12);
        });
        ctx.restore();
    }

    function drawHeatmap(ctx, w, h) {
        const anchors = [
            [w * 0.26, h * 0.68],
            [w * 0.5, h * 0.42],
            [w * 0.76, h * 0.6],
            [w * 0.58, h * 0.78]
        ];
        const pressure = state.trafficPressure;

        ctx.save();
        anchors.forEach(([x, y], index) => {
            const radius = 50 + pressure * 110 + index * 8;
            const gradient = ctx.createRadialGradient(x, y, 8, x, y, radius);
            gradient.addColorStop(0, `rgba(255, 51, 85, ${0.22 + pressure * 0.26})`);
            gradient.addColorStop(0.45, `rgba(255, 187, 0, ${0.12 + pressure * 0.12})`);
            gradient.addColorStop(1, 'rgba(255, 51, 85, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function drawRoutes(ctx, w, h, timeSeconds) {
        const t = (timeSeconds * 0.18) % 1;
        const routes = [
            [[w * 0.32, h * 0.64], [w * 0.5, h * 0.5], [w * 0.76, h * 0.42]],
            [[w * 0.7, h * 0.64], [w * 0.56, h * 0.52], [w * 0.38, h * 0.43]],
            [[w * 0.2, h * 0.72], [w * 0.4, h * 0.66], [w * 0.58, h * 0.5]]
        ];

        ctx.save();
        routes.forEach((route, index) => {
            ctx.strokeStyle = index === 0 ? 'rgba(0, 240, 255, 0.45)' : index === 1 ? 'rgba(255, 187, 0, 0.38)' : 'rgba(191, 0, 255, 0.4)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 14]);
            ctx.lineDashOffset = -timeSeconds * 14;
            ctx.beginPath();
            route.forEach((point, pointIndex) => {
                if (pointIndex === 0) ctx.moveTo(point[0], point[1]);
                else ctx.lineTo(point[0], point[1]);
            });
            ctx.stroke();
            drawArrowPulse(ctx, route, t, index);
        });
        ctx.setLineDash([]);
        ctx.restore();
    }

    function drawArrowPulse(ctx, route, t, index) {
        const sample = polylineSample(route, (t + index * 0.23) % 1);
        ctx.save();
        ctx.fillStyle = index === 0 ? '#00f0ff' : index === 1 ? '#ffbb00' : '#bf00ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawCrowdDots(ctx, w, h, timeSeconds) {
        ctx.save();
        state.crowdDots.forEach((dot, index) => {
            const x = dot.x * w;
            const y = dot.y * h;
            const alpha = 0.32 + (index % 5) * 0.08;
            ctx.fillStyle = dot.type === 'vip' ? `rgba(255, 187, 0, ${alpha})` : `rgba(224, 244, 255, ${alpha})`;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y, dot.type === 'vip' ? 2.8 : 2.1, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function drawVehicles(ctx, w, h, timeSeconds) {
        const routes = [
            [[w * 0.22, h * 0.72], [w * 0.38, h * 0.64], [w * 0.54, h * 0.54], [w * 0.76, h * 0.4]],
            [[w * 0.78, h * 0.72], [w * 0.62, h * 0.58], [w * 0.48, h * 0.47], [w * 0.28, h * 0.42]],
            [[w * 0.16, h * 0.22], [w * 0.36, h * 0.3], [w * 0.56, h * 0.36], [w * 0.8, h * 0.26]],
            [[w * 0.84, h * 0.22], [w * 0.64, h * 0.31], [w * 0.48, h * 0.38], [w * 0.24, h * 0.28]]
        ];

        ctx.save();
        state.vehicles.forEach((vehicle, index) => {
            const route = routes[vehicle.laneIndex % routes.length];
            const sample = polylineSample(route, (vehicle.t + (timeSeconds * 0.005)) % 1);
            const width = 9 + (vehicle.laneIndex === 0 ? 2 : 0);
            const height = 5;
            ctx.save();
            ctx.translate(sample.x, sample.y);
            const angle = Math.atan2(sample.y - route[0][1], sample.x - route[0][0]);
            ctx.rotate(angle);
            ctx.fillStyle = vehicle.tint;
            ctx.shadowColor = vehicle.tint;
            ctx.shadowBlur = 14;
            roundRect(ctx, -width / 2, -height / 2, width, height, 2.6, true, false);
            ctx.fillStyle = 'rgba(255,255,255,0.72)';
            ctx.fillRect(-width / 2 + 1, -1, width - 2, 2);
            ctx.restore();
        });
        ctx.restore();
    }

    function drawLabels(ctx, w, h) {
        ctx.save();
        ctx.font = '12px Orbitron, sans-serif';
        ctx.fillStyle = 'rgba(224, 244, 255, 0.82)';
        ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
        ctx.shadowBlur = 10;
        ctx.fillText(state.profile.venue, w * 0.42, h * 0.18);
        ctx.fillText('Emergency Corridor', w * 0.62, h * 0.72);
        ctx.fillText('Diversion Route', w * 0.16, h * 0.66);
        ctx.restore();
    }

    function setupMapCanvas() {
        state.canvas = el.eventTrafficCanvas;
        state.ctx = state.canvas.getContext('2d');
        resizeCanvas();
    }

    function resizeCanvas() {
        if (!state.canvas) return;
        const rect = state.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        state.mapDpr = dpr;
        state.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        state.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function polylineSample(points, t) {
        const lengths = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const length = distance(points[i], points[i + 1]);
            lengths.push(length);
            total += length;
        }

        let remaining = t * total;
        for (let i = 0; i < points.length - 1; i++) {
            const seg = lengths[i];
            if (remaining <= seg) {
                const ratio = seg === 0 ? 0 : remaining / seg;
                return {
                    x: lerp(points[i][0], points[i + 1][0], ratio),
                    y: lerp(points[i][1], points[i + 1][1], ratio)
                };
            }
            remaining -= seg;
        }
        const last = points[points.length - 1];
        return { x: last[0], y: last[1] };
    }

    function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
            radius = { tl: 0, tr: 0, br: 0, bl: 0, ...radius };
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function distance(a, b) {
        return Math.hypot(b[0] - a[0], b[1] - a[1]);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function gaussian(x, mean, sigma) {
        const exponent = -((x - mean) ** 2) / (2 * sigma ** 2);
        return Math.exp(exponent);
    }

    function noise(seed) {
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function formatMinute(minute) {
        if (minute < 0) return `${Math.abs(Math.round(minute))}m pre`;
        if (minute <= EVENT_END_MINUTE) return `${Math.round(minute)}m`;
        return `${Math.round(minute - EVENT_END_MINUTE)}m post`;
    }

    return {
        init
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', EventModeApp.init);
} else {
    EventModeApp.init();
}