# 🚦 Smart Traffic Management System

A cutting-edge, real-time traffic simulation and management system featuring adaptive signal control, multi-intersection synchronization, emergency vehicle preemption, and advanced analytics.

## 🚀 Quick Start

```bash
# Install and run
npm install-backend
npm start

# Open browser
http://localhost:3000
```

## 📖 Full Documentation

**For complete, detailed documentation including:**
- ✅ All features explained
- ✅ How the system works
- ✅ Installation & setup steps
- ✅ Keyboard controls & shortcuts
- ✅ Module explanations
- ✅ Traffic signal algorithms
- ✅ Multi-intersection coordination
- ✅ Vehicle physics
- ✅ Emergency handling
- ✅ Troubleshooting & tips

**→ See: [COMPREHENSIVE_README.md](COMPREHENSIVE_README.md)**

## 📋 Quick Reference

### Keyboard Controls
| Key | Action |
|-----|--------|
| `SPACE` | Pause/Resume |
| `E` | Emergency vehicle |
| `G` | Green-wave sync |
| `A` | Alternating sync |
| `O` | Offset sync |
| `I` | Independent mode |
| `H` | Help overlay |
| `S` | Speed toggle |
| `R` | Reset simulation |

### Key Features
- 🚗 Realistic vehicle physics (Krauss model)
- 🚦 Actuated signal control (demand-responsive)
- 🌉 4 multi-intersection coordination modes
- 🚨 Emergency vehicle preemption
- 📊 Real-time metrics & analytics
- 🎯 Collision avoidance
- 🤖 YOLO vehicle detection (optional)

## 📂 Project Structure

```
smart_traffic_management_system/
├── frontend/              # Browser-side code
├── backend/               # Server & Python scripts
├── COMPREHENSIVE_README.md  # Full documentation
├── package.json           # Root config
└── .gitignore
```

## 🛠️ Technologies

- **JavaScript** (ES6+) - Simulation & UI
- **HTML5 & CSS3** - Layout & styling
- **Node.js & Express** - Backend server
- **Canvas 2D API** - Real-time rendering
- **Python & YOLO** - Vehicle detection (optional)

## 🔗 Related Files

- [Full Documentation](COMPREHENSIVE_README.md) - Complete guide
- [Frontend Code](frontend/README.md) - Frontend module docs
- [Backend Code](backend/README.md) - Backend setup
- [.gitignore](.gitignore) - Git configuration

## 📝 License

MIT License - See LICENSE file for details

---

**→ Start with [COMPREHENSIVE_README.md](COMPREHENSIVE_README.md) for full details!**
     ↓
Backend Server (Express.js)
     ├─ Serves frontend files
     ├─ API endpoints (future)
     └─ Static file middleware
     ↓
     │ Files downloaded (HTML, CSS, JS)
     ↓
 ┌─ Frontend Code (All JavaScript)
 │  ├─ Simulation Logic
 │  ├─ Canvas Rendering
 │  ├─ Dashboard Updates
 │  └─ User Controls
 │  
 └─ Python Backend (Optional)
    └─ YOLO Vehicle Detection
