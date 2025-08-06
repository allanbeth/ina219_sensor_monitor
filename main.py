# main.py

import sys
import time
try:
    from sensor_monitor.config_manager import ConfigManager
    from sensor_monitor.sensor_manager import SensorManager
    from sensor_monitor.logger import logger
    from sensor_monitor.live_data import sensor_data
    from threading import Thread
except Exception as ex:
    print("Error" + str(ex))
    sys.exit()
   
# Initialize the configuration manager and sensor manager
logger.info("Initializing ConfigManager and SensorManager")
config = ConfigManager()
manager = SensorManager(config)

def run_sensor_loop():
    while True:
        # Update sensor data
        data = manager.get_data()
        # Update the global sensor_data dictionary
        # This assumes sensor_data is a global dictionary that holds the latest sensor readings
        sensor_data.clear()
        sensor_data.update(data)
        # Sleep for a short duration to avoid busy waiting
        time.sleep(1)

if __name__ == "__main__":
    # Start the sensor data loop in a separate thread
    logger.info("Starting sensor data loop in a separate thread")
    Thread(target=run_sensor_loop).start()
    # Start the web server
    logger.info("Starting web server")
    manager.webserver.run_webserver()
    
    
