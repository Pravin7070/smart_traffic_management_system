// ===== MANUAL TRAFFIC CONTROL SYSTEM =====
// Allows traffic police operators to manually override automatic AI control
// Provides real-time signal state control for each direction

const ManualControl = (() => {
    let isActive = false;
    let manualMode = false;
    let currentControlledDirection = 'north';
    let selectedSignal = 'green';
    let controlMode = 'AUTO'; // AUTO or MANUAL
    let lastManualInput = 0;
    let lockoutTimer = 0;

    // Manual control states per direction
    const manualStates = {
        north: null,    // null = auto, 'green', 'yellow', 'red'
        south: null,
        east: null,
        west: null
    };

    // Signal timing lockout to prevent frequent changes
    const LOCKOUT_TIME = 0.5; // seconds

    const directionPhaseMap = {
        north: 'Grrr',
        south: 'rGrr',
        east: 'rrGr',
        west: 'rrrG'
    };

    function init() {
        bindUiControls();
        refreshUi();

        // Keyboard shortcuts for manual override
        document.addEventListener('keydown', (e) => {
            if (!isActive) return;

            // Direction selection: N, S, E, W
            if (e.code === 'KeyN') selectDirection('north');
            else if (e.code === 'KeyA') selectDirection('south');
            else if (e.code === 'KeyD') selectDirection('east');
            else if (e.code === 'KeyW') selectDirection('west');
            // Signal state: 1=GREEN, 2=YELLOW, 3=RED
            else if (e.code === 'Digit1' && currentControlledDirection) setSignalState('green');
            else if (e.code === 'Digit2' && currentControlledDirection) setSignalState('yellow');
            else if (e.code === 'Digit3' && currentControlledDirection) setSignalState('red');
        });
    }

    function bindUiControls() {
        document.querySelectorAll('.btn-dir').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                selectDirection(dir);
            });
        });

        document.querySelectorAll('.btn-signal').forEach(btn => {
            btn.addEventListener('click', () => {
                const state = btn.dataset.state;
                setSignalState(state);
            });
        });

        const btnAuto = document.getElementById('btnAutoMode');
        if (btnAuto) {
            btnAuto.addEventListener('click', () => {
                setAutoMode();
            });
        }
    }

    function logManualState() {
        console.log('Manual Mode:', manualMode);
        console.log('Direction:', currentControlledDirection);
        console.log('Signal:', selectedSignal);
    }

    function activate() {
        if (manualMode) return;
        isActive = true;
        manualMode = true;
        controlMode = 'MANUAL';
        applyCurrentSelection();
        refreshUi();
        logManualState();
        console.log('[MANUAL CONTROL] Activated');
    }

    function deactivate() {
        if (!isActive && !manualMode) return;
        isActive = false;
        manualMode = false;
        controlMode = 'AUTO';
        clearAllManualStates();
        refreshUi();
        logManualState();
        console.log('[MANUAL CONTROL] Deactivated');
    }

    function setAutoMode() {
        deactivate();
    }

    function toggle() {
        if (manualMode) deactivate();
        else activate();
        return manualMode;
    }

    function selectDirection(dir) {
        if (!['north', 'south', 'east', 'west'].includes(dir)) return;

        if (!manualMode) activate();
        currentControlledDirection = dir;
        refreshUi();
        logManualState();
        console.log(`[MANUAL] Selected direction: ${dir.toUpperCase()}`);
    }

    function setSignalState(state) {
        if (!['green', 'yellow', 'red'].includes(state)) return;

        if (!manualMode) activate();
        if (!currentControlledDirection) currentControlledDirection = 'north';

        selectedSignal = state;
        applyCurrentSelection();
        if (typeof window.updateSignalState === 'function') {
            window.updateSignalState(currentControlledDirection, state);
        }
        lockoutTimer = LOCKOUT_TIME;
        lastManualInput = Date.now();

        refreshUi();
        logManualState();
        console.log(`[MANUAL] ${currentControlledDirection.toUpperCase()} → ${state.toUpperCase()}`);
    }

    function setDirectionState(direction, state, bypassLockout = false) {
        if (!manualMode) activate();
        if (!['north', 'south', 'east', 'west'].includes(direction)) return;
        if (!['green', 'yellow', 'red'].includes(state)) return;
        if (!bypassLockout && lockoutTimer > 0) return;

        manualStates[direction] = state;
        lockoutTimer = LOCKOUT_TIME;
        lastManualInput = Date.now();
    }

    function applyCurrentSelection() {
        clearAllManualStates();
        if (!currentControlledDirection) currentControlledDirection = 'north';

        if (selectedSignal === 'green') {
            setDirectionState(currentControlledDirection, 'green', true);
        } else if (selectedSignal === 'yellow') {
            setDirectionState(currentControlledDirection, 'yellow', true);
        } else {
            setDirectionState(currentControlledDirection, 'red', true);
        }
    }

    function getCurrentStateString() {
        if (!manualMode || !currentControlledDirection) return 'rrrr';
        if (selectedSignal === 'green') return directionPhaseMap[currentControlledDirection] || 'rrrr';
        if (selectedSignal === 'yellow') {
            const map = { north: 'yrrr', south: 'ryrr', east: 'rryr', west: 'rrry' };
            return map[currentControlledDirection] || 'rrrr';
        }
        return 'rrrr';
    }

    function refreshUi() {
        const modeDisplay = document.getElementById('modeDisplay');
        if (modeDisplay) {
            modeDisplay.textContent = manualMode ? 'MANUAL' : 'AUTO';
            modeDisplay.classList.toggle('manual-active', manualMode);
        }

        document.querySelectorAll('.btn-dir').forEach(btn => {
            const isSelected = manualMode && btn.dataset.dir === currentControlledDirection;
            btn.classList.toggle('active', isSelected);
        });

        document.querySelectorAll('.btn-signal').forEach(btn => {
            const isSelected = manualMode && btn.dataset.state === selectedSignal;
            btn.classList.toggle('active', isSelected);
        });
    }

    function clearAllManualStates() {
        manualStates.north = null;
        manualStates.south = null;
        manualStates.east = null;
        manualStates.west = null;
    }

    function getManualState(direction) {
        return manualStates[direction] || null;
    }

    function hasManualOverride(direction) {
        return manualStates[direction] !== null;
    }

    function update(dt) {
        if (lockoutTimer > 0) {
            lockoutTimer -= dt;
        }
    }

    function getStats() {
        return {
            isActive: isActive,
            mode: controlMode,
            currentDirection: currentControlledDirection,
            states: { ...manualStates },
            hasActiveControl: Object.values(manualStates).some(s => s !== null)
        };
    }

    // Quick action: set direction to green
    function quickSetGreen(direction) {
        if (!manualMode) activate();
        selectDirection(direction);
        setSignalState('green');
    }

    // Quick action: clear all lanes (all to red except target)
    function quickClearLane(direction) {
        if (!manualMode) activate();
        selectDirection(direction);
        selectedSignal = 'green';
        applyCurrentSelection();
        refreshUi();
        logManualState();
    }

    return {
        init: init,
        activate: activate,
        deactivate: deactivate,
        setAutoMode: setAutoMode,
        toggle: toggle,
        selectDirection: selectDirection,
        setSignalState: setSignalState,
        clearAllManualStates: clearAllManualStates,
        getManualState: getManualState,
        hasManualOverride: hasManualOverride,
        getCurrentStateString: getCurrentStateString,
        getSelectedDirection: () => currentControlledDirection,
        getSelectedSignal: () => selectedSignal,
        update: update,
        getStats: getStats,
        quickSetGreen: quickSetGreen,
        quickClearLane: quickClearLane,
        get isActive() { return isActive; },
        get manualMode() { return manualMode; },
        get mode() { return controlMode; }
    };
})();
