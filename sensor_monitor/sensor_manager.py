# sensor_monitor/sensor_manager.py

import json
import time
import pigpio
import board
import sys
try:
    from sensor_monitor.sensor import Sensor
    from sensor_monitor.config_manager import SENSOR_FILE, MQTT_STATUS
    from sensor_monitor.mqtt import MQTTPublisher
    from sensor_monitor.webserver import flaskWrapper
    from sensor_monitor.logger import logger
except Exception as ex:
    print("Error loading config: " + str(ex))
    sys.exit()

class Device:
    def __init__(self, name, id, remote_gpio=False, gpio_address=None):
        self.name = name
        self.id = id
        self.remote_gpio = remote_gpio
        self.gpio_address = gpio_address
        self.pi = None
        self.i2c = None
        self.connected = False
        self.last_connection_check = 0
        self.connection_check_interval = 30  # Check connection every 30 seconds
        logger.info(f"Initializing Device: {self.name} (ID: {self.id} Remote GPIO: {self.remote_gpio})")

    def connect(self):
        try:
            if self.remote_gpio:
                logger.info(f"{self.name}: Establishing remote GPIO connection at {self.gpio_address}")
                if self.pi:
                    self.pi.stop()  # Close existing connection if any
                self.pi = pigpio.pi(self.gpio_address)
                if not self.pi.connected:
                    self.connected = False
                    raise RuntimeError(f"{self.name}: Could not connect to remote GPIO at {self.gpio_address}")
                self.connected = True
                logger.info(f"{self.name}: Remote GPIO connection established")
            else:
                logger.info(f"{self.name}: Establishing local GPIO connection")
                self.i2c = board.I2C()
                self.connected = True
                logger.info(f"{self.name}: Local GPIO connection established")
            self.last_connection_check = time.time()
        except Exception as e:
            self.connected = False
            logger.error(f"{self.name}: Connection failed - {str(e)}")
            raise

    def check_connection(self):
        """Check if device connection is still alive"""
        current_time = time.time()
        if current_time - self.last_connection_check < self.connection_check_interval:
            return self.connected
            
        try:
            if self.remote_gpio and self.pi:
                # Test connection with a simple GPIO operation
                self.connected = self.pi.connected
            elif not self.remote_gpio and self.i2c:
                # For I2C, the connection is generally stable once established
                self.connected = True
            else:
                self.connected = False
                
            self.last_connection_check = current_time
            if not self.connected:
                logger.warning(f"{self.name}: Connection check failed")
            return self.connected
        except Exception as e:
            self.connected = False
            logger.error(f"{self.name}: Connection check error - {str(e)}")
            return False

    def reconnect(self):
        """Attempt to reconnect the device"""
        logger.info(f"{self.name}: Attempting to reconnect...")
        try:
            self.connect()
            return True
        except Exception as e:
            logger.error(f"{self.name}: Reconnection failed - {str(e)}")
            return False

    def detect_sensors(self):
        if self.remote_gpio:
            logger.warning(f"{self.name}: Remote GPIO sensor detection not implemented; assuming config is correct.")
            return []
        if not self.i2c:
            logger.warning(f"{self.name}: I2C not initialized.")
            return []
        while not self.i2c.try_lock():
            pass
        try:
            addresses = self.i2c.scan()
            for addr in addresses:
                logger.info(f"{self.name}: I2C Sensor detected at {hex(addr)}")
            return addresses
        finally:
            self.i2c.unlock()


class sensor_config:
    def __init__(self, mqtt=None):
        self.sensors = []
        self.mqtt = mqtt

    def save_sensors(self, sensors=None):
        if sensors is None:
            sensors = self.sensors
        with open(SENSOR_FILE, "w") as f:
            json.dump([{"name": s.name, "address": s.address, "type": s.type,
                        "max_power": s.max_power, "rating": s.rating, "device_id": s.device_id} for s in sensors], f)

    def update_sensor(self, name, new_name, new_type, new_max_power, new_rating, new_address, new_device_id):
        for sensor in self.sensors:
            if sensor.name == name:
                sensor.name = new_name
                sensor.type = new_type
                sensor.max_power = new_max_power
                sensor.rating = new_rating
                sensor.address = new_address
                sensor.device_id = new_device_id
                self.save_sensors()
                self.mqtt.send_discovery_config(sensor.name, sensor.type)
                return True
        return False

    def remove_sensor(self, name):
        sensor_to_remove = next((s for s in self.sensors if s.name == name), None)
        if sensor_to_remove:
            self.sensors.remove(sensor_to_remove)
            self.save_sensors()
            self.mqtt.remove_discovery_config(sensor_to_remove.name, sensor_to_remove.type)
            logger.info(f"Removed sensor: {sensor_to_remove.name}")
            return True
        logger.warning(f"Tried to remove non-existent sensor: {name}")
        return False