```

---

## Key Features

### ✅ Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| **4-Way Intersection Simulation** | ✅ Complete | Realistic intersection with 4 lanes (N, S, E, W) |
| **Actuated Signal Control** | ✅ Complete | Demand-responsive 8-phase signaling |
| **Vehicle Physics** | ✅ Complete | Krauss car-following model with acceleration/deceleration |
| **Collision Detection** | ✅ Complete | Prevents vehicles from colliding at lane merges |
| **Live Dashboard** | ✅ Complete | Real-time metrics for all directions |
| **Emergency Preemption** | ✅ Complete | Green priority for emergency vehicles |
| **Speed Controls** | ✅ Complete | 1x, 2x, 4x, and 0.5x simulation speeds |

### ✨ Advanced Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Multi-Intersection Sync** | ✅ Complete | Coordinate 2+ intersections with multiple strategies |
| **Sync Visualization Panel** | ✅ Complete | On-screen status showing both intersections |
| **YOLO Detection Integration** | ✅ Complete | Identify vehicle types and counts |
| **Smart Spawn System** | ✅ Complete | Vehicles spawn weighted towards available green lights |
| **Particle Effects** | ✅ Complete | Visual effects for vehicles, lights, and events |
| **Volumetric Lighting** | ✅ Complete | Cinematic lighting at intersection |
| **Keyboard Control** | ✅ Complete | Full control via keyboard shortcuts |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TRAFFIC SIMULATION                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  SUMO Vehicles   │  │  SUMO Signals    │             │
│  │  (Krauss Model)  │  │  (8-Phase)       │             │
│  └────────┬─────────┘  └────────┬─────────┘             │
│           │                     │                        │
│  ┌────────▼─────────────────────▼──────────┐            │
│  │       SUMO Detectors (Queue Count)       │            │
│  └────────┬─────────────────────────────────┘            │
│           │                                  │            │
│  ┌────────▼──────────────────────────────────▼─────┐     │
│  │  Multi-Intersection Sync Controller (2 signals) │     │
│  │  - Green-wave, Alternating, Offset, Independent│     │
│  └────────┬──────────────────────────────────────┬─┘     │
│           │                                      │        │
│  ┌────────▼──────────────────┐     ┌────────────▼──┐   │
│  │   Renderer (Canvas 2D)     │     │  Dashboard    │   │
│  │  - Roads, Vehicles, Lights │     │  - Metrics    │   │
│  │  - Sync Panel              │     │  - Charts     │   │
│  └────────────────────────────┘     └───────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │        YOLO Detection (Python Backend)            │   │
│  │        - Vehicle Type Classification              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Technologies Used

### Frontend
- **HTML5 / CSS3** - UI and styling
- **Canvas API** - 2D rendering of intersection
- **Vanilla JavaScript** - Core simulation logic
- **Node.js / Express.js** - Backend server

### Simulation Engine
- **SUMO (Simulation of Urban Mobility)** - Vehicle physics and traffic modeling
- **Krauss Car-Following Model** - Realistic vehicle acceleration/deceleration
- **Actuated Signal Control** - Demand-responsive traffic light timing

### Detection & Analysis
- **YOLOv8n** - Vehicle detection and classification
- **Python** - Backend for YOLO processing

### Visualization
- **Canvas 2D Context** - Real-time rendering
- **Particle Effects** - Visual feedback
- **Cinematic Lighting** - Volumetric light effects

---

## Installation & Setup

### Prerequisites
```
- Node.js (v14+)
- Python 3.8+ (only if using YOLO detection)
- Modern web browser (Chrome, Firefox, Edge)
```

### Step 1: Install Backend Dependencies

From project root:
```bash
npm install-backend
```

Or manually:
```bash
cd backend
npm install
cd ..
```

This installs Express.js and other Node dependencies.

### Step 2: Download YOLO Model (Optional)
The YOLOv8n model is already included (`backend/yolo/yolov8n.pt`). If you need to re-download:

```bash
cd backend/yolo
pip install ultralytics opencv-python
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
cd ../..
```

### Step 3: Start the Server

**From project root:**
```bash
npm start
```

**Or from backend folder:**
```bash
cd backend
npm start
cd ..
```

The server starts on `http://localhost:3000` and serves the frontend from the `frontend/` folder.

---

## How to Run

### Starting the Simulation

1. **Install dependencies** (if not done yet):
   ```bash
   npm install-backend
   ```

2. **Start the server** from project root:
   ```bash
   npm start
   ```
   Server will start at `http://localhost:3000`

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

4. **Simulation starts automatically** - Traffic begins flowing immediately

5. **Monitor the dashboard** - Watch live metrics update in real-time

6. **Use keyboard controls** - Press `H` for help overlay

### Basic Controls

| Key | Action |
|-----|--------|
| **SPACE** | Pause / Resume |
| **E** | Spawn Emergency Vehicle |
| **S** | Cycle Speed (1x → 2x → 4x → 0.5x) |
| **H** | Show Help Overlay |

### Multi-Intersection Sync Controls

