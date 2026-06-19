# Smart Traffic Management System - Professional Project Structure

## 📋 Project Overview
Enterprise-grade AI-based adaptive traffic signal control system with real-time vehicle detection, event management, and comprehensive analytics dashboard. Built with Node.js + Express backend, MongoDB persistence, and vanilla JavaScript modular frontend.

---

## 🗂️ Directory Structure

```
smart_traffic_management_system/
├── backend/                          # Node.js + Express API server
│   ├── config/
│   │   └── database.js              # MongoDB connection (singleton pattern)
│   ├── controllers/                 # Business logic layer
│   │   ├── alertController.js       # Alert CRUD operations
│   │   ├── analyticsController.js   # Analytics & metrics
│   │   ├── eventController.js       # Event scenario management
│   │   ├── intersectionController.js # Intersection operations
│   │   ├── parkingController.js     # Parking zone management
│   │   ├── signalController.js      # Traffic signal control
│   │   └── vehicleController.js     # Vehicle detection & tracking
│   ├── models/                      # Data schema definitions
│   │   ├── Alert.js
│   │   ├── Analytics.js
│   │   ├── Event.js
│   │   ├── Intersection.js
│   │   ├── Parking.js
│   │   ├── Signal.js
│   │   └── Vehicle.js
│   ├── routes/                      # API endpoint handlers
│   │   ├── api/
│   │   │   ├── alerts.js
│   │   │   ├── analytics.js
│   │   │   ├── events.js
│   │   │   ├── intersections.js
│   │   │   ├── parking.js
│   │   │   ├── signals.js
│   │   │   ├── status.js
│   │   │   └── vehicles.js
│   │   └── pages.js                 # HTML page routes
│   ├── utils/
│   │   └── seedDatabase.js          # Auto-seed collections & data
│   ├── .env                         # Environment configuration
│   ├── package.json
│   ├── README.md
│   └── server.js                    # Express app entry point (94 lines)
│
├── frontend/                         # Client-side application
│   ├── assets/
│   │   ├── images/                  # UI graphics & icons
│   │   ├── styles/
│   │   │   ├── main.css            # Primary stylesheet
│   │   │   ├── event-mode.css      # Event Mode theme
│   │   │   ├── insights.css        # Analytics theme
│   │   │   └── events.json         # SUMO event data
│   │   └── ...
│   ├── js/
│   │   ├── api/
│   │   │   └── client.js           # Centralized API client (25+ methods)
│   │   ├── modules/                # Feature modules (IIFE pattern)
│   │   │   ├── collision-system.js     # Collision detection & alerts
│   │   │   ├── dashboard.js            # Main dashboard rendering
│   │   │   ├── emergency-alert.js      # Emergency management
│   │   │   ├── event-mode.js           # Event scenario control
│   │   │   ├── insights.js             # Analytics visualization
│   │   │   ├── manual-control.js       # Manual signal override
│   │   │   ├── multi-intersection.js   # Multi-point coordination
│   │   │   ├── renderer.js             # Canvas rendering engine
│   │   │   ├── sumo-detectors.js       # Lane detector logic
│   │   │   ├── sumo-network.js         # Network topology
│   │   │   ├── sumo-signals.js         # Signal phase management
│   │   │   └── sumo-vehicles.js        # Vehicle tracking
│   │   ├── utils/
│   │   │   ├── constants.js        # App-wide configuration
│   │   │   └── helpers.js          # Reusable utilities (10+ functions)
│   │   └── app.js                  # Main initialization
│   ├── event-mode.html             # Event Management page
│   ├── index.html                  # Dashboard page
│   ├── insights.html               # Analytics page
│   ├── README.md
│   └── sumo/
│       └── (legacy SUMO data)
│
├── yolo/                            # YOLO vehicle detection
│   ├── detect.py
│   ├── traffic_data.json
│   └── yolov8n.pt
│
└── Root Documentation
    ├── README.md                   # Main project overview
    ├── BACKEND_STRUCTURE.md        # Backend architecture guide
    ├── FRONTEND_STRUCTURE.md       # Frontend architecture guide
    ├── QUICKSTART.md               # Quick start guide
    ├── MULTI_INTERSECTION_README.md # Multi-point features
    ├── package.json                # Root-level dependencies
    └── .gitignore                  # Git ignore rules
```

