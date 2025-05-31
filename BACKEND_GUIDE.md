# Backend Integration Guide

## Overview

This guide provides comprehensive instructions for integrating backend services with the Drone Simulation System. The simulation supports multiple data transmission methods including WebSocket real-time streaming, HTTP REST API, and hybrid redundancy modes.

## Table of Contents

- [Data Formats](#data-formats)
- [WebSocket Integration](#websocket-integration)
- [HTTP REST API Integration](#http-rest-api-integration)
- [Hybrid Mode](#hybrid-mode)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Backend Implementation Examples](#backend-implementation-examples)
- [Testing and Debugging](#testing-and-debugging)
- [Performance Optimization](#performance-optimization)

## Data Formats

### Core Drone Data Structure

```json
{
  "sessionId": "uuid-v4-string",
  "timestamp": "2025-06-01T12:00:00.000Z",
  "drone": {
    "id": "drone-001",
    "name": "Primary Surveillance Drone",
    "model": "DJI-X1000",
    "status": "active"
  },
  "position": {
    "x": 150,
    "y": 200,
    "z": 50,
    "gps": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "altitude": 50
    }
  },
  "telemetry": {
    "battery": 85,
    "signal": 95,
    "temperature": 22.5,
    "speed": 12.3,
    "heading": 45.2
  },
  "sensors": {
    "accelerometer": {
      "x": 0.1,
      "y": 0.2,
      "z": 9.8
    },
    "gyroscope": {
      "x": 0.05,
      "y": -0.03,
      "z": 0.01
    },
    "magnetometer": {
      "x": 25.3,
      "y": -15.7,
      "z": 42.1
    }
  },
  "mission": {
    "id": "mission-001",
    "waypoint": 3,
    "totalWaypoints": 10,
    "missionType": "surveillance"
  },
  "metadata": {
    "transmissionMethod": "websocket",
    "dataVersion": "1.0",
    "compression": false
  }
}
```

### Anomaly Report Structure

```json
{
  "sessionId": "uuid-v4-string",
  "timestamp": "2025-06-01T12:00:00.000Z",
  "anomaly": {
    "type": "battery_critical",
    "severity": "high",
    "description": "Battery level below 20%",
    "value": 15,
    "threshold": 20,
    "action": "return_to_base"
  },
  "drone": {
    "id": "drone-001",
    "position": {
      "x": 150,
      "y": 200,
      "z": 50
    }
  },
  "context": {
    "missionId": "mission-001",
    "flightTime": 1800,
    "previousAnomalies": []
  }
}
```

## WebSocket Integration

### Server Implementation

#### Node.js Example

```javascript
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

class DroneBackendServer {
  constructor(port = 8080) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.port = port;
    this.clients = new Set();
    
    this.setupWebSocket();
    this.setupRoutes();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New drone connection established');
      this.clients.add(ws);

      // Send connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connection_ack',
        timestamp: new Date().toISOString(),
        status: 'connected'
      }));

      ws.on('message', (data) => {
        try {
          const droneData = JSON.parse(data);
          this.processDroneData(droneData);
        } catch (error) {
          console.error('Invalid JSON received:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON format'
          }));
        }
      });

      ws.on('close', () => {
        console.log('Drone disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  processDroneData(data) {
    // Validate data structure
    if (!this.validateDroneData(data)) {
      console.error('Invalid drone data structure');
      return;
    }

    // Store in database
    this.storeDroneData(data);

    // Process real-time analytics
    this.processAnalytics(data);

    // Check for anomalies
    this.checkAnomalies(data);

    // Broadcast to other connected services
    this.broadcastToServices(data);
  }

  validateDroneData(data) {
    const required = ['sessionId', 'timestamp', 'drone', 'position', 'telemetry'];
    return required.every(field => data.hasOwnProperty(field));
  }

  async storeDroneData(data) {
    // Database storage implementation
    // Example with MongoDB
    /*
    await this.db.collection('drone_telemetry').insertOne({
      ...data,
      receivedAt: new Date()
    });
    */
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Drone Backend Server running on port ${this.port}`);
    });
  }
}

// Start server
const server = new DroneBackendServer(8080);
server.start();
```

#### Python Example

```python
import asyncio
import websockets
import json
import logging
from datetime import datetime
from typing import Dict, Any

class DroneBackendServer:
    def __init__(self, host='localhost', port=8080):
        self.host = host
        self.port = port
        self.clients = set()
        self.logger = logging.getLogger(__name__)
        
    async def register_client(self, websocket):
        """Register a new client connection"""
        self.clients.add(websocket)
        self.logger.info(f"New drone connected: {websocket.remote_address}")
        
        # Send connection acknowledgment
        await websocket.send(json.dumps({
            'type': 'connection_ack',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'connected'
        }))

    async def unregister_client(self, websocket):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        self.logger.info(f"Drone disconnected: {websocket.remote_address}")

    async def handle_client(self, websocket, path):
        """Handle individual client connections"""
        await self.register_client(websocket)
        try:
            async for message in websocket:
                try:
                    drone_data = json.loads(message)
                    await self.process_drone_data(drone_data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': 'Invalid JSON format'
                    }))
                except Exception as e:
                    self.logger.error(f"Error processing data: {e}")
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)

    async def process_drone_data(self, data: Dict[str, Any]):
        """Process incoming drone data"""
        if not self.validate_drone_data(data):
            self.logger.error("Invalid drone data structure")
            return

        # Store data
        await self.store_drone_data(data)
        
        # Process analytics
        await self.process_analytics(data)
        
        # Check anomalies
        await self.check_anomalies(data)

    def validate_drone_data(self, data: Dict[str, Any]) -> bool:
        """Validate drone data structure"""
        required_fields = ['sessionId', 'timestamp', 'drone', 'position', 'telemetry']
        return all(field in data for field in required_fields)

    async def store_drone_data(self, data: Dict[str, Any]):
        """Store drone data in database"""
        # Implement your database storage logic here
        pass

    async def process_analytics(self, data: Dict[str, Any]):
        """Process real-time analytics"""
        # Implement your analytics logic here
        pass

    async def check_anomalies(self, data: Dict[str, Any]):
        """Check for anomalies in drone data"""
        # Implement anomaly detection logic here
        pass

    def start(self):
        """Start the WebSocket server"""
        return websockets.serve(
            self.handle_client,
            self.host,
            self.port
        )

# Usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    server = DroneBackendServer()
    
    start_server = server.start()
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
```

### Connection Configuration

The frontend automatically connects using these parameters:

```javascript
// Default WebSocket connection
const wsUrl = 'ws://localhost:8080';

// With custom configuration
const config = {
  url: 'ws://your-server.com:8080',
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
};
```

## HTTP REST API Integration

### Endpoint Specifications

#### POST /api/drone/telemetry

Receives drone telemetry data via HTTP POST requests.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-api-key>
```

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string",
  "timestamp": "2025-06-01T12:00:00.000Z",
  "drone": { /* drone data */ },
  "position": { /* position data */ },
  "telemetry": { /* telemetry data */ }
}
```

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-06-01T12:00:00.000Z",
  "dataId": "unique-data-id",
  "message": "Telemetry data received successfully"
}
```

#### POST /api/drone/anomaly

Receives anomaly reports from the drone system.

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string",
  "timestamp": "2025-06-01T12:00:00.000Z",
  "anomaly": { /* anomaly data */ },
  "drone": { /* drone context */ }
}
```

### Server Implementation Examples

#### Express.js (Node.js)

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Middleware for API key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Telemetry endpoint
app.post('/api/drone/telemetry', validateApiKey, async (req, res) => {
  try {
    const droneData = req.body;
    
    // Validate data structure
    if (!validateDroneData(droneData)) {
      return res.status(400).json({ 
        error: 'Invalid data structure',
        status: 'error'
      });
    }

    // Process the data
    const dataId = await processTelemetryData(droneData);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      dataId: dataId,
      message: 'Telemetry data received successfully'
    });
  } catch (error) {
    console.error('Error processing telemetry:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Anomaly endpoint
app.post('/api/drone/anomaly', validateApiKey, async (req, res) => {
  try {
    const anomalyData = req.body;
    
    // Process anomaly
    await processAnomalyReport(anomalyData);
    
    // Send alert notifications
    await sendAnomalyAlerts(anomalyData);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'Anomaly report processed'
    });
  } catch (error) {
    console.error('Error processing anomaly:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

app.listen(3000, () => {
  console.log('Drone API server running on port 3000');
});
```

#### FastAPI (Python)

