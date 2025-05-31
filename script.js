class DroneSimulator {
    constructor() {
        this.canvas = document.getElementById('droneMap');
        this.ctx = this.canvas.getContext('2d');
        
        // Drone PNG resmini yükle
        this.droneImage = new Image();
        this.droneImage.src = 'assets/drone.png';
        this.droneImageLoaded = false;
        
        this.droneImage.onload = () => {
            this.droneImageLoaded = true;
            this.drawMap(); // Resim yüklendikten sonra haritayı yeniden çiz
        };
        
        this.droneImage.onerror = () => {
            console.warn('Drone PNG yüklenemedi, basit çizim kullanılacak');
            this.drawMap();
        };
        
        // Harita PNG resmini yükle
        this.mapImage = new Image();
        this.mapImage.src = 'assets/map.png';
        this.mapImageLoaded = false;
        
        this.mapImage.onload = () => {
            this.mapImageLoaded = true;
            this.drawMap(); // Harita resmi yüklendikten sonra haritayı yeniden çiz
        };
        
        this.mapImage.onerror = () => {
            console.warn('Harita PNG yüklenemedi, grid çizimi kullanılacak');
            this.drawMap();
        };
        
        // Drone durumu
        this.drone = {
            x: 50,
            y: 200,
            altitude: 100,
            speed: 60,
            direction: 0,
            targetX: 550,
            targetY: 200,
            status: 'Beklemede',
            battery: 100
        };

        // Simülasyon durumu
        this.isRunning = false;
        this.simulationInterval = null;
        this.currentMode = 'normal';
        this.anomalyDuration = 0;
        this.originalTarget = { x: 550, y: 200 };
        
        // Veri geçmişi
        this.dataHistory = [];
        this.maxHistoryLength = 20;

        // Backend Data Streaming
        this.dataStreamer = new DroneDataStreamer(this);
        this.httpSender = new DroneHTTPSender(this);
        this.streamingMethod = 'websocket'; // 'websocket', 'http', or 'both'
        this.lastDataSent = Date.now();

        this.initializeEventListeners();
        this.drawMap();
    }

    initializeEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
        
        document.getElementById('routeAnomalyBtn').addEventListener('click', () => this.triggerRouteAnomaly());
        document.getElementById('altitudeAnomalyBtn').addEventListener('click', () => this.triggerAltitudeAnomaly());
        document.getElementById('speedAnomalyBtn').addEventListener('click', () => this.triggerSpeedAnomaly());
        document.getElementById('normalBtn').addEventListener('click', () => this.returnToNormal());
        
        // Backend streaming controls
        document.getElementById('streamingMethod').addEventListener('change', (e) => {
            this.setStreamingMethod(e.target.value);
        });
    }

    startSimulation() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.drone.status = 'Uçuşta';
        this.updateDisplay();
        
        // Backend streaming başlat
        this.startDataStreaming();
        
        this.simulationInterval = setInterval(() => {
            this.updateDrone();
            this.updateDisplay();
            this.logData();
            
            // Real-time data streaming
            this.streamDataToBackend();
        }, 100); // Her 100ms'de bir güncelle
    }

    stopSimulation() {
        this.isRunning = false;
        this.drone.status = 'Durduruldu';
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        // Backend streaming durdur
        this.stopDataStreaming();
        
        this.updateDisplay();
    }

    resetSimulation() {
        this.stopSimulation();
        this.drone = {
            x: 50,
            y: 200,
            altitude: 100,
            speed: 60,
            direction: 0,
            targetX: 550,
            targetY: 200,
            status: 'Beklemede',
            battery: 100
        };
        this.currentMode = 'normal';
        this.anomalyDuration = 0;
        this.dataHistory = [];
        this.updateDisplay();
        this.drawMap();
        document.getElementById('dataLog').innerHTML = '';
    }

    updateDrone() {
        // Anomali durumlarını kontrol et
        this.handleAnomalies();

        // Hedefe doğru hareket et
        const dx = this.drone.targetX - this.drone.x;
        const dy = this.drone.targetY - this.drone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            // Yön hesapla
            this.drone.direction = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Hareket hızı hesapla (pixel/frame)
            const moveSpeed = this.drone.speed / 10; // Hızı uygun şekilde ölçekle
            
            // Yeni pozisyon hesapla
            this.drone.x += (dx / distance) * moveSpeed;
            this.drone.y += (dy / distance) * moveSpeed;
        } else {
            // Hedefe ulaştı, yeni hedef belirle
            this.setNewTarget();
        }

        // Sınırları kontrol et
        this.drone.x = Math.max(10, Math.min(590, this.drone.x));
        this.drone.y = Math.max(10, Math.min(390, this.drone.y));

        // Batarya tüketimi (hareket ettiği sürece)
        if (distance > 5) {
            this.drone.battery = Math.max(0, this.drone.battery - 0.05);
        }

        this.drawMap();
    }

    setNewTarget() {
        if (this.currentMode === 'normal') {
            // Normal modda rastgele hedef seç
            this.drone.targetX = 50 + Math.random() * 500;
            this.drone.targetY = 50 + Math.random() * 300;
        }
    }

    handleAnomalies() {
        if (this.anomalyDuration > 0) {
            this.anomalyDuration--;
            
            switch (this.currentMode) {
                case 'route':
                    // Rota anomalisi devam ediyor
                    break;
                case 'altitude':
                    // İrtifa kaybı
                    this.drone.altitude = Math.max(0, this.drone.altitude - 2);
                    break;
                case 'speed':
                    // Hız düşüşü
                    this.drone.speed = Math.max(10, this.drone.speed - 1);
                    // Anomali sırasında batarya daha hızlı tükenir
                    this.drone.battery = Math.max(0, this.drone.battery - 0.2);
                    break;
            }
            
            if (this.anomalyDuration <= 0) {
                this.returnToNormal();
            }
        }
    }

    triggerRouteAnomaly() {
        this.currentMode = 'route';
        this.anomalyDuration = 100; // 10 saniye (100 * 100ms)
        this.drone.status = 'ANOMALI: Rota Değişikliği';
        
        // Backend'e anomali bildir
        this.reportAnomalyToBackend('route');
        
        // Beklenmedik hedefe yönlendir
        this.drone.targetX = Math.random() * 600;
        this.drone.targetY = Math.random() * 400;
    }

    triggerAltitudeAnomaly() {
        this.currentMode = 'altitude';
        this.anomalyDuration = 50; // 5 saniye
        this.drone.status = 'ANOMALI: İrtifa Kaybı';
        
        // Backend'e anomali bildir
        this.reportAnomalyToBackend('altitude');
    }

    triggerSpeedAnomaly() {
        this.currentMode = 'speed';
        this.anomalyDuration = 80; // 8 saniye
        this.drone.status = 'ANOMALI: Hız Düşüşü';
        
        // Backend'e anomali bildir
        this.reportAnomalyToBackend('speed');
    }
    
    reportAnomalyToBackend(anomalyType) {
        // WebSocket ile anomali gönder
        if (this.streamingMethod === 'websocket' || this.streamingMethod === 'both') {
            this.dataStreamer.sendAnomalyAlert(anomalyType, this.getAnomalySeverity(anomalyType));
        }
        
        // HTTP ile anomali gönder
        if (this.streamingMethod === 'http' || this.streamingMethod === 'both') {
            this.httpSender.sendAnomalyHTTP(anomalyType);
        }
    }
    
    getAnomalySeverity(anomalyType) {
        switch (anomalyType) {
            case 'altitude': return 'high';
            case 'route': return 'medium';
            case 'speed': return 'low';
            default: return 'medium';
        }
    }

    startDataStreaming() {
        switch (this.streamingMethod) {
            case 'websocket':
                // WebSocket zaten constructor'da başlatılıyor
                break;
            case 'http':
                this.httpSender.startSending();
                break;
            case 'both':
                this.httpSender.startSending();
                break;
        }
        console.log(`📡 Data streaming started with method: ${this.streamingMethod}`);
    }
    
    stopDataStreaming() {
        this.httpSender.stopSending();
        console.log('📡 Data streaming stopped');
    }
    
    streamDataToBackend() {
        const now = Date.now();
        
        // WebSocket için her 500ms'de bir gönder (daha sık)
        if (this.streamingMethod === 'websocket' || this.streamingMethod === 'both') {
            if (now - this.lastDataSent >= 500) {
                this.dataStreamer.sendDroneData();
                this.lastDataSent = now;
            }
        }
        
        // HTTP zaten kendi interval'ında çalışıyor
    }
    
    setStreamingMethod(method) {
        this.stopDataStreaming();
        this.streamingMethod = method;
        if (this.isRunning) {
            this.startDataStreaming();
        }
    }
    
    updateDisplay() {
        // Ana panel verilerini güncelle
        document.getElementById('coordinates').textContent = 
            `${Math.round(this.drone.x)}, ${Math.round(this.drone.y)}`;
        
        document.getElementById('altitude').textContent = 
            Math.round(this.drone.altitude);
        
        document.getElementById('speed').textContent = 
            Math.round(this.drone.speed);
        
        document.getElementById('direction').textContent = 
            Math.round(this.drone.direction);
        
        document.getElementById('timestamp').textContent = 
            new Date().toLocaleTimeString();
        
        document.getElementById('battery').textContent = 
            Math.round(this.drone.battery);
        
        // Durum güncelleme
        const statusElement = document.getElementById('status');
        statusElement.textContent = this.drone.status;
        
        // Status bar güncellemeleri
        document.getElementById('statusBarStatus').textContent = this.drone.status;
        document.getElementById('statusBarBattery').textContent = `${Math.round(this.drone.battery)}%`;
        document.getElementById('statusBarSpeed').textContent = `${Math.round(this.drone.speed)} km/h`;
        document.getElementById('statusBarAltitude').textContent = `${Math.round(this.drone.altitude)} m`;
        
        // CSS sınıfları ile görsel güncellemeler
        this.updateDataItemStyles();
    }

    updateDataItemStyles() {
        // Status item styling
        const statusItem = document.getElementById('statusItem');
        statusItem.className = 'data-item';
        if (this.currentMode === 'normal') {
            statusItem.classList.add('status-normal');
        } else {
            statusItem.classList.add('status-anomaly');
        }
        
        // Battery item styling
        const batteryItem = document.getElementById('batteryItem');
        batteryItem.className = 'data-item';
        if (this.drone.battery > 50) {
            batteryItem.classList.add('battery-high');
        } else if (this.drone.battery > 20) {
            batteryItem.classList.add('battery-medium');
        } else {
            batteryItem.classList.add('battery-low');
        }
    }

    logData() {
        const logEntry = {
            time: new Date().toLocaleTimeString(),
            x: Math.round(this.drone.x),
            y: Math.round(this.drone.y),
            altitude: Math.round(this.drone.altitude),
            speed: Math.round(this.drone.speed),
            battery: Math.round(this.drone.battery),
            status: this.drone.status
        };

        this.dataHistory.unshift(logEntry);
        
        if (this.dataHistory.length > this.maxHistoryLength) {
            this.dataHistory.pop();
        }

        this.updateDataLog();
    }

    updateDataLog() {
        const logContainer = document.getElementById('dataLog');
        logContainer.innerHTML = '';
        
        this.dataHistory.forEach(entry => {
            const logDiv = document.createElement('div');
            logDiv.className = 'log-entry';
            
            const isAnomaly = entry.status.includes('ANOMALI');
            const statusClass = isAnomaly ? 'log-anomaly' : 'log-normal';
            
            logDiv.innerHTML = `
                <span class="log-time">${entry.time}</span> - 
                Pos: (${entry.x}, ${entry.y}) - 
                Alt: ${entry.altitude}m - 
                Hız: ${entry.speed}km/h - 
                Bat: ${entry.battery}% - 
                <span class="${statusClass}">${entry.status}</span>
            `;
            
            logContainer.appendChild(logDiv);
        });
    }

    drawMap() {
        // Canvas'ı temizle
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Arka plan grid çiz
        this.drawGrid();
        
        // Waypoint'leri çiz
        this.drawWaypoints();
        
        // Hedef noktayı çiz
        this.drawTarget();
        
        // Drone'u çiz
        this.drawDrone();
        
        // Rotayı çiz
        this.drawPath();
    }

    drawGrid() {
        if (this.mapImageLoaded) {
            // Harita resmini canvas boyutuna sığacak şekilde çiz
            this.ctx.drawImage(
                this.mapImage, 
                0, 
                0, 
                this.canvas.width, 
                this.canvas.height
            );
        } else {
            // Harita resmi yüklenene kadar grid çizgilerini göster
            this.ctx.strokeStyle = '#e0e0e0';
            this.ctx.lineWidth = 1;
            
            // Dikey çizgiler
            for (let x = 0; x <= this.canvas.width; x += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
            
            // Yatay çizgiler
            for (let y = 0; y <= this.canvas.height; y += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
        }
    }

    drawWaypoints() {
        // MapPin iconları gibi waypoint'ler - grid kesişimlerinde
        this.ctx.fillStyle = '#666';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        for (let x = 100; x <= this.canvas.width - 100; x += 150) {
            for (let y = 100; y <= this.canvas.height - 100; y += 150) {
                // MapPin icon benzeri şekil
                this.ctx.beginPath();
                this.ctx.arc(x, y - 3, 4, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 3);
                this.ctx.lineTo(x, y + 5);
                this.ctx.stroke();
                
                // Alt üçgen
                this.ctx.fillStyle = '#666';
                this.ctx.beginPath();
                this.ctx.moveTo(x - 2, y + 3);
                this.ctx.lineTo(x + 2, y + 3);
                this.ctx.lineTo(x, y + 7);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }

    drawTarget() {
        // Hedef dairesi
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.strokeStyle = '#ff4757';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.arc(this.drone.targetX, this.drone.targetY, 10, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Target icon benzeri hedef işareti
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        
        // Dış çember
        this.ctx.beginPath();
        this.ctx.arc(this.drone.targetX, this.drone.targetY, 6, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // İç nokta
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.drone.targetX, this.drone.targetY, 2, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawDrone() {
        const ctx = this.ctx;
        const x = this.drone.x;
        const y = this.drone.y;
        
        // PNG resmi yüklendiyse onu kullan
        if (this.droneImageLoaded) {
            ctx.save();
            
            // Drone'un merkez noktasına pozisyonla
            ctx.translate(x, y);
            
            // Drone'un yönüne göre döndür
            const directionRad = this.drone.direction * Math.PI / 180;
            ctx.rotate(directionRad);
            
            // Drone boyutu (PNG'yi ölçekle)
            const droneSize = 40; // 40x40 pixel
            
            // Anomali durumunda renk filtresi uygula
            if (this.currentMode !== 'normal') {
                ctx.filter = 'hue-rotate(0deg) saturate(2) brightness(1.2)';
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(-droneSize/2, -droneSize/2, droneSize, droneSize);
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'none';
            }
            
            // PNG resmini çiz (merkeze hizalı)
            ctx.drawImage(
                this.droneImage, 
                -droneSize/2, 
                -droneSize/2, 
                droneSize, 
                droneSize
            );
            
            ctx.restore();
            
            // Yön göstergesi (isteğe bağlı - drone'un önünü göstermek için)
            this.drawDirectionIndicator(x, y);
        } else {
            // PNG yüklenene kadar basit bir drone çiz
            this.drawSimpleDrone(x, y);
        }
    }

    drawDirectionIndicator(x, y) {
        const ctx = this.ctx;
        ctx.save();
        
        // Yön ok çizgisi
        ctx.strokeStyle = this.currentMode === 'normal' ? '#4CAF50' : '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const directionRad = this.drone.direction * Math.PI / 180;
        const arrowLength = 25;
        const startX = x + Math.cos(directionRad) * 20;
        const startY = y + Math.sin(directionRad) * 20;
        const endX = x + Math.cos(directionRad) * arrowLength;
        const endY = y + Math.sin(directionRad) * arrowLength;
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Ok başı
        const arrowHeadSize = 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - Math.cos(directionRad - 0.3) * arrowHeadSize,
            endY - Math.sin(directionRad - 0.3) * arrowHeadSize
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - Math.cos(directionRad + 0.3) * arrowHeadSize,
            endY - Math.sin(directionRad + 0.3) * arrowHeadSize
        );
        ctx.stroke();
        
        ctx.restore();
    }

    drawSimpleDrone(x, y) {
        // PNG yüklenene kadar gösterilecek basit drone
        const ctx = this.ctx;
        const droneColor = this.currentMode === 'normal' ? '#4CAF50' : '#ff6b6b';
        
        ctx.fillStyle = droneColor;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Basit yön göstergesi
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        const directionRad = this.drone.direction * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(directionRad) * 12, y + Math.sin(directionRad) * 12);
        ctx.stroke();
    }

    drawPath() {
        if (this.dataHistory.length > 1) {
            this.ctx.strokeStyle = this.currentMode === 'normal' ? '#4CAF50' : '#ff6b6b';
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.dataHistory[0].x, this.dataHistory[0].y);
            
            for (let i = 1; i < Math.min(this.dataHistory.length, 10); i++) {
                this.ctx.lineTo(this.dataHistory[i].x, this.dataHistory[i].y);
            }
            
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
    }
}

// Simülasyonu başlat
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new DroneSimulator();
});

// Gerçek zamanlı veri için API simülasyonu
class DroneDataAPI {
    constructor(simulator) {
        this.simulator = simulator;
        this.subscribers = [];
    }

    // Veri aboneliği
    subscribe(callback) {
        this.subscribers.push(callback);
    }

    // Anlık veri al
    getCurrentData() {
        return {
            timestamp: new Date().toISOString(),
            coordinates: {
                x: Math.round(this.simulator.drone.x),
                y: Math.round(this.simulator.drone.y)
            },
            altitude: Math.round(this.simulator.drone.altitude),
            speed: Math.round(this.simulator.drone.speed),
            direction: Math.round(this.simulator.drone.direction),
            battery: Math.round(this.simulator.drone.battery),
            status: this.simulator.drone.status,
            mode: this.simulator.currentMode
        };
    }

    // Veri geçmişi al
    getHistoricalData(limit = 50) {
        return this.simulator.dataHistory.slice(0, limit);
    }

    // Anomali tetikle
    triggerAnomaly(type) {
        switch (type) {
            case 'route':
                this.simulator.triggerRouteAnomaly();
                break;
            case 'altitude':
                this.simulator.triggerAltitudeAnomaly();
                break;
            case 'speed':
                this.simulator.triggerSpeedAnomaly();
                break;
        }
    }
}

// WebSocket Connection ve Real-time Data Streaming
class DroneDataStreamer {
    constructor(simulator) {
        this.simulator = simulator;
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connectionStatus = 'disconnected';
        
        // Backend URL - kendi backend URL'inizi buraya yazın
        this.wsUrl = 'ws://localhost:8080/drone-data'; // Örnek WebSocket URL
        
        this.initWebSocket();
    }
    
    initWebSocket() {
        try {
            this.websocket = new WebSocket(this.wsUrl);
            
            this.websocket.onopen = (event) => {
                console.log('🚁 Drone data stream connected to backend');
                this.isConnected = true;
                this.connectionStatus = 'connected';
                this.reconnectAttempts = 0;
                this.updateConnectionStatus();
                
                // Bağlantı kurulduğunda initial data gönder
                this.sendInitialData();
            };
            
            this.websocket.onmessage = (event) => {
                // Backend'den gelen mesajları işle
                const message = JSON.parse(event.data);
                this.handleBackendMessage(message);
            };
            
            this.websocket.onclose = (event) => {
                console.log('🔌 WebSocket connection closed');
                this.isConnected = false;
                this.connectionStatus = 'disconnected';
                this.updateConnectionStatus();
                
                // Otomatik yeniden bağlanma
                this.attemptReconnect();
            };
            
            this.websocket.onerror = (error) => {
                console.error('🚨 WebSocket error:', error);
                this.connectionStatus = 'error';
                this.updateConnectionStatus();
            };
            
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.connectionStatus = 'error';
            this.updateConnectionStatus();
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.connectionStatus = 'reconnecting';
            this.updateConnectionStatus();
            
            setTimeout(() => {
                console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.initWebSocket();
            }, 3000 * this.reconnectAttempts); // Exponential backoff
        }
    }
    
    sendDroneData() {
        if (!this.isConnected || !this.websocket) {
            return false;
        }
        
        const droneData = {
            timestamp: new Date().toISOString(),
            sessionId: this.generateSessionId(),
            drone: {
                id: 'DRONE_001',
                coordinates: {
                    x: Math.round(this.simulator.drone.x * 10) / 10,
                    y: Math.round(this.simulator.drone.y * 10) / 10,
                    latitude: this.convertToLatitude(this.simulator.drone.y), // Gerçek koordinatlara çevir
                    longitude: this.convertToLongitude(this.simulator.drone.x)
                },
                telemetry: {
                    altitude: Math.round(this.simulator.drone.altitude),
                    speed: Math.round(this.simulator.drone.speed),
                    direction: Math.round(this.simulator.drone.direction),
                    battery: Math.round(this.simulator.drone.battery)
                },
                status: {
                    mode: this.simulator.currentMode,
                    statusText: this.simulator.drone.status,
                    isActive: this.simulator.isRunning,
                    hasAnomaly: this.simulator.currentMode !== 'normal'
                },
                target: {
                    x: Math.round(this.simulator.drone.targetX),
                    y: Math.round(this.simulator.drone.targetY)
                }
            },
            metadata: {
                source: 'drone-simulator',
                version: '1.0.0',
                dataType: 'real-time'
            }
        };
        
        try {
            this.websocket.send(JSON.stringify(droneData));
            return true;
        } catch (error) {
            console.error('Failed to send drone data:', error);
            return false;
        }
    }
    
    sendInitialData() {
        const initialData = {
            type: 'connection',
            timestamp: new Date().toISOString(),
            drone: {
                id: 'DRONE_001',
                name: 'Simulation Drone',
                type: 'quadcopter',
                firmware: '2.1.4'
            },
            session: {
                id: this.generateSessionId(),
                startTime: new Date().toISOString(),
                simulator: true
            }
        };
        
        if (this.isConnected) {
            this.websocket.send(JSON.stringify(initialData));
        }
    }
    
    sendAnomalyAlert(anomalyType, severity = 'medium') {
        if (!this.isConnected) return;
        
        const anomalyData = {
            type: 'anomaly_alert',
            timestamp: new Date().toISOString(),
            anomaly: {
                type: anomalyType,
                severity: severity,
                description: this.simulator.drone.status,
                droneId: 'DRONE_001'
            },
            coordinates: {
                x: this.simulator.drone.x,
                y: this.simulator.drone.y,
                latitude: this.convertToLatitude(this.simulator.drone.y),
                longitude: this.convertToLongitude(this.simulator.drone.x)
            }
        };
        
        this.websocket.send(JSON.stringify(anomalyData));
    }
    
    handleBackendMessage(message) {
        switch (message.type) {
            case 'command':
                this.handleDroneCommand(message.command);
                break;
            case 'config_update':
                this.handleConfigUpdate(message.config);
                break;
            case 'ping':
                this.sendPong();
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    handleDroneCommand(command) {
        switch (command.action) {
            case 'start':
                this.simulator.startSimulation();
                break;
            case 'stop':
                this.simulator.stopSimulation();
                break;
            case 'reset':
                this.simulator.resetSimulation();
                break;
            case 'trigger_anomaly':
                this.simulator.triggerAnomaly(command.anomaly_type);
                break;
            case 'set_target':
                this.simulator.drone.targetX = command.target.x;
                this.simulator.drone.targetY = command.target.y;
                break;
        }
    }
    
    sendPong() {
        if (this.isConnected) {
            this.websocket.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
            }));
        }
    }
    
    convertToLatitude(y) {
        // Canvas Y koordinatını gerçek latitude'a çevir (İstanbul bölgesi)
        const minLat = 40.9000;
        const maxLat = 41.2000;
        return minLat + (y / 400) * (maxLat - minLat);
    }
    
    convertToLongitude(x) {
        // Canvas X koordinatını gerçek longitude'a çevir (İstanbul bölgesi)
        const minLng = 28.8000;
        const maxLng = 29.2000;
        return minLng + (x / 600) * (maxLng - minLng);
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    updateConnectionStatus() {
        // UI'da bağlantı durumunu güncelle
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = this.connectionStatus.toUpperCase();
            statusElement.className = `connection-status ${this.connectionStatus}`;
        }
        
        // Status bar'da göster
        const wsStatusElement = document.getElementById('wsStatus');
        if (wsStatusElement) {
            wsStatusElement.textContent = this.isConnected ? 'ONLINE' : 'OFFLINE';
        }
    }
    
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.isConnected = false;
        }
    }
}

