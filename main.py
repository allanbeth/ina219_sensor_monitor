# main.py

from sensor_monitor.config_manager import ConfigManager
from sensor_monitor.sensor_manager import SensorManager
#from sensor_monitor.webserver import flaskWrapper
from sensor_monitor.live_data import sensor_data
from threading import Thread
import time

config = ConfigManager()
manager = SensorManager(config)




def run_sensor_loop():
    while True:
        data = manager.get_data()
        sensor_data.clear()
        sensor_data.update(data)
       

        time.sleep(1)

if __name__ == "__main__":
    Thread(target=run_sensor_loop).start()
    manager.webserver.run_webserver()
    
    
