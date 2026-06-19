// ===== SUMO TRAFFIC DETECTORS (With Rule 8: DETECTION SMOOTHING) =====
// E1 (induction loop) and E2 (lane area) detector implementations
// Measures vehicle count, speed, occupancy, queue length per approach
// Rule 8: Ignore low confidence detections (< 0.5) + smooth counts using 5-frame average

const SUMODetectors = (() => {
    // ===== RULE 8: DETECTION SMOOTHING BUFFERS =====
    // Store last 5 frames of detection data for smoothing
    const SMOOTHING_WINDOW = 5;  // Average over 5 frames
    const smoothingBuffers = {
        north: { queueLength: [], vehicleCount: [], avgSpeed: [] },
        south: { queueLength: [], vehicleCount: [], avgSpeed: [] },
        east: { queueLength: [], vehicleCount: [], avgSpeed: [] },
        west: { queueLength: [], vehicleCount: [], avgSpeed: [] }
    };

    // E2 Lane Area Detector data per approach direction
    const e2Data = {
        north: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0, confidence: 1.0 },
        south: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0, confidence: 1.0 },
        east: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0, confidence: 1.0 },
        west: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0, confidence: 1.0 }
    };

    // E1 Induction Loop counters (cumulative counts)
    const e1Data = {
        north: { totalCount: 0, lastSpeed: 0, occupancy: 0 },
        south: { totalCount: 0, lastSpeed: 0, occupancy: 0 },
        east: { totalCount: 0, lastSpeed: 0, occupancy: 0 },
        west: { totalCount: 0, lastSpeed: 0, occupancy: 0 }
    };

    // Detector positions (relative to stop line, in pixels upstream)
    const E2_LENGTH = 350; // Length of E2 detector area
    const E1_POSITION = 250; // E1 loop distance from stop line

    // History for graphs
    const densityHistory = { north: [], south: [], east: [], west: [] };
    const throughputHistory = [];
    let lastThroughputCount = 0;
    let throughputTimer = 0;

    // ===== RULE 8: HELPER - Apply Smoothing =====
    function smoothValue(buffer, newValue) {
        buffer.push(newValue);
        if (buffer.length > SMOOTHING_WINDOW) {
            buffer.shift();
        }
        
        // Calculate average, but ignore outliers
        if (buffer.length === 0) return newValue;
        
        const sorted = [...buffer].sort((a, b) => a - b);
        let sum = 0;
        for (let i = 0; i < sorted.length; i++) {
            sum += sorted[i];
        }
        return sum / sorted.length;
    }

    // ===== RULE 8: HELPER - Check Confidence =====
    function getDetectionConfidence(vehicleCount, avgSpeed, stoppedCount) {
        // Stopped queues are valid traffic demand, not sensor noise.
        if (vehicleCount <= 0) return 0.5;
        if (stoppedCount > 0) return 0.9;
        if (avgSpeed <= 0.5) return 0.8;
        if (avgSpeed > 50) return 0.9;
        return 0.85;
    }

    function update(dt) {
        const dirs = ['north', 'south', 'east', 'west'];

        dirs.forEach(dir => {
            const vehicles = SUMOVehicles.getVehiclesByDir(dir);
            const stopLine = SUMONetwork.getStopLine(dir);

            // E2 Lane Area Detector: count vehicles within detector area
            let count = 0;
            let totalSpeed = 0;
            let stoppedCount = 0;
            let onDetector = 0;

            vehicles.forEach(v => {
                let distToStop = 0;
                if (dir === 'north') distToStop = stopLine - v.y;
                else if (dir === 'south') distToStop = v.y - stopLine;
                else if (dir === 'east') distToStop = v.x - stopLine;
                else if (dir === 'west') distToStop = stopLine - v.x;

                // Vehicle is within E2 detector area (upstream of stop line)
                if (distToStop > -50 && distToStop < E2_LENGTH) {
                    count++;
                    totalSpeed += v.speed;
                    onDetector++;
                    if (v.speed < 1) stoppedCount++;
                }
            });

            let avgSpeedRaw = count > 0 ? (totalSpeed / count) : 0;

            // ===== RULE 8: APPLY SMOOTHING =====
            const queueSmoothed = smoothValue(smoothingBuffers[dir].queueLength, stoppedCount);
            const countSmoothed = smoothValue(smoothingBuffers[dir].vehicleCount, count);
            const speedSmoothed = smoothValue(smoothingBuffers[dir].avgSpeed, avgSpeedRaw);

            // ===== RULE 8: CHECK CONFIDENCE =====
            const confidence = getDetectionConfidence(countSmoothed, speedSmoothed, queueSmoothed);
            
            // If confidence < 0.5, mark as unreliable and use conservative values
            const useSmoothed = confidence >= 0.5;

            // Update e2Data with smoothed values
            e2Data[dir].vehicleCount = useSmoothed ? vehicles.length : 0;
            e2Data[dir].queueLength = useSmoothed ? SUMOVehicles.getQueueLength(dir) : 0;
            e2Data[dir].jamLength = useSmoothed ? queueSmoothed : 0;
            e2Data[dir].avgSpeed = useSmoothed ? speedSmoothed.toFixed(1) : 0;
            e2Data[dir].occupancy = useSmoothed ? 
                Math.min(100, (countSmoothed / Math.max(1, E2_LENGTH / 40)) * 100).toFixed(0) : 0;
            e2Data[dir].density = useSmoothed ? countSmoothed : 0;
            e2Data[dir].vehiclesOnDetector = useSmoothed ? onDetector : 0;
            e2Data[dir].confidence = confidence;

            if (!useSmoothed) {
                console.warn(`[RULE 8] Low confidence (${confidence.toFixed(2)}) detection for ${dir}! Using conservative values`);
            }

            // E1 Induction Loop: count passing vehicles
            e1Data[dir].totalCount = SUMOVehicles.totalDeparted;
            e1Data[dir].occupancy = e2Data[dir].occupancy;
        });

        // Update density history (sample every 0.5s)
        if (densityHistory.north.length === 0 || Math.random() < dt * 2) {
            dirs.forEach(dir => {
                densityHistory[dir].push(e2Data[dir].density);
                if (densityHistory[dir].length > 30) densityHistory[dir].shift();
            });
        }

        // Update throughput history (per minute)
        throughputTimer += dt;
        if (throughputTimer >= 5) { // Sample every 5 seconds
            const currentTotal = SUMOVehicles.totalArrived;
            const throughput = currentTotal - lastThroughputCount;
            lastThroughputCount = currentTotal;
            throughputHistory.push(throughput);
            if (throughputHistory.length > 20) throughputHistory.shift();
            throughputTimer = 0;
        }
    }

    // Get detector positions for rendering
    function getDetectorPositions() {
        const positions = [];
        const dirs = ['north', 'south', 'east', 'west'];

        dirs.forEach(dir => {
            const stopLine = SUMONetwork.getStopLine(dir);
            const cx = SUMONetwork.cx;
            const cy = SUMONetwork.cy;

            if (dir === 'north') {
                positions.push({
                    dir, type: 'E2',
                    x: cx + 5, y: stopLine, w: SUMONetwork.LANE_WIDTH * 2 - 10, h: E2_LENGTH,
                    vertical: true
                });
                positions.push({
                    dir, type: 'E1',
                    x: cx + 5, y: stopLine + E1_POSITION, w: SUMONetwork.LANE_WIDTH * 2 - 10, h: 4,
                    vertical: true
                });
            } else if (dir === 'south') {
                positions.push({
                    dir, type: 'E2',
                    x: cx - SUMONetwork.LANE_WIDTH * 2 + 5, y: stopLine - E2_LENGTH, w: SUMONetwork.LANE_WIDTH * 2 - 10, h: E2_LENGTH,
                    vertical: true
                });
                positions.push({
                    dir, type: 'E1',
                    x: cx - SUMONetwork.LANE_WIDTH * 2 + 5, y: stopLine - E1_POSITION, w: SUMONetwork.LANE_WIDTH * 2 - 10, h: 4,
                    vertical: true
                });
            } else if (dir === 'east') {
                positions.push({
                    dir, type: 'E2',
                    x: stopLine, y: cy + 5, w: E2_LENGTH, h: SUMONetwork.LANE_WIDTH * 2 - 10,
                    vertical: false
                });
                positions.push({
                    dir, type: 'E1',
                    x: stopLine + E1_POSITION, y: cy + 5, w: 4, h: SUMONetwork.LANE_WIDTH * 2 - 10,
                    vertical: false
                });
            } else if (dir === 'west') {
                positions.push({
                    dir, type: 'E2',
                    x: stopLine - E2_LENGTH, y: cy - SUMONetwork.LANE_WIDTH * 2 + 5, w: E2_LENGTH, h: SUMONetwork.LANE_WIDTH * 2 - 10,
                    vertical: false
                });
                positions.push({
                    dir, type: 'E1',
                    x: stopLine - E1_POSITION, y: cy - SUMONetwork.LANE_WIDTH * 2 + 5, w: 4, h: SUMONetwork.LANE_WIDTH * 2 - 10,
                    vertical: false
                });
            }
        });

        return positions;
    }

    return {
        e2Data,
        e1Data,
        densityHistory,
        throughputHistory,
        update,
        getDetectorPositions,
        E2_LENGTH,
        E1_POSITION
    };
})();