| Key | Action |
|-----|--------|
| **G** | Green-Wave Sync Mode |
| **A** | Alternating Sync Mode |
| **O** | Offset Sync Mode |
| **I** | Independent (No Sync) |
| **.** | Increase Offset |
| **,** | Decrease Offset |

---

## Controls & Shortcuts

### Dashboard Controls (UI Buttons)

- **⏸️ PAUSE/RESUME** - Toggle simulation pause
- **⚡ SPEED** - Click to cycle through speeds
- **🚨 EMERGENCY** - Trigger emergency vehicle

### Keyboard Shortcuts

```
SIMULATION CONTROL:
  SPACE  = Pause/Resume simulation
  E      = Spawn emergency vehicle
  S      = Cycle speed (1x, 2x, 4x, 0.5x)
  
MULTI-INTERSECTION SYNC:
  G      = Green-Wave mode (recommended)
  A      = Alternating mode
  O      = Offset mode
  I      = Independent mode
  .      = Increase sync offset
  ,      = Decrease sync offset
  
HELP:
  H      = Show/Hide keyboard shortcuts
```

For detailed keyboard help, press **H** in the simulation to see the interactive help overlay.

---

## Project Structure

```
smart_traffic_management_system/
│
├── 📂 frontend/                    # Client-side code (all runs in browser)
│   ├── index.html                  # Main HTML page
│   ├── styles.css                  # Styling (intersection, dashboard, effects)
│   ├── README.md                   # Frontend documentation
│   │
│   ├── app.js                      # Main app controller & simulation loop
│   ├── renderer.js                 # Canvas rendering engine
│   │                               # - Roads, vehicles, traffic lights
│   │                               # - Sync panel, help overlay
│   │                               # - Particle effects
│   │
│   ├── dashboard.js                # Live metrics dashboard
│   │                               # - Queue counts per direction
│   │                               # - Vehicle speeds
│   │                               # - Signal timers
│   │                               # - Performance charts
│   │
│   ├── collision-system.js         # Collision detection & prevention
│   │                               # - Lane merge detection
│   │                               # - Vehicle separation logic
│   │
│   ├── sumo-network.js             # SUMO network topology
│   │                               # - Road layout definition
│   │                               # - Lane specifications
│   │                               # - Intersection geometry
│   │
│   ├── sumo-vehicles.js            # Vehicle management
│   │                               # - Vehicle spawning
│   │                               # - Movement (car-following)
│   │                               # - Emergency vehicles
│   │
│   ├── sumo-signals.js             # Traffic signal control
│   │                               # - 8-phase signal model
│   │                               # - Actuated control logic
│   │                               # - Phase timing
│   │
│   ├── sumo-detectors.js           # Queue detection
│   │                               # - Lane occupancy
│   │                               # - Vehicle counting
│   │
│   └── multi-intersection.js        # Multi-intersection coordinator
│                                   # - 4 sync modes
│                                   # - Synchronized control
│                                   # - Status tracking
│
├── 📂 backend/                     # Server-side code
│   ├── server.js                   # Express.js server
│   │                               # - Serves frontend files
│   │                               # - Listens on port 3000
│   │
│   ├── package.json                # Backend Node dependencies
│   ├── README.md                   # Backend documentation
│   │
│   └── 📂 yolo/                    # Vehicle detection system
│       ├── detect.py               # YOLO detection script
│       ├── traffic_data.json       # Detection results
│       └── yolov8n.pt              # Pre-trained YOLO model
│
├── 📄 package.json                 # Root project config
│                                   # - Scripts for npm start
│                                   # - Orchestration
│
├── 📄 README.md                    # Main project documentation (this file)
├── 📄 MULTI_INTERSECTION_README.md # Multi-intersection feature guide
└── Other files (.gitignore, etc.)
```

### Frontend vs Backend Organization

