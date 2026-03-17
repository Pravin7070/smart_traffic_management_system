// ===== SUMO VEHICLE SIMULATION =====
// Implements Krauss car-following model, turning logic, and vehicle management
// With junction flow control: only 2 vehicles per direction in junction at once

const SUMOVehicles = (() => {
    const vTypes = {
        car: { id: 'car', label: 'CAR', length: 28, width: 16, accel: 2.6, decel: 4.5, maxSpeed: 13.89, minGap: 50, sigma: 0.3, color: '#3b82f6', yoloColor: '#00ff88', probability: 0.5 },
        bus: { id: 'bus', label: 'BUS', length: 55, width: 20, accel: 1.2, decel: 4.0, maxSpeed: 11.11, minGap: 70, sigma: 0.2, color: '#f59e0b', yoloColor: '#ffbb00', probability: 0.12 },
        truck: { id: 'truck', label: 'TRUCK', length: 48, width: 20, accel: 1.0, decel: 3.5, maxSpeed: 10.0, minGap: 70, sigma: 0.2, color: '#ef4444', yoloColor: '#ff3355', probability: 0.13 },
        bike: { id: 'bike', label: 'BIKE', length: 16, width: 10, accel: 3.5, decel: 5.0, maxSpeed: 8.33, minGap: 35, sigma: 0.3, color: '#a855f7', yoloColor: '#bf00ff', probability: 0.15 },
        emergency: { id: 'emergency', label: 'AMBULANCE', length: 36, width: 18, accel: 3.0, decel: 5.0, maxSpeed: 16.67, minGap: 45, sigma: 0.1, color: '#ff0044', yoloColor: '#ff0044', probability: 0 }
    };

    const turnAngles = {
        north: { straight: Math.PI / 2, left: 0, right: Math.PI },
        south: { straight: -Math.PI / 2, left: Math.PI, right: 0 },
        east: { straight: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 },
        west: { straight: 0, left: -Math.PI / 2, right: Math.PI / 2 }
    };

    const vehicles = [];
    let nextId = 0;
    let totalDeparted = 0;
    let totalArrived = 0;
    const directions = ['north', 'south', 'east', 'west'];
    const SPEED_SCALE = 1.8;

    // Max vehicles from ONE direction allowed in junction at once
    const MAX_IN_JUNCTION_PER_DIR = 2;

    function selectVType() {
        const r = Math.random();
        let cumulative = 0;
        for (const vt of Object.values(vTypes)) {
            cumulative += vt.probability;
            if (r <= cumulative) return vt;
        }
        return vTypes.car;
    }

    function isSpawnClear(dir, lane, spawnX, spawnY, vehicleLength) {
        // Very large clearance to prevent overlaps at spawn
        const requiredClearance = vehicleLength + 120;
        for (const v of vehicles) {
            if (!v.active || v.dir !== dir) continue;
            // Check same lane strictly
            if (v.lane === lane) {
                if (dir === 'north' || dir === 'south') {
                    if (Math.abs(v.y - spawnY) < requiredClearance) return false;
                } else {
                    if (Math.abs(v.x - spawnX) < requiredClearance) return false;
                }
            }
            // Also check adjacent lanes for lateral safety
            if (Math.abs(v.lane - lane) === 1) {
                const lateralBuffer = 35;
                if (dir === 'north' || dir === 'south') {
                    if (Math.abs(v.y - spawnY) < requiredClearance * 0.7) return false;
                } else {
                    if (Math.abs(v.x - spawnX) < requiredClearance * 0.7) return false;
                }
            }
        }
        return true;
    }

    function spawnVehicle(dir, vType = null, laneIndex = -1) {
        const type = vType || selectVType();
        const lane = laneIndex >= 0 ? laneIndex : Math.floor(Math.random() * SUMONetwork.LANES_PER_DIRECTION);
        const spawn = SUMONetwork.getSpawnPoint(dir, lane);
        if (!spawn) return null;
        if (!isSpawnClear(dir, lane, spawn.x, spawn.y, type.length)) return null;

        let turnIntent;
        if (type.id === 'emergency') {
            turnIntent = 'straight';
        } else if (lane === 0) {
            turnIntent = Math.random() < 0.65 ? 'straight' : 'left';
        } else {
            turnIntent = Math.random() < 0.65 ? 'straight' : 'right';
        }

        const vehicle = {
            id: nextId++, type, dir, lane,
            x: spawn.x, y: spawn.y, angle: spawn.angle,
            speed: type.maxSpeed * SPEED_SCALE * (0.5 + Math.random() * 0.3),
            maxSpeed: type.maxSpeed * SPEED_SCALE,
            accel: type.accel * SPEED_SCALE * 0.3,
            decel: type.decel * SPEED_SCALE * 0.3,
            length: type.length, width: type.width,
            minGap: type.minGap, sigma: type.sigma,
            stopped: false, inJunction: false, exiting: false,
            confidence: (0.85 + Math.random() * 0.14).toFixed(2),
            hoverPhase: Math.random() * Math.PI * 2,
            active: true,
            turnIntent: turnIntent,
            targetAngle: turnAngles[dir][turnIntent],
            turning: false,
            emergencyStopped: false,
            moveDir: dir
        };

        vehicles.push(vehicle);
        totalDeparted++;
        return vehicle;
    }

    function spawnEmergency(dir) {
        // Force-clear lane 0 for emergency vehicle
        const spawn = SUMONetwork.getSpawnPoint(dir, 0);
        if (!spawn) return null;
        for (const v of vehicles) {
            if (!v.active || v.dir !== dir || v.lane !== 0) continue;
            if (dir === 'north' || dir === 'south') {
                if (Math.abs(v.y - spawn.y) < 100) v.active = false;
            } else {
                if (Math.abs(v.x - spawn.x) < 100) v.active = false;
            }
        }
        return spawnVehicle(dir, vTypes.emergency, 0);
    }

    // ===== COUNT VEHICLES IN JUNCTION PER DIRECTION =====
    function countInJunction(dir) {
        let count = 0;
        for (const v of vehicles) {
            if (v.active && v.dir === dir && v.inJunction && !v.exiting) count++;
        }
        return count;
    }

    // ===== GAP CALCULATION =====
    function getGap(vehicle, leader) {
        if (vehicle.inJunction || vehicle.exiting || leader.inJunction || leader.exiting) {
            const dx = vehicle.x - leader.x;
            const dy = vehicle.y - leader.y;
            return Math.sqrt(dx * dx + dy * dy) - (leader.length / 2 + vehicle.length / 2);
        }
        if (vehicle.dir === 'north' || vehicle.dir === 'south') {
            return Math.abs(vehicle.y - leader.y) - (leader.length / 2 + vehicle.length / 2);
        } else {
            return Math.abs(vehicle.x - leader.x) - (leader.length / 2 + vehicle.length / 2);
        }
    }

    // ===== KRAUSS CAR-FOLLOWING =====
    function kraussFollowing(vehicle, leader, dt) {
        if (!leader) return vehicle.maxSpeed;
        const gap = getGap(vehicle, leader);
        
        // ZERO TOLERANCE for closeness
        if (gap < 0) return 0;  // Overlapping - STOP
        if (gap < 5) return 0;  // Danger zone - FULL STOP
        if (gap < 15) return Math.min(leader.speed * 0.1, 0.2);
        if (gap < 30) return Math.min(leader.speed * 0.15, 0.5);
        if (gap < vehicle.minGap * 0.5) return Math.min(leader.speed * 0.2, 1);
        
        // Very conservative reaction time
        const tau = 0.5;
        let vSafe = leader.speed + (gap - leader.speed * tau) / (vehicle.speed / vehicle.decel + tau);
        vSafe = Math.max(0, vSafe);
        
        // EXTREMELY aggressive speed capping
        if (gap < vehicle.minGap * 1.5) vSafe = Math.min(vSafe, leader.speed * 0.15);
        else if (gap < vehicle.minGap * 2.0) vSafe = Math.min(vSafe, leader.speed * 0.2);
        else if (gap < vehicle.minGap) vSafe = Math.min(vSafe, leader.speed * 0.25);
        
        const vDesired = Math.min(vehicle.maxSpeed * 0.8, vehicle.speed + vehicle.accel * dt * 0.5);
        const vRandom = Math.max(0, Math.min(vSafe, vDesired) - vehicle.sigma * vehicle.accel * dt * Math.random());
        return Math.max(0, Math.min(vRandom, vehicle.maxSpeed));
    }

    // ===== FIND LEADER =====
    function findLeader(vehicle) {
        let bestLeader = null;
        let bestDist = Infinity;

        if (!vehicle.inJunction && !vehicle.exiting) {
            // LANE MODE: same direction + same lane, PLUS exiting vehicles ahead on same axis
            const cosA = Math.cos(vehicle.angle);
            const sinA = Math.sin(vehicle.angle);

            for (const other of vehicles) {
                if (other.id === vehicle.id || !other.active) continue;

                // FIX 2: Also see exiting vehicles that are physically ahead on the same road axis
                if (other.exiting) {
                    const dx = other.x - vehicle.x;
                    const dy = other.y - vehicle.y;
                    const forwardDist = dx * cosA + dy * sinA;
                    const lateralDist = Math.abs(-dx * sinA + dy * cosA);
                    // Treat exiting vehicle as leader if directly ahead within 28px lateral
                    if (forwardDist > 0 && lateralDist < 28 && forwardDist < bestDist) {
                        bestDist = forwardDist;
                        bestLeader = other;
                    }
                    continue;
                }

                if (other.dir !== vehicle.dir || other.lane !== vehicle.lane) continue;

                let dist = 0;
                if (vehicle.dir === 'north') dist = other.y - vehicle.y;
                else if (vehicle.dir === 'south') dist = vehicle.y - other.y;
                else if (vehicle.dir === 'east') dist = vehicle.x - other.x;
                else if (vehicle.dir === 'west') dist = other.x - vehicle.x;

                if (dist > 0 && dist < bestDist) {
                    bestDist = dist;
                    bestLeader = other;
                }
            }
        } else {
            // JUNCTION/EXIT MODE: forward projection with wider lateral check
            const cosA = Math.cos(vehicle.angle);
            const sinA = Math.sin(vehicle.angle);

            for (const other of vehicles) {
                if (other.id === vehicle.id || !other.active) continue;

                const dx = other.x - vehicle.x;
                const dy = other.y - vehicle.y;
                const forwardDist = dx * cosA + dy * sinA;
                const lateralDist = Math.abs(-dx * sinA + dy * cosA);

                // Wider threshold (35px) to detect turning vehicles properly
                if (forwardDist > 0 && lateralDist < 35 && forwardDist < bestDist) {
                    bestDist = forwardDist;
                    bestLeader = other;
                }
            }
        }
        return bestLeader;
    }

    // ===== JUNCTION CROSSING CONFLICT DETECTION =====
    // Finds any vehicle in the junction that is on a CROSSING path (angle diff > 45°)
    // and dangerously close. Used to make turning vehicles yield.
    function findJunctionConflict(vehicle) {
        const safeRadius = vehicle.length * 1.6;
        let worstConflict = null;
        let worstDist = Infinity;

        for (const other of vehicles) {
            if (other.id === vehicle.id || !other.active) continue;
            if (!other.inJunction && !other.exiting) continue;

            const dx = other.x - vehicle.x;
            const dy = other.y - vehicle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minSafe = (vehicle.length / 2 + other.length / 2) * 1.3;

            if (dist > safeRadius + other.length) continue; // too far to care

            // Check if they are on crossing paths (angle difference)
            let angleDiff = Math.abs(vehicle.angle - other.angle);
            while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

            // Crossing = angle difference between 30° and 150° (not same/opposite direction)
            const isCrossing = angleDiff > Math.PI / 6 && angleDiff < Math.PI * 5 / 6;

            if (isCrossing && dist < minSafe * 2 && dist < worstDist) {
                worstDist = dist;
                worstConflict = { vehicle: other, dist, minSafe };
            }
        }
        return worstConflict;
    }

    // ===== MAIN UPDATE =====
    function update(dt, signalStates) {
        const junctionSize = SUMONetwork.HALF_ROAD + 10;
        const emergencyMode = SUMOSignals.emergencyActive;
        const cx = SUMONetwork.cx;
        const cy = SUMONetwork.cy;

        // PRE-MOVEMENT: Check and prevent collisions before vehicles move this frame
        if (typeof CollisionSystem !== 'undefined') {
            CollisionSystem.enforceMinimumGaps(vehicles);
        }

        for (const v of vehicles) {
            if (!v.active) continue;
            const isEmergency = v.type.id === 'emergency';

            if (v.emergencyStopped && !emergencyMode) {
                v.emergencyStopped = false;
                v.stopped = false;
            }

            // ===== EMERGENCY MODE =====
            // Smart yielding: only stop vehicles that conflict with the ambulance path
            // Opposite-direction vehicles (other side of same road) keep moving normally
            if (emergencyMode && !isEmergency) {
                const eDir = SUMOSignals.emergencyDir;
                // Determine relationship to ambulance
                const oppositeDir = { north: 'south', south: 'north', east: 'west', west: 'east' };
                const isOppositeDirection = v.dir === oppositeDir[eDir];
                const isSameDirection = v.dir === eDir;
                // Cross-traffic: directions on a different road axis
                const isCrossTraffic = !isOppositeDirection && !isSameDirection;

                if (isOppositeDirection) {
                    // OPPOSITE SIDE of the road — NO conflict, keep driving normally
                    // Signal is green for them too, so normal logic below handles them fine
                } else if (isSameDirection) {
                    // SAME DIRECTION as ambulance — need to yield / pull over

                    // If vehicle is IN the junction, push it through quickly to clear the path
                    if (v.inJunction || v.exiting) {
                        v.speed = Math.max(v.speed, v.maxSpeed * 0.5);
                        v.x += Math.cos(v.angle) * v.speed * dt;
                        v.y += Math.sin(v.angle) * v.speed * dt;
                        v.hoverPhase += dt * 2;
                        if (isOffScreen(v)) { v.active = false; totalArrived++; }
                        continue;
                    }

                    // For vehicles NOT in junction: pull over to lane 1 if in lane 0
                    if (v.lane === 0) {
                        const targetLaneCenter = SUMONetwork.getLaneCenter(v.dir, 1);
                        if (targetLaneCenter !== null) {
                            if (v.dir === 'north' || v.dir === 'south') {
                                const diff = targetLaneCenter - v.x;
                                v.x += diff * 4.0 * dt;
                                if (Math.abs(targetLaneCenter - v.x) < 3) v.x = targetLaneCenter;
                            } else {
                                const diff = targetLaneCenter - v.y;
                                v.y += diff * 4.0 * dt;
                                if (Math.abs(targetLaneCenter - v.y) < 3) v.y = targetLaneCenter;
                            }
                        }
                        v.lane = 1;
                    }

                    // FIX 4: Stop fully if there's a vehicle close ahead — no crawling into them
                    const eLeader = findLeader(v);
                    if (eLeader) {
                        const eGap = getGap(v, eLeader);
                        if (eGap < v.minGap * 1.2) {
                            v.speed *= 0.75;
                            if (v.speed < 0.5) v.speed = 0;
                            v.stopped = true;
                            v.emergencyStopped = true;
                            v.x += Math.cos(v.angle) * v.speed * dt;
                            v.y += Math.sin(v.angle) * v.speed * dt;
                            v.hoverPhase += dt * 2;
                            if (isOffScreen(v)) { v.active = false; totalArrived++; }
                            continue;
                        }
                    }
                    // No vehicle immediately ahead — slow down but allow crawl to clear space
                    v.speed *= 0.88;
                    if (v.speed < 0.6) v.speed = 0.6;
                    v.emergencyStopped = true;
                    v.x += Math.cos(v.angle) * v.speed * dt;
                    v.y += Math.sin(v.angle) * v.speed * dt;
                    v.hoverPhase += dt * 2;
                    if (isOffScreen(v)) { v.active = false; totalArrived++; }
                    continue;
                } else if (isCrossTraffic) {
                    // CROSS TRAFFIC — must stop completely (red signal)
                    // But if already in junction, push through to clear
                    if (v.inJunction || v.exiting) {
                        v.speed = Math.max(v.speed, v.maxSpeed * 0.4);
                        v.x += Math.cos(v.angle) * v.speed * dt;
                        v.y += Math.sin(v.angle) * v.speed * dt;
                        v.hoverPhase += dt * 2;
                        if (isOffScreen(v)) { v.active = false; totalArrived++; }
                        continue;
                    }
                    v.speed *= 0.85;
                    if (v.speed < 0.3) v.speed = 0;
                    v.stopped = true;
                    v.emergencyStopped = true;
                    v.x += Math.cos(v.angle) * v.speed * dt;
                    v.y += Math.sin(v.angle) * v.speed * dt;
                    v.hoverPhase += dt * 2;
                    if (isOffScreen(v)) { v.active = false; totalArrived++; }
                    continue;
                }
            }

            // ===== EMERGENCY VEHICLE =====
            if (isEmergency) {
                // Check for vehicles directly in front — avoid crashing into them
                const leader = findLeader(v);
                if (leader) {
                    const gap = getGap(v, leader);
                    if (gap < v.minGap * 1.5) {
                        // Vehicle ahead hasn't moved aside yet — slow down
                        v.speed = Math.min(v.maxSpeed, Math.max(leader.speed * 0.8, gap * 0.3));
                        if (gap < 5) v.speed = Math.max(leader.speed * 0.5, 0.5);
                    } else {
                        v.speed = v.maxSpeed;
                    }
                } else {
                    v.speed = v.maxSpeed;
                }
                v.stopped = false;
                v.x += Math.cos(v.angle) * v.speed * dt;
                v.y += Math.sin(v.angle) * v.speed * dt;
                v.hoverPhase += dt * 2;

                // Check if ambulance has CLEARED the junction area
                if (emergencyMode && !v.clearedJunction) {
                    const jBounds = junctionSize + 40;
                    const pastJunction =
                        (v.dir === 'north' && v.y > cy + jBounds) ||
                        (v.dir === 'south' && v.y < cy - jBounds) ||
                        (v.dir === 'east' && v.x < cx - jBounds) ||
                        (v.dir === 'west' && v.x > cx + jBounds);

                    if (pastJunction) {
                        v.clearedJunction = true;
                        v.inJunction = false;
                        v.exiting = true;
                        SUMOSignals.deactivateEmergency();
                    } else {
                        v.inJunction = true;
                    }
                }

                if (isOffScreen(v)) {
                    v.active = false; totalArrived++;
                    // Failsafe: if still in emergency mode somehow
                    if (emergencyMode) SUMOSignals.deactivateEmergency();
                }
                continue;
            }

            // ===== NORMAL VEHICLE =====
            const leader = findLeader(v);
            let targetSpeed = kraussFollowing(v, leader, dt);

            // Leader collision prevention - ABSOLUTE ZERO TOLERANCE
            if (leader) {
                const gap = getGap(v, leader);
                
                // Any overlap = FULL STOP
                if (gap <= 0) {
                    targetSpeed = 0;
                    v.stopped = true;
                    // Push back if overlapping
                    const pushBack = Math.abs(gap) + 1;
                    v.x -= Math.cos(v.angle) * pushBack;
                    v.y -= Math.sin(v.angle) * pushBack;
                }
                // Danger zones
                else if (gap < 10) targetSpeed = 0;
                else if (gap < 20) targetSpeed = Math.min(targetSpeed, leader.speed * 0.1);
                else if (gap < 35) targetSpeed = Math.min(targetSpeed, leader.speed * 0.15);
                else if (gap < v.minGap * 0.6) targetSpeed = Math.min(targetSpeed, leader.speed * 0.2);
                else if (gap < v.minGap) targetSpeed = Math.min(targetSpeed, leader.speed * 0.25);
            }

            const stopLine = SUMONetwork.getStopLine(v.dir);
            const signalState = signalStates[v.dir];
            const distToStop = getDistToStopLine(v, stopLine);

            // ===== SIGNAL COMPLIANCE =====
            if (!v.inJunction && !v.exiting) {
                if (distToStop > 0 && distToStop < 250) {
                    if (signalState === 'red' || signalState === 'yellow') {
                        // Must stop before stop line
                        const brakeDist = (v.speed * v.speed) / (2 * v.decel);
                        if (distToStop <= brakeDist + 30) {
                            const brakeForce = Math.max(1, (brakeDist + 30 - distToStop) / (brakeDist + 30));
                            targetSpeed = Math.max(0, v.speed - v.decel * dt * 3 * brakeForce);
                            if (distToStop < 15) { targetSpeed = 0; v.stopped = true; }
                        }
                    } else if (signalState === 'green') {
                        v.stopped = false;
                        // About to run out of green? Brake if can't make it
                        const timeInPhase = SUMOSignals.timers[v.dir];
                        if (typeof timeInPhase === 'number' && timeInPhase <= 3 && distToStop > 30 && distToStop < 100) {
                            const brakeDist = (v.speed * v.speed) / (2 * v.decel);
                            if (distToStop <= brakeDist + 15) targetSpeed = Math.max(0, v.speed - v.decel * dt);
                        }

                        // *** JUNCTION FLOW CONTROL ***
                        // Only allow MAX_IN_JUNCTION_PER_DIR vehicles from this direction in junction
                        if (distToStop < 60 && distToStop > 5) {
                            const inJunctionCount = countInJunction(v.dir);
                            if (inJunctionCount >= MAX_IN_JUNCTION_PER_DIR) {
                                // Too many from our direction already in junction — wait!
                                targetSpeed = 0;
                                v.stopped = true;
                            }
                        }
                    }
                }
            }

            // ===== JUNCTION TRAVERSAL & TURNING =====
            if (!v.stopped && !v.exiting) {
                // Enter junction
                if (!v.inJunction && distToStop <= 0) {
                    // Double-check junction limit at entry point
                    const inJunctionCount = countInJunction(v.dir);
                    if (inJunctionCount >= MAX_IN_JUNCTION_PER_DIR) {
                        // Can't enter — hold at stop line
                        targetSpeed = 0;
                        v.stopped = true;
                        // Push back slightly behind stop line
                        if (distToStop < -5) {
                            if (v.dir === 'north') v.y = stopLine - 5;
                            else if (v.dir === 'south') v.y = stopLine + 5;
                            else if (v.dir === 'east') v.x = stopLine + 5;
                            else if (v.dir === 'west') v.x = stopLine - 5;
                        }
                    } else {
                        v.inJunction = true;
                        if (v.turnIntent !== 'straight' && !v.exitTarget) {
                            v.exitTarget = SUMONetwork.getExitLanePosition(v.dir, v.turnIntent);
                        }
                    }
                }

                if (v.inJunction) {
                    if (v.turnIntent !== 'straight' && v.exitTarget) {
                        const dx = v.exitTarget.x - v.x;
                        const dy = v.exitTarget.y - v.y;
                        const distToTarget = Math.sqrt(dx * dx + dy * dy);
                        const angleToTarget = Math.atan2(dy, dx);

                        let angleDiff = angleToTarget - v.angle;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                        if (Math.abs(angleDiff) > 0.03) {
                            v.angle += angleDiff * 5.0 * dt;
                            v.turning = true;
                        } else {
                            v.angle = angleToTarget;
                        }

                        if (distToTarget < 30) {
                            v.angle = v.targetAngle;
                            v.turning = false;
                        }
                    }

                    // ===== JUNCTION CROSSING CONFLICT YIELD =====
                    // If a crossing vehicle is dangerously close, slow down or stop
                    const conflict = findJunctionConflict(v);
                    if (conflict) {
                        const { dist, minSafe } = conflict;
                        if (dist < minSafe) {
                            // Imminent collision — halt
                            targetSpeed = 0;
                            v.stopped = true;
                        } else {
                            // Approaching conflict — slow proportionally
                            const closeness = 1 - (dist - minSafe) / (minSafe * 1.5);
                            targetSpeed = Math.min(targetSpeed, v.maxSpeed * (1 - closeness * 0.85));
                        }
                    }

                    // Speed in junction — turn slowly, go straight faster
                    if (v.turning) {
                        targetSpeed = Math.min(targetSpeed, v.maxSpeed * 0.35);
                    } else {
                        targetSpeed = Math.min(targetSpeed, v.maxSpeed * 0.7);
                    }

                    // Exit junction detection
                    if (v.turnIntent === 'straight') {
                        if (distToStop <= -(junctionSize * 2 + 40)) {
                            v.inJunction = false;
                            v.exiting = true;
                        }
                    } else {
                        const jBounds = junctionSize + 15;
                        const outsideJunction = v.x < cx - jBounds || v.x > cx + jBounds ||
                            v.y < cy - jBounds || v.y > cy + jBounds;
                        if (outsideJunction && !v.turning) {
                            v.inJunction = false;
                            v.exiting = true;
                            v.angle = v.targetAngle;
                            v.moveDir = getMoveDirFromAngle(v.angle);
                        }
                    }
                }
            }

            // ===== SPEED UPDATE =====
            // LIGHTNING-FAST braking response
            if (!v.stopped) {
                let sf;
                if (targetSpeed === 0) {
                    sf = 0.99; // INSTANT emergency stop
                } else if (targetSpeed < v.speed * 0.1) {
                    sf = 0.95; // Maximum emergency braking
                } else if (targetSpeed < v.speed * 0.2) {
                    sf = 0.9;  // Hard emergency braking
                } else if (targetSpeed < v.speed * 0.5) {
                    sf = 0.8;  // Very strong braking
                } else if (targetSpeed < v.speed) {
                    sf = 0.65; // Moderate braking
                } else {
                    sf = 0.15; // Slow acceleration
                }
                v.speed += (targetSpeed - v.speed) * sf;
                v.speed = Math.max(0, Math.min(v.speed, v.maxSpeed));
            } else {
                v.speed *= 0.2; // Extreme deceleration when stopped
                if (v.speed < 0.01) v.speed = 0;
                if (signalState === 'green' && !v.emergencyStopped) {
                    // Only unstop if junction has room
                    const inJunctionCount = countInJunction(v.dir);
                    if (inJunctionCount < MAX_IN_JUNCTION_PER_DIR || distToStop > 60) {
                        v.stopped = false;
                    }
                }
            }

            // ===== MOVE =====
            v.x += Math.cos(v.angle) * v.speed * dt;
            v.y += Math.sin(v.angle) * v.speed * dt;
            v.hoverPhase += dt * 2;

            if (isOffScreen(v)) { v.active = false; totalArrived++; }
        }

        // PRIORITY 1: Enforce minimum gaps (before collisions happen)
        if (typeof CollisionSystem !== 'undefined') {
            CollisionSystem.enforceMinimumGaps(vehicles);
        }

        // PRIORITY 2: Prevent overlaps with physics-based separation
        if (typeof CollisionSystem !== 'undefined') {
            CollisionSystem.preventCollisions(vehicles);
        }

        // PRIORITY 3: Legacy overlap resolution as final fallback
        resolveOverlaps();

        // Clean up
        for (let i = vehicles.length - 1; i >= 0; i--) {
            if (!vehicles[i].active) vehicles.splice(i, 1);
        }
    }

    function isOffScreen(v) {
        return v.x < -100 || v.x > SUMONetwork.canvasW + 100 ||
            v.y < -100 || v.y > SUMONetwork.canvasH + 100;
    }

    function getMoveDirFromAngle(angle) {
        let a = angle % (Math.PI * 2);
        if (a < 0) a += Math.PI * 2;
        if (a < Math.PI * 0.25 || a >= Math.PI * 1.75) return 'west';
        if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return 'north';
        if (a >= Math.PI * 0.75 && a < Math.PI * 1.25) return 'east';
        return 'south';
    }

    // ===== OVERLAP RESOLUTION =====
    // ABSOLUTE collision prevention - NO overlaps allowed
    function resolveOverlaps() {
        for (let i = 0; i < vehicles.length; i++) {
            const a = vehicles[i];
            if (!a.active) continue;
            for (let j = i + 1; j < vehicles.length; j++) {
                const b = vehicles[j];
                if (!b.active) continue;

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                // MASSIVE safety buffer - prevent ANY visual overlap
                const minDist = (a.length / 2 + b.length / 2) * 1.4;

                if (dist < minDist && dist > 0.1) {
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // MAXIMUM push-apart force
                    const push = overlap * 1.0;

                    a.x += nx * push * 0.6;
                    a.y += ny * push * 0.6;
                    b.x -= nx * push * 0.6;
                    b.y -= ny * push * 0.6;

                    // ALL collisions = FULL STOP
                    if (dist < minDist * 0.3) {
                        // HARD collision - both vehicles halt completely
                        a.speed = 0;
                        b.speed = 0;
                        a.stopped = true;
                        b.stopped = true;
                    } else if (dist < minDist * 0.6) {
                        // Medium collision: extremely strong braking
                        a.speed *= 0.2;
                        b.speed *= 0.2;
                        a.stopped = true;
                        b.stopped = true;
                    } else if (dist < minDist * 0.9) {
                        // Mild collision: very strong braking
                        a.speed *= 0.4;
                        b.speed *= 0.4;
                    } else {
                        // Light proximity: strong braking
                        a.speed *= 0.6;
                        b.speed *= 0.6;
                    }
                }
            }
        }
    }

    function getDistToStopLine(vehicle, stopLine) {
        if (vehicle.dir === 'north') return stopLine - vehicle.y;
        if (vehicle.dir === 'south') return vehicle.y - stopLine;
        if (vehicle.dir === 'east') return vehicle.x - stopLine;
        if (vehicle.dir === 'west') return stopLine - vehicle.x;
        return 999;
    }

    function getVehiclesByDir(dir) { return vehicles.filter(v => v.active && v.dir === dir); }
    function getQueueLength(dir) { return vehicles.filter(v => v.active && v.dir === dir && (v.stopped || v.speed < 1)).length; }
    function getAverageSpeed(dir) {
        const dv = getVehiclesByDir(dir);
        return dv.length === 0 ? 0 : dv.reduce((s, v) => s + v.speed, 0) / dv.length;
    }
    function getCount() { return vehicles.filter(v => v.active).length; }

    return {
        vehicles, vTypes, spawnVehicle, spawnEmergency, update,
        getVehiclesByDir, getQueueLength, getAverageSpeed, getCount,
        get totalDeparted() { return totalDeparted; },
        get totalArrived() { return totalArrived; },
        directions
    };
})();
