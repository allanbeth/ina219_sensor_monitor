# Sensor Monitor

A Python-based sensor monitoring system for reading INA219 power sensors via I²C using local or remote GPIO, with a real-time web interface, MQTT support, and Home Assistant auto-discovery.

---

## 🚀 Features

- Reads voltage, current, power, and state of charge (for batteries) from INA219 sensors.
- Web interface with real-time updates, configuration panel, logs, sensor editing, and backup/restore.
- Publishes data to MQTT with Home Assistant discovery support.
- Remote GPIO support using `pigpio` for controlling I²C-connected sensors on another device.
- Automatically detects and registers sensors on the I²C bus.
- Supports restart via the web UI when managed by `systemd`.

---

## 🔌 Hardware Requirements & Connections

### Required Hardware

- Raspberry Pi (or compatible SBC)
- One or more **INA219** voltage/current/power sensors
- I²C wires (SDA/SCL, VCC, GND)
- Optional: Remote Raspberry Pi or controller for distributed monitoring
- Optional: 3.3V logic-level shifter for longer I²C runs

### Typical Connection (Local GPIO)

| INA219 Pin | Connect To (Raspberry Pi) |
|------------|---------------------------|
| VCC        | 3.3V                      |
| GND        | GND                       |
| SDA        | GPIO2 (Pin 3)             |
| SCL        | GPIO3 (Pin 5)             |

Enable I²C on the Pi via `sudo raspi-config`.

---

## 🌐 Remote GPIO Setup (Using `pigpio`)

To monitor sensors attached to another Pi on the network:

### On the **Remote Pi** (with sensors):

1. Enable I²C (`sudo raspi-config`)
2. Start the `pigpiod` daemon:
   ```bash
   sudo systemctl enable pigpiod
   sudo systemctl start pigpiod
   ```
3. Ensure port `8888` is open on the remote Pi.

### On the **Main Pi** (running the app):

In `config.json`:
```json
"remote_gpio": 1,
"gpio_address": "192.168.1.10"
```

The app will connect via TCP to the `pigpiod` server on the remote device and read INA219 sensors over I²C.

---

## 📦 Installation

### Prerequisites

- Python 3.7 or later
- Raspberry Pi OS or Linux with I²C enabled
- MQTT broker (e.g. Mosquitto)
- `pigpiod` running (for remote GPIO)

### Install Dependencies

```bash
sudo apt update
sudo apt install -y pigpio python3-pigpio
pip install -r requirements.txt
```

### Enable and Start pigpio Daemon (for local GPIO)

```bash
sudo systemctl enable pigpiod
sudo systemctl start pigpiod
```

---

## ⚙️ Configuration

When the app starts, it will create a `config.json` file if one does not exist.

### Example: `config.json`

```json
{
  "poll_intervals": {
    "Wind": 7,
    "Solar": 5,
    "Battery": 10
  },
  "max_log": 5,
  "max_readings": 5,
  "mqtt_broker": "localhost",
  "mqtt_port": 1883,
  "webserver_host": "0.0.0.0",
  "webserver_port": 5000,
  "gpio_address": "192.168.1.10",
  "remote_gpio": 0
}
```

### Configuration Options

| Key               | Description                                                  |
|------------------|--------------------------------------------------------------|
| `poll_intervals` | Per-sensor-type interval in seconds                          |
| `max_log`        | Maximum log file size in MB                                  |
| `max_readings`   | Number of past readings to keep per sensor                   |
| `mqtt_broker`    | MQTT broker IP or hostname                                   |
| `mqtt_port`      | MQTT port number (usually 1883)                              |
| `webserver_host` | IP to bind the web server to                                 |
| `webserver_port` | Port to serve the web UI on                                  |
| `gpio_address`   | Remote GPIO IP (only used if `remote_gpio` is 1)             |
| `remote_gpio`    | Use remote GPIO (`1` for remote via pigpio, `0` for local)   |

---

## 🌐 Web Interface

Launch the server and access it at:

```
http://<host>:<webserver_port>
```

### UI Features

- **Sensor Cards**: Show real-time voltage, current, power, and charge.
- **Edit Panel**: Rename sensors, adjust type, rating, and max power.
- **Settings Panel**:
  - Modify polling intervals, MQTT broker settings, and GPIO mode.
  - **💾 Backup & Restore**:
    - Download a backup of your `config.json` and sensor settings.
    - Upload a backup to restore previous configurations.
- **Logs**: View the most recent log entries.
- **Restart**: Button to trigger service restart when running via `systemd`.

---

## 🏡 Home Assistant Integration (via MQTT)

### Auto-Discovery

Home Assistant will auto-discover sensors published using MQTT when discovery is enabled.

- **State Topic**:  
  ```
  sensor_monitor/<sensor_name>
  ```

- **Discovery Config Topic**:  
  ```
  homeassistant/sensor/<sensor_name>_<measurement>/config
  ```

- **Measurements**: `voltage`, `current`, `power`, and `state_of_charge` (if battery)

Each sensor publishes availability and data as retained MQTT topics for reliable recovery.

---

## 🔁 Restarting the App

When running under `systemd`, the web UI allows restarting the service with a button.

### Example `systemd` Service File

```ini
[Unit]
Description=Sensor Monitor Service
After=network.target

[Service]
ExecStart=/usr/bin/python3 /path/to/main.py
WorkingDirectory=/path/to
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

Enable the service:

```bash
sudo systemctl daemon-reexec
sudo systemctl enable sensor_monitor.service
sudo systemctl start sensor_monitor.service
```

---

## 🧪 Development & Debugging

Run manually with:

```bash
python3 main.py
```

To view logs:

```bash
tail -f sensor_monitor.log
```

To debug the web UI, open the browser DevTools and check the Console tab.

---

## 🛠 Contributing

Feel free to open issues or PRs!

1. Fork this repository
2. Create a new feature branch
3. Commit and push your changes
4. Submit a pull request

---

## 📄 License

MIT License © 2025 Allan Beth