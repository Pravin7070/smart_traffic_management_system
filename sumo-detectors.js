// ===== SUMO TRAFFIC DETECTORS =====
// E1 (induction loop) and E2 (lane area) detector implementations
// Measures vehicle count, speed, occupancy, queue length per approach

const SUMODetectors = (() => {
    // E2 Lane Area Detector data per approach direction
    const e2Data = {
        north: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0 },
        south: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0 },
        east: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0 },
        west: { vehicleCount: 0, queueLength: 0, jamLength: 0, avgSpeed: 0, occupancy: 0, density: 0, vehiclesOnDetector: 0 }
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

            e2Data[dir].vehicleCount = vehicles.length;
            e2Data[dir].queueLength = SUMOVehicles.getQueueLength(dir);
            e2Data[dir].jamLength = stoppedCount;
            e2Data[dir].avgSpeed = count > 0 ? (totalSpeed / count).toFixed(1) : 0;
            e2Data[dir].occupancy = Math.min(100, (count / Math.max(1, E2_LENGTH / 40)) * 100).toFixed(0);
            e2Data[dir].density = count;
            e2Data[dir].vehiclesOnDetector = onDetector;

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