```python
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

app = FastAPI(title="Drone Backend API", version="1.0.0")

# Data models
class DroneData(BaseModel):
    sessionId: str
    timestamp: str
    drone: Dict[str, Any]
    position: Dict[str, Any]
    telemetry: Dict[str, Any]
    sensors: Optional[Dict[str, Any]] = None
    mission: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class AnomalyData(BaseModel):
    sessionId: str
    timestamp: str
    anomaly: Dict[str, Any]
    drone: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

# Authentication
async def validate_api_key(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    api_key = authorization.replace("Bearer ", "")
    if not is_valid_api_key(api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return api_key

@app.post("/api/drone/telemetry")
async def receive_telemetry(
    data: DroneData,
    api_key: str = Depends(validate_api_key)
):
    try:
        # Process telemetry data
        data_id = await process_telemetry_data(data.dict())
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "dataId": data_id,
            "message": "Telemetry data received successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/drone/anomaly")
async def receive_anomaly(
    data: AnomalyData,
    api_key: str = Depends(validate_api_key)
):
    try:
        # Process anomaly report
        await process_anomaly_report(data.dict())
        
        # Send alerts
        await send_anomaly_alerts(data.dict())
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Anomaly report processed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def is_valid_api_key(api_key: str) -> bool:
    # Implement your API key validation logic
    return True

async def process_telemetry_data(data: dict) -> str:
    # Implement your data processing logic
    return str(uuid.uuid4())

async def process_anomaly_report(data: dict):
    # Implement your anomaly processing logic
    pass

async def send_anomaly_alerts(data: dict):
    # Implement your alert system
    pass
```

## Hybrid Mode

Hybrid mode enables dual transmission using both WebSocket and HTTP methods for maximum reliability and redundancy.

### Configuration

```javascript
// Frontend configuration for hybrid mode
const config = {
  streamingMethod: 'hybrid',
  websocket: {
    url: 'ws://localhost:8080',
    enabled: true
  },
  http: {
    endpoint: 'http://localhost:3000/api/drone/telemetry',
    interval: 5000,
    enabled: true
  }
};
```

### Backend Considerations

When implementing hybrid mode on the backend:

1. **Deduplication**: Implement logic to handle duplicate data from both channels
2. **Priority**: Define which channel takes priority for real-time decisions
3. **Fallback**: Use HTTP as fallback when WebSocket connection fails
4. **Data Consistency**: Ensure both channels maintain data integrity

```javascript
class HybridDataProcessor {
  constructor() {
    this.processedData = new Map();
    this.dataTimeout = 30000; // 30 seconds
  }

  async processData(data, source) {
    const key = `${data.sessionId}-${data.timestamp}`;
    
    if (this.processedData.has(key)) {
      console.log(`Duplicate data detected from ${source}, skipping`);
      return;
    }

    // Mark as processed
    this.processedData.set(key, {
      source,
      timestamp: Date.now()
    });

    // Clean up old entries
    this.cleanupOldEntries();

    // Process the data
    await this.handleDroneData(data);
  }

  cleanupOldEntries() {
    const now = Date.now();
    for (const [key, value] of this.processedData.entries()) {
      if (now - value.timestamp > this.dataTimeout) {
        this.processedData.delete(key);
      }
    }
  }
}
```

## Authentication

### API Key Authentication

The system supports API key authentication for secure data transmission.

#### Generating API Keys

```javascript
const crypto = require('crypto');

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Store in your database with associated permissions
const apiKey = generateApiKey();
```

#### Validation

```javascript
function validateApiKey(key) {
  // Check against your database
  // Return user/drone permissions
  return database.findApiKey(key);
}
```

### JWT Authentication (Optional)

For more advanced authentication, implement JWT tokens:

```javascript
const jwt = require('jsonwebtoken');

function generateJWT(droneId, permissions) {
  return jwt.sign(
    { 
      droneId,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.JWT_SECRET
  );
}
```

## Error Handling

### Frontend Error Codes

The frontend sends these error codes that your backend should handle:

- `CONNECTION_FAILED`: WebSocket connection failed
- `TRANSMISSION_ERROR`: Data transmission error
- `AUTHENTICATION_ERROR`: API key validation failed
- `DATA_VALIDATION_ERROR`: Invalid data format
- `TIMEOUT_ERROR`: Request timeout

### Backend Error Responses

