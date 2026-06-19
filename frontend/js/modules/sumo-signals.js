// ===== SMART AI TRAFFIC LIGHT SYSTEM =====
// Fully demand-driven: NO fixed order. Always gives green to the BUSIEST direction.
// Skips directions with zero vehicles automatically.

const SUMOSignals = (() => {
    // Phase templates for each direction
    // Order: N-straight, N-left, S-straight, S-left, E-straight, E-left, W-straight, W-left
    const dirPhases = {
        north: { green: 'GGrrrrrr', yellow: 'yyrrrrrr' },
        east: { green: 'rrrrGGrr', yellow: 'rrrryyrr' },
        south: { green: 'rrGGrrrr', yellow: 'rryyrrrr' },
        west: { green: 'rrrrrrGG', yellow: 'rrrrrryy' }
    };

    // Timing parameters
    const config = {
        minGreen: 8,     // minimum green time (seconds)
        maxGreen: 30,    // maximum green time (seconds)
        yellowDur: 4,    // yellow phase duration (seconds) — longer for safe stopping
        maxGap: 2.5,     // seconds — if no vehicle for this long after minGreen, switch
        allRedDur: 3,    // minimum all-red clearance time (seconds)
        maxAllRedDur: 12 // maximum all-red wait (hard cap to prevent deadlock)
    };

    // Actuated control parameters (for dashboard display)
    const actuatedParams = {
        maxGap: config.maxGap,
        detGap: 2.0,
        showDetectors: true
    };

    // Current state
    let currentGreenDir = 'north';   // which direction currently has green
    let currentState = 'green';       // 'green', 'yellow', 'allred'
    let phaseTimer = 0;
    let greenExtended = false;
    let lastGreenDir = null;          // prevents giving same direction green twice in a row
    let emergencyActive = false;
    let emergencyDir = null;
    let emergencyTimer = 0;
    let manualAllRedTimer = 0;

    // Signal states per direction: 'green', 'yellow', 'red'
    const signalStates = {
        north: 'green',
        south: 'red',
        east: 'red',
        west: 'red'
    };

    // Countdown timers per direction (for display)
    const timers = {
        north: 30,
        south: 30,
        east: 30,
        west: 30
    };

    // Build the phases array for dashboard compatibility
    const phases = [
        { state: 'GGrrrrrr', minDur: config.minGreen, maxDur: config.maxGreen, name: 'N Green' },
        { state: 'yyrrrrrr', minDur: config.yellowDur, maxDur: config.yellowDur, name: 'N Yellow' },
        { state: 'rrrrGGrr', minDur: config.minGreen, maxDur: config.maxGreen, name: 'E Green' },
        { state: 'rrrryyrr', minDur: config.yellowDur, maxDur: config.yellowDur, name: 'E Yellow' },
        { state: 'rrGGrrrr', minDur: config.minGreen, maxDur: config.maxGreen, name: 'S Green' },
        { state: 'rryyrrrr', minDur: config.yellowDur, maxDur: config.yellowDur, name: 'S Yellow' },
        { state: 'rrrrrrGG', minDur: config.minGreen, maxDur: config.maxGreen, name: 'W Green' },
        { state: 'rrrrrryy', minDur: config.yellowDur, maxDur: config.yellowDur, name: 'W Yellow' }
    ];

    // Map direction to phase index for dashboard
    const dirToPhaseIndex = { north: 0, east: 2, south: 4, west: 6 };
    let currentPhaseIndex = 0;

    const manualDirectionStateMap = {
        north: 'Grrr',
        south: 'rGrr',
        east: 'rrGr',
        west: 'rrrG'
    };

    function getCurrentPhase() {
        return phases[currentPhaseIndex];
    }

    function parsePhaseState(stateStr) {
        const map = { 'G': 'green', 'g': 'green', 'y': 'yellow', 'r': 'red' };
        if (stateStr.length === 4) {
            return {
                north: map[stateStr[0]] || 'red',
                south: map[stateStr[1]] || 'red',
                east: map[stateStr[2]] || 'red',
                west: map[stateStr[3]] || 'red'
            };
        }
        return {
            north: map[stateStr[0]] || 'red',
            south: map[stateStr[2]] || 'red',
            east: map[stateStr[4]] || 'red',
            west: map[stateStr[6]] || 'red'
        };
    }

    function updateSignalState(direction, color) {
        setManualOverride(direction, color);
    }

    function applyManualControl(direction, signal, dt = 0.016) {
        if (!['north', 'south', 'east', 'west'].includes(direction)) return;
        if (!['green', 'yellow', 'red'].includes(signal)) return;

        if (signal === 'green') {
            const state = parsePhaseState(manualDirectionStateMap[direction]);
            signalStates.north = state.north;
            signalStates.south = state.south;
            signalStates.east = state.east;
            signalStates.west = state.west;
            currentGreenDir = direction;
            currentState = 'green';
            manualAllRedTimer = 0;
        } else {
            ['north', 'south', 'east', 'west'].forEach(dir => {
                signalStates[dir] = dir === direction ? signal : 'red';
            });

            const allRed = Object.values(signalStates).every(s => s === 'red');
            if (allRed) {
                manualAllRedTimer += dt;
                if (manualAllRedTimer > 5) {
                    const fallbackState = parsePhaseState(manualDirectionStateMap.north);
                    signalStates.north = fallbackState.north;
                    signalStates.south = fallbackState.south;
                    signalStates.east = fallbackState.east;
                    signalStates.west = fallbackState.west;
                    currentGreenDir = 'north';
                    currentState = 'green';
                    manualAllRedTimer = 0;
                }
            } else {
                manualAllRedTimer = 0;
            }
        }

        timers.north = signalStates.north === 'green' ? 99 : '--';
        timers.south = signalStates.south === 'green' ? 99 : '--';
        timers.east = signalStates.east === 'green' ? 99 : '--';
        timers.west = signalStates.west === 'green' ? 99 : '--';
    }

    // ===== CORE: Find the direction with the MOST vehicles =====
    function findBusiestDirection(detectorData, excludeDir) {
        const dirs = ['north', 'east', 'south', 'west'];
        let bestDir = null;
        let bestScore = 0;

        for (const dir of dirs) {
            // Skip the direction we want to exclude (just finished green)
            if (dir === excludeDir) continue;

            let score = 0;
            if (detectorData && detectorData[dir]) {
                const d = detectorData[dir];
                // Primary: queue length. Secondary: vehicle count. Tertiary: waiting time
                score = (Number(d.queueLength) || 0) * 2 + (Number(d.vehicleCount) || 0) + (Number(d.vehiclesOnDetector) || 0) * 0.5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestDir = dir;
            }
        }

        return { dir: bestDir, score: bestScore };
    }

    function hasDemand(data) {
        if (!data) return false;
        const queue = Number(data.queueLength) || 0;
        const count = Number(data.vehicleCount) || 0;
        const onDetector = Number(data.vehiclesOnDetector) || 0;
        return queue > 0 || count > 0 || onDetector > 0;
    }

    // ===== MAIN UPDATE =====
    function update(dt, detectorData) {
        if (emergencyActive) {
            updateEmergency(dt);
            return;
        }

        phaseTimer += dt;

        if (currentState === 'green') {
            // === GREEN PHASE ===
            updateGreenPhase(dt, detectorData);
        } else if (currentState === 'yellow') {
            // === YELLOW PHASE ===
            updateYellowPhase(dt, detectorData);
        } else if (currentState === 'allred') {
            // === ALL-RED CLEARANCE ===
            updateAllRedPhase(dt, detectorData);
        }

        // Update display timers
        updateTimers(detectorData);
    }

    function updateGreenPhase(dt, detectorData) {
        // Set signal states: current direction green, all others red
        const dirs = ['north', 'south', 'east', 'west'];
        dirs.forEach(d => {
            signalStates[d] = (d === currentGreenDir) ? 'green' : 'red';
        });

        // Update phase index for dashboard
        currentPhaseIndex = dirToPhaseIndex[currentGreenDir];

        // Check if we should end this green phase
        let shouldSwitch = false;

        // 1. Max green time reached — MUST switch
        if (phaseTimer >= config.maxGreen) {
            shouldSwitch = true;
        }
        // 2. After minimum green: check if current direction still has vehicles
        else if (phaseTimer >= config.minGreen) {
            const hasVehicles = detectorData && hasDemand(detectorData[currentGreenDir]);

            if (!hasVehicles) {
                // No more vehicles on current green — switch after gap time
                if (phaseTimer >= config.minGreen + config.maxGap) {
                    shouldSwitch = true;
                }
            }

            // Also check: is another direction much busier?
            const busiest = findBusiestDirection(detectorData, currentGreenDir);
            const currentQueue = (detectorData && detectorData[currentGreenDir]) ?
                (Number(detectorData[currentGreenDir].queueLength) || 0) : 0;

            // If another direction is significantly busier, switch early.
            // Lower threshold avoids starvation under sustained queues.
            if (busiest.score > 0 && busiest.score > Math.max(2, currentQueue * 1.8) && phaseTimer >= config.minGreen) {
                shouldSwitch = true;
            }
        }

        if (shouldSwitch) {
            // Transition to yellow
            currentState = 'yellow';
            phaseTimer = 0;
            lastGreenDir = currentGreenDir;

            // Set yellow signal
            signalStates[currentGreenDir] = 'yellow';
            currentPhaseIndex = dirToPhaseIndex[currentGreenDir] + 1; // yellow phase index
        }
    }

    function updateYellowPhase(dt, detectorData) {
        // Keep yellow for this direction, red for all others
        const dirs = ['north', 'south', 'east', 'west'];
        dirs.forEach(d => {
            signalStates[d] = (d === currentGreenDir) ? 'yellow' : 'red';
        });

        if (phaseTimer >= config.yellowDur) {
            // Yellow done — brief all-red, then pick next direction
            currentState = 'allred';
            phaseTimer = 0;

            // All red
            dirs.forEach(d => { signalStates[d] = 'red'; });
        }
    }

    function updateAllRedPhase(dt, detectorData) {
        // All red clearance
        const dirs = ['north', 'south', 'east', 'west'];
        dirs.forEach(d => { signalStates[d] = 'red'; });

        // Wait for minimum all-red clearance time
        if (phaseTimer < config.allRedDur) return;

        // STRICT JUNCTION CLEARANCE: Don't switch to green until
        // ALL vehicles have physically left the junction area
        const junctionClear = isJunctionEmpty();
        const maxWaitExceeded = phaseTimer >= config.maxAllRedDur;

        if (!junctionClear && !maxWaitExceeded) {
            // Vehicles still in junction — keep waiting
            return;
        }

        // === SMART DECISION: Pick the BUSIEST direction ===
        // Exclude the direction that just had green — give others a fair chance
        const busiest = findBusiestDirection(detectorData, lastGreenDir);

        if (busiest.dir && busiest.score > 0) {
            // Give green to the busiest direction (excluding last one)
            currentGreenDir = busiest.dir;
        } else {
            // All OTHER directions are empty — check if last green dir still has vehicles
            const lastDirHasVehicles = lastGreenDir && detectorData && detectorData[lastGreenDir] &&
                (detectorData[lastGreenDir].queueLength > 0 || detectorData[lastGreenDir].vehicleCount > 0);

            if (lastDirHasVehicles) {
                // Only the last direction has vehicles — give it green again
                currentGreenDir = lastGreenDir;
            } else {
                // No vehicles anywhere — pick next in round-robin
                const order = ['north', 'east', 'south', 'west'];
                const currentIdx = order.indexOf(lastGreenDir || 'west');
                currentGreenDir = order[(currentIdx + 1) % 4];
            }
        }

        currentState = 'green';
        phaseTimer = 0;
        currentPhaseIndex = dirToPhaseIndex[currentGreenDir];
    }

    // Check if ANY vehicle is physically inside the junction area
    // This is a STRICT check — uses actual position, not flags
    function isJunctionEmpty() {
        const cx = SUMONetwork.cx;
        const cy = SUMONetwork.cy;
        const jSize = SUMONetwork.HALF_ROAD + 15;

        for (const v of SUMOVehicles.vehicles) {
            if (!v.active) continue;
            if (v.type.id === 'emergency') continue; // Ignore ambulance

            // Check if vehicle center is inside the junction box
            if (v.x > cx - jSize && v.x < cx + jSize &&
                v.y > cy - jSize && v.y < cy + jSize) {
                return false; // Junction is NOT empty
            }
        }
        return true; // Junction is clear
    }

    // Legacy function kept for compatibility
    function isJunctionClearOfDir(dir) {
        return isJunctionEmpty();
    }

    function updateTimers(detectorData) {
        const dirs = ['north', 'south', 'east', 'west'];
        dirs.forEach(d => {
            if (signalStates[d] === 'green') {
                timers[d] = Math.max(0, Math.ceil(config.maxGreen - phaseTimer));
            } else if (signalStates[d] === 'yellow') {
                timers[d] = Math.max(0, Math.ceil(config.yellowDur - phaseTimer));
            } else {
                // Show estimated wait — just show a dash concept via number
                timers[d] = '--';
            }
        });
    }

    function getActiveGreenDirections(stateStr) {
        const dirs = [];
        if (stateStr[0] === 'G') dirs.push('north');
        if (stateStr[2] === 'G') dirs.push('south');
        if (stateStr[4] === 'G') dirs.push('east');
        if (stateStr[6] === 'G') dirs.push('west');
        return dirs;
    }

    // Emergency vehicle preemption
    // Give green to ambulance direction AND opposite direction (same road, no conflict)
    // Cross-traffic gets red
    function activateEmergency(dir) {
        emergencyActive = true;
        emergencyDir = dir;
        const oppositeMap = { north: 'south', south: 'north', east: 'west', west: 'east' };
        const oppositeDirection = oppositeMap[dir];
        const dirs = ['north', 'south', 'east', 'west'];
        dirs.forEach(d => {
            // Green for ambulance direction AND opposite direction (same road, other side)
            signalStates[d] = (d === dir || d === oppositeDirection) ? 'green' : 'red';
            timers[d] = (d === dir || d === oppositeDirection) ? 99 : 99;
        });
    }

    function deactivateEmergency() {
        emergencyActive = false;
        emergencyDir = null;
        emergencyTimer = 0;
        // Go to all-red for clearance, then normal logic picks next green
        currentState = 'allred';
        phaseTimer = 0;
        // Set all signals to red for clearance
        const dirs = ['north', 'south', 'east', 'west'];
        dirs.forEach(d => {
            signalStates[d] = 'red';
            timers[d] = '--';
        });
    }

    function updateEmergency(dt) {
        emergencyTimer += dt;
        // Failsafe: max 8s emergency (ambulance should clear junction much faster)
        if (emergencyTimer > 8) {
            emergencyTimer = 0;
            deactivateEmergency();
        }
    }

    function setManualOverride(direction, state) {
        if (!['north', 'south', 'east', 'west'].includes(direction)) return;
        if (!['green', 'yellow', 'red'].includes(state)) return;

        signalStates[direction] = state;
        // For other directions, set to red if not specified
        ['north', 'south', 'east', 'west'].forEach(dir => {
            if (dir !== direction && state === 'green') {
                signalStates[dir] = 'red';
            }
        });
        if (Object.values(signalStates).every(s => s === 'red')) {
            manualAllRedTimer = 0;
        }
    }

    return {
        phases,
        actuatedParams,
        signalStates,
        timers,
        update,
        applyManualControl,
        updateSignalState,
        getCurrentPhase,
        activateEmergency,
        deactivateEmergency,
        setManualOverride,
        get currentPhaseIndex() { return currentPhaseIndex; },
        get currentGreenDir() { return currentGreenDir; },
        get currentState() { return currentState; },
        get emergencyActive() { return emergencyActive; },
        get emergencyDir() { return emergencyDir; }
    };
})();
