from sensor_monitor.sensor import Sensor
from sensor_monitor.config import SENSOR_FILE
from sensor_monitor.mqtt import MQTTPublisher

import json

class SensorManager:
    def __init__(self):
        self.sensors = self.load_sensors()
        self.mqtt = MQTTPublisher()
        self.load_mqtt_discovery()   
    
    def load_sensors(self):
        try:
            # read sensor list from json
            with open(SENSOR_FILE, "r") as f:
                sensor_data = json.load(f)
                sensors = [Sensor(s["name"], s["address"], s["type"]) for s in sensor_data]
            
                return sensors
        except FileNotFoundError:
            self.new_sensor()

    def load_mqtt_discovery(self):
        try:
            # Send auto-discovery for each sensor on startup
            for sensor in self.sensors:
                self.mqtt.send_discovery_config(sensor.name)
                
        except FileNotFoundError:
            pass

    def publish_mqtt (self, data):
        try:
            # Send auto-discovery for each sensor on startup
            self.mqtt.publish(data)
                
        except FileNotFoundError:
            pass
        
        
    def new_sensor(self):
        sensor = [Sensor("New", 64, "solar")]
        self.save_sensors(sensor)
        self.sensors = self.load_sensors()


    def save_sensors(self, sensors=None):
        # Save sensors to the SENSOR_FILE
        if sensors is None:
            sensors = self.sensors
        with open(SENSOR_FILE, "w") as f:
            json.dump([{"name": s.name, "address": s.address, "type": s.type} for s in sensors], f)

    def update_sensor(self, name, new_name, new_type):
        # Modify an existing sensor's name and type.
        for sensor in self.sensors:
            if sensor.name == name:
                sensor.name = new_name
                sensor.type = new_type
                self.save_sensors()
                self.mqtt.send_discovery_config(sensor.name)
                return True
        return False

    def get_data(self):
        # Retrieve data from all connected sensors

        return {s.name: s.read_data() for s in self.sensors}
    