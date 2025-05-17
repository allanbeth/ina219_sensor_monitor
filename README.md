# INA219 Sensor Monitor

A Python-based web application designed to monitor real-time data from an INA219 energy sensor connected to a Raspberry Pi. It provides a user-friendly web interface to visualize voltage, current, and power readings.

---

## Features

- Real-time monitoring of voltage, current, and power from the INA219 sensor.
- Web interface built with Flask for easy access and visualization.
- Configurable sensor settings via a JSON file.
- Systemd service file included for running the application as a background service on boot.

---

## Prerequisites

- Raspberry Pi with I2C enabled.
- INA219 sensor connected via I2C.
- Python 3 installed on the Raspberry Pi.

---

## Installation

### 1. Clone the Repository

```bash
$ git clone https://github.com/allanbeth/sensor_monitor.git
$ cd sensor_monitor
```

### 2. Install Required Python Packages

```bash
$ pip install -r requirements.txt
```

### 3. Enable I2C on Raspberry Pi

Ensure that I2C is enabled by running:

```bash
$ sudo raspi-config
```

Navigate to:

```
Interfacing Options > I2C
```

Enable it and reboot if necessary.

### 4. Configure Sensor Settings

Connected sensors will be detected automatically and saved to `sensors.json`.  
This file contains settings such as sensor address and calibration values.

---

## Usage

### Run the Application

```bash
$ python main.py
```

By default, the Flask application will start on:

```
http://0.0.0.0:5000/
```

You can access it via your browser using the Raspberry Pi's IP address.

### Access the Web Interface

Open your web browser and navigate to:

```
http://<raspberry_pi_ip_address>:5000/
```

Replace `<raspberry_pi_ip_address>` with the actual IP address of your Raspberry Pi.

---

## Running as a Service

### 1. Copy the Service File

```bash
$ sudo cp sensor_monitor.service /etc/systemd/system/
```

### 2. Reload systemd and Enable the Service

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl enable sensor_monitor.service
```

### 3. Start the Service

```bash
$ sudo systemctl start sensor_monitor.service
```

### 4. Check Service Status

```bash
$ sudo systemctl status sensor_monitor.service
```

---

## Dependencies

The application relies on the following Python packages:

- `Flask`
- `smbus2`
- `ina219`

These are specified in the `requirements.txt` file.