// HTTP REST API Data Sender
class DroneHTTPSender {
    constructor(simulator) {
        this.simulator = simulator;
        this.apiBaseUrl = 'http://localhost:3000/api'; // Backend API URL'inizi buraya yazın
        this.sendInterval = 1000; // 1 saniyede bir gönder
        this.intervalId = null;
        this.isActive = false;
        this.requestQueue = [];
        this.maxQueueSize = 100;
    }
    
    startSending() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.intervalId = setInterval(() => {
            this.sendDroneDataHTTP();
        }, this.sendInterval);
        
        console.log('📡 HTTP data sending started');
    }
    
    stopSending() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isActive = false;
        console.log('📡 HTTP data sending stopped');
    }
    
    async sendDroneDataHTTP() {
        const droneData = {
            timestamp: new Date().toISOString(),
            droneId: 'DRONE_001',
            coordinates: {
                x: this.simulator.drone.x,
                y: this.simulator.drone.y,
                latitude: this.convertToLatitude(this.simulator.drone.y),
                longitude: this.convertToLongitude(this.simulator.drone.x)
            },
            telemetry: {
                altitude: this.simulator.drone.altitude,
                speed: this.simulator.drone.speed,
                direction: this.simulator.drone.direction,
                battery: this.simulator.drone.battery
            },
            status: {
                mode: this.simulator.currentMode,
                statusText: this.simulator.drone.status,
                isActive: this.simulator.isRunning
            }
        };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/drone-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_TOKEN', // Gerekirse API token
                },
                body: JSON.stringify(droneData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Data sent successfully:', result);
            
        } catch (error) {
            console.error('❌ Failed to send data:', error);
            this.queueFailedRequest(droneData);
        }
    }
    
    async sendAnomalyHTTP(anomalyType) {
        const anomalyData = {
            timestamp: new Date().toISOString(),
            droneId: 'DRONE_001',
            anomaly: {
                type: anomalyType,
                severity: this.calculateSeverity(anomalyType),
                description: this.simulator.drone.status
            },
            coordinates: {
                x: this.simulator.drone.x,
                y: this.simulator.drone.y,
                latitude: this.convertToLatitude(this.simulator.drone.y),
                longitude: this.convertToLongitude(this.simulator.drone.x)
            }
        };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/anomalies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_TOKEN',
                },
                body: JSON.stringify(anomalyData)
            });
            
            if (response.ok) {
                console.log('🚨 Anomaly reported successfully');
            }
            
        } catch (error) {
            console.error('❌ Failed to report anomaly:', error);
        }
    }
    
    queueFailedRequest(data) {
        if (this.requestQueue.length >= this.maxQueueSize) {
            this.requestQueue.shift(); // En eski request'i çıkar
        }
        this.requestQueue.push(data);
    }
    
    async retryFailedRequests() {
        while (this.requestQueue.length > 0) {
            const data = this.requestQueue.shift();
            try {
                await this.sendSingleRequest(data);
            } catch (error) {
                this.requestQueue.unshift(data); // Tekrar başa ekle
                break;
            }
        }
    }
    
    calculateSeverity(anomalyType) {
        switch (anomalyType) {
            case 'altitude': return 'high';
            case 'route': return 'medium';
            case 'speed': return 'low';
            default: return 'medium';
        }
    }
    
    convertToLatitude(y) {
        const minLat = 40.9000;
        const maxLat = 41.2000;
        return minLat + (y / 400) * (maxLat - minLat);
    }
    
    convertToLongitude(x) {
        const minLng = 28.8000;
        const maxLng = 29.2000;
        return minLng + (x / 600) * (maxLng - minLng);
    }
}
