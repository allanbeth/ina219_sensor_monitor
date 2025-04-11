import paho.mqtt.client as mqtt
from sensor_monitor.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC, MQTT_DISCOVERY_PREFIX
from sensor_monitor.logger import sensor_logger
import json

class MQTTPublisher:
    def __init__(self):
        self.logger = sensor_logger()
        self.client = mqtt.Client()

        try:

            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.logger.info("Connected to MQTT Broker: %s", MQTT_BROKER)

        except:
            self.logger.info("Connection to MQTT Broker failed")

    def publish(self, data):

        for sensor, readings in data.items():
            topic = f"{MQTT_TOPIC}/{sensor}"
            payload = json.dumps(readings)

            self.client.publish(topic, payload, retain=True)

            availability_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor}/availability"
            self.client.publish(availability_topic, "online", retain=True)
            

    def send_discovery_config(self, sensor_name):

        base_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_name}"
        state_topic = f"{MQTT_TOPIC}/{sensor_name}"

        for measurement, unit, device_class in [
            ("voltage", "V", "voltage"),
            ("current", "A", "current"),
            ("power", "W", "power"),
        ]:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_name}_{measurement}/config"
            

            payload = {
                "name": f"{sensor_name} {measurement.capitalize()}",
                "state_topic": state_topic,
                "value_template": f"{{{{ value_json.{measurement} }}}}",
                "unit_of_measurement": unit,
                "device_class": device_class,
                "unique_id": f"{sensor_name}_{measurement}",
                "availability_topic": f"{base_topic}/availability",
                "device": {
                    "identifiers": [sensor_name],
                    "name": sensor_name,
                    "manufacturer": "Custom",
                    "model": "INA219 Sensor"
                }
            }

            self.client.publish(config_topic, json.dumps(payload), retain=True)

    def remove_discovery_config(self, sensor_name):

        for measurement in ["voltage", "current", "power"]:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_name}_{measurement}/config"
            self.client.publish(config_topic, "", retain=True)
