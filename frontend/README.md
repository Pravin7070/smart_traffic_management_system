# 🎨 Frontend - Smart Traffic Management System

Interactive web-based visualization and control interface for the traffic simulation system.

## Overview

This folder contains all client-side code that runs in the browser, including:
- **HTML UI** - Dashboard and control panels
- **CSS Styling** - Glassmorphic design system
- **Canvas Rendering** - Real-time 2D intersection visualization
- **Simulation Logic** - Traffic dynamics and signal control
- **Dashboard** - Live metrics and monitoring
- **Multi-Intersection Sync** - Coordination visualization

## File Structure

```
frontend/
├── index.html                  # Main HTML page (entry point)
├── styles.css                  # All CSS styling
│
├── app.js                      # Main app controller
│                               # - Simulation loop (requestAnimationFrame)
│                               # - Keyboard shortcuts
│                               # - Module initialization
│                               # - Vehicle spawning logic
│
├── renderer.js                 # Canvas rendering engine
│                               # - Intersection visualization
│                               # - Traffic lights, roads, vehicles
│                               # - Particle effects & lighting
│                               # - Sync panel display
│                               # - Help overlay
│
├── dashboard.js                # Live metrics dashboard
│                               # - Queue counts, speeds
│                               # - Signal timers
│                               # - Performance charts
│                               # - Real-time updates
│
├── collision-system.js         # Collision detection & prevention
│                               # - Lane merge detection
│                               # - Vehicle separation logic
│
├── sumo-network.js             # SUMO network topology
│                               # - Road layout & geometry
│                               # - Lane definitions
│                               # - Intersection structure
│
├── sumo-vehicles.js            # Vehicle management (Krauss model)
│                               # - Vehicle spawning
│                               # - Car-following physics
│                               # - Emergency vehicles
│                               # - Movement & acceleration
│
├── sumo-signals.js             # Traffic signal control
│                               # - 8-phase signal model
│                               # - Actuated control algorithm
│                               # - Emergency preemption
│                               # - Timing logic
│
├── sumo-detectors.js           # Queue detection sensors
│                               # - Vehicle counting
│                               # - Lane occupancy
│                               # - Speed/density measurement
│
└── multi-intersection.js        # Multi-intersection sync
                                # - 4 sync modes (green-wave, etc)
                                # - Coordination logic
                                # - Status tracking
```

## How It Works - The Rendering Pipeline

```
1. Browser requests index.html
   ↓
2. index.html loads all JavaScript modules
   ↓
3. app.js initializes:
   - Renderer (canvas setup)
   - Dashboard (DOM references)
   - SUMO modules (vehicles, signals, detectors)
   - Multi-intersection controller
   - Keyboard listeners
   ↓
4. app.js starts main loop (requestAnimationFrame)
   ↓
5. Each frame (~60fps):
   a) Update detectors (measure traffic)
   b) Update signals (actuated control logic)
   c) Update multi-intersection sync
   d) Update vehicles (car-following + collision)
   e) Spawn new vehicles (probabilistic)
   f) Render everything (canvas + dashboard)
   ↓
6. User interactions (keyboard):
   - SPACE: Pause/Resume
   - E: Emergency vehicle
   - S: Speed multiplier
   - G/A/O/I: Sync modes
   - H: Help overlay
```

## Key Modules

### app.js - Application Controller

**Responsibilities:**
- Manages simulation loop (requestAnimationFrame)
- Coordinates module updates
- Handles keyboard shortcuts
- Manages pause/resume state
- Spawns vehicles at timed intervals

**Update Sequence (Each Frame):**
```javascript
1. SUMODetectors.update(dt)  // Measure queues
2. SUMOSignals.update(dt)     // Actuated logic
3. MultiIntersection.updateSync(dt)  // Sync signals
4. SUMOVehicles.update(dt)    // Move vehicles
5. Spawn new vehicles if needed
6. Renderer.render(dt)        // Draw everything
7. Dashboard.update()         // Update metrics
```

### renderer.js - Canvas 2D Visualization

**Renders:**
- City background with grid
- Buildings in different districts
- Road network with lane markings
- Traffic light signals with colors
- Vehicle sprites with heading vectors
- Detector sensor indicators
- Crosswalks and stop lines
- Particle effects (emissions, spark)
- Volumetric lighting effects
- Multi-intersection sync panel
- Help overlay

**Performance Optimizations:**
- Background gradient cached
- Particle pooling to reduce GC
- Canvas clear + redraw every frame
- Only recompute affected areas

### dashboard.js - Live Metrics

**Displays:**
- Current simulation step
- Total vehicle count
- Queue lengths (per direction with bar charts)
- Signal timers (seconds for each direction)
- Average speeds
- Signal phase state
- Emergency status
- SUMO parameters

**Updates:**
- DOM elements directly
- Bound to simulation data via SUMODetectors, SUMOSignals
- Refreshes every frame from app.js

### sumo-vehicles.js - Vehicle Physics

**Implements Krauss Car-Following Model:**
```
v_desired = v_max * (1 - (x_gap / x_d)^2)
a = min(a_max, v_desired - v_current)
```

**Features:**
- Realistic acceleration/deceleration
- Collision awareness
- Lane assignment
- Direction-based spawning
- Emergency vehicle priority
- Speed constraints per lane

