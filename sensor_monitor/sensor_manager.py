from sensor_monitor.sensor import Sensor
from sensor_monitor.config import SENSOR_FILE, CONFIG_FILE
from sensor_monitor.mqtt import MQTTPublisher
from sensor_monitor.logger import sensor_logger



import json
import board
import time

class SensorManager:
    def __init__(self):
        self.i2c = board.I2C()   
        self.config = self.load_config()
        self.poll_intervals = self.config.get("poll_intervals", {})
        self.settings = self.config.get("settings", {})
        self.logger = sensor_logger(self.settings.get("max_log", 5))    
        self.last_poll_times = {}
        self.sensors = self.load_sensors()
        self.mqtt = MQTTPublisher(self.logger)
        self.load_mqtt_discovery()  

    def load_config(self):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning(f"Config file {CONFIG_FILE} not found, using defaults.")
            return {}

    def detect_sensors(self):       
        while not self.i2c.try_lock():
                pass
        try:
            while True:
                addresses = self.i2c.scan()
                print(
                    "I2C addresses found:",
                    [hex(device_address) for device_address in self.i2c.scan()],
                )
                return addresses
        finally:
            self.i2c.unlock()     
    
    def load_sensors(self):
        sensors = []
        try:
            with open(SENSOR_FILE, "r") as f:
                sensor_data = json.load(f)
                sensors = [Sensor(s["name"], s["address"], s["type"], s["max_power"], s["rating"]) for s in sensor_data]
                self.logger.info("Configured Sensor:")

                for sensor in sensors:
                    self.logger.info(sensor.name)     
        except:
            pass

        existing_sensors = [s.address for s in sensors]
        connected_sensors = self.detect_sensors()

        for addr in connected_sensors:
            if addr not in existing_sensors:
                default_name = f"Sensor_{addr}"
                default_type = "Solar"
                default_max_power = 100
                default_rating = 12
                sensors.append(Sensor(default_name, addr, default_type, default_max_power, default_rating))

        self.save_sensors(sensors)
        return sensors
        
    def new_sensor(self):
        sensor = [Sensor("New", 64, "solar", )]
        self.save_sensors(sensor)
        self.sensors = self.load_sensors()


    def save_sensors(self, sensors=None):
        if sensors is None:
            sensors = self.sensors
        with open(SENSOR_FILE, "w") as f:
            json.dump([{"name": s.name, "address": s.address, "type": s.type, "max_power": s.max_power, "rating": s.rating} for s in sensors], f)

    def update_sensor(self, name, new_name, new_type, new_max_power, new_rating):
        for sensor in self.sensors:
            if sensor.name == name:
                sensor.name = new_name
                sensor.type = new_type
                sensor.max_power = new_max_power
                sensor.rating = new_rating
                self.save_sensors()
                self.mqtt.send_discovery_config(sensor.name)
                return True
        return False
    
    def remove_sensor(self, name):
        sensor_to_remove = None
        for sensor in self.sensors:
            if sensor.name == name:
                sensor_to_remove = sensor
                break

        if sensor_to_remove:
            self.sensors.remove(sensor_to_remove)
            self.save_sensors()
            self.mqtt.remove_discovery_config(sensor_to_remove.name.replace(" ", "_"))
            self.logger.info(f"Removed sensor: {sensor_to_remove.name}")
            return True
        else:
            self.logger.warning(f"Tried to remove non-existent sensor: {name}")
            return False

    def load_mqtt_discovery(self):
        try:
            for sensor in self.sensors:
                self.mqtt.send_discovery_config(sensor.name, sensor.type)               
        except:
            pass

    def publish_mqtt (self, data):
        try:
            self.mqtt.publish(data)                
        except:
            pass

    def save_settings(self, settings):
        
        with open(CONFIG_FILE, "w") as f:
            self.settings = settings
            json.dump(self.settings, f)
       

    def get_data(self):
        current_time = time.time()
        data = {}

        for s in self.sensors:
            sensor_type = s.type
            poll_interval = self.poll_intervals.get(sensor_type, 5)
            last_poll = self.last_poll_times.get(s.name, 0)

            if current_time - last_poll >= poll_interval:
                sensor_data = s.read_data()
                self.last_poll_times[s.name] = current_time
                self.logger.info((f"Sensor: {s.name}"))
                self.logger.info(f"Current Data: {sensor_data['voltage']}, {sensor_data['current']}, {sensor_data['power']}")
                readings = sensor_data['readings']
                for reading in readings:
                    self.logger.info(f"Readings: {reading}")
            else:
                if s.readings:
                    readings =list(s.readings)
                    sensor_data = {
                        "voltage": 0,
                        "current": 0,
                        "power": 0,
                        "time_stamp": s.readings[-1]["time_stamp"],
                        "state_of_charge": 0 if s.type== "Battery" else None,
                        "output": "Off" if s.type!= "Battery" else None,
                        "readings": readings
                    }
                else:
                    sensor_data = {
                        "voltage": 0,
                        "current": 0,
                        "power": 0,
                        "time_stamp": "Not Updated",
                        "state_of_charge": 0 if s.type== "Battery" else None,
                        "output": "Off" if s.type!= "Battery" else None,
                        "readings": []
                    }

            data[s.name] = {
                "address": s.address,
                "type": s.type,
                "max_power": s.max_power,
                "rating": s.rating,
                "data": sensor_data
            }

        if data:
            self.publish_mqtt(data)

        return data
