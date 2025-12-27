# sensor_monitor/mqtt.py
import sys
import time
try:
    from sensor_monitor.config_manager import MQTT_DISCOVERY_PREFIX, MQTT_BASE, VERSION
    from sensor_monitor.logger import logger
except Exception as ex:
    print("Error loading config: " + str(ex))
    sys.exit()

DEVICE_INFO = {
    "identifiers": ["ina219_sensor_monitor_hub"],
    "name": "INA219 Sensor Monitor",
    "manufacturer": "allanbeth",
    "model": "INA219 Multi-Sensor Unit",
    "suggested_area": "Power Systems",
    "sw_version": VERSION
}

DEVICE_PAYLOAD = {
            "name": "INA219 Hub Status",
            "state_topic": f"{MQTT_BASE}/ina219_hub_status",
            "unique_id": "ina219_hub_status",
            "availability_topic": f"{MQTT_DISCOVERY_PREFIX}/sensor/ina219_hub_status/availability",
            "icon": "mdi:flash",
            "device": DEVICE_INFO,
        }
try:
    import paho.mqtt.client as mqtt
    import json
except Exception as ex:
    print("Error loading config: " + str(ex))
    sys.exit()

# Global MQTT connection status for frontend
mqttConnectionStatus = 0

class MQTTPublisher:
    def __init__(self, mqtt_config):
        self.connection_status = {
            'state': 'disconnected',  # disconnected, connecting, connected, error
            'last_connected': None,
            'last_error': None,
            'connection_attempts': 0
        }

        logger.info("Initializing MQTT Publisher")
        self.mqtt_broker = mqtt_config['mqtt_broker']
        self.mqtt_port = int(mqtt_config['mqtt_port'])
        self.client = mqtt.Client()
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.loop_start()

        try:
            self.connection_status['state'] = 'connecting'
            self.connection_status['connection_attempts'] += 1
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            logger.info("Connected to MQTT Broker")
            self.client.publish(f"{MQTT_BASE}/ina219_hub_status", "online", retain=True)
            self.client.publish(f"{MQTT_DISCOVERY_PREFIX}/sensor/ina219_hub_status/availability", "online", retain=True)
            logger.info("Published Hub Status as online")
        except Exception as e:
            self.connection_status['state'] = 'error'
            self.connection_status['last_error'] = str(e)
            logger.error(f"Connection to MQTT Broker failed: {e}")

    def _on_connect(self, client, userdata, flags, rc):
        global mqttConnectionStatus
        if rc == 0:
            self.connection_status['state'] = 'connected'
            self.connection_status['last_connected'] = time.time()
            self.connection_status['last_error'] = None
            logger.info("MQTT connection established successfully")
            
            # Update global MQTT status for frontend
            mqttConnectionStatus = 1
        else:
            self.connection_status['state'] = 'error'
            self.connection_status['last_error'] = f"Connection failed with code {rc}"
            logger.error(f"MQTT connection failed with code {rc}")
            
            # Update global MQTT status for frontend
            mqttConnectionStatus = 0

    def _on_disconnect(self, client, userdata, rc):
        global mqttConnectionStatus
        self.connection_status['state'] = 'disconnected'
        if rc != 0:
            self.connection_status['last_error'] = f"Unexpected disconnection (code {rc})"
            logger.warning(f"MQTT disconnected unexpectedly with code {rc}")
        else:
            logger.info("MQTT disconnected gracefully")
            
        # Update global MQTT status for frontend
        mqttConnectionStatus = 0

    def get_connection_status(self):
        """Get current MQTT connection status for API"""
        status = self.connection_status.copy()
        status['broker'] = self.mqtt_broker
        status['port'] = self.mqtt_port
        return status

    def is_connected(self):
        """Simple connection check"""
        return self.connection_status['state'] == 'connected'

    def publish_hub_device(self):
        payload = {
            "name": "INA219 Hub Status",
            "state_topic": f"{MQTT_BASE}/ina219_hub_status",
            "unique_id": "ina219_hub_status",
            "availability_topic": f"{MQTT_DISCOVERY_PREFIX}/sensor/ina219_hub_status/availability",
            "icon": "mdi:flash",
            "device": DEVICE_INFO,
        }
        config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/ina219_hub_status/config"
        logger.info(f'Publishing MQTT Hub Device Config - {config_topic} with payload: {payload}')
        self.client.publish(config_topic, json.dumps(payload), retain=True)
        # Publish the state and availability topics for the hub device
        self.client.publish(f"{MQTT_BASE}/ina219_hub_status", "online", retain=True)
        self.client.publish(f"{MQTT_DISCOVERY_PREFIX}/sensor/ina219_hub_status/availability", "online", retain=True)
        logger.info(f'MQTT Hub Device Published - {MQTT_DISCOVERY_PREFIX}/sensor/ina219_hub_status/availability as online')

    def publish_totals_device(self):
        """
        Publishes Home Assistant MQTT discovery config for a totals device.
        Shows total power generated by turbine and solar, and battery in/out totals.
        """
        base_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/totals"
        state_topic = f"{MQTT_BASE}/totals"
        
        totals = [
            ("total_power", "Total Power Generated", "W", "power", "mdi:flash"),
            ("solar_total", "Solar Total Generated", "W", "power", "mdi:solar-power"),
            ("wind_total", "Wind Total Generated", "W", "power", "mdi:weather-windy"),
            ("battery_soc_total", "Battery Total SoC", "%", "battery", "mdi:battery"),
            ("battery_in_total", "Battery Total Charge In", "Wh", "energy", "mdi:battery-plus"),
            ("battery_out_total", "Battery Total Discharge Out", "Wh", "energy", "mdi:battery-minus"),
        ]
        device_info = {
            "identifiers": ["ina219_sensor_totals"],
            "name": "INA219 Sensor Totals",
            "manufacturer": "allanbeth",
            "model": "INA219 Sensor (Totals)",
            "sw_version": VERSION,
            "via_device": "ina219_sensor_monitor_hub",
            "suggested_area": "Power Systems",
        }

        for key, name, unit, device_class, icon in totals:
            config_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/totals_{key}/config"
            logger.info(f"Publishing MQTT discovery for Totals ({key}) to {config_topic}")

            payload = {
                "name": name,        
                "state_topic": state_topic,
                "value_template": f"{{{{ value_json.{key} }}}}",
                "unique_id": f"ina219_totals_{key}",
                "unit_of_measurement": unit,
                "device_class": device_class,
                "icon": icon,
                "availability_topic": f"{base_topic}/availability",
                "device": device_info,
            }
            
            logger.info(f"Publishing MQTT payload for ({key}): {payload}")
            self.client.publish(config_topic, json.dumps(payload), retain=True)
            logger.info(f'MQTT Totals Discovery Config Published - {config_topic}')

        # Publish the availability topic for the totals device
        self.client.publish(f"{base_topic}/availability", "online", retain=True)

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
            measurements.append(("output", "%", None, "mdi:flash", "measurement"))
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
            logger.info(f"Publishing MQTT discovery for {sensor_name} ({sensor_type}) to {config_topic}")

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

            logger.info(f"Publishing MQTT payload for ({sensor_name}): {payload}")
            self.client.publish(config_topic, json.dumps(payload), retain=True)
            logger.info(f'MQTT Discovery Config Published - {config_topic}')

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
            logger.info(f'MQTT Discovery Config Published - {status_config_topic}')



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

    def publish_new_data(self, sensor, readings):
        sensor_clean = sensor.replace(" ", "_")
        topic = f"{MQTT_BASE}/{sensor_clean}"
        sensor_data = readings
        del sensor_data['readings']

        payload = json.dumps(sensor_data)
        self.client.publish(topic, payload, retain=True)
        logger.info(f'MQTT Published - {topic}: {payload}')

        availability_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/{sensor_clean}/availability"
        self.client.publish(availability_topic, "online", retain=True)

    def publish_totals_data(self, totals_dict):
        """
        Publishes the totals data to MQTT for Home Assistant.
        totals_dict should have keys: solar_total, wind_total, battery_in_total, battery_out_total
        """
        topic = f"{MQTT_BASE}/totals"
        payload = json.dumps(totals_dict)
        self.client.publish(topic, payload, retain=True)
        logger.info(f'MQTT Published Totals - {topic}: {payload}')

        availability_topic = f"{MQTT_DISCOVERY_PREFIX}/sensor/totals/availability"
        self.client.publish(availability_topic, "online", retain=True)