---

## 🚀 Backend Architecture (MVC Pattern)

### Database Connection (Singleton)
**File:** `backend/config/database.js`
```javascript
// Ensures single MongoDB connection reused across app
- connectDatabase()     // Initialize connection
- getDatabase()         // Retrieve active instance
- collection(name)      // Get collection reference
- closeDatabase()       // Graceful shutdown
```

### Models (Data Schemas)
**Location:** `backend/models/`
- Define MongoDB collection schemas and default seed data
- Exported as plain JavaScript objects with structure documentation

### Controllers (Business Logic)
**Location:** `backend/controllers/`
- 7 controllers handling CRUD + complex operations
- Async functions with error handling
- Access database via `collection()` helper

### Routes (API Endpoints)
**Location:** `backend/routes/`
- 25+ REST endpoints organized under `/api`
- Hierarchical structure: status → collections → operations
- All routes follow `/api/{resource}` pattern

### Server Entry Point
**File:** `backend/server.js` (94 lines)
1. Load environment variables (.env)
2. Establish MongoDB connection
3. Seed database with default data
4. Mount all routes
5. Start HTTP server on port 3000

---

## 💾 Database Collections (MongoDB)

Auto-created and seeded on startup:

| Collection | Documents | Purpose |
|-----------|-----------|---------|
| event_scenarios | 6 types | Concert, festival, sports, accident, weather, emergency |
| intersections | 3 locations | Junction data with coordinates, lanes, signals |
| parking | 4 zones | Parking area capacity and occupancy |
| signals | Per intersection | Signal timing and phase data |
| vehicles | 4 types | Car, motorcycle, bus, truck detection |
| alerts | 3 samples | Collision, congestion, emergency alerts |
| analytics | 1 record | System metrics and performance stats |
| event_metrics | From events | Event-triggered metric snapshots |
| traffic_events | From SUMO | Traffic simulation event logs |

---

## 🎨 Frontend Architecture (Modular)

### API Client (Centralized)
**File:** `frontend/js/api/client.js`
- Single source of truth for all backend endpoints
- 25+ methods organized by resource
- Usage: `APIClient.getIntersections()`, `APIClient.createAlert()`, etc.

### Constants & Configuration
**File:** `frontend/js/utils/constants.js`
- API endpoints
- Event scenarios, alert types, severity levels
- Signal phases, colors, thresholds

### Utility Functions
**File:** `frontend/js/utils/helpers.js`
- `formatCurrency()`, `formatNumber()`, `formatDateTime()`
- `clamp()`, `debounce()`, `sleep()`
- `showNotification()`, `generateId()`, `getColorByPercentage()`
- `isValidEmail()`

### Feature Modules (IIFE Pattern)
**Location:** `frontend/js/modules/`
Each module is self-contained:
- No global state pollution
- Independent initialization
- Proper dependency injection

**Key Modules:**
- **dashboard.js** - Main display + user interactions
- **renderer.js** - Canvas drawing engine for intersections
- **sumo-network.js** - Road network topology
- **sumo-signals.js** - Signal state management
- **sumo-vehicles.js** - Vehicle tracking & animation
- **sumo-detectors.js** - Lane detector visualization
- **collision-system.js** - Collision detection logic
- **emergency-alert.js** - Emergency mode handling
- **event-mode.js** - Event scenario management
- **multi-intersection.js** - Coordinated control
- **manual-control.js** - Manual signal override
- **insights.js** - Analytics visualization

### HTML Pages
**3 Pages with proper resource loading order:**

1. **index.html** - Dashboard (Main)
   - Constants → Helpers → APIClient → Modules → App
   
2. **event-mode.html** - Event Management
   - Chart.js → Constants → Helpers → APIClient → Event Module
   
