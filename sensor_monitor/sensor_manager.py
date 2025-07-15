# sensor_monitor/sensor_manager.py

from sensor_monitor.sensor import Sensor
from sensor_monitor.config_manager import SENSOR_FILE
from sensor_monitor.mqtt import MQTTPublisher
from sensor_monitor.logger import sensor_logger
from sensor_monitor.webserver import flaskWrapper

import pigpio
import json
import board
import time

class sensor_config:
    def __init__(self):
        self.sensors = []

    def save_sensors(self, sensors=None):
        if sensors is None:
            sensors = self.sensors
        with open(SENSOR_FILE, "w") as f:
            json.dump([{"name": s.name, "address": s.address, "type": s.type, "max_power": s.max_power, "rating": s.rating} for s in sensors], f)

    def update_sensor(self, name, new_name, new_type, new_max_power, new_rating, new_address):
        for sensor in self.sensors:
            if sensor.name == name:
                sensor.name = new_name
                sensor.type = new_type
                sensor.max_power = new_max_power
                sensor.rating = new_rating
                sensor.address = new_address
                self.save_sensors()
                self.mqtt.send_discovery_config(sensor.name, sensor.type)
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
            self.mqtt.remove_discovery_config(sensor_to_remove.name, sensor_to_remove.type)
            self.logger.info(f"Removed sensor: {sensor_to_remove.name}")
            return True
        else:
            self.logger.warning(f"Tried to remove non-existent sensor: {name}")
            return False



class SensorManager:
    def __init__(self, config):
        self.config = config
        self.logger = sensor_logger()  
        self.set_config()
        self.sensor_config = sensor_config()
        self.pi = None
        self.i2c = None

        if self.config.config_data.get("remote_gpio") == 1:
            gpio_address = self.config.config_data.get("gpio_address")
            self.logger.info(f"Establishing remote GPIO connection at {gpio_address}")
            self.pi = pigpio.pi(gpio_address)
            if not self.pi.connected:
                raise RuntimeError(f"Could not connect to remote GPIO at {gpio_address}")
            self.logger.info("Remote GPIO connection established")
        else:
            self.logger.info(f"Establishing local GPIO Connection")
            self.i2c = board.I2C()
        
        
        self.sensors = self.load_sensors()      
        self.sensor_config.sensors = self.sensors
        self.mqtt = MQTTPublisher(self.logger, self.mqtt_config)
        self.webserver = flaskWrapper(self.logger, self.config, self.sensor_config)  
        self.load_mqtt_discovery()  

    def set_config(self):
        self.poll_intervals = self.config.config_data.get("poll_intervals", {})
        self.logger.set_log_size(self.config.config_data["max_log"])  
        self.last_poll_times = {}
        self.mqtt_config = {
            "mqtt_broker": self.config.config_data['mqtt_broker'],
            "mqtt_port": self.config.config_data['mqtt_port']
        }


    def detect_sensors(self):    

        if self.pi:
            self.logger.warning("Remote GPIO sensor detection not implemented; assuming config file is correct.")
            return []
        else:
            while not self.i2c.try_lock():
                    pass
            try:
                while True:
                    addresses = self.i2c.scan()
                    for device_address in self.i2c.scan():
                        addr = hex(device_address)
                        self.logger.info(f"I2C connected Sensor: {addr}")
                    return addresses
            finally:
                self.i2c.unlock()     
    
    def load_sensors(self):
        sensors = []
        try:
            with open(SENSOR_FILE, "r") as f:
                sensor_data = json.load(f)
                sensors = [Sensor(s["name"], s["address"], s["type"], s["max_power"], s["rating"], self.config.config_data['max_readings'],i2c=self.i2c,pi=self.pi) for s in sensor_data]
                self.logger.info("Configured Sensors Successfully")

                for sensor in sensors:
                    self.logger.info(f"Connected to {sensor.name} Sucessfully")     
        except:
            pass

        if not self.pi:
            existing_sensors = [s.address for s in sensors]
            connected_sensors = self.detect_sensors()

            for addr in connected_sensors:
                if addr not in existing_sensors:
                    default_name = f"Sensor_{addr}"
                    default_type = "Solar"
                    default_max_power = 100
                    default_rating = 12
                    sensors.append(Sensor(default_name, addr, default_type, default_max_power, default_rating, self.config.config_data['max_readings'],self.i2c))

        
        self.sensor_config.save_sensors(sensors)
        return sensors
    

    def load_mqtt_discovery(self):
        try:
            for sensor in self.sensors:
                self.mqtt.send_discovery_config(sensor.name, sensor.type)   
                self.logger.info(f"MQTT discovery published succesfully for {sensor.name} of type {sensor.type}")            
        except Exception as e:
            self.logger.error(f"MQTT publish failed: {e}")
            
    def get_data(self):
        current_time = time.time()
        data = {}

        for s in self.sensors:

            data[s.name] = {
                "address": s.address,
                "type": s.type,
                "max_power": s.max_power,
                "rating": s.rating
            }

            sensor_type = s.type
            poll_interval = self.poll_intervals[sensor_type]
            last_poll = self.last_poll_times.get(s.name, 0)


            if current_time - last_poll >= poll_interval:
                sensor_data = s.read_data()
                self.last_poll_times[s.name] = current_time
                self.logger.info(f"New Reading - {s.name}: {sensor_data['time_stamp']}: {sensor_data['voltage']}V({sensor_data['voltage_trend']}), {sensor_data['current']}A, {sensor_data['power']}W")     
                self.mqtt.publish_new_data(s.name, sensor_data)
                data[s.name]['data'] = sensor_data
                self.webserver.broadcast_sensor_data()
            else:
                if s.readings:
                    sensor_data = s.current_data()
                    data[s.name]['data'] = sensor_data
                    self.logger.info(f"Using last Reading - {s.name}: {sensor_data['time_stamp']}: {sensor_data['voltage']}V, {sensor_data['current']}A, {sensor_data['power']}W")
                else:
                    sensor_data = {
                        "voltage": 0,
                        "current": 0,
                        "power": 0,
                        "time_stamp": "Not Updated",
                        "status": "no data" if self.type == "Battery" else None,
                        "state_of_charge": 0 if s.type == "Battery" else None,
                        "output": 0 if s.type != "Battery" else None,
                        "readings": []
                    }

            

        return data
    

