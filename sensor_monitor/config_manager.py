# sensor_monitor/config_manager.py

MQTT_TOPIC = "homeassistant/sensor"
MQTT_DISCOVERY_PREFIX = "homeassistant"

LOG_FILE = "sensor_monitor.log"
SENSOR_FILE = "sensors.json"
CONFIG_FILE = "config.json"

from sensor_monitor.logger import sensor_logger
import json

class ConfigManager:
    def __init__(self):
         
         self.logger = sensor_logger()
         self.config_data = self.load_config()

    def load_config(self):
        try:
            with open(CONFIG_FILE, "r") as f:
                self.logger.info(f"Config file opened Successfully.")
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning(f"Config file not found, creating default config.")
            default_config = {
                "poll_intervals": {
                    "Wind": 7,
                    "Solar": 5,
                    "Battery": 10
                    },
                    "max_log": 5,
                    "max_readings": 5,
                    "mqtt_broker": "localhost",
                    "mqtt_port": 1883,
                    "webserver_host": "0.0.0.0",
                    "webserver_port": 5000,
                    "remote_gpio": 0,
                    "gpio_address": "localhost"
                }  
            try:
                with open(CONFIG_FILE, "w") as f:
                    json.dump(default_config, f, indent=4)
                self.logger.info(f"Created new config file at {CONFIG_FILE}.")

            except Exception as e:
                self.logger.error(f"Failed to create config file: {e}")
            
            return default_config
            
    def save_config(self, config):
        self.logger.info(f"Saving config file at {CONFIG_FILE}.")

        new_config = {
            "poll_intervals": {
                "Wind": int(config['wind_interval']),
                "Solar": int(config['solar_interval']),
                "Battery": int(config['battery_interval'])
            },
            "max_log": int(config['max_log']),
            "max_readings": int(config['max_readings']),
            "mqtt_broker": config['mqtt_broker'],
            "mqtt_port": config['mqtt_port'],
            "webserver_host": config['webserver_host'],
            "webserver_port": config['webserver_port'],
            "remote_gpio": int(config['remote_gpio']),
            "gpio_address": config['gpio_address']
        }

        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(new_config, f, indent=4)
            self.logger.info(f"Saved config file at {CONFIG_FILE}.")
            self.config_data = new_config

        except Exception as e:
            self.logger.error(f"Failed to save config: {e}")

    def backup_config(self, program, sensor):
        self.logger.info(f"Backed up {program} {sensor}")

    def restore_config(self, config_file):
        self.logger.info(f"Backed up {config_file}")    


    def reload_config (self):
        self.config_data = self.load_config()
        self.logger.info("Configuration reloaded from disk.")

