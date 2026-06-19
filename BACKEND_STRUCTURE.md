# Backend Structure - Professional Standards

## Directory Layout

```
backend/
├── server.js                 # Entry point (clean, minimal)
├── .env                      # Environment variables
├── package.json             # Dependencies
├── config/
│   └── database.js          # MongoDB connection & helpers
├── controllers/             # Business logic layer
│   ├── eventController.js
│   ├── intersectionController.js
│   ├── parkingController.js
│   ├── signalController.js
│   ├── vehicleController.js
│   ├── alertController.js
│   └── analyticsController.js
├── routes/                  # API routes
│   ├── index.js            # Route aggregator
│   ├── events.js
│   ├── intersections.js
│   ├── parking.js
│   ├── signals.js
│   ├── vehicles.js
│   ├── alerts.js
│   └── analytics.js
├── models/                  # Data schemas
│   ├── Event.js
│   ├── Intersection.js
│   ├── Parking.js
│   ├── Signal.js
│   ├── Vehicle.js
│   ├── Alert.js
│   └── Analytics.js
├── middleware/              # Request middleware
│   └── (to be added)
├── utils/                   # Helper functions
│   └── seedDatabase.js      # Database initialization
├── sumo_test/              # SUMO test data
└── yolo/                   # YOLO detection
```

## Architecture Pattern

The backend follows the **MVC (Model-View-Controller)** pattern:

### 1. **Models** (`models/`)
- Define data schemas and structure
- Export default data for seeding

### 2. **Controllers** (`controllers/`)
- Handle business logic
- Process requests from routes
- Interact with database

### 3. **Routes** (`routes/`)
- Define API endpoints
- Import controllers
- HTTP methods mapping

### 4. **Config** (`config/`)
- Database connection management
- Singleton pattern for MongoDB

### 5. **Utils** (`utils/`)
- Helper functions
- Database seeding utilities

## Key Features

✓ Clean separation of concerns  
✓ Reusable controllers  
✓ Centralized database config  
✓ Easy to test and maintain  
✓ Scalable architecture  

## API Endpoints

All endpoints prefixed with `/api`:

- `GET /status` - Database and backend status
- `GET /intersections` - List all intersections
- `POST /intersections` - Create intersection
- `PATCH /intersections/:id` - Update intersection
- `GET /parking` - List parking zones
- `POST /parking` - Create parking zone
- `PATCH /parking/:id` - Update parking
- `GET /signals` - List signal timings
- `GET /signals/:intersectionId` - Get signal for intersection
- `POST /signals` - Create signal
- `PATCH /signals/:intersectionId` - Update signal
- `GET /vehicles` - List vehicle detections
- `GET /vehicles/:intersectionId` - Vehicles at intersection
- `POST /vehicles` - Record vehicle detection
- `GET /alerts` - List all alerts
- `GET /alerts/active` - Get active alerts
- `POST /alerts` - Create alert
- `PATCH /alerts/:id` - Resolve alert
- `GET /event-mode/scenarios` - Event scenarios
- `POST /event-mode/metrics` - Save event metrics
- `GET /event-mode/metrics/latest` - Latest event snapshot
- `GET /analytics` - Latest analytics
- `POST /analytics` - Record analytics
- `GET /analytics/stats` - Database statistics

## Starting the Server

```bash
cd backend
npm install
node server.js
```

## Database

Connected via `config/database.js`:
- URI: `mongodb://127.0.0.1:27017` (configurable)
- Database: `smart_traffic_management_system`
- Collections: 9 (auto-seeded on startup)