| Aspect | Frontend (browser) | Backend (server) |
|--------|-------------------|-----------------|
| **Location** | `frontend/` | `backend/` |
| **Technology** | HTML/CSS/JavaScript | Node.js/Express |
| **Responsibility** | UI, Rendering, Logic | Serving Files, APIs |
| **Runs On** | Client Browser | Server |
| **Files** | index.html, CSS, JS modules | server.js, package.json |
| **Dependencies** | None (browser native) | Express.js, (Python) |

---

## Core Modules

### 🚗 **sumo-vehicles.js**
Manages all vehicles in the simulation using the Krauss car-following model.

**Key Functions:**
- `spawnVehicle(direction)` - Create new vehicle from north/south/east/west
- `spawnEmergency(direction)` - Create priority emergency vehicle
- `update(dt, signalStates)` - Update vehicle positions and behavior
- `getCount()` - Return current vehicle count

**Car-Following Logic:**
```
v_desired = max_speed * (1 - (position / headway)^2)
acceleration = min(acceleration, v_desired - current_v)
```

### 🚦 **sumo-signals.js**
Implements actuated traffic signal control with 8-phase model.

**8-Phase Signal Model:**
```
Phase 0: ┌─────────────────────┐
         │ G (North) | r (South) |
         │ r (East)  | r (West)  │
         └─────────────────────┘

Phase 1: Yellow (North)
Phase 2: All red
Phase 3: ┌──────────────────────┐
         │ r (North) | G (South) │
         │ r (East)  | r (West)  │
         └──────────────────────┘
... (continues for East/West)
```

**Actuated Control:**
- Minimum green: 8 seconds
- Maximum green: 30 seconds
- No activity detection: 2.5 seconds (end phase early)
- Yellow duration: 4 seconds

### 📊 **sumo-detectors.js**
Measures traffic demand using virtual detectors on each lane.

**Detector Measurements:**
- Queue length (vehicles waiting)
- Density (vehicles per meter)
- Average speed
- Flow rate (vehicles per time)

### 🔄 **collision-system.js**
Prevents unrealistic vehicle collisions at lane merges and intersections.

**Collision Detection:**
- Lane merge points (where vehicles cross paths)
- Safe separation distances
- Automatic deceleration if collision risk detected

### 🎨 **renderer.js**
Canvas-based 2D visualization of the intersection.

**Rendered Elements:**
- Roads and lanes with markings
- Stop lines and crosswalks
- Traffic lights (green, yellow, red)
- Vehicles (with heading/velocity visualization)
- Detectors and sensor points
- City buildings and backdrop
- Particle effects
- Multi-intersection sync panel
- Interactive help overlay

### 📱 **dashboard.js**
Real-time metrics display showing:
- Current simulation step
- Vehicle counts per direction
- Signal phase and timing
- Queue lengths (bar charts)
- Vehicle speeds
- Detection data
- Signal control parameters

### 🔗 **multi-intersection.js**
Coordinates traffic signals across 2 intersections.

**4 Synchronization Modes:**

1. **Green-Wave** - Secondary green starts 3s after main green
2. **Alternating** - Phases alternate between main and secondary
3. **Offset** - Configurable delay (0-10s) between intersections
4. **Independent** - No coordination (baseline comparison)

---

## Traffic Signal System

### How Actuated Control Works

The traffic signal doesn't use fixed timing. Instead, it adapts to traffic demand:

```
State Machine Example:
┌─────────────────────────────────────────────────────────┐
│ Phase 0: North/South Green                               │
│                                                           │
│ Timer 0s:   ▼ North queue detected → Start phase        │
│ Timer 8s:   ▼ 8 sec minimum reached → Can change        │
│ Timer 8-30s: ▼ Stay green while N/S has demand          │
│ Timer 15s:  ▼ No new vehicles (max gap 2.5s) → Yellow   │
│ Timer 19s:  ▼ All-red (2s clearance interval)           │
│ Timer 21s:  ▼ East/West Green → Repeat for other dir   │
└─────────────────────────────────────────────────────────┘
```

### Phase Timing Parameters

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `minGreen` | 8s | Minimum time to stay green |
| `maxGreen` | 30s | Maximum time to stay green |
| `maxGap` | 2.5s | No activity before cycling |
| `yellow` | 4s | Yellow light duration |
| `allRed` | 2s | Safety clearance interval |