class SensorManager:
    def __init__(self, config):
        self.config = config
        #logger = sensor_logger()
        self.set_config()

        self.mqtt = MQTTPublisher(self.mqtt_config)
        self.sensor_config = sensor_config( self.mqtt)

        self.devices = []
        for d in self.device_configs:
            device = Device(
                name=d['name'],
                id=d.get('id', 0),
                remote_gpio=d.get('remote_gpio', 0) == 1,
                gpio_address=d.get('gpio_address')
            )
            
            try:
                device.connect()
                self.devices.append(device)
                logger.info(f"Device {device.name} connected successfully")
            except Exception as e:
                logger.error(f"Failed to connect to device {device.name}: {str(e)}")
                logger.info(f"Continuing without device {device.name}")
                # Continue without this device - webserver will still start

        self.sensors = self.load_sensors()
        self.sensor_config.sensors = self.sensors

        self.webserver = flaskWrapper(self.config, self.sensor_config)
        self.webserver.mqtt_publisher = self.mqtt  # Pass MQTT publisher to webserver

        self.mqtt.publish_hub_device()
        self.load_mqtt_discovery()

    def set_config(self):
        self.device_configs = self.config.config_data["devices"]
        logger.info(f"Sensor Manager initialized with {len(self.device_configs)} devices")
        self.poll_intervals = self.config.config_data.get("poll_intervals", {})
        # logger.max_log_size = self.config.config_data["max_log"]
        self.last_poll_times = {}
        self.mqtt_config = {
            "mqtt_broker": self.config.config_data['mqtt_broker'],
            "mqtt_port": self.config.config_data['mqtt_port']
        }
        self.battery_count = 0
        self.totals_data = {}

    def load_sensors(self):
        sensors = []
        try:
            with open(SENSOR_FILE, "r") as f:
                logger.info(f"Loading sensors from {SENSOR_FILE}")
                sensor_data = json.load(f)

                for s in sensor_data:
                    i2c = None
                    pi = None
                    device_id = s.get("device_id", 0)
                    logger.info(f"Loading sensor: {s['name']} at address {s['address']} on device ID {device_id}")

                    # Look for connected device
                    device_found = False
                    for device in self.devices:
                        if device.id == device_id:
                            logger.info(f"Found device {device.name} for sensor {s['name']}")
                            if device.remote_gpio:
                                logger.info(f"Using remote GPIO for sensor {s['name']}")
                            i2c = device.i2c
                            pi = device.pi
                            device_found = True
                            logger.info(f"Found matching device for sensor {s['name']}: {device.name}")
                            break

                    # Create sensor regardless of device connection status
                    # If device is not connected, i2c and pi will be None, causing graceful degradation
                    sensor = Sensor(
                        s["name"],
                        s["address"],
                        s["type"],
                        s["max_power"],
                        s["rating"],
                        self.config.config_data['max_readings'],
                        device_id=device_id,
                        i2c=i2c,
                        pi=pi
                    )
                    
                    if not device_found:
                        logger.warning(f"Creating sensor {sensor.name} without device connection - will show null data")
                    else:
                        logger.info(f"Creating Sensor: {sensor.name} of type {sensor.type} with address {sensor.address}")
                    
                    sensors.append(sensor)

                    if sensor.type == "Battery":
                        self.battery_count += 1

                    logger.info(f"Configured Sensor: {sensor.name}")
        except Exception as e:
            logger.warning(f"Failed to load sensors from file: {e}")
            
        # If no saved sensors but we have device configurations, create default sensors
        if not sensors:
            logger.info("No saved sensors found, creating default sensors from device config")
            for device_config in self.config.config_data.get('devices', []):
                device_id = device_config.get('id', 0)
                device_name = device_config.get('name', f'Device_{device_id}')
                device_found = False
                i2c = None
                pi = None
                
                # Look for connected device
                for d in self.devices:
                    if d.id == device_id:
                        device_found = True
                        i2c = d.i2c
                        pi = d.pi
                        break
                
                # Create default sensors for each configured device (connected or not)
                default_sensors = [
                    {"name": f"Battery_{device_name}", "address": 0x40, "type": "Battery", "max_power": 100, "rating": 12},
                    {"name": f"Solar_{device_name}", "address": 0x41, "type": "Solar", "max_power": 100, "rating": 12}
                ]
                
                for sensor_config in default_sensors:
                    sensor = Sensor(
                        sensor_config["name"],
                        sensor_config["address"],
                        sensor_config["type"],
                        sensor_config["max_power"],
                        sensor_config["rating"],
                        self.config.config_data['max_readings'],
                        device_id=device_id,
                        i2c=i2c,
                        pi=pi
                    )
                    
                    if not device_found:
                        logger.warning(f"Creating default sensor {sensor.name} without device connection - will show null data")
                    else:
                        logger.info(f"Creating default sensor: {sensor.name}")
                    
                    sensors.append(sensor)
                    
                    if sensor.type == "Battery":
                        self.battery_count += 1

        # Auto-detect sensors only on successfully connected devices
        for device in self.devices:
            if not device.remote_gpio:
                existing_addresses = [s.address for s in sensors]
                new_addresses = device.detect_sensors()
                for addr in new_addresses:
                    if addr not in existing_addresses:
                        default_sensor = Sensor(
                            f"{device.name}_{addr}", addr, "Solar", 100, 12,
                            self.config.config_data['max_readings'], device_id=device.id, i2c=device.i2c
                        )
                        sensors.append(default_sensor)

        # Save sensors if we have any
        if sensors:
            self.sensor_config.save_sensors(sensors)
        
        logger.info(f"Total sensors loaded: {len(sensors)} (connected devices: {len(self.devices)})")
        return sensors

    def load_mqtt_discovery(self):
        self.mqtt.publish_totals_device()
        for sensor in self.sensors:
            try:
                self.mqtt.send_discovery_config(sensor.name, sensor.type)
                logger.info(f"MQTT discovery published for {sensor.name}")
            except Exception as e:
                logger.error(f"MQTT discovery failed for {sensor.name}: {e}")

    def get_data(self):
        current_time = time.time()
        data = {}

        solar_total = 0.0
        wind_total = 0.0
        average_battery_soc = 0.0
        battery_in_total = 0.0
        battery_out_total = 0.0
        battery_count = 0

        # Check device connections periodically
        connected_devices = 0
        device_status = {}
        
        for device in self.devices:
            is_connected = device.check_connection()
            device_status[device.id] = {
                "name": device.name,
                "connected": is_connected,
                "type": "remote" if device.remote_gpio else "local",
                "address": device.gpio_address if device.remote_gpio else "local"
            }
            if is_connected:
                connected_devices += 1
        
        # Try to reconnect failed devices
        for device_config in self.device_configs:
            device_id = device_config.get('id', 0)
            if device_id not in [d.id for d in self.devices]:
                # Device not in connected devices list, try to add it
                device = Device(
                    name=device_config['name'],
                    id=device_id,
                    remote_gpio=device_config.get('remote_gpio', 0) == 1,
                    gpio_address=device_config.get('gpio_address')
                )
                if device.reconnect():
                    self.devices.append(device)
                    logger.info(f"Device {device.name} reconnected successfully")
                    connected_devices += 1
                    device_status[device_id] = {
                        "name": device.name,
                        "connected": True,
                        "type": "remote" if device.remote_gpio else "local",
                        "address": device.gpio_address if device.remote_gpio else "local"
                    }
                else:
                    device_status[device_id] = {
                        "name": device_config['name'],
                        "connected": False,
                        "type": "remote" if device_config.get('remote_gpio', 0) == 1 else "local",
                        "address": device_config.get('gpio_address', 'local')
                    }

        for s in self.sensors:
            data[s.name] = {
                "address": s.address,
                "type": s.type,
                "max_power": s.max_power,
                "rating": s.rating,
                "device_id": s.device_id
            }

            poll_interval = self.poll_intervals.get(s.type, 30)
            last_poll = self.last_poll_times.get(s.name, 0)

            if current_time - last_poll >= poll_interval:
                sensor_data = s.read_data()
                self.last_poll_times[s.name] = current_time
                data[s.name]['data'] = sensor_data

                logger.info(f"New Reading - {s.name}: {data[s.name]['data']['voltage']}V, {data[s.name]['data']['current']}A, {data[s.name]['data']['power']}W")
                self.mqtt.publish_new_data(s.name, sensor_data)
                self.webserver.broadcast_sensor_data()
            else:
                if s.readings:
                    sensor_data = s.current_data()
                    data[s.name]['data'] = sensor_data
                else:
                    sensor_data = {
                        "voltage": 0,
                        "current": 0,
                        "power": 0,
                        "time_stamp": "Not Updated",
                        "status": "no data" if s.type == "Battery" else None,
                        "state_of_charge": 0 if s.type == "Battery" else None,
                        "output": 0 if s.type != "Battery" else None,
                        "readings": []
                    }
                    data[s.name]['data'] = sensor_data

            # --- Calculate totals for all sensors, using latest data ---
            # Only calculate totals for sensors with valid data (not default 'no data' state)
            sensor_power = data[s.name]['data'].get("power", 0.0)
            sensor_voltage = data[s.name]['data'].get("voltage", 0.0)
            
            # Skip sensors with no readings (voltage and power both 0 usually indicates no data)
            if sensor_voltage > 0 or sensor_power != 0:
                if s.type == "Solar":
                    # Use absolute power for solar in case of negative readings due to wiring
                    solar_total += abs(sensor_power)
                elif s.type == "Wind":
                    # For wind turbines, use absolute power for totals since negative power
                    # just indicates current direction (depends on wiring/sensor orientation)
                    wind_total += abs(sensor_power)
                elif s.type == "Battery":
                    soc = data[s.name]['data'].get("state_of_charge", 0.0)
                    status = data[s.name]['data'].get("status", "")
                    average_battery_soc += soc
                    battery_count += 1
                    if status == "charging":
                        battery_in_total += abs(sensor_power)
                    elif status == "discharging":
                        battery_out_total += abs(sensor_power)

        # Calculate average SoC
        if battery_count > 0:
            average_battery_soc = average_battery_soc / battery_count

        # Calculate total power generation (solar + wind)
        total_power_generation = solar_total + wind_total
        
        self.totals_data = {
            "solar_total": round(solar_total, 2),
            "wind_total": round(wind_total, 2),
            "total_power": round(total_power_generation, 2),
            "battery_soc_total": round(average_battery_soc, 2),
            "battery_in_total": round(battery_in_total, 2),
            "battery_out_total": round(battery_out_total, 2)
        }

        self.mqtt.publish_totals_data(self.totals_data)
        data["totals"] = self.totals_data
        data["devices"] = device_status
        data["system_status"] = {
            "connected_devices": connected_devices,
            "total_devices": len(self.device_configs),
            "active_sensors": len([s for s in self.sensors if hasattr(s, 'readings') and s.readings])
        }
        return data
