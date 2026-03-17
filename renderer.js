// ===== INTERSECTION & CITY RENDERER =====
// Canvas-based renderer for the 4-way intersection, vehicles, city backdrop,
// smart road effects, detectors, drones, and cinematic lighting

const Renderer = (() => {
    let canvas, ctx;
    let time = 0;
    let droneAngle = 0;
    const particles = [];

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        initParticles();
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        SUMONetwork.init(canvas.width, canvas.height);
    }

    function initParticles() {
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * 2000,
                y: Math.random() * 1200,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                alpha: Math.random() * 0.3 + 0.1
            });
        }
    }

    function render(dt) {
        time += dt;
        droneAngle += dt * 0.3;

        const w = canvas.width;
        const h = canvas.height;
        const cx = SUMONetwork.cx;
        const cy = SUMONetwork.cy;

        ctx.clearRect(0, 0, w, h);

        drawBackground(w, h);
        drawCityBuildings(w, h, cx, cy);
        drawParticles(w, h);
        drawRoads(cx, cy, w, h);
        drawDetectors();
        drawSmartRoadEffects(cx, cy, w, h);
        drawCrosswalks(cx, cy);
        drawStopLines(cx, cy);
        drawIoTSensors(cx, cy);
        drawTrafficLights(cx, cy);
        drawVehicles();
        drawVehicleCounts(cx, cy);
        drawDrone(cx, cy);
        drawNetworkLines(cx, cy, w, h);
        drawVolumetricLight(cx, cy);
    }

    // ===== BACKGROUND =====
    function drawBackground(w, h) {
        const grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.8);
        grad.addColorStop(0, '#0f1729');
        grad.addColorStop(0.5, '#0a0e1a');
        grad.addColorStop(1, '#050810');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle grid
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
        ctx.lineWidth = 0.5;
        const gridSize = 60;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }

    // ===== CITY BUILDINGS =====
    function drawCityBuildings(w, h, cx, cy) {
        const roadHalf = SUMONetwork.ROAD_WIDTH / 2 + 20;

        // Draw buildings in each quadrant
        const quadrants = [
            { x1: 0, y1: 0, x2: cx - roadHalf, y2: cy - roadHalf },
            { x1: cx + roadHalf, y1: 0, x2: w, y2: cy - roadHalf },
            { x1: 0, y1: cy + roadHalf, x2: cx - roadHalf, y2: h },
            { x1: cx + roadHalf, y1: cy + roadHalf, x2: w, y2: h }
        ];

        // Seed random for consistent buildings
        let seed = 42;
        function seededRandom() {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        }

        quadrants.forEach((q, qi) => {
            seed = 42 + qi * 1000;
            const numBuildings = 6;
            for (let i = 0; i < numBuildings; i++) {
                const bw = 40 + seededRandom() * 80;
                const bh = 60 + seededRandom() * 120;
                const bx = q.x1 + seededRandom() * (q.x2 - q.x1 - bw);
                const by = q.y1 + seededRandom() * (q.y2 - q.y1 - bh);

                // Building body
                const buildGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
                buildGrad.addColorStop(0, `rgba(30, 41, 59, ${0.6 + seededRandom() * 0.3})`);
                buildGrad.addColorStop(1, `rgba(15, 23, 42, ${0.8 + seededRandom() * 0.2})`);
                ctx.fillStyle = buildGrad;
                ctx.fillRect(bx, by, bw, bh);

                // Building outline
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.12)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(bx, by, bw, bh);

                // Glass windows
                const windowSize = 6;
                const windowGap = 12;
                for (let wx = bx + 6; wx < bx + bw - 6; wx += windowGap) {
                    for (let wy = by + 8; wy < by + bh - 8; wy += windowGap) {
                        const lit = seededRandom() > 0.4;
                        if (lit) {
                            ctx.fillStyle = `rgba(0, 240, 255, ${0.1 + seededRandom() * 0.25})`;
                            // Window flicker
                            const flicker = Math.sin(time * 2 + wx + wy) * 0.05;
                            ctx.globalAlpha = 0.3 + flicker;
                            ctx.fillRect(wx, wy, windowSize, windowSize);
                            ctx.globalAlpha = 1;
                        }
                    }
                }

                // Glass reflection effect
                ctx.fillStyle = 'rgba(0, 240, 255, 0.02)';
                ctx.fillRect(bx, by, bw * 0.3, bh);

                // Solar panel indicator on some buildings
                if (seededRandom() > 0.6) {
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
                    ctx.fillRect(bx + 4, by + 2, bw - 8, 4);
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
                    ctx.fillRect(bx + 4, by + 2, (bw - 8) * (0.5 + Math.sin(time) * 0.2), 4);
                }
            }
        });
    }

    // ===== PARTICLES =====
    function drawParticles(w, h) {
        particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < 0) { p.y = h; p.x = Math.random() * w; }
            ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * (0.5 + Math.sin(time + p.x) * 0.5)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ===== ROADS =====
    function drawRoads(cx, cy, w, h) {
        const lw = SUMONetwork.LANE_WIDTH;
        const lanes = SUMONetwork.LANES_PER_DIRECTION;
        const roadW = lw * lanes;

        // Road surface
        ctx.fillStyle = '#1a1f2e';

        // Vertical road (North-South)
        ctx.fillRect(cx - roadW, 0, roadW * 2, h);
        // Horizontal road (East-West)
        ctx.fillRect(0, cy - roadW, w, roadW * 2);

        // Junction center - slightly lighter
        ctx.fillStyle = '#1e2438';
        ctx.fillRect(cx - roadW, cy - roadW, roadW * 2, roadW * 2);

        // Road edges (curbs)
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 2;

        // Vertical curbs
        ctx.beginPath();
        ctx.moveTo(cx - roadW, 0); ctx.lineTo(cx - roadW, cy - roadW);
        ctx.moveTo(cx + roadW, 0); ctx.lineTo(cx + roadW, cy - roadW);
        ctx.moveTo(cx - roadW, cy + roadW); ctx.lineTo(cx - roadW, h);
        ctx.moveTo(cx + roadW, cy + roadW); ctx.lineTo(cx + roadW, h);
        ctx.stroke();

        // Horizontal curbs
        ctx.beginPath();
        ctx.moveTo(0, cy - roadW); ctx.lineTo(cx - roadW, cy - roadW);
        ctx.moveTo(0, cy + roadW); ctx.lineTo(cx - roadW, cy + roadW);
        ctx.moveTo(cx + roadW, cy - roadW); ctx.lineTo(w, cy - roadW);
        ctx.moveTo(cx + roadW, cy + roadW); ctx.lineTo(w, cy + roadW);
        ctx.stroke();

        // Lane dividers (dashed)
        ctx.setLineDash([15, 20]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;

        // Center line (solid yellow)
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255, 187, 0, 0.35)';
        ctx.lineWidth = 2;

        // Vertical center
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, cy - roadW);
        ctx.moveTo(cx, cy + roadW); ctx.lineTo(cx, h);
        ctx.stroke();

        // Horizontal center
        ctx.beginPath();
        ctx.moveTo(0, cy); ctx.lineTo(cx - roadW, cy);
        ctx.moveTo(cx + roadW, cy); ctx.lineTo(w, cy);
        ctx.stroke();

        // Lane dividers
        ctx.setLineDash([12, 18]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;

        for (let i = 1; i < lanes; i++) {
            // Right lanes (north)
            ctx.beginPath();
            ctx.moveTo(cx + lw * i, 0); ctx.lineTo(cx + lw * i, cy - roadW);
            ctx.moveTo(cx + lw * i, cy + roadW); ctx.lineTo(cx + lw * i, h);
            ctx.stroke();

            // Left lanes
            ctx.beginPath();
            ctx.moveTo(cx - lw * i, 0); ctx.lineTo(cx - lw * i, cy - roadW);
            ctx.moveTo(cx - lw * i, cy + roadW); ctx.lineTo(cx - lw * i, h);
            ctx.stroke();

            // Horizontal lanes
            ctx.beginPath();
            ctx.moveTo(0, cy + lw * i); ctx.lineTo(cx - roadW, cy + lw * i);
            ctx.moveTo(cx + roadW, cy + lw * i); ctx.lineTo(w, cy + lw * i);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, cy - lw * i); ctx.lineTo(cx - roadW, cy - lw * i);
            ctx.moveTo(cx + roadW, cy - lw * i); ctx.lineTo(w, cy - lw * i);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    // ===== SMART ROAD EFFECTS =====
    function drawSmartRoadEffects(cx, cy, w, h) {
        const roadW = SUMONetwork.LANE_WIDTH * SUMONetwork.LANES_PER_DIRECTION;
        const pulse = Math.sin(time * 1.5) * 0.3 + 0.7;

        // Glowing road edges
        const glowWidth = 3;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = 8 * pulse;

        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * pulse})`;
        ctx.lineWidth = glowWidth;

        // Vertical glow lines
        ctx.beginPath();
        ctx.moveTo(cx - roadW, 0); ctx.lineTo(cx - roadW, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + roadW, 0); ctx.lineTo(cx + roadW, h);
        ctx.stroke();

        // Horizontal glow lines
        ctx.beginPath();
        ctx.moveTo(0, cy - roadW); ctx.lineTo(w, cy - roadW);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, cy + roadW); ctx.lineTo(w, cy + roadW);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // IoT sensor grid pattern on road surface
        ctx.fillStyle = `rgba(0, 240, 255, ${0.03 * pulse})`;
        const gridS = 30;
        for (let x = cx - roadW + 5; x < cx + roadW; x += gridS) {
            for (let y = 0; y < h; y += gridS) {
                if (Math.abs(x - cx) < 2) continue; // Skip center line
                ctx.fillRect(x, y, 1, 1);
            }
        }
        for (let y = cy - roadW + 5; y < cy + roadW; y += gridS) {
            for (let x = 0; x < w; x += gridS) {
                if (Math.abs(y - cy) < 2) continue;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    // ===== CROSSWALKS =====
    function drawCrosswalks(cx, cy) {
        const roadW = SUMONetwork.LANE_WIDTH * SUMONetwork.LANES_PER_DIRECTION;
        const crossW = 6, crossGap = 8;
        const offset = roadW + 5;

        const pulse = (Math.sin(time * 2) * 0.3 + 0.7);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * pulse})`;

        // North crosswalk
        for (let x = cx - roadW + 4; x < cx + roadW - 4; x += crossW + crossGap) {
            ctx.fillRect(x, cy - offset - 12, crossW, 12);
        }
        // South crosswalk
        for (let x = cx - roadW + 4; x < cx + roadW - 4; x += crossW + crossGap) {
            ctx.fillRect(x, cy + offset, crossW, 12);
        }
        // East crosswalk
        for (let y = cy - roadW + 4; y < cy + roadW - 4; y += crossW + crossGap) {
            ctx.fillRect(cx + offset, y, 12, crossW);
        }
        // West crosswalk
        for (let y = cy - roadW + 4; y < cy + roadW - 4; y += crossW + crossGap) {
            ctx.fillRect(cx - offset - 12, y, 12, crossW);
        }

        // Pedestrian walk signal icons
        const walkDirs = [
            { x: cx - roadW - 30, y: cy - roadW - 30 },
            { x: cx + roadW + 15, y: cy - roadW - 30 },
            { x: cx - roadW - 30, y: cy + roadW + 15 },
            { x: cx + roadW + 15, y: cy + roadW + 15 }
        ];

        walkDirs.forEach(pos => {
            // Walk signal housing
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pos.x, pos.y, 18, 18, 3);
            ctx.fill();
            ctx.stroke();

            // Walk icon (simple person shape)
            const walking = Math.sin(time * 3) > 0;
            ctx.fillStyle = walking ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 51, 85, 0.8)';
            ctx.beginPath();
            ctx.arc(pos.x + 9, pos.y + 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(pos.x + 7.5, pos.y + 8, 3, 6);
        });
    }

    // ===== STOP LINES =====
    function drawStopLines(cx, cy) {
        const roadW = SUMONetwork.LANE_WIDTH * SUMONetwork.LANES_PER_DIRECTION;
        const halfRoad = roadW + 10;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;

        // North stop line
        ctx.beginPath();
        ctx.moveTo(cx, cy - halfRoad);
        ctx.lineTo(cx + roadW, cy - halfRoad);
        ctx.stroke();

        // South stop line
        ctx.beginPath();
        ctx.moveTo(cx - roadW, cy + halfRoad);
        ctx.lineTo(cx, cy + halfRoad);
        ctx.stroke();

        // East stop line
        ctx.beginPath();
        ctx.moveTo(cx + halfRoad, cy);
        ctx.lineTo(cx + halfRoad, cy + roadW);
        ctx.stroke();

        // West stop line
        ctx.beginPath();
        ctx.moveTo(cx - halfRoad, cy - roadW);
        ctx.lineTo(cx - halfRoad, cy);
        ctx.stroke();
    }

    // ===== IOT SENSORS =====
    function drawIoTSensors(cx, cy) {
        const roadW = SUMONetwork.LANE_WIDTH * SUMONetwork.LANES_PER_DIRECTION;
        const sensorPositions = [
            { x: cx + roadW + 8, y: cy - roadW - 8 },
            { x: cx - roadW - 8, y: cy - roadW - 8 },
            { x: cx + roadW + 8, y: cy + roadW + 8 },
            { x: cx - roadW - 8, y: cy + roadW + 8 }
        ];

        sensorPositions.forEach(pos => {
            // Camera mount
            ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
            ctx.fillRect(pos.x - 3, pos.y - 20, 6, 20);

            // Camera head
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 22, 5, 0, Math.PI * 2);
            ctx.fill();

            // Camera lens glow
            const pulse = Math.sin(time * 2 + pos.x) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(0, 240, 255, ${0.5 * pulse})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 22, 2, 0, Math.PI * 2);
            ctx.fill();

            // Data stream from camera (dashed line to junction center)
            ctx.setLineDash([3, 6]);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 * pulse})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - 22);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }

    // ===== DETECTORS =====
    function drawDetectors() {
        const positions = SUMODetectors.getDetectorPositions();

        positions.forEach(det => {
            if (det.type === 'E2') {
                // E2 area detector - subtle overlay
                ctx.fillStyle = `rgba(0, 240, 255, ${0.04 + Math.sin(time * 2) * 0.02})`;
                ctx.fillRect(det.x, det.y, det.w, det.h);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(det.x, det.y, det.w, det.h);
                ctx.setLineDash([]);

                // E2 label
                ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.font = '8px JetBrains Mono';
                ctx.fillText('E2', det.x + 3, det.y + 10);
            } else {
                // E1 induction loop - bright line
                ctx.fillStyle = `rgba(191, 0, 255, ${0.4 + Math.sin(time * 3) * 0.2})`;
                ctx.fillRect(det.x, det.y, det.w, det.h);
                ctx.fillStyle = 'rgba(191, 0, 255, 0.5)';
                ctx.font = '7px JetBrains Mono';
                const labelX = det.vertical ? det.x + det.w + 3 : det.x;
                const labelY = det.vertical ? det.y + 3 : det.y - 3;
                ctx.fillText('E1', labelX, labelY);
            }
        });
    }

    // ===== TRAFFIC LIGHTS =====
    function drawTrafficLights(cx, cy) {
        const roadW = SUMONetwork.LANE_WIDTH * SUMONetwork.LANES_PER_DIRECTION;
        const offset = roadW + 30;
        const states = SUMOSignals.signalStates;
        const timers = SUMOSignals.timers;

        const lightPositions = [
            { dir: 'north', x: cx + roadW + 10, y: cy - offset, rotation: 0 },
            { dir: 'south', x: cx - roadW - 30, y: cy + offset - 20, rotation: 0 },
            { dir: 'east', x: cx + offset - 10, y: cy + roadW + 10, rotation: 0 },
            { dir: 'west', x: cx - offset - 10, y: cy - roadW - 50, rotation: 0 }
        ];

        lightPositions.forEach(lp => {
            const state = states[lp.dir];
            const timer = timers[lp.dir];

            // Signal housing
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(lp.x, lp.y, 20, 58, 4);
            ctx.fill();
            ctx.stroke();

            // LED panel glow
            ctx.shadowColor = state === 'green' ? '#00ff88' : state === 'yellow' ? '#ffbb00' : '#ff3355';
            ctx.shadowBlur = 10;

            const colors = ['red', 'yellow', 'green'];
            const colorVals = {
                red: { on: '#ff3355', off: '#331111' },
                yellow: { on: '#ffbb00', off: '#332b11' },
                green: { on: '#00ff88', off: '#113311' }
            };

            colors.forEach((c, i) => {
                const isActive = state === c;
                ctx.fillStyle = isActive ? colorVals[c].on : colorVals[c].off;
                ctx.beginPath();
                ctx.arc(lp.x + 10, lp.y + 10 + i * 16, 6, 0, Math.PI * 2);
                ctx.fill();

                if (isActive) {
                    ctx.fillStyle = `rgba(${c === 'red' ? '255,51,85' : c === 'yellow' ? '255,187,0' : '0,255,136'}, 0.15)`;
                    ctx.beginPath();
                    ctx.arc(lp.x + 10, lp.y + 10 + i * 16, 9, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.shadowBlur = 0;

            // Countdown timer below
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
            ctx.beginPath();
            ctx.roundRect(lp.x - 2, lp.y + 62, 24, 16, 3);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = state === 'green' ? '#00ff88' : state === 'yellow' ? '#ffbb00' : '#ff3355';
            ctx.font = 'bold 11px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(timer.toString(), lp.x + 10, lp.y + 74);
            ctx.textAlign = 'left';

            // Solar panel on top
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.fillRect(lp.x + 2, lp.y - 6, 16, 4);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            ctx.fillRect(lp.x + 2, lp.y - 6, 16 * (0.5 + Math.sin(time * 0.5) * 0.3), 4);
        });
    }

    // ===== VEHICLES =====
    // Track occupied label positions to avoid overlap
    const usedLabelSlots = [];

    function isLabelSlotFree(x, y, w, h) {
        for (const slot of usedLabelSlots) {
            if (x < slot.x + slot.w && x + w > slot.x &&
                y < slot.y + slot.h && y + h > slot.y) {
                return false;
            }
        }
        return true;
    }

    function drawVehicles() {
        // Clear label slots each frame
        usedLabelSlots.length = 0;

        SUMOVehicles.vehicles.forEach(v => {
            if (!v.active) return;

            ctx.save();
            ctx.translate(v.x, v.y);
            ctx.rotate(v.angle);

            // Antigravity energy field (blue glow under vehicle)
            const hoverOffset = Math.sin(v.hoverPhase) * 2 + 3;
            const agGrad = ctx.createRadialGradient(0, hoverOffset + 4, 0, 0, hoverOffset + 4, v.length * 0.6);
            agGrad.addColorStop(0, 'rgba(0, 170, 255, 0.25)');
            agGrad.addColorStop(0.5, 'rgba(0, 120, 255, 0.1)');
            agGrad.addColorStop(1, 'rgba(0, 80, 255, 0)');
            ctx.fillStyle = agGrad;
            ctx.beginPath();
            ctx.ellipse(0, hoverOffset + 4, v.length * 0.5, v.width * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vehicle shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(2, hoverOffset + 2, v.length * 0.4, v.width * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vehicle body (hover offset applied)
            ctx.translate(0, -hoverOffset);

            // Body
            const bodyGrad = ctx.createLinearGradient(-v.length / 2, -v.width / 2, v.length / 2, v.width / 2);
            bodyGrad.addColorStop(0, v.type.color);
            bodyGrad.addColorStop(1, shadeColor(v.type.color, -30));
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 3);
            ctx.fill();

            // Windshield
            ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.fillRect(v.length / 2 - 8, -v.width / 2 + 2, 6, v.width - 4);

            // Emergency lights
            if (v.type.id === 'emergency') {
                const flash = Math.sin(time * 15) > 0;
                ctx.fillStyle = flash ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 100, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(-v.length / 4, -v.width / 2 - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = !flash ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 100, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(v.length / 4, -v.width / 2 - 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Headlights
            ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
            ctx.fillRect(v.length / 2 - 2, -v.width / 2 + 1, 3, 3);
            ctx.fillRect(v.length / 2 - 2, v.width / 2 - 4, 3, 3);

            // Taillights
            ctx.fillStyle = 'rgba(255, 0, 50, 0.5)';
            ctx.fillRect(-v.length / 2 - 1, -v.width / 2 + 1, 3, 3);
            ctx.fillRect(-v.length / 2 - 1, v.width / 2 - 4, 3, 3);

            // Turn signal blinkers (yellow blinking on the turning side)
            if (v.turnIntent && v.turnIntent !== 'straight') {
                const blinkOn = Math.sin(time * 10) > 0;
                if (blinkOn) {
                    ctx.fillStyle = 'rgba(255, 200, 0, 0.95)';
                    if (v.turnIntent === 'left') {
                        // Left side blinkers (top side in local coords = -width/2)
                        ctx.fillRect(v.length / 2 - 4, -v.width / 2 - 1, 4, 3);
                        ctx.fillRect(-v.length / 2, -v.width / 2 - 1, 4, 3);
                    } else {
                        // Right side blinkers (bottom side in local coords = +width/2)
                        ctx.fillRect(v.length / 2 - 4, v.width / 2 - 2, 4, 3);
                        ctx.fillRect(-v.length / 2, v.width / 2 - 2, 4, 3);
                    }
                }
            }

            ctx.restore();

            // YOLO-style bounding box (in screen space, not rotated)
            drawYOLOBox(v);
        });
    }

    function drawYOLOBox(v) {
        const padX = v.length / 2 + 4;
        const padY = v.width / 2 + 4;
        const x1 = v.x - padX;
        const y1 = v.y - padY;
        const w = padX * 2;
        const h = padY * 2;

        ctx.strokeStyle = v.type.yoloColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;

        // Corner brackets instead of full box
        const cornerLen = 8;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(x1, y1 + cornerLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLen, y1);
        // Top-right
        ctx.moveTo(x1 + w - cornerLen, y1); ctx.lineTo(x1 + w, y1); ctx.lineTo(x1 + w, y1 + cornerLen);
        // Bottom-right
        ctx.moveTo(x1 + w, y1 + h - cornerLen); ctx.lineTo(x1 + w, y1 + h); ctx.lineTo(x1 + w - cornerLen, y1 + h);
        // Bottom-left
        ctx.moveTo(x1 + cornerLen, y1 + h); ctx.lineTo(x1, y1 + h); ctx.lineTo(x1, y1 + h - cornerLen);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Label — only draw if the label slot is free (prevents overlap)
        const label = `${v.type.label} ${v.confidence}`;
        ctx.font = '9px JetBrains Mono';
        const tw = ctx.measureText(label).width + 6;
        const labelX = x1;
        const labelY = y1 - 14;
        const labelW = tw;
        const labelH = 13;

        if (isLabelSlotFree(labelX, labelY, labelW, labelH)) {
            ctx.fillStyle = v.type.yoloColor;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(labelX, labelY, labelW, labelH);

            ctx.fillStyle = '#000';
            ctx.globalAlpha = 1;
            ctx.fillText(label, labelX + 3, labelY + 9);

            // Reserve this label slot
            usedLabelSlots.push({ x: labelX, y: labelY, w: labelW, h: labelH });
        }

        ctx.globalAlpha = 1;
    }

    // ===== VEHICLE COUNTS PER LANE =====
    function drawVehicleCounts(cx, cy) {
        const roadW = SUMONetwork.LANE_WIDTH * SUMONetwork.LANES_PER_DIRECTION;
        const dirs = [
            { dir: 'north', x: cx + roadW / 2, y: 40 },
            { dir: 'south', x: cx - roadW / 2, y: SUMONetwork.canvasH - 40 },
            { dir: 'east', x: SUMONetwork.canvasW - 40, y: cy + roadW / 2 },
            { dir: 'west', x: 40, y: cy - roadW / 2 }
        ];

        dirs.forEach(d => {
            const count = SUMOVehicles.getVehiclesByDir(d.dir).length;
            const queue = SUMOVehicles.getQueueLength(d.dir);

            // Count badge
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(d.x - 22, d.y - 12, 44, 28, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#00f0ff';
            ctx.font = 'bold 14px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(count.toString(), d.x, d.y + 4);

            ctx.fillStyle = 'rgba(255, 187, 0, 0.7)';
            ctx.font = '8px JetBrains Mono';
            ctx.fillText(`Q:${queue}`, d.x, d.y + 14);
            ctx.textAlign = 'left';
        });
    }

    // ===== DRONE =====
    function drawDrone(cx, cy) {
        const radius = 180;
        const dx = cx + Math.cos(droneAngle) * radius;
        const dy = cy + Math.sin(droneAngle) * radius * 0.4 - 60;

        // Drone shadow on ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(dx + 10, dy + 80, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Drone body
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(dx, dy, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Propellers
        const propAngle = time * 20;
        for (let i = 0; i < 4; i++) {
            const pa = (i * Math.PI / 2) + propAngle;
            const px = dx + Math.cos(pa) * 10;
            const py = dy + Math.sin(pa) * 4;
            ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Camera indicator
        ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(time * 4) * 0.3})`;
        ctx.beginPath();
        ctx.arc(dx, dy + 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Data uplink line
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + Math.sin(time * 2) * 0.05})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx, dy - 40);
        ctx.stroke();
        ctx.setLineDash([]);

        // Drone label
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.font = '8px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('UAV-01', dx, dy - 12);
        ctx.textAlign = 'left';
    }

    // ===== NETWORK LINES =====
    function drawNetworkLines(cx, cy, w, h) {
        // Cloud connection lines from corners to center
        const corners = [
            { x: 50, y: 30 },
            { x: w - 50, y: 30 },
            { x: 50, y: h - 60 },
            { x: w - 50, y: h - 60 }
        ];

        corners.forEach((c, i) => {
            const phase = time * 0.5 + i;
            ctx.setLineDash([4, 12]);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 + Math.sin(phase) * 0.04})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(cx, cy);
            ctx.stroke();

            // Cloud icon
            ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(phase) * 0.1})`;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('☁', c.x, c.y + 5);
            ctx.textAlign = 'left';
        });

        ctx.setLineDash([]);
    }

    // ===== VOLUMETRIC LIGHT =====
    function drawVolumetricLight(cx, cy) {
        // Subtle light rays from center
        const rayCount = 6;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + time * 0.1;
            const len = 300;
            const endX = cx + Math.cos(angle) * len;
            const endY = cy + Math.sin(angle) * len;

            const grad = ctx.createLinearGradient(cx, cy, endX, endY);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.03)');
            grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = 30;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    // ===== UTILITY =====
    function shadeColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + percent));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));
        return `rgb(${r},${g},${b})`;
    }

    return {
        init,
        render,
        resize,
        get canvas() { return canvas; },
        get ctx() { return ctx; }
    };
})();
