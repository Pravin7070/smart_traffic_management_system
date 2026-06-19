# Frontend Structure - Professional Standards

## Directory Layout

```
frontend/
├── index.html                           # Dashboard page
├── event-mode.html                      # Event Mode page
├── insights.html                        # Insights page
├── js/
│   ├── app.js                          # Main app entry point
│   ├── modules/                        # Feature modules
│   │   ├── event-mode.js               # Event Mode logic
│   │   ├── dashboard.js                # Dashboard logic
│   │   ├── collision-system.js         # Collision detection
│   │   ├── emergency-alert.js          # Emergency alerts
│   │   ├── manual-control.js           # Manual controls
│   │   ├── multi-intersection.js       # Multi-intersection management
│   │   ├── renderer.js                 # Canvas rendering
│   │   ├── sumo-detectors.js           # SUMO detectors
│   │   ├── sumo-network.js             # SUMO network
│   │   ├── sumo-signals.js             # SUMO signals
│   │   └── sumo-vehicles.js            # SUMO vehicles
│   ├── api/
│   │   └── client.js                   # Centralized API client
│   └── utils/
│       ├── helpers.js                  # Utility functions
│       └── constants.js                # Constants & config
├── assets/
│   ├── styles/                         # CSS files
│   │   ├── main.css                    # Global styles (was styles.css)
│   │   ├── event-mode.css              # Event Mode styles
│   │   ├── insights.css                # Insights styles
│   │   └── responsive.css              # (to be added)
│   ├── images/                         # Images
│   └── fonts/                          # Custom fonts
└── sumo/                               # SUMO data
    └── events.json
```

## Architecture Pattern

The frontend follows a **modular component architecture**:

### 1. **HTML Pages**
- `index.html` - Main dashboard
- `event-mode.html` - Event Mode page
- `insights.html` - Analytics/insights

### 2. **API Client** (`js/api/`)
- Centralized `client.js` for all API calls
- No inline fetch() calls in modules
- Consistent error handling
- Single source of truth for endpoints

### 3. **Modules** (`js/modules/`)
- Self-contained feature files
- No global dependencies
- Exported as IIFE or modules
- Clear responsibilities

### 4. **Utilities** (`js/utils/`)
- **helpers.js** - Reusable functions
- **constants.js** - App configuration & endpoints

### 5. **Styles** (`assets/styles/`)
- Organized by page/feature
- Responsive design ready
- BEM naming convention

## Module Pattern

Each module exports an IIFE:

```javascript
const ModuleName = (() => {
    // Private state
    const state = { /* ... */ };
    
    // Private functions
    const initialize = () => { /* ... */ };
    
    // Public API
    return {
        init: initialize,
        doSomething: () => { /* ... */ }
    };
})();
```

## API Client Usage

```javascript
// In any module
APIClient.getIntersections()
    .then(data => console.log(data))
    .catch(error => console.error(error));

// Methods available:
// Intersections: getIntersections(), createIntersection(data)
// Parking: getParkingZones(), updateParking(id, data)
// Alerts: getAlerts(), createAlert(data), resolveAlert(id)
// Event Mode: getEventScenarios(), saveEventMetrics(data)
// Analytics: getAnalytics(), getDbStats()
```

## Constants

Use `Constants` from `js/utils/constants.js`:

```javascript
Constants.API.INTERSECTIONS        // "/api/intersections"
Constants.EVENT_SCENARIOS.CRICKET  // "cricket"
Constants.COLORS.CYAN              // "#00f0ff"
Constants.THRESHOLDS.CONGESTION_HIGH  // 0.75
```

## Loading Order

HTML should load in this order:
1. Utility/constant files
2. API client
3. Module files
4. Main app.js

## Best Practices

✓ Use `APIClient` for all API calls  
✓ Use `Constants` for config values  
✓ Use `Utils` helpers for common operations  
✓ Keep modules focused on single features  
✓ Avoid global variables  
✓ Use modular CSS with responsive design  
✓ All module initialization in app.js  

## Responsive Design

CSS classes for breakpoints:
- `@media (max-width: 768px)` - Mobile
- `@media (max-width: 1024px)` - Tablet
- `@media (min-width: 1025px)` - Desktop

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers
