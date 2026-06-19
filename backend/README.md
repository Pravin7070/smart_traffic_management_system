# 🖥️ Backend - Smart Traffic Management System

Server-side infrastructure for the traffic management system, including static file serving, MongoDB persistence, and YOLO vehicle detection.

## Overview

This folder contains the backend server and supporting utilities:
- **Express.js Server** - Serves frontend files and provides API endpoints
- **MongoDB Database** - Stores event scenarios, event metrics, and traffic snapshots
- **YOLO Detection** - Python script for vehicle detection and classification
- **Static Assets** - Frontend files served by the server

## File Structure

```
backend/
├── server.js                   # Express.js server (entry point)
│                               # - Serves static files from ../frontend
│                               # - Handles root route
│                               # - Listens on port 3000
│
├── package.json                # Node dependencies
│                               # - express ^4.18.2
│
├── yolo/
│   ├── detect.py               # Vehicle detection script
│   │                           # - Uses YOLOv8n model
│   │                           # - Processes traffic frames
│   │                           # - Outputs traffic_data.json
│   │
│   ├── yolov8n.pt              # Pre-trained YOLO model
│   │                           # - YOLOv8 Nano weights
│   │                           # - ~6.2MB file size
│   │                           # - Optimized for speed
│   │
│   └── traffic_data.json        # Detection results
│                               # - Vehicle counts by type
│                               # - Timestamps
│                               # - Speed estimates
```

## How to Run

### Prerequisites

```
Node.js v14+ (for Express server)
MongoDB Community Server or Atlas (for Compass / backend database)
Python 3.8+ (for YOLO detection)
```

### MongoDB Compass Setup

MongoDB Compass connects to the same MongoDB server used by the backend.

1. Start a local MongoDB server or use an Atlas cluster.
2. Open MongoDB Compass.
3. Connect with one of these URIs:
   - `mongodb://127.0.0.1:27017`
   - `mongodb://localhost:27017`
   - your Atlas connection string
4. Open the database named `smart_traffic_management_system`.
5. Inspect these collections:
   - `event_scenarios`
   - `event_metrics`
   - `traffic_events`

If MongoDB is unavailable, the backend still runs and falls back to file-backed demo data.

### Installation

1. **From project root, install backend dependencies:**

```bash
npm install-backend
# or
cd backend && npm install
```

2. **Optional: Setup Python YOLO environment (if using detection)**

```bash
cd backend/yolo
pip install ultralytics opencv-python
```

### Starting the Server

From project root:
```bash
npm start
# or from backend folder:
npm start
```

From backend folder:
```bash
node server.js
# or
npm start
```

The server will start on `http://localhost:3000` and serve the frontend.

It also seeds MongoDB with default event scenarios and stores Event Mode snapshots automatically.

### Running YOLO Detection (Optional)

```bash
cd backend/yolo
python detect.py
```

Outputs detection results to `traffic_data.json`

### MongoDB Connection Settings

The backend defaults to the local MongoDB server used by Compass:

```bash
mongodb://127.0.0.1:27017
```

You can override it with environment variables:

```bash
set MONGODB_URI=mongodb://127.0.0.1:27017
set MONGODB_DB=smart_traffic_management_system
```

## Server Architecture

### Express.js Server (server.js)

**Purpose:**
- Serve frontend static files (HTML, CSS, JS)
- Provide root route handler
- Listen for incoming HTTP requests
- Enable CORS for API calls (if needed)

**Configuration:**
```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve everything from ../frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ...);
```

**How It Works:**
1. Client makes HTTP request to `http://localhost:3000`
2. Express receives request
3. Checks static files in `frontend/` folder
4. If found, serves file (index.html, styles.css, app.js, etc.)
5. If root route (/), explicitly serves index.html
6. Browser loads HTML, downloads JS, starts simulation

**File Serving Flow:**
```
Browser Request for index.html
        ↓
Express static middleware
        ↓
Looks in ../frontend/ directory
        ↓
Found: frontend/index.html
        ↓
Server responds with file + MIME type (text/html)
        ↓
Browser renders HTML, loads CSS and JavaScript
        ↓
JavaScript files (app.js, etc.) download
        ↓
app.js initializes simulation
```

## YOLO Vehicle Detection

### Detect.py Script

**Purpose:**
- Process traffic video/images using YOLOv8
- Detect and classify vehicles
- Output results to JSON

**What It Does:**
1. Loads YOLOv8n model (`yolov8n.pt`)
2. Captures video frames (from file or camera)
3. Runs object detection
4. Identifies: cars, trucks, buses, motorcycles
5. Counts by type
6. Estimates speeds (if tracking enabled)
7. Saves results to `traffic_data.json`

**Output Format:**
```json
{
  "timestamp": "2026-04-11T10:30:45",
  "frame_num": 1234,
  "total_vehicles": 24,
  "by_type": {
    "car": 18,
    "truck": 3,
    "bus": 2,
    "motorcycle": 1
  },
  "average_speed_kmh": 28.5,
  "detections": [
    {
      "id": "1",
      "class": "car",
      "confidence": 0.95,
      "x": 120,
      "y": 200,
      "width": 80,
      "height": 60,
      "speed_kmh": 32.5
    }
    // ... more detections
  ]
}
```

### Model Information

**YOLOv8n (Nano)**
- **Size**: ~6.2 MB
- **Speed**: Fast inference (~5-10ms per frame)
- **Accuracy**: 80-85% mAP
- **Use Case**: Real-time detection on edge devices