---

## Multi-Intersection Synchronization

### Why Synchronize Intersections?

In real cities, adjacent traffic signals coordinate to:
- Create "green waves" for smooth traffic flow
- Reduce stops and delays
- Balance traffic distribution
- Improve throughput and safety

### The 4 Sync Modes

#### 1️⃣ **Green-Wave Mode** (Default)
```
Time 0s:   [Main: ■ GREEN]  [Secondary: □ RED]
Time 3s:   [Main: ■ GREEN]  [Secondary: ■ GREEN] ← Wave starts
Time 8s:   [Main: □ RED]    [Secondary: ■ GREEN] ← Wave continues
Time 11s:  [Main: □ RED]    [Secondary: □ RED]
Time 13s:  [Main: ■ GREEN]  [Secondary: □ RED]   ← Repeats
```
**Best for**: High-volume corridors, through-traffic optimization

#### 2️⃣ **Alternating Mode**
```
Time 0s:   [Main: ■ GREEN]  [Secondary: □ RED]
Time 8s:   [Main: □ RED]    [Secondary: ■ GREEN] ← Alternate
Time 16s:  [Main: ■ GREEN]  [Secondary: □ RED]   ← Repeat
```
**Best for**: Balanced traffic distribution, two-way streets

#### 3️⃣ **Offset Mode**
```
Offset = 3 seconds (adjustable with . and , keys)

Time 0s:   [Main: ■ GREEN]  [Secondary: □ RED]
Time 3s:   [Main: ■ GREEN]  [Secondary: ■ GREEN] ← Flexible wave
Time 6s:   [Main: ■ GREEN]  [Secondary: ■ GREEN]
```
**Best for**: Fine-tuning coordination, special configurations

#### 4️⃣ **Independent Mode**
```
Each intersection operates on its own demand-responsive logic
No coordination or synchronization
```
**Best for**: Testing, baseline comparison, autonomous operation

### Viewing Sync Status

The **sync panel** (top-right corner) shows:
- Both intersection states (GREEN, RED, YELLOW)
- Current sync mode
- Sync offset value (in seconds)
- Visual connection indicator

---

## Vehicle Detection (YOLO)

### Integration

The system includes YOLOv8 object detection for vehicles. This allows:
- Vehicle type classification (car, truck, bus, motorcycle)
- Real-time counting by type
- Speed and behavior analysis
- Data logging to `traffic_data.json`

### Running YOLO Detection

```bash
cd backend/yolo
python detect.py
```

Outputs detection results to `backend/yolo/traffic_data.json`

### Detection Results

```json
{
  "timestamp": "2026-04-11T10:30:45",
  "total_vehicles": 24,
  "by_type": {
    "car": 18,
    "truck": 3,
    "bus": 2,
    "motorcycle": 1
  },
  "average_speed": 28.5
}
```

---

## Dashboard Metrics

The live dashboard displays:

### Per-Direction Metrics (N, S, E, W)
- **Queue Count**: Vehicles waiting at signal
- **Density**: Vehicles per meter of lane
- **Speed**: Average velocity
- **Signal Timer**: Seconds remaining in current color

### Global Metrics
- **Simulation Step**: Current timestep number
- **Total Vehicles**: Active vehicles in system
- **Current Phase**: Which direction(s) have green
- **Throughput**: Vehicles passing through per minute

### Performance Charts
- **Density Over Time**: Queue buildup patterns
- **Throughput Over Time**: System capacity utilization

### Emergency Indicators
- **Emergency Status**: Active emergency vehicle preemption
- **EV Count**: Number of emergency vehicles in system

---

## Advanced Features

### Emergency Vehicle Preemption

Press **E** to trigger an emergency vehicle:

1. Random direction selected (N, S, E, W)
2. High-priority vehicle spawned
3. Signal states immediately switch to all-green for that direction
4. Vehicle moves at high speed (40+ m/s)
5. 20-second preemption window
6. After 20s, normal actuated control resumes

**Use Case**: Ambulance, fire truck, police vehicle priority

