# sensor_monitor/config_manager.py

import json
import sys
try:
    from pathlib import Path
    from datetime import datetime
    from sensor_monitor.logger import logger
except Exception as ex:
    print("Error" + str(ex))
    sys.exit()

MQTT_TOPIC = "homeassistant/sensor"
MQTT_DISCOVERY_PREFIX = "homeassistant"
MQTT_BASE = "ina219_sensor_monitor"

ROOT = Path(__file__).parents[1]

SENSOR_FILE = "sensors.json"
CONFIG_FILE = "config.json"
BACKUP_DIR = ROOT / "backups"
VERSION = "1.0.1"


class ConfigManager:
    def __init__(self):       
        self.config_data = self.load_config()
        logger.set_log_size(int(self.config_data.get("max_log", 10)))

    def load_config(self):
        try:
            with open(CONFIG_FILE, "r") as f:
                logger.info("Config file opened Successfully.")
                return json.load(f)
        except FileNotFoundError:
            logger.warning("Config file not found, creating default config.")
            default_config = {
                "devices": [
                    {
                        "name": "Default Device",
                        "id": "0",
                        "remote_gpio": 0,
                        "gpio_address": "localhost"
                    }
                ],
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
                "gpio_address": "localhost",           
                }
            try:
                with open(CONFIG_FILE, "w") as f:
                    json.dump(default_config, f, indent=4)
                logger.info(f"Created new config file at {CONFIG_FILE}.")
            except Exception as e:
                logger.error(f"Failed to create config file: {e}")
            
            return default_config
        
    def set_config(self):
        # Set logger configuration
        try:
            log_size = int(self.config_data.get("max_log", 10))
            logger.set_log_size(log_size)
        except ValueError:
            logger.error("Invalid log size value.") 

    def save_config(self, config):
        logger.info(f"Saving config file at {CONFIG_FILE}.")
        devices = []
        device_data = config['devices']
        # Convert device data to the expected format
        for device in device_data:
            device_info = {
                "name": device.get("name", "Unnamed Device"),
                "id": device.get("id", "0"),
                "remote_gpio": int(device.get("remote_gpio", 0)),
                "gpio_address": device.get("gpio_address", "localhost")
            }
            devices.append(device_info)
        # Create new config structure
        new_config = {
            "devices": devices,
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
        # Save the new config to the file
        logger.info(f"Saving new config: {new_config}")
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(new_config, f, indent=4)
            logger.info(f"Saved config file at {CONFIG_FILE}.")
            self.config_data = new_config
        except Exception as e:
            logger.error(f"Failed to save config: {e}")

    def backup_config(self, program_config, sensor_config):
        BACKUP_DIR.mkdir(exist_ok=True)  # Create directory if it doesn't exist
        backup_data = {}
        # Add program configuration if requested
        if program_config:
            try:
                with open("config.json", "r") as f:
                    backup_data["config"] = json.load(f)
                    logger.info("Added config.json to backup")
            except FileNotFoundError:
                logger.info("config.json not found.")
                backup_data["config"] = None
        # Add sensor configuration if requested
        if sensor_config:
            try:
                with open("sensors.json", "r") as f:
                    backup_data["sensors"] = json.load(f)
                    logger.info("Added sensor.json to backup")
            except FileNotFoundError:
                logger.info("sensors.json not found.")
                backup_data["sensors"] = None
        # Create a timestamped backup file
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filepath = BACKUP_DIR / f"backup_{timestamp}.json"

        with open(filepath, "w") as f:
            json.dump(backup_data, f, indent=2)
        logger.info(f"Backup saved to {filepath}")
        return str(filepath)
		
    def restore_backup(self, backup_file, restore_config, restore_sensors):
        logger.info(f"Backed up {backup_file}")  
        file_path = BACKUP_DIR / backup_file
        if file_path.exists():
            with open(file_path, "r") as f:
                backup = json.load(f)
            # Restore the configuration if requested
            if restore_config and "config" in backup and backup["config"]:
                with open(CONFIG_FILE , "w") as f:
                    json.dump(backup["config"], f, indent=2)
                    logger.info("config.json restored.")
            # Restore the sensors if requested
            if restore_sensors and "sensors" in backup and backup["sensors"]:
                with open(SENSOR_FILE , "w") as f:
                    json.dump(backup["sensors"], f, indent=2)
                    logger.info("sensors.json restored.")
            logger.info("Backup restored successfully.")
        else:
            logger.error(f"Backup file {backup_file} does not exist in {BACKUP_DIR}.")
            raise FileNotFoundError(f"Backup file {backup_file} does not exist.")
        
    def list_backups(self):
        if not BACKUP_DIR.exists():
            logger.info("No backups found.")
            return []
        # List all JSON files in the backup directory
        backups = [f.name for f in BACKUP_DIR.iterdir() if f.is_file() and f.suffix == '.json']
        logger.info(f"Found {len(backups)} backup(s).")
        return backups

    def delete_backup(self, filename):
        file_path = BACKUP_DIR / filename
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted backup file {filename}.")
        else:
            logger.error(f"Backup file {filename} does not exist.")
            raise FileNotFoundError(f"Backup file {filename} does not exist.")
        
    def reload_config (self):
        self.config_data = self.load_config()
        logger.info("Configuration reloaded from disk.")

