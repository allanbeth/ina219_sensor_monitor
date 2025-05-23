# sensor_monitor/mqtt.py

import paho.mqtt.client as mqtt
from sensor_monitor.config_manager import MQTT_TOPIC, MQTT_DISCOVERY_PREFIX
#from sensor_monitor.logger import sensor_logger
import json

class MQTTPublisher:
    def __init__(self, logger, mqtt_config):
        self.mqtt_broker = mqtt_config['mqtt_broker']
        self.mqtt_port = mqtt_config['mqtt_port']
        self.logger = logger
        self.client = mqtt.Client()

        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.logger.info("Connected to MQTT Broker")
        except Exception as e:
            self.logger.error(f"Connection to MQTT Broker failed: {e}")

    def publish(self, data):
        for sensor, readings in data.items():
            sensor_clean = sensor.replace(" ", "_")
            topic = f"{MQTT_TOPIC}/{sensor_clean}"
            sensor_data = readings.get('data', {})

            payload = json.dumps(sensor_data)
            self.client.publish(topic, payload, retain=True)

            availability_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}/availability"
            self.client.publish(availability_topic, "online", retain=True)

    def send_discovery_config(self, sensor_name, sensor_type):
        sensor_clean = sensor_name.replace(" ", "_")
        base_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}"
        state_topic = f"{MQTT_TOPIC}/{sensor_clean}"

        measurements = [
            ("voltage", "V", "voltage"),
            ("current", "A", "current"),
        ]

        if sensor_type != "battery":
            measurements.append(("power", "W", "power"))
        else:
            measurements.append(("state_of_charge", "%", "battery"))

        for measurement, unit, device_class in measurements:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}_{measurement}/config"
            payload = {
                "name": f"{sensor_name} {measurement.replace('_', ' ').capitalize()}",
                "state_topic": state_topic,
                "value_template": f"{{{{ value_json.{measurement} }}}}",
                "unit_of_measurement": unit,
                "device_class": device_class,
                "unique_id": f"{sensor_clean}_{measurement}",
                "availability_topic": f"{base_topic}/availability",
                "device": {
                    "identifiers": [sensor_clean],
                    "name": sensor_name,
                    "manufacturer": "Custom",
                    "model": "INA219 Sensor"
                }
            }
            self.client.publish(config_topic, json.dumps(payload), retain=True)

    def remove_discovery_config(self, sensor_name, sensor_type="generic"):
        sensor_clean = sensor_name.replace(" ", "_")

        measurements = ["voltage", "current"]
        if sensor_type == "battery":
            measurements.append("state_of_charge")
        else:
            measurements.append("power")

        for measurement in measurements:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}_{measurement}/config"
            self.client.publish(config_topic, "", retain=True)

    def rename_discovery_config(self, old_name, new_name, sensor_type): 
        self.remove_discovery_config(old_name, sensor_type)
        self.send_discovery_config(new_name, sensor_type)