# sensor_monitor/mqtt.py

from sensor_monitor.config_manager import MQTT_TOPIC, MQTT_DISCOVERY_PREFIX, MQTT_BASE, VERSION

DEVICE_INFO = {
    "identifiers": ["ina219_sensor_monitor_hub"],
    "name": "INA219 Sensor Monitor",
    "manufacturer": "allanbeth",
    "model": "INA219 Multi-Sensor Unit",
    "suggested_area": "Power Systems",
    "sw_version": VERSION
}
import paho.mqtt.client as mqtt
import json

class MQTTPublisher:
    def __init__(self, logger, mqtt_config):
        self.mqtt_broker = mqtt_config['mqtt_broker']
        self.mqtt_port = int(mqtt_config['mqtt_port'])
        self.logger = logger
        self.client = mqtt.Client()
        self.client.loop_start()

        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.logger.info("Connected to MQTT Broker")
            self.publish_hub_device()
        except Exception as e:
            self.logger.error(f"Connection to MQTT Broker failed: {e}")

    def publish_new_data(self, sensor, readings):
        sensor_clean = sensor.replace(" ", "_")
        topic = f"{MQTT_BASE}/{sensor_clean}"
        sensor_data = readings
        del sensor_data['readings']

        payload = json.dumps(sensor_data)
        self.client.publish(topic, payload, retain=True)
        self.logger.info(f'MQTT Published - {topic}: {payload}')

        availability_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}/availability"
        self.client.publish(availability_topic, "online", retain=True)

    def publish_hub_device(self):
        topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/sensor_monitor_hub/config"
        payload = {
            "name": "INA219 Sensor Monitor Hub",
            "state_topic": "sensor_monitor/hub_status",
            "value_template": "{{ value_json.status }}",
            "unique_id": "sensor_monitor_hub_status",
            "device": DEVICE_INFO,
            "icon": "mdi:chip",
            "availability_topic": "sensor_monitor/hub_status/availability"
        }
        self.client.publish(topic, json.dumps(payload), retain=True)
        self.client.publish("sensor_monitor/hub_status", json.dumps({"status": "online"}), retain=True)
        self.client.publish("sensor_monitor/hub_status/availability", "online", retain=True)
        self.logger.info(f'MQTT Hub Device Config Published - {topic}')



    def send_discovery_config(self, sensor_name, sensor_type):
        """
        Publishes Home Assistant MQTT discovery config for a sensor.
        Each measurement is published as a separate entity.
        For battery sensors, publishes status as a separate enum entity.
        """
        sensor_clean = sensor_name.replace(" ", "_")
        base_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}"
        state_topic = f"{MQTT_BASE}/{sensor_clean}"

        # Default measurements
        measurements = [
            ("voltage", "V", "voltage", "mdi:flash", "measurement"),
            ("current", "A", "current", "mdi:current-dc", "measurement"),
            ("power", "W", "power", "mdi:lightning-bolt", "measurement"),
        ]

        # Sensor-type-specific extra measurements
        if sensor_type in ("Solar", "Wind"):
            measurements.append(("output", "%", "power", "mdi:flash", "measurement"))
        elif sensor_type == "Battery":
            measurements.append(("state_of_charge", "%", "battery", "mdi:battery-high", "measurement"))
            

        # Device info for Home Assistant
        device_info = {
            "identifiers": [f"ina219_sensor_{sensor_clean}"],
            "name": sensor_name,
            "manufacturer": "allanbeth",
            "model": f"INA219 Sensor ({sensor_type})",
            "sw_version": VERSION,
            "via_device": "ina219_sensor_monitor_hub",
            "suggested_area": "Power Systems",
        }

        # Publish all standard measurements
        for measurement, unit, device_class, icon, entity_category in measurements:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}_{measurement}/config"
            self.logger.info(f"Publishing MQTT discovery for {sensor_name} ({sensor_type}) to {config_topic}")

            payload = {
                "name": f"{sensor_name} {measurement.replace('_', ' ').capitalize()}",
                "state_topic": state_topic,
                "value_template": f"{{{{ value_json.{measurement} }}}}",
                "unit_of_measurement": unit,
                "device_class": device_class,
                "unique_id": f"{sensor_clean}_{measurement}",
                "availability_topic": f"{base_topic}/availability",
                "device": device_info,
            }

            self.client.publish(config_topic, json.dumps(payload), retain=True)
            self.logger.info(f'MQTT Discovery Config Published - {config_topic}')

        # For battery type, publish status as a separate enum entity
        if sensor_type == "Battery":
            status_config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}_status/config"
            status_payload = {
                "name": f"{sensor_name} Status",
                "state_topic": state_topic,
                "value_template": "{{ value_json.status }}",
                "unique_id": f"{sensor_clean}_status",
                "availability_topic": f"{base_topic}/availability",
                "device": device_info,
                "device_class": "enum",
                "entity_category": "diagnostic",
                "icon": "mdi:battery",
                "options": ["charging", "discharging", "idle"]
            }
            self.client.publish(status_config_topic, json.dumps(status_payload), retain=True)
            self.logger.info(f'MQTT Discovery Config Published - {status_config_topic}')

    def remove_discovery_config(self, sensor_name, sensor_type="generic"):
        sensor_clean = sensor_name.replace(" ", "_")
        measurements = ["voltage", "current", "power"]
        if sensor_type == "Battery":
            measurements.append("state_of_charge")
            measurements.append("status")
        elif sensor_type in ["Solar", "Wind"]:
            measurements.append("output")

        for measurement in measurements:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}_{measurement}/config"
            self.client.publish(config_topic, "", retain=True)

    def rename_discovery_config(self, old_name, new_name, sensor_type): 
        self.remove_discovery_config(old_name, sensor_type)
        self.send_discovery_config(new_name, sensor_type)