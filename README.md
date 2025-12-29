# INA219 Sensor Monitor

A comprehensive Python-based power monitoring system for renewable energy applications. Monitor solar panels, wind turbines, and battery banks using INA219 current/voltage sensors with real-time web dashboard, MQTT integration, and Home Assistant compatibility.

---

## 🚀 Key Features

### 📊 **Multi-Source Power Monitoring**
- **Solar Panels**: Track voltage, current, power output, and generation trends
- **Wind Turbines**: Monitor turbine performance with proper handling of bi-directional current flow
- **Battery Banks**: Real-time state of charge (SoC), charging/discharging status, and health monitoring
- **Automatic Totals**: Backend-calculated power generation totals with proper current direction handling

### 🌐 **Advanced Web Interface**
- **Real-time Dashboard**: Live power generation and consumption data
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Interactive Sensor Cards**: Detailed sensor readings with trend indicators
- **Live Updates**: WebSocket-based real-time data streaming

### ⚙️ **Smart Configuration Management**
- **Web-based Settings**: Configure sensors, polling intervals, and system settings via UI
- **Dynamic Sensor Management**: Add, edit, or remove sensors without system restart
- **Device Management**: Support for multiple GPIO devices (local and remote)
- **Backup & Restore**: Complete configuration backup with versioning support

### 🔄 **Distributed Architecture**
- **Remote GPIO Support**: Monitor sensors on remote Raspberry Pi devices using `pigpio`
- **Multi-device Management**: Connect and manage multiple sensor devices from one dashboard
- **Connection Monitoring**: Automatic device health checking and reconnection

### 🏡 **Home Assistant Integration**
- **MQTT Auto-discovery**: Automatic sensor registration in Home Assistant
- **Complete Device Integration**: All sensors appear as native HA entities
- **Retained Messages**: Reliable data persistence and recovery
- **Standard Measurements**: Voltage (V), Current (A), Power (W), Battery SoC (%)

---

## 🔧 Supported Sensor Types

### **Solar Panel Monitoring**
- Real-time power generation tracking
- Voltage and current measurement
- Daily/hourly generation trends
- Peak power detection

### **Wind Turbine Monitoring**  
- Bi-directional current handling (accounts for wiring orientation)
- Wind generation totals with absolute power calculations
- Turbine performance metrics
- Current direction indicators

### **Battery Bank Monitoring**
- State of charge (SoC) estimation for 12V/24V lead-acid batteries
- Charging/discharging status detection
- Battery health monitoring
- Separate tracking of charge-in and discharge-out power

---

## 🖥️ Web Interface Pages

### **📈 Dashboard**
- **Power Generation Overview**: Total, solar, and wind power generation
- **Battery Status**: SoC percentage with charging/discharging indicators  
- **System Health**: Device connection status and sensor counts
- **Live Totals Header**: Real-time power totals in navigation bar

### **🔌 Sensors**
- **Interactive Sensor Cards**: Individual sensor readings with connection status
- **Sensor Management**: Add, edit, or delete sensors dynamically
- **Reading History**: Historical data logs for each sensor
- **Connection Indicators**: Visual status of local vs remote GPIO connections

### **⚙️ Settings**
- **System Configuration**: Polling intervals, log levels, web server settings
- **MQTT Settings**: Broker configuration and Home Assistant integration
- **Device Management**: Add and configure local/remote GPIO devices
- **Service Control**: Restart application directly from web interface

### **💾 Configuration Backup**
- **Backup Creation**: Download complete system configuration as JSON
- **Backup Management**: View, restore, or delete previous backups
- **Selective Restore**: Choose to restore configuration only, sensors only, or both
- **Version Control**: Timestamped backup files for easy identification

### **📜 System Logs**
- **Real-time Log Viewing**: Live system logs with filtering by severity
- **Error Tracking**: Highlight errors and warnings for troubleshooting
- **Connection Events**: Track device connections and sensor discoveries
- **Performance Monitoring**: System health and performance metrics

### **❓ About & Documentation**
- **Integrated Help**: README.md rendered directly in the web interface
- **Feature Documentation**: Complete feature descriptions and usage guides
- **Version Information**: System version and component details

---

## 🔌 Hardware Setup

### **Required Components**
- **Primary Controller**: Raspberry Pi (any model with GPIO)
- **Sensors**: INA219 current/voltage/power sensors
- **Connections**: I²C wiring (SDA, SCL, 3.3V, GND)
- **Optional**: Additional Raspberry Pi devices for distributed monitoring
- **Optional**: Logic level shifters for long I²C runs

