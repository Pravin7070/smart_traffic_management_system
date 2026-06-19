// ===== SUMO NETWORK MODEL =====
// Defines the road network topology: edges, lanes, junction, and connections
// Modeled after SUMO's .net.xml structure
// Lane positions are calculated precisely for correct vehicle placement

const SUMONetwork = (() => {
    // Road dimensions (pixels)
    const LANE_WIDTH = 40;
    const LANES_PER_DIRECTION = 2; // 2 lanes each way
    const ROAD_WIDTH = LANE_WIDTH * LANES_PER_DIRECTION * 2; // total road width (both directions) = 160
    const HALF_ROAD = ROAD_WIDTH / 2; // 80
    const MEDIAN_WIDTH = 4;

    // Network center (updated on resize)
    let cx = 0, cy = 0;
    let canvasW = 0, canvasH = 0;

    // Edge definitions
    const edges = {};
    const lanes = {};
    const connections = [];

    function init(w, h) {
        canvasW = w;
        canvasH = h;
        cx = w / 2;
        cy = h / 2;
        buildNetwork();
    }

    function buildNetwork() {
        const junctionSize = HALF_ROAD + 10;

        // Junction bounds
        const jx1 = cx - junctionSize;
        const jx2 = cx + junctionSize;
        const jy1 = cy - junctionSize;
        const jy2 = cy + junctionSize;

        // === LANE POSITION REFERENCE (right-hand traffic) ===
        // Vertical road: cx - 80 to cx + 80
        //   Northbound (out): cx-80 to cx  → Lane 0: cx-60, Lane 1: cx-20
        //   Southbound (in from north): cx to cx+80 → Lane 0: cx+20, Lane 1: cx+60
        //
        // Horizontal road: cy - 80 to cy + 80
        //   Eastbound (in from west): cy-80 to cy → Lane 0: cy-60, Lane 1: cy-20 (FIXED: was wrong)
        //   Westbound (in from east): cy to cy+80 → Lane 0: cy+20, Lane 1: cy+60

        // NORTH approach: vehicles come from top, travel south (use right side: cx to cx+80)
        edges.north_in = {
            id: 'north_in', dir: 'north', type: 'in',
            y1: 0, y2: jy1,
            angle: Math.PI / 2, // heading south
            lanes: [
                { id: 'north_in_0', centerX: cx + LANE_WIDTH / 2, speedLimit: 13.89 },         // cx + 20
                { id: 'north_in_1', centerX: cx + LANE_WIDTH + LANE_WIDTH / 2, speedLimit: 13.89 }  // cx + 60
            ]
        };
        edges.north_out = {
            id: 'north_out', dir: 'north', type: 'out',
            y1: jy1, y2: 0,
            angle: -Math.PI / 2
        };

        // SOUTH approach: vehicles come from bottom, travel north (use left side: cx-80 to cx)
        edges.south_in = {
            id: 'south_in', dir: 'south', type: 'in',
            y1: canvasH, y2: jy2,
            angle: -Math.PI / 2,
            lanes: [
                { id: 'south_in_0', centerX: cx - LANE_WIDTH / 2, speedLimit: 13.89 },         // cx - 20
                { id: 'south_in_1', centerX: cx - LANE_WIDTH - LANE_WIDTH / 2, speedLimit: 13.89 }  // cx - 60
            ]
        };
        edges.south_out = {
            id: 'south_out', dir: 'south', type: 'out',
            y1: jy2, y2: canvasH,
            angle: Math.PI / 2
        };

        // EAST approach: vehicles come from right, travel west (use bottom side: cy to cy+80)
        edges.east_in = {
            id: 'east_in', dir: 'east', type: 'in',
            x1: canvasW, x2: jx2,
            angle: Math.PI, // heading west
            lanes: [
                { id: 'east_in_0', centerY: cy + LANE_WIDTH / 2, speedLimit: 13.89 },         // cy + 20
                { id: 'east_in_1', centerY: cy + LANE_WIDTH + LANE_WIDTH / 2, speedLimit: 13.89 }  // cy + 60
            ]
        };
        edges.east_out = {
            id: 'east_out', dir: 'east', type: 'out',
            x1: jx2, x2: canvasW,
            angle: 0
        };

        // WEST approach: vehicles come from left, travel east (use top side: cy-80 to cy)
        edges.west_in = {
            id: 'west_in', dir: 'west', type: 'in',
            x1: 0, x2: jx1,
            angle: 0, // heading east
            lanes: [
                { id: 'west_in_0', centerY: cy - LANE_WIDTH / 2, speedLimit: 13.89 },         // cy - 20
                { id: 'west_in_1', centerY: cy - LANE_WIDTH - LANE_WIDTH / 2, speedLimit: 13.89 }  // cy - 60
            ]
        };
        edges.west_out = {
            id: 'west_out', dir: 'west', type: 'out',
            x1: jx1, x2: 0,
            angle: Math.PI
        };
    }

    // Get the spawn position for a vehicle entering from a given direction
    // Uses the pre-calculated lane center positions for precise placement
    function getSpawnPoint(dir, laneIndex = 0) {
        const edge = edges[dir + '_in'];
        if (!edge) return null;
        const lane = edge.lanes[laneIndex];
        if (!lane) return null;

        if (dir === 'north') {
            // Vehicles enter from top, travel south
            return { x: lane.centerX, y: -30, angle: edge.angle };
        } else if (dir === 'south') {
            // Vehicles enter from bottom, travel north
            return { x: lane.centerX, y: canvasH + 30, angle: edge.angle };
        } else if (dir === 'east') {
            // Vehicles enter from right, travel west
            return { x: canvasW + 30, y: lane.centerY, angle: edge.angle };
        } else if (dir === 'west') {
            // Vehicles enter from left, travel east
            return { x: -30, y: lane.centerY, angle: edge.angle };
        }
    }

    // Get the lane center position for a given direction and lane index
    // This is used to keep vehicles aligned to their lane
    function getLaneCenter(dir, laneIndex) {
        const edge = edges[dir + '_in'];
        if (!edge || !edge.lanes[laneIndex]) return null;
        const lane = edge.lanes[laneIndex];

        if (dir === 'north' || dir === 'south') {
            return lane.centerX;
        } else {
            return lane.centerY;
        }
    }

    // Get the stop line position for a given direction (where vehicles must stop at red)
    function getStopLine(dir) {
        const junctionSize = HALF_ROAD + 10;
        if (dir === 'north') return cy - junctionSize;
        if (dir === 'south') return cy + junctionSize;
        if (dir === 'east') return cx + junctionSize;
        if (dir === 'west') return cx - junctionSize;
    }

    // Get the exit point where vehicles leave the canvas
    function getExitPoint(dir, laneIndex = 0) {
        if (dir === 'north') return { x: cx - LANE_WIDTH / 2, y: -50 };
        if (dir === 'south') return { x: cx + LANE_WIDTH / 2, y: canvasH + 50 };
        if (dir === 'east') return { x: canvasW + 50, y: cy - LANE_WIDTH / 2 };
        if (dir === 'west') return { x: -50, y: cy + LANE_WIDTH / 2 };
    }

    // Get the target lane position for a vehicle turning at the junction
    // Returns {x, y} that the vehicle should aim for when turning
    // The exit road lane depends on which direction the vehicle exits:
    //   - Exiting south (south_out): use north_in lanes (cx+20, cx+60) heading south
    //   - Exiting north (north_out): use south_in lanes (cx-20, cx-60) heading north
    //   - Exiting east (east_out): use west_in lanes (cy-20, cy-60) heading east
    //   - Exiting west (west_out): use east_in lanes (cy+20, cy+60) heading west
    function getExitLanePosition(approachDir, turnIntent) {
        const junctionSize = HALF_ROAD + 10;
        // Map: approach + turn → which outgoing road the vehicle enters
        // north→left=east, north→right=west; south→left=west, south→right=east
        // east→left=south, east→right=north; west→left=north, west→right=south
        const exitMap = {
            north: { left: 'east', right: 'west' },
            south: { left: 'west', right: 'east' },
            east: { left: 'south', right: 'north' },
            west: { left: 'north', right: 'south' }
        };

        if (turnIntent === 'straight') return null;
        const exitDir = exitMap[approachDir][turnIntent];

        // Use lane 0 (inner lane) for the exit road outgoing direction
        // The outgoing lanes are the opposite side of the incoming lanes
        if (exitDir === 'east') {
            // Exiting east: use west_in lane positions (top side of road: cy-20)
            return { x: cx + junctionSize + 30, y: cy - LANE_WIDTH / 2 };
        } else if (exitDir === 'west') {
            // Exiting west: use east_in lane positions (bottom side of road: cy+20)
            return { x: cx - junctionSize - 30, y: cy + LANE_WIDTH / 2 };
        } else if (exitDir === 'south') {
            // Exiting south: use north_in lane positions (right side: cx+20)
            return { x: cx + LANE_WIDTH / 2, y: cy + junctionSize + 30 };
        } else if (exitDir === 'north') {
            // Exiting north: use south_in lane positions (left side: cx-20)
            return { x: cx - LANE_WIDTH / 2, y: cy - junctionSize - 30 };
        }
        return null;
    }

    // Get all lane center positions for a direction (for detector visualization)
    function getLaneCenters(dir) {
        const edge = edges[dir + '_in'];
        if (!edge) return [];
        return edge.lanes.map((lane, i) => ({
            index: i,
            id: lane.id,
            ...(dir === 'north' || dir === 'south'
                ? { x: lane.centerX }
                : { y: lane.centerY })
        }));
    }

    return {
        init,
        edges,
        LANE_WIDTH,
        LANES_PER_DIRECTION,
        ROAD_WIDTH,
        HALF_ROAD,
        MEDIAN_WIDTH,
        get cx() { return cx; },
        get cy() { return cy; },
        get canvasW() { return canvasW; },
        get canvasH() { return canvasH; },
        getSpawnPoint,
        getStopLine,
        getExitPoint,
        getExitLanePosition,
        getLaneCenter,
        getLaneCenters
    };
})();