3. **insights.html** - Analytics Dashboard
   - Chart.js → Constants → Helpers → APIClient → Insights Module

---

## 📡 API Endpoints

All endpoints under `/api` prefix:

### Status & Health
- `GET /api/status` - System health & connection status

### Intersection Management
- `GET /api/intersections` - List all intersections
- `POST /api/intersections` - Create new intersection
- `GET /api/intersections/:id` - Get intersection details
- `PATCH /api/intersections/:id` - Update intersection

### Signal Control
- `GET /api/signals` - List all signals
- `POST /api/signals` - Create signal
- `GET /api/signals/:id` - Get signal state
- `PATCH /api/signals/:id` - Modify signal timing

### Vehicle Detection
- `GET /api/vehicles` - List detected vehicles
- `GET /api/vehicles/:type` - Vehicles by type

### Parking Management
- `GET /api/parking` - List parking zones
- `PATCH /api/parking/:id` - Update occupancy

### Alerts & Events
- `GET /api/alerts` - All alerts
- `GET /api/alerts/active` - Active alerts only
- `POST /api/alerts` - Create alert
- `PATCH /api/alerts/:id` - Resolve alert
- `GET /api/event-mode/scenarios` - Event scenarios
- `POST /api/event-mode/activate` - Activate scenario

### Analytics
- `GET /api/analytics` - System metrics
- `GET /api/analytics/trends` - Historical trends
- `POST /api/analytics/save` - Record metrics

---

## 🔧 Configuration

### Environment Variables
**File:** `backend/.env`
```
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=smart_traffic_management_system
PORT=3000
NODE_ENV=development
```

### Dependencies
- **Backend:** Express, MongoDB Driver, dotenv
- **Frontend:** Chart.js (CDN), vanilla JavaScript
- **Database:** MongoDB Community Edition

---

## 📊 Data Flow

```
Frontend (HTML/JS)
    ↓
APIClient (js/api/client.js)
    ↓
Express Routes (backend/routes/)
    ↓
Controllers (backend/controllers/) - Business Logic
    ↓
MongoDB Collections - Persistent Storage
```

---

## ✨ Key Design Principles

1. **MVC Architecture** - Clear separation of concerns
2. **Singleton Pattern** - Single database connection
3. **Modular Frontend** - IIFE modules with no globals
4. **Centralized API** - Single client for all requests
5. **Environment Configuration** - .env for flexibility
6. **Auto-seeding** - Database bootstraps on startup
7. **Error Handling** - Try-catch blocks with logging
8. **Reusable Utilities** - Shared helpers and constants

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB Community Edition (running on localhost:27017)

### Installation
```bash
# Backend
cd backend
npm install

# Frontend (static files served by Express)
# No installation needed - served from frontend/ directory
```

### Running
```bash
# From backend directory
npm start
# or
node server.js

# Server starts at http://localhost:3000
```

### Database
- Automatically creates collections on startup
- Seeded with default data
- Data persists in MongoDB

---

## 🧪 Testing

### API Endpoints
Access via browser or curl:
```bash
curl http://localhost:3000/api/status
curl http://localhost:3000/api/intersections
curl http://localhost:3000/api/signals
```

### Pages
- Dashboard: http://localhost:3000/
- Event Mode: http://localhost:3000/event-mode
- Insights: http://localhost:3000/insights

---

## 📝 Code Quality Standards

- **Backend:** MVC pattern, proper error handling, database abstraction
- **Frontend:** Modular code, centralized API access, reusable utilities
- **Database:** Consistent schema definitions, auto-seeding, proper indexing
- **Documentation:** Clear comments, README files per section

---

## 🔄 Development Workflow

1. **Backend Changes** - Edit controller/model, server auto-applies
2. **Frontend Changes** - Update modules/HTML, refresh browser
3. **Database Changes** - Modify models and seedDatabase.js
4. **Configuration** - Update .env and restart server

---

**Last Updated:** March 2025  
**Status:** Production-Ready ✅  
**Maintainability:** Professional Enterprise Level 🏢
