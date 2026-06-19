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
        return (radius1 + radius2) * 1.1;
    }

    function isPotentialConflict(v1, v2) {
        if (v1.dir === v2.dir && v1.lane === v2.lane) return true;
        if (v1.inJunction || v2.inJunction || v1.exiting || v2.exiting) return true;
        if (v1.type?.id === 'emergency' || v2.type?.id === 'emergency') return true;
        return false;
    }
    
    function getDistance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function checkAndSeparate(v1, v2) {
        if (!isPotentialConflict(v1, v2)) return false;

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
            
            // Hard stop only for severe overlap; otherwise reduce speed and allow recovery.
            if (dist < safeDistance * 0.6) {
                v1.speed = 0;
                v2.speed = 0;
                v1.stopped = true;
                v2.stopped = true;
            } else {
                v1.speed *= 0.6;
                v2.speed *= 0.6;
            }
            
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
        // Only stop if there's a REAL obstacle directly ahead on same lane
        for (let i = 0; i < vehicles.length; i++) {
            const vehicle = vehicles[i];
            if (!vehicle.active) continue;
            
            let shouldStop = false;
            
            // Only check vehicles in SAME direction and SAME lane
            for (const other of vehicles) {
                if (other.id === vehicle.id || !other.active) continue;
                
                // STRICT: Must be same direction
                if (other.dir !== vehicle.dir) continue;
                
                // STRICT: Must be same lane
                if (other.lane !== vehicle.lane) continue;
                
                // Calculate distance on the road (simple forward distance)
                let forwardDist = 0;
                if (vehicle.dir === 'north') forwardDist = other.y - vehicle.y;
                else if (vehicle.dir === 'south') forwardDist = vehicle.y - other.y;
                else if (vehicle.dir === 'east') forwardDist = vehicle.x - other.x;
                else if (vehicle.dir === 'west') forwardDist = other.x - vehicle.x;
                
                // Only care about vehicles ahead (positive distance)
                if (forwardDist <= 0) continue;
                
                // Check if too close to vehicle ahead
                const minGap = vehicle.minGap + other.length / 2;
                const safeDistance = minGap + vehicle.length / 2;
                
                // Only stop if dangerously close (within 40px)
                if (forwardDist < safeDistance) {
                    shouldStop = true;
                    break;
                }
            }
            
            if (shouldStop) {
                if (vehicle.speed > 0.8) {
                    vehicle.speed *= 0.45;
                } else {
                    vehicle.speed = 0;
                    vehicle.stopped = true;
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