### Speed Multiplier

Press **S** to cycle through speeds:
- **1×** - Real-time (1 second = 1 second)
- **2×** - 2× faster (1 second = 2 seconds simulated)
- **4×** - 4× faster (1 second = 4 seconds simulated)
- **0.5×** - Slow motion (1 second = 0.5 seconds simulated)

Useful for:
- Speeding up observation (4× to see patterns quickly)
- Slow motion analysis (0.5× to watch specific vehicles)

### Pause/Resume

Press **SPACE** to pause/resume. While paused:
- Settings still work (you can switch sync modes)
- Dashboard freezes at current state
- Perfect for analysis and screenshots

---

## Performance & Optimization

### System Specifications

| Metric | Value |
|--------|-------|
| Target FPS | 60 |
| Typical CPU | <15% (modern CPU) |
| Memory Usage | ~50-100 MB |
| Max Vehicles | 30 (configurable) |
| Simulation Timestep | 0.016s (60 Hz) |

### Optimization Techniques

1. **Spatial Partitioning** - Collision checks use grid acceleration
2. **Particle Pooling** - Reuse particle objects to reduce GC
3. **Canvas Caching** - Background drawn once per frame
4. **LOD Rendering** - Distant objects use lower detail
5. **Detector Sampling** - Detectors check vehicles every frame (efficient)

---

## Troubleshooting

### "No vehicles appear"
- Check that max vehicles > 0 (should be 30 by default)
- Verify spawn timer isn't stuck
- Check browser console for errors

### "Traffic lights not changing"
- Verify actuated signal logic is running
- Check detector values (should show queue count)
- Try switching sync modes with G/A/O/I

### "Sync panel showing incorrect state"
- Refresh the page
- Check that `multi-intersection.js` is loaded (check Network tab)
- Verify synchronization is not in 'independent' mode

### "YOLO detection not working"
- Start Python server: `python detect.py`
- Check `yolo/yolov8n.pt` model exists
- Verify `traffic_data.json` is being written

### "Collision warnings in console"
- This is normal behavior (detection system working)
- Vehicles automatically adjust to avoid collisions
- Check collision-system.js for threshold values if too aggressive

---

## Future Roadmap

- [ ] Add 3rd, 4th, 5th intersections in a grid
- [ ] Pedestrian crossing simulation
- [ ] Transit bus priority lanes
- [ ] Bike lane support
- [ ] Real-world traffic pattern data import
- [ ] ML-based optimal signal timing
- [ ] Adaptive sync based on congestion
- [ ] Export simulation data to CSV
- [ ] Replay simulation from recorded data
- [ ] Web API for remote control
- [ ] Multi-user collaboration

---

## Contributing

This project is part of a smart city traffic management research initiative. To contribute:

1. Create a new branch for your feature
2. Test thoroughly with different traffic patterns
3. Document any new modules or major changes
4. Submit a pull request with description

---

## License

This project is for educational and research purposes.

---

## More Information

### Documentation Files

- **[frontend/README.md](frontend/README.md)** - Frontend architecture, modules, rendering pipeline, debugging
- **[backend/README.md](backend/README.md)** - Backend server setup, YOLO detection, deployment
- **[MULTI_INTERSECTION_README.md](MULTI_INTERSECTION_README.md)** - Multi-intersection sync modes and usage

### External Resources

- **SUMO Documentation**: https://sumo.dlr.de/
- **YOLO Documentation**: https://docs.ultralytics.com/
- **Express.js Docs**: https://expressjs.com/

---

## Quick Start Checklist

- [ ] Install Node.js and Python
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Open `http://localhost:3000`
- [ ] Press `H` for keyboard shortcuts
- [ ] Try pressing `G` to enable green-wave sync
- [ ] Press `E` to spawn an emergency vehicle
- [ ] Press `S` to change simulation speed
- [ ] Press `Space` to pause and observe

---

**Version**: 1.0  
**Last Updated**: April 11, 2026  
**Status**: ✅ Production Ready

Enjoy managing your smart traffic intersection! 🚦