**Supported Classes:**
- person, bicycle, car, motorcycle, airplane, bus, train, truck, boat,...
- Total: 80 COCO dataset classes

### How to Use YOLO Results

1. **Run detection:**
   ```bash
   cd backend/yolo
   python detect.py
   ```

2. **Read traffic_data.json** in your application

3. **Parse vehicle counts:**
   ```javascript
   const data = require('./traffic_data.json');
   console.log(`Total vehicles: ${data.total_vehicles}`);
   console.log(`Cars: ${data.by_type.car}`);
   ```

4. **Use in frontend** (optional integration)

### MongoDB Data Model

#### `event_scenarios`
Stores the event definitions used by Event Mode:
- cricket
- concert
- festival
- school
- temple
- vip

#### `event_metrics`
Stores periodic Event Mode snapshots from the browser:
- phase
- traffic pressure
- congestion
- queue length
- throughput
- control flags

#### `traffic_events`
Stores SUMO test-event snapshots used by `/api/test-events`.

### MongoDB API Endpoints

- `GET /api/mongodb-status`
- `GET /api/event-mode/scenarios`
- `POST /api/event-mode/metrics`
- `GET /api/event-mode/metrics/latest`

## Project Structure Relationship

```
smart_traffic_management_system/
│
├── frontend/              ← Where frontend files are served FROM
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── ...
│
├── backend/               ← Backend infrastructure
│   ├── server.js         ← Serves frontend files
│   ├── package.json
│   └── yolo/
│       ├── detect.py
│       ├── yolov8n.pt
│       └── traffic_data.json
│
├── package.json           ← Root orchestration
├── README.md              ← Main project docs
└── MULTI_INTERSECTION_README.md

Request Flow:
┌─────────────────────────────────┐
│     Browser                      │
│  http://localhost:3000          │
└────────────┬────────────────────┘
             │ HTTP Request
             ↓
┌─────────────────────────────────┐
│  server.js (Express)             │
│  Listening on port 3000          │
└────────────┬────────────────────┘
             │ Static file lookup
             ↓
┌─────────────────────────────────┐
│  frontend/ directory             │
│  index.html, app.js, styles.css │
└────────────┬────────────────────┘
             │ Send files
             ↓
┌─────────────────────────────────┐
│     Browser                      │
│  Renders HTML + Runs JS          │
│  Simulation starts               │
└─────────────────────────────────┘
```

## Environment Variables

### Optional Configuration

```bash
# Port to listen on (default: 3000)
export PORT=3000

# Node environment (default: development)
export NODE_ENV=development
```

Set in command line or `.env` file if using dotenv package.

## Deployment

### Requirements

- Node.js v14+
- npm or yarn
- For YOLO: Python 3.8+, ultralytics package

### Deploy Steps

1. **Install dependencies:**
   ```bash
   npm install-all
   ```

2. **Start server:**
   ```bash
   npm start
   ```

3. **Access application:**
   - Open browser to `http://localhost:3000`
   - Or deploy to cloud (Heroku, Azure, AWS, etc.)

### Production Best Practices

- Use process manager (PM2, supervisor)
- Set NODE_ENV=production
- Use proper error logging
- Monitor server health
- Set up firewall rules
- Use HTTPS in production (with self-signed cert or real cert)
- Implement rate limiting for API endpoints

## Extending the Backend

### Adding API Endpoints

To add new HTTP endpoints:

```javascript
// In server.js
app.get('/api/traffic-stats', (req, res) => {
    // Read simulation data
    const data = require('./yolo/traffic_data.json');
    res.json(data);
});

app.post('/api/signal-control', (req, res) => {
    // Receive control commands
    const { direction, action } = req.body;
    // Process command...
    res.json({ status: 'ok' });
});
```

### Connecting to Frontend

In frontend JavaScript (e.g., app.js):

```javascript
// Fetch traffic data
async function getTrafficData() {
    const response = await fetch('/api/traffic-stats');
    const data = await response.json();
    console.log(data);
}

// Send control command
async function controlSignal(direction) {
    const response = await fetch('/api/signal-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, action: 'manual' })
    });
    const data = await response.json();
    console.log(data);
}
```

### Adding Middleware

```javascript
// CORS for cross-origin requests
const cors = require('cors');
app.use(cors());

// JSON parsing for POST requests
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
```

## Troubleshooting

### "Cannot find module 'express'"
```bash
npm install-backend
# or
cd backend && npm install
```

### "Port 3000 already in use"
```bash
# Use different port
PORT=3001 npm start

# Or kill existing process on 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### "YOLO model not found"
```bash
cd backend/yolo
# Redownload model
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

### "Frontend files not loading"
- Verify `../frontend/` directory exists
- Check file paths in server.js
- Inspect Network tab in DevTools
- Check browser console for 404 errors

## Performance Notes

### Server Performance

| Metric | Value |
|--------|-------|
| Static file serving | < 10ms |
| Concurrent requests | 1000+ |
| Memory footprint | ~30-50MB |
| CPU usage | < 5% idle |

### YOLO Performance

| Metric | Value |
|--------|-------|
| Inference time | 5-15ms per frame |
| Model size | 6.2 MB |
| CPU usage | 20-40% during inference |
| Python memory | 200-500MB |

## Related Documentation

- **Frontend**: See `../frontend/README.md`
- **Main Project**: See `../README.md`
- **Multi-Intersection**: See `../MULTI_INTERSECTION_README.md`
- **YOLO Docs**: https://docs.ultralytics.com/
- **Express Docs**: https://expressjs.com/

---

**Backend Version**: 1.0 | **Last Updated**: April 11, 2026