### sumo-signals.js - Actuated Control

**8-Phase Model:**
```
Phases 0,1 = North/South movements + yellow + all-red
Phases 2,3 = East/West movements + yellow + all-red
(Repeats)
```

**Actuated Logic:**
- Minimum green: 8 seconds
- Maximum green: 30 seconds
- Maximum gap without detection: 2.5 seconds
- Yellow: 4 seconds
- All-red clearance: 2 seconds
- Emergency preemption: Override to all-green for one direction

### multi-intersection.js - Sync Coordination

**4 Sync Modes:**

1. **Green-Wave** (GW)
   - Secondary green = Main green + syncOffset
   - syncOffset default: 3 seconds
   - Result: "Wave" of green lights

2. **Alternating** (ALT)
   - Phases trade off between intersections
   - Perfect 50/50 timing split
   - Continuous coordination

3. **Offset** (OFFSET)
   - Configurable delay (0-10s)
   - User adjustable with . and , keys
   - Fine-tuned synchronization

4. **Independent** (IND)
   - No synchronization
   - Each operates autonomously
   - Baseline comparison mode

**Status Tracking:**
- Current sync mode
- Offset value in seconds
- Intersection states (GREEN/RED/YELLOW)
- Stats available to renderer

## Interaction Flow

### User Presses Key

```
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') → App pause toggle
  else if (e.code === 'KeyG') → MultiIntersection.switchSyncMode('green-wave')
  else if (e.code === 'KeyA') → MultiIntersection.switchSyncMode('alternating')
  // ... other modes
  else if (e.code === 'Period') → Increase sync offset
  else if (e.code === 'Comma') → Decrease sync offset
});
```

### Dashboard Button Click

```
btnPause.addEventListener('click', () => {
  App.paused = !App.paused;
  Update UI to show pause state;
  Stop/start pulse animation;
});

btnSpeed.addEventListener('click', () => {
  Cycle through [1x, 2x, 4x, 0.5x];
  Update speedMultiplier in app.js;
});

btnEmergency.addEventListener('click', () => {
  SUMOVehicles.spawnEmergency(randomDirection);
  SUMOSignals.activateEmergency(direction);
  Show visual feedback;
});
```

## Browser Dependencies

- **HTML Canvas API** - 2D rendering context
- **requestAnimationFrame** - Smooth 60fps loop
- **DOM APIs** - Dashboard updates
- **Event Listeners** - Keyboard/mouse input
- **localStorage** (optional) - Preferences
- **Performance API** - Frame timing

**No External Libraries Required** ✅
- Pure vanilla JavaScript
- No jQuery, React, Vue, etc.
- Canvas rendering without Three.js
- Minimal browser APIs usage

## Performance Characteristics

| Metric | Target | Typical |
|--------|--------|---------|
| FPS | 60 | 55-60 |
| Frame Time | 16.7ms | 12-15ms |
| CPU Usage | <20% | 8-15% |
| Memory | <100MB | 50-80MB |
| Vehicle Count | 30 max | 20-30 |

## Debugging Tips

### Enable Console Logging

Open browser DevTools (F12) and check Console for:
- Sync mode changes: `[SYNC] Green-wave mode activated`
- Vehicle spawning: Position and direction logs
- Collision detections: Warning messages
- Frame rate: No errors should appear

### Check Canvas Performance

1. Open DevTools
2. Go to Performance tab
3. Record 5-10 seconds
4. Check for long frames (>16.7ms)
5. Identify bottleneck functions

### Inspect Live Data

In Console, run:
```javascript
window.SUMOVehicles.getCount()     // Current vehicles
window.SUMOSignals.signalStates    // Current signal phase
window.SUMODetectors.e2Data        // Current queue counts
window.MultiIntersection.getStats() // Sync info
```

## Common Issues

**"Canvas is blank but not frozen"**
- Check if render() is being called
- Verify ctx not null
- Check canvas size is correct

**"Vehicles not moving"**
- Verify update() is called each frame
- Check speedMultiplier > 0
- Inspect SUMOSignals state

**"Sync panel not showing"**
- Verify multi-intersection.js loaded
- Check window.MultiIntersection exists
- Ensure drawMultiIntersectionPanel() called

**"High CPU usage"**
- Check particle count (pooling may be leaking)
- Profile canvas operations
- Check for memory leaks in detectors

## Development Workflow

1. **Edit source file** (e.g., sumo-vehicles.js)
2. **Refresh browser** (Ctrl+R or Cmd+R)
3. **Check Console** for errors
4. **Use DevTools debugger** to step through code
5. **Monitor Performance** tab for bottlenecks

## Adding New Features

To add a new frontend feature:

1. **Create new module** (e.g., `my-feature.js`)
2. **Add to index.html** (`<script src="my-feature.js"></script>`)
3. **Integrate into app.js** update loop
4. **Add controls** to keyboard/button handlers
5. **Add visualization** if needed in renderer.js
6. **Test** in browser with DevTools

## Related Documentation

- **Backend**: See `../backend/README.md`
- **Multi-Intersection Guide**: See `../MULTI_INTERSECTION_README.md`
- **Main README**: See `../README.md`

---

**Frontend Version**: 1.0 | **Last Updated**: April 11, 2026
