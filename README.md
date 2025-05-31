# 🚁 Drone Simulation Prototype

Modern real-time drone simulation with anomaly detection and backend streaming capabilities. Features a futuristic sci-fi interface designed for professional drone operations and monitoring.

![Drone Simulation Dashboard](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![Platform](https://img.shields.io/badge/Platform-Web-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎮 Core Simulation
- **Real-time Map**: Canvas-based 2D city map with drone movement
- **Realistic Drone Icon**: PNG drone visual with directional indicators
- **Autonomous Navigation**: Random target-based autonomous movement
- **Physical Boundaries**: Safe flight within canvas boundaries

### 📊 Live Data System
- **Coordinate Tracking**: Real-time X, Y coordinates with GPS conversion
- **Telemetry Data**: Altitude, speed, direction, battery level monitoring
- **Status Information**: Normal/anomaly mode detection
- **Timestamp**: Millisecond precision time logging

### 🚨 Anomaly Simulations
- **Route Deviation**: Unexpected direction change simulation
- **Altitude Loss**: Sudden altitude drop scenarios
- **Speed Reduction**: Motor failure simulation
- **Critical Battery**: Low battery warning system

### 🌐 Backend Integration
- **WebSocket Streaming**: Real-time data flow (500ms intervals)
- **HTTP REST API**: Periodic data transmission (1s intervals)
- **Hybrid Mode**: Dual redundancy with both methods
- **Auto-Reconnect**: Automatic recovery on connection loss

### 🎨 Modern UI/UX
- **Futuristic Design**: Sci-fi dark theme with professional dashboard
- **Glowing Effects**: Neon lighting effects and smooth animations
- **Responsive Design**: Mobile and desktop compatible
- **Real-time Status**: Live connection and system status indicators

## 🚀 Installation & Setup

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd Drone-Sim-Prototype

# Start a simple HTTP server
python3 -m http.server 8080
# or
npx serve .
# or
php -S localhost:8080

# Open in browser
open http://localhost:8080
```

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- WebSocket support
- Canvas API support
- ES6+ JavaScript support
- Local server (for file:// protocol limitations)

## 🎯 Usage

### Basic Operations
1. **Start Simulation**: Drone automatically begins movement
2. **Test Anomalies**: Trigger different anomaly scenarios
3. **Backend Connection**: Select streaming method and configure endpoints
4. **Monitor Data**: Track real-time data flow and history

### Control Panel
- 🟢 **Start**: Activates the simulation
- 🟡 **Stop**: Pauses the simulation  
- 🔵 **Reset**: Clears all data and resets drone position
- 🔴 **Anomaly**: Triggers test scenarios

### Backend Streaming Controls
- **WebSocket**: Real-time bidirectional communication
- **HTTP**: REST API periodic data transmission
- **Hybrid**: Both methods for redundancy
- **Connection Status**: Live indicators for backend connectivity

## 📁 Project Structure

```
Drone-Sim-Prototype/
├── index.html              # Main HTML file with futuristic UI
├── style.css               # Sci-fi CSS styles and animations
├── script.js               # JavaScript simulation engine
├── README.md               # This documentation
├── BACKEND_GUIDE.md        # Backend integration guide
└── assets/
    ├── drone.png           # Drone icon asset
    └── map.png             # City map background
```

## 🔧 Technical Details

### Frontend Technologies
- **HTML5 Canvas**: 2D graphics rendering engine
- **CSS3**: Modern animations and visual effects
- **Vanilla JavaScript**: ES6+ features and modules
- **WebSocket API**: Real-time bidirectional communication
- **Fetch API**: HTTP requests and JSON handling

### Performance Specifications
- **60 FPS**: Smooth animation rendering
- **100ms**: Simulation update frequency
- **500ms**: WebSocket data transmission interval
- **1s**: HTTP API data transmission interval
- **Auto-reconnect**: 3-second retry intervals

### Data Structure
```javascript
{
  "timestamp": "2025-01-01T10:30:00.123Z",
  "drone": {
    "coordinates": {
      "x": 245,
      "y": 178,
      "lat": 41.02,
      "lng": 28.98
    },
    "telemetry": {
      "altitude": 100,
      "speed": 60,
      "direction": 45,
      "battery": 85
    },
    "status": {
      "mode": "normal",
      "isActive": true,
      "hasAnomaly": false,
      "anomalyType": null
    }
  },
  "metadata": {
    "sessionId": "uuid-string",
    "version": "2.0.0"
  }
}
```

## 🌐 Backend Integration

For detailed backend setup and integration instructions:
👉 **[BACKEND_GUIDE.md](./BACKEND_GUIDE.md)**

### Supported Protocols
- ✅ WebSocket (ws:// and wss://)
- ✅ HTTP REST API (GET/POST)
- ✅ JSON Data Format
- ✅ CORS Support
- ✅ Auto-reconnection Logic

### Quick Backend Setup
```javascript
// WebSocket Endpoint
ws://localhost:8080/drone-stream

// HTTP Endpoints
POST http://localhost:3000/api/drone/data
POST http://localhost:3000/api/drone/anomaly
```

## 🛠 Development

### Customization Options
- **Drone Speed**: Modify `moveSpeed` in `script.js`
- **Anomaly Duration**: Adjust `anomalyDuration` parameter
- **Data Transmission**: Change `sendInterval` settings
- **UI Colors**: Update CSS variables in `style.css`
- **Map Background**: Replace `assets/map.png` with custom map

### Adding New Features
1. **New Anomaly Type**: Implement in `triggerAnomaly()` method
2. **New Data Fields**: Extend the data model structure
3. **New UI Elements**: Add HTML components and CSS styling
4. **Backend Endpoints**: Add new API routes in backend guide

### Code Structure
```javascript
// Main Classes
- DroneSimulation: Core simulation engine
- DroneDataStreamer: WebSocket communication
- DroneHTTPSender: REST API communication
- AnomalyManager: Anomaly detection and simulation
```

## 📈 Roadmap

### v2.1.0 Features
- [ ] 3D Map integration with Three.js
- [ ] Multi-drone simulation support
- [ ] Real GPS coordinate system
- [ ] Weather data integration
- [ ] Advanced anomaly detection algorithms

### v3.0.0 Vision
- [ ] VR/AR support with WebXR
- [ ] Cloud-based analytics dashboard
- [ ] Machine Learning anomaly prediction
- [ ] IoT device integration
- [ ] Real drone hardware connection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow ES6+ JavaScript standards
- Maintain responsive design principles
- Include comprehensive comments
- Test all anomaly scenarios
- Ensure backend compatibility

## 🐛 Troubleshooting

### Common Issues
- **WebSocket Connection Failed**: Check backend server and CORS settings
- **Canvas Not Loading**: Ensure browser supports HTML5 Canvas
- **Assets Not Found**: Verify file paths and server configuration
- **Performance Issues**: Check browser developer tools for errors

### Browser Support
- Chrome 80+ ✅
- Firefox 75+ ✅
- Safari 13+ ✅
- Edge 80+ ✅

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 📞 Contact

- **Developer**: [Your Name]
- **Email**: [your.email@example.com]
- **Project Link**: [https://github.com/username/drone-sim-prototype]
- **Issues**: [https://github.com/username/drone-sim-prototype/issues]

## 🙏 Acknowledgments

- **Lucide Icons**: Modern icon set for UI elements
- **Google Fonts**: Orbitron and Rajdhani font families
- **Canvas API**: 2D rendering support
- **WebSocket API**: Real-time communication standard
- **Open Source Community**: For inspiration and resources

---

**🚁 Happy Flying! 🚁**

*Built with ❤️ for the drone simulation community*