Standardized error response format:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid drone data structure",
    "details": {
      "field": "telemetry.battery",
      "expectedType": "number",
      "receivedType": "string"
    }
  },
  "timestamp": "2025-06-01T12:00:00.000Z",
  "requestId": "uuid-v4-string"
}
```

### Retry Logic

Implement exponential backoff for retries:

```javascript
class RetryHandler {
  constructor(maxRetries = 5, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async executeWithRetry(operation, attempt = 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      await this.sleep(delay);
      
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Backend Implementation Examples

### Database Integration

#### MongoDB Example

```javascript
const { MongoClient } = require('mongodb');

class DroneDataManager {
  constructor(connectionUrl) {
    this.client = new MongoClient(connectionUrl);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('drone_system');
  }

  async storeTelemetry(data) {
    const collection = this.db.collection('telemetry');
    return await collection.insertOne({
      ...data,
      receivedAt: new Date(),
      processed: false
    });
  }

  async storeAnomaly(data) {
    const collection = this.db.collection('anomalies');
    return await collection.insertOne({
      ...data,
      receivedAt: new Date(),
      acknowledged: false,
      severity: data.anomaly.severity
    });
  }

  async getRecentTelemetry(droneId, limit = 100) {
    const collection = this.db.collection('telemetry');
    return await collection
      .find({ 'drone.id': droneId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
}
```

#### PostgreSQL Example

```python
import asyncpg
import json
from datetime import datetime

class DroneDataManager:
    def __init__(self, connection_url):
        self.connection_url = connection_url
        self.pool = None

    async def initialize(self):
        self.pool = await asyncpg.create_pool(self.connection_url)
        await self.create_tables()

    async def create_tables(self):
        async with self.pool.acquire() as connection:
            await connection.execute('''
                CREATE TABLE IF NOT EXISTS drone_telemetry (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    drone_id VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    data JSONB NOT NULL,
                    received_at TIMESTAMP DEFAULT NOW(),
                    processed BOOLEAN DEFAULT FALSE
                );
                
                CREATE TABLE IF NOT EXISTS drone_anomalies (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    drone_id VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    anomaly_type VARCHAR(255) NOT NULL,
                    severity VARCHAR(50) NOT NULL,
                    data JSONB NOT NULL,
                    received_at TIMESTAMP DEFAULT NOW(),
                    acknowledged BOOLEAN DEFAULT FALSE
                );
            ''')

    async def store_telemetry(self, data):
        async with self.pool.acquire() as connection:
            return await connection.fetchval('''
                INSERT INTO drone_telemetry (session_id, drone_id, timestamp, data)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            ''', 
            data['sessionId'],
            data['drone']['id'],
            datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')),
            json.dumps(data)
            )

    async def store_anomaly(self, data):
        async with self.pool.acquire() as connection:
            return await connection.fetchval('''
                INSERT INTO drone_anomalies (session_id, drone_id, timestamp, anomaly_type, severity, data)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            ''',
            data['sessionId'],
            data['drone']['id'],
            datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')),
            data['anomaly']['type'],
            data['anomaly']['severity'],
            json.dumps(data)
            )
```

### Real-time Analytics

```javascript
class DroneAnalytics {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      battery: { critical: 20, warning: 40 },
      signal: { critical: 30, warning: 60 },
      temperature: { min: -10, max: 60 }
    };
  }

  processRealTimeData(data) {
    const droneId = data.drone.id;
    
    // Update metrics
    this.updateMetrics(droneId, data);
    
    // Check thresholds
    const anomalies = this.checkThresholds(data);
    
    // Calculate trends
    const trends = this.calculateTrends(droneId);
    
    return {
      metrics: this.metrics.get(droneId),
      anomalies,
      trends
    };
  }

  updateMetrics(droneId, data) {
    if (!this.metrics.has(droneId)) {
      this.metrics.set(droneId, {
        totalFlightTime: 0,
        averageBattery: 0,
        averageSignal: 0,
        dataPoints: 0,
        lastUpdate: null
      });
    }

    const metrics = this.metrics.get(droneId);
    metrics.dataPoints++;
    metrics.lastUpdate = new Date();
    
    // Update averages
    metrics.averageBattery = this.updateAverage(
      metrics.averageBattery,
      data.telemetry.battery,
      metrics.dataPoints
    );
    
    metrics.averageSignal = this.updateAverage(
      metrics.averageSignal,
      data.telemetry.signal,
      metrics.dataPoints
    );
  }

  updateAverage(currentAvg, newValue, count) {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  checkThresholds(data) {
    const anomalies = [];
    const telemetry = data.telemetry;

    // Battery check
    if (telemetry.battery <= this.thresholds.battery.critical) {
      anomalies.push({
        type: 'battery_critical',
        severity: 'high',
        value: telemetry.battery,
        threshold: this.thresholds.battery.critical
      });
    }

    // Signal check
    if (telemetry.signal <= this.thresholds.signal.critical) {
      anomalies.push({
        type: 'signal_critical',
        severity: 'high',
        value: telemetry.signal,
        threshold: this.thresholds.signal.critical
      });
    }

    // Temperature check
    if (telemetry.temperature < this.thresholds.temperature.min ||
        telemetry.temperature > this.thresholds.temperature.max) {
      anomalies.push({
        type: 'temperature_anomaly',
        severity: 'medium',
        value: telemetry.temperature,
        threshold: this.thresholds.temperature
      });
    }

    return anomalies;
  }
}
```

## Testing and Debugging

### Testing WebSocket Connection

```bash
# Using wscat (install with: npm install -g wscat)
wscat -c ws://localhost:8080

# Send test data
{"sessionId":"test-session","timestamp":"2025-06-01T12:00:00.000Z","drone":{"id":"test-drone"}}
```

### Testing HTTP API

```bash
# Test telemetry endpoint
curl -X POST http://localhost:3000/api/drone/telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "sessionId": "test-session",
    "timestamp": "2025-06-01T12:00:00.000Z",
    "drone": {"id": "test-drone"},
    "position": {"x": 100, "y": 200, "z": 50},
    "telemetry": {"battery": 85, "signal": 95}
  }'

# Test anomaly endpoint
curl -X POST http://localhost:3000/api/drone/anomaly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "sessionId": "test-session",
    "timestamp": "2025-06-01T12:00:00.000Z",
    "anomaly": {"type": "battery_low", "severity": "medium"},
    "drone": {"id": "test-drone"}
  }'
```

### Debug Logging

Enable debug logging in the frontend:

```javascript
// In browser console
localStorage.setItem('droneSimDebug', 'true');
```

Backend logging examples:

```javascript
// Winston logging (Node.js)
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'drone-backend.log' }),
    new winston.transports.Console()
  ]
});

// Usage
logger.info('Drone connected', { droneId: 'drone-001' });
logger.error('Data validation failed', { error: error.message });
```

## Performance Optimization

### Data Compression

```javascript
const zlib = require('zlib');

// Compress data before storage
function compressData(data) {
  return new Promise((resolve, reject) => {
    zlib.gzip(JSON.stringify(data), (err, compressed) => {
      if (err) reject(err);
      else resolve(compressed);
    });
  });
}

// Decompress data
function decompressData(compressed) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(compressed, (err, decompressed) => {
      if (err) reject(err);
      else resolve(JSON.parse(decompressed.toString()));
    });
  });
}
```

### Batch Processing

```javascript
class BatchProcessor {
  constructor(batchSize = 100, flushInterval = 5000) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.batch = [];
    this.timer = null;
    
    this.startTimer();
  }

  add(data) {
    this.batch.push(data);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;
    
    const currentBatch = [...this.batch];
    this.batch = [];
    
    try {
      await this.processBatch(currentBatch);
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Re-add failed items or handle retry logic
    }
  }

  async processBatch(items) {
    // Bulk insert to database
    await database.insertMany(items);
  }

  startTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // Flush remaining items
  }
}
```

### Connection Pooling

```javascript
// Database connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  user: 'username',
  host: 'localhost',
  database: 'drone_system',
  password: 'password',
  port: 5432,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// WebSocket connection management
class ConnectionManager {
  constructor(maxConnections = 1000) {
    this.connections = new Map();
    this.maxConnections = maxConnections;
  }

  addConnection(id, connection) {
    if (this.connections.size >= this.maxConnections) {
      throw new Error('Maximum connections exceeded');
    }
    
    this.connections.set(id, {
      connection,
      lastActivity: Date.now()
    });
  }

  removeInactiveConnections(timeoutMs = 300000) { // 5 minutes
    const now = Date.now();
    for (const [id, conn] of this.connections.entries()) {
      if (now - conn.lastActivity > timeoutMs) {
        conn.connection.close();
        this.connections.delete(id);
      }
    }
  }
}
```

## Configuration Examples

### Environment Variables

```bash
# .env file
DRONE_WEBSOCKET_PORT=8080
DRONE_HTTP_PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/drone_system
REDIS_URL=redis://localhost:6379
API_KEY_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
MAX_CONNECTIONS=1000
BATCH_SIZE=100
COMPRESSION_ENABLED=true
DEBUG_MODE=false
```

### Docker Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  drone-backend:
    build: .
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/drone_system
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: drone_system
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Security Considerations

1. **API Key Rotation**: Implement regular API key rotation
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Input Validation**: Always validate and sanitize input data
4. **HTTPS/WSS**: Use secure connections in production
5. **Access Control**: Implement proper access control and permissions
6. **Audit Logging**: Log all API access and data modifications
7. **Data Encryption**: Encrypt sensitive data at rest and in transit

## Conclusion

This guide provides a comprehensive foundation for integrating backend services with the drone simulation system. The examples can be adapted to your specific technology stack and requirements. For additional support or questions, refer to the main README.md or contact the development team.

Remember to:
- Test all endpoints thoroughly before production deployment
- Monitor performance and optimize as needed
- Implement proper error handling and logging
- Keep security best practices in mind
- Document any custom modifications for your team

---

**Last Updated:** June 1, 2025  
**Version:** 1.0.0  
**Compatible with:** Drone Simulation System v1.0.0