### **I²C Connections**
| INA219 Pin | Raspberry Pi |
|------------|--------------|
| VCC        | 3.3V (Pin 1) |
| GND        | GND (Pin 6)  |
| SDA        | GPIO2 (Pin 3)|
| SCL        | GPIO3 (Pin 5)|

### **Multiple Sensor Addressing**
Each INA219 sensor requires a unique I²C address (0x40-0x43). Connect the A0/A1 pins to VCC or GND to set different addresses:
- **0x40** (default): A0=GND, A1=GND  
- **0x41**: A0=VCC, A1=GND
- **0x42**: A0=GND, A1=VCC
- **0x43**: A0=VCC, A1=VCC

---

## 🌐 Remote GPIO Configuration

Enable monitoring of sensors connected to remote Raspberry Pi devices over network.

### **Remote Device Setup** (Device with sensors attached)
```bash
# Enable I²C interface
sudo raspi-config
# Navigate to: Interfacing Options > I2C > Yes

# Install and start pigpio daemon
sudo apt update && sudo apt install pigpio
sudo systemctl enable pigpiod
sudo systemctl start pigpiod

# Verify pigpio is running (should show port 8888 listening)
sudo netstat -tlnp | grep :8888
```

### **Main Controller Setup** (Device running the web interface)
Add remote device in the web interface Settings > Device Management, or manually configure:

```json
{
  "devices": [
    {
      "name": "Remote Sensor Hub",
      "id": 1,
      "remote_gpio": 1,
      "gpio_address": "192.168.1.100"
    }
  ]
}
```

---

## 📦 Installation & Setup

### **System Requirements**
- **Operating System**: Raspberry Pi OS, Ubuntu, or Debian-based Linux
- **Python**: Version 3.7 or later
- **Hardware**: Raspberry Pi with I²C enabled
- **Network**: MQTT broker (local or remote)

### **Quick Installation**
```bash
# Clone repository
git clone https://github.com/allanbeth/ina219_sensor_monitor.git
cd ina219_sensor_monitor

# Install system dependencies
sudo apt update
sudo apt install -y python3-pip pigpio python3-pigpio i2c-tools

# Install Python dependencies  
pip3 install -r requirements.txt

# Enable I²C interface
sudo raspi-config
# Navigate to: Interfacing Options > I2C > Yes

# Start pigpio daemon (for local GPIO)
sudo systemctl enable pigpiod
sudo systemctl start pigpiod

# Run the application
python3 main.py
```

### **System Service Installation**
```bash
# Copy service file to systemd
sudo cp sensor_monitor.service /etc/systemd/system/

# Edit paths in service file to match your installation
sudo nano /etc/systemd/system/sensor_monitor.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sensor_monitor.service
sudo systemctl start sensor_monitor.service

# Check service status
sudo systemctl status sensor_monitor.service
```

---

## ⚙️ Configuration Files

### **Main Configuration (`config.json`)**
```json
{
  "devices": [
    {
      "name": "Local GPIO",
      "id": 0,
      "remote_gpio": 0,
      "gpio_address": "localhost"
    }
  ],
  "poll_intervals": {
    "Solar": 5,
    "Wind": 7,
    "Battery": 10
  },
  "max_log": 10,
  "max_readings": 20,
  "mqtt_broker": "localhost",
  "mqtt_port": 1883,
  "mqtt_username": "",
  "mqtt_password": "",
  "webserver_host": "0.0.0.0",
  "webserver_port": 5000
}
```

### **Sensor Configuration (`sensors.json`)**
```json
[
  {
    "name": "Solar Panel Array",
    "address": 64,
    "type": "Solar", 
    "max_power": 300,
    "rating": 24,
    "device_id": 0
  },
  {
    "name": "Wind Turbine",
    "address": 65,
    "type": "Wind",
    "max_power": 400,
    "rating": 24,
    "device_id": 0  
  },
  {
    "name": "Battery Bank",
    "address": 66,
    "type": "Battery",
    "max_power": 1000,
    "rating": 24,
    "device_id": 0
  }
]
```

---

## 🏡 Home Assistant Integration

### **MQTT Discovery**
Sensors automatically appear in Home Assistant when MQTT discovery is enabled:

```yaml
# configuration.yaml
mqtt:
  discovery: true
  discovery_prefix: homeassistant
```

### **Available Entities**
Each sensor creates the following entities in Home Assistant:
- **`sensor.<name>_voltage`**: Voltage measurement (V)
- **`sensor.<name>_current`**: Current measurement (A) 
- **`sensor.<name>_power`**: Power measurement (W)
- **`sensor.<name>_state_of_charge`**: Battery SoC (%) - Battery sensors only
- **`sensor.<name>_status`**: Battery status - Battery sensors only
- **`sensor.<name>_output`**: Output percentage - Solar/Wind sensors only

