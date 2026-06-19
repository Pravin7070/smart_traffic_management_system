// ===== MULTI-INTERSECTION CONTROLLER =====
// Manages 2 intersections with synchronized signal control
// Two intersections side-by-side with coordinated signal timing

const MultiIntersection = (() => {
    const intersections = {
        main: {
            id: 'main',
            offset: { x: 0, y: 0 },
            label: 'MAIN',
            signals: null,
            detectors: null,
            vehicles: [],
            enabled: true
        },
        secondary: {
            id: 'secondary',
            offset: { x: 600, y: 0 },
            label: 'SECONDARY',
            signals: null,
            detectors: null,
            vehicles: [],
            enabled: true
        }
    };

    let syncMode = 'green-wave'; // 'offset', 'alternating', 'green-wave', 'independent'
    let syncOffset = 0; // delay between main and secondary green in seconds
    let masterTime = 0;

    function init() {
        // Initialize signal synchronization
        syncOffset = 3; // 3 second offset between intersections
        resetSync();
    }

    function resetSync() {
        masterTime = 0;
    }

    function updateSync(dt) {
        masterTime += dt;

        // Get current signal states from main intersection
        if (!window.SUMOSignals) return;
        
        const mainPhase = window.SUMOSignals.getCurrentPhase?.();
        const mainGreenDir = window.SUMOSignals.currentGreenDir;
        const mainTimer = window.SUMOSignals.timers;

        if (!mainTimer || !mainGreenDir) return;

        // Apply sync logic based on mode
        switch (syncMode) {
            case 'green-wave':
                // Secondary intersection shows green ~3 seconds AFTER main
                // This creates a "green wave" for traffic flow
                if (mainTimer[mainGreenDir] < syncOffset) {
                    // Main is green, secondary should be red
                    applySecondaryState('red');
                } else if (mainTimer[mainGreenDir] >= syncOffset && mainTimer[mainGreenDir] < syncOffset + 3) {
                    // Secondary starts green after delay
                    applySecondaryState('green');
                }
                break;

            case 'alternating':
                // Main green, then secondary green, alternating
                const minGreen = window.SUMOSignals.config?.minGreen || 8;
                const yellowDur = window.SUMOSignals.config?.yellowDur || 4;
                const cycleTime = (minGreen + yellowDur) * 1.5;
                const phase = (masterTime % (cycleTime * 2)) < cycleTime ? 'main' : 'secondary';
                applySecondaryState(phase === 'secondary' ? 'green' : 'red');
                break;

            case 'offset':
                // Simple offset: secondary lags main by fixed delay
                const elapsed = mainTimer[mainGreenDir] || 0;
                if (elapsed < syncOffset) {
                    applySecondaryState('red');
                } else {
                    applySecondaryState('green');
                }
                break;

            case 'independent':
                // No synchronization - both run independently
                break;
        }
    }

    function applySecondaryState(state) {
        // Apply synchronized state to secondary intersection
        // This is a simplified representation
        if (!intersections.secondary.signals) return;

        const secondaryDir = 'north'; // Example: always sync northbound
        const dirColors = {
            red: 'r',
            yellow: 'y',
            green: 'G'
        };

        // Store sync state for visualization
        intersections.secondary.syncState = state;
    }

    function getIntersectionOffset(id) {
        return intersections[id]?.offset || { x: 0, y: 0 };
    }

    function getIntersectionLabel(id) {
        return intersections[id]?.label || '';
    }

    function isIntersectionEnabled(id) {
        return intersections[id]?.enabled || false;
    }

    function switchSyncMode(mode) {
        const validModes = ['offset', 'alternating', 'green-wave', 'independent'];
        if (validModes.includes(mode)) {
            syncMode = mode;
            console.log(`[MULTI-INTERSECTION] Sync mode changed to: ${mode}`);
            return true;
        }
        return false;
    }

    function setSyncOffset(seconds) {
        syncOffset = Math.max(0, Math.min(10, seconds)); // Clamp 0-10 seconds
        console.log(`[MULTI-INTERSECTION] Sync offset set to: ${syncOffset}s`);
    }

    function getStats() {
        return {
            intersections_active: Object.values(intersections).filter(i => i.enabled).length,
            sync_mode: syncMode,
            sync_offset: syncOffset,
            master_time: masterTime.toFixed(2),
            main_label: intersections.main.label,
            secondary_label: intersections.secondary.label
        };
    }

    function getIntersectionInfo(id) {
        const intersection = intersections[id];
        if (!intersection) return null;

        return {
            id: intersection.id,
            label: intersection.label,
            offset: intersection.offset,
            enabled: intersection.enabled,
            syncState: intersection.syncState || 'unknown'
        };
    }

    return {
        init,
        updateSync,
        resetSync,
        getIntersectionOffset,
        getIntersectionLabel,
        isIntersectionEnabled,
        switchSyncMode,
        setSyncOffset,
        getStats,
        getIntersectionInfo,
        // Direct access for advanced control
        intersections: () => intersections,
        syncMode: () => syncMode,
        masterTime: () => masterTime
    };
})();
