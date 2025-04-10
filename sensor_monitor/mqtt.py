import paho.mqtt.client as mqtt
import json
from sensor_monitor.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC, MQTT_DISCOVERY_PREFIX

class MQTTPublisher:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.connect(MQTT_BROKER, MQTT_PORT, 60)

    def publish(self, data):

        for sensor, readings in data.items():
            topic = f"{MQTT_TOPIC}/{sensor}"
            payload = json.dumps(readings)

            # Publish the sensor readings
            self.client.publish(topic, payload, retain=True)

            # Optionally publish availability as "online"
            availability_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor}/availability"
            self.client.publish(availability_topic, "online", retain=True)

            print(f"[MQTT] Published to {topic}: {payload}")
            

    def send_discovery_config(self, sensor_name):
        """Publishes Home Assistant MQTT auto-discovery configuration."""
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
        """Removes a sensor from Home Assistant MQTT discovery."""
        base_topic = f"homeassistant/sensor/{sensor_name}"
        for measurement in ["voltage", "current", "power"]:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_name}_{measurement}/config"
            self.client.publish(config_topic, "", retain=True)  # Send empty payload to remove