### **System Totals**
Additional entities for system-wide totals:
- **`sensor.total_power`**: Combined solar + wind generation
- **`sensor.solar_total`**: Total solar power generation
- **`sensor.wind_total`**: Total wind power generation  
- **`sensor.battery_soc_total`**: Average battery state of charge
- **`sensor.battery_in_total`**: Total battery charging power
- **`sensor.battery_out_total`**: Total battery discharging power

---

## 🔍 Troubleshooting

### **Common Issues**

**Sensors Not Detected**
```bash
# Check I²C is enabled and devices are connected
sudo i2cdetect -y 1

# Verify pigpio is running
sudo systemctl status pigpiod

# Check application logs
tail -f sensor_monitor.log
```

**MQTT Connection Issues**
```bash
# Test MQTT broker connectivity
mosquitto_pub -h localhost -t test -m "hello"
mosquitto_sub -h localhost -t test

# Check MQTT broker is running
sudo systemctl status mosquitto
```

**Web Interface Not Loading**
```bash  
# Check if service is running
sudo systemctl status sensor_monitor.service

# Verify port is not blocked
sudo netstat -tlnp | grep :5000

# Check firewall settings
sudo ufw status
```

**Remote GPIO Connection Failures**
```bash
# On remote device, verify pigpiod is accessible
sudo netstat -tlnp | grep :8888

# Test connection from main controller
telnet <remote-ip> 8888

# Check firewall on remote device
sudo ufw allow 8888
```

### **Debug Mode**
Enable detailed logging by modifying the configuration:
```json
{
  "debug_mode": true,
  "log_level": "DEBUG"
}
```

---

## 🚀 Advanced Features

### **Current Direction Handling**
The system properly handles bi-directional current flow, especially important for wind turbines:
- **Positive Current**: Current flowing in one direction
- **Negative Current**: Current flowing in opposite direction  
- **Power Totals**: Uses absolute values to show total generation regardless of current direction
- **Individual Readings**: Preserves current sign to indicate flow direction

### **Data Validation & Filtering**  
- **Outlier Detection**: Automatically rejects readings that deviate significantly from recent values
- **Smoothing Algorithms**: Moving average calculations for stable readings
- **Connection Validation**: Only includes sensors with valid data in totals calculations

### **Performance Optimization**
- **Efficient Polling**: Different poll intervals for different sensor types
- **WebSocket Communications**: Real-time updates without page refresh
- **Caching**: Intelligent data caching to reduce I²C bus traffic
- **Background Processing**: Non-blocking sensor reads and data processing

---

## 🛠️ Development

### **Project Structure**
```
ina219_sensor_monitor/
├── main.py                 # Application entry point
├── sensor_monitor/         # Main package
│   ├── config_manager.py   # Configuration handling  
│   ├── sensor_manager.py   # Device and sensor management
│   ├── sensor.py           # Individual sensor logic
│   ├── mqtt.py             # MQTT publisher and Discovery
│   ├── webserver.py        # Flask web server and API endpoints
│   └── logger.py           # Logging configuration
├── templates/
│   └── index.html          # Main web interface template
├── static/                 # Web assets
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript modules
│   └── icons/              # Web app icons
├── config.json             # Main configuration file
├── sensors.json            # Sensor definitions
├── requirements.txt        # Python dependencies
└── sensor_monitor.service  # Systemd service definition
```

### **API Endpoints**
The web interface provides RESTful API endpoints:

- **GET `/`**: Main web interface
- **GET `/get_settings`**: Retrieve current configuration
- **POST `/update_settings`**: Update system configuration
- **POST `/add_sensor`**: Add new sensor  
- **POST `/update_sensor`**: Modify existing sensor
- **POST `/delete_sensor`**: Remove sensor
- **POST `/backup`**: Create configuration backup
- **POST `/restore_backup`**: Restore from backup
- **GET `/get_log_file`**: Retrieve system logs
- **POST `/restart`**: Restart application service
- **GET `/readme`**: Serve documentation

---

## 📈 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow coding standards**: PEP 8 for Python, ESLint for JavaScript
3. **Add tests** for new functionality
4. **Update documentation** for any new features
5. **Submit a pull request** with detailed description

### **Development Setup**
```bash
# Clone your fork
git clone https://github.com/yourusername/ina219_sensor_monitor.git
cd ina219_sensor_monitor

# Create development environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run in development mode
python3 main.py
```

---

## 📄 License

MIT License © 2025 Allan Beth

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.