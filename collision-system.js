// ===== DEDICATED COLLISION PREVENTION SYSTEM =====
// Independent collision detection and prevention
// Runs AFTER vehicles are moved to prevent any overlaps

const CollisionSystem = (() => {
    // Physics-based collision detection and resolution
    
    function getVehicleRadius(vehicle) {
        return Math.max(vehicle.length / 2, vehicle.width / 2) + 5;
    }
    
    function getSafeDistance(v1, v2) {
        // Minimum safe distance between two vehicles
        const radius1 = getVehicleRadius(v1);
        const radius2 = getVehicleRadius(v2);
        return (radius1 + radius2) * 1.5; // 50% safety buffer
    }
    
    function getDistance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function checkAndSeparate(v1, v2) {
        const dist = getDistance(v1, v2);
        const safeDistance = getSafeDistance(v1, v2);
        
        if (dist < safeDistance && dist > 0.1) {
            // Collision detected - push apart
            const dx = v1.x - v2.x;
            const dy = v1.y - v2.y;
            const nx = dx / dist;
            const ny = dy / dist;
            
            const overlap = safeDistance - dist;
            const push = overlap * 0.6;
            
            // Push both vehicles apart
            v1.x += nx * push;
            v1.y += ny * push;
            v2.x -= nx * push;
            v2.y -= ny * push;
            
            // STOP both vehicles
            v1.speed = 0;
            v2.speed = 0;
            v1.stopped = true;
            v2.stopped = true;
            
            return true;
        }
        return false;
    }
    
    function preventCollisions(vehicles) {
        for (let i = 0; i < vehicles.length; i++) {
            const v1 = vehicles[i];
            if (!v1.active) continue;
            
            for (let j = i + 1; j < vehicles.length; j++) {
                const v2 = vehicles[j];
                if (!v2.active) continue;
                
                checkAndSeparate(v1, v2);
            }
        }
    }
    
    function enforceMinimumGaps(vehicles) {
        // Force vehicles to maintain minimum gaps before they move
        for (let i = 0; i < vehicles.length; i++) {
            const vehicle = vehicles[i];
            if (!vehicle.active) continue;
            
            let hasBlockage = false;
            
            // Check if there's an obstacle ahead
            for (const other of vehicles) {
                if (other.id === vehicle.id || !other.active) continue;
                
                // Calculate forward distance
                const cosA = Math.cos(vehicle.angle);
                const sinA = Math.sin(vehicle.angle);
                const dx = other.x - vehicle.x;
                const dy = other.y - vehicle.y;
                
                const forwardDist = dx * cosA + dy * sinA;
                const lateralDist = Math.abs(-dx * sinA + dy * cosA);
                
                // Check if other vehicle is ahead and nearby
                if (forwardDist > 0 && forwardDist < 100 && lateralDist < 50) {
                    const minGap = vehicle.minGap + other.length / 2;
                    if (forwardDist < minGap + vehicle.length / 2) {
                        vehicle.speed = 0;
                        vehicle.stopped = true;
                        hasBlockage = true;
                        break;
                    }
                }
            }
        }
    }
    
    return {
        preventCollisions: preventCollisions,
        enforceMinimumGaps: enforceMinimumGaps,
        checkAndSeparate: checkAndSeparate
    };
})();
