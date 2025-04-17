# main.py

import time
from sensor_monitor.sensor_manager import SensorManager
from sensor_monitor.webserver import run_webserver, broadcast_sensor_data
from sensor_monitor.live_data import sensor_data
from threading import Thread

manager = SensorManager()

def run_sensor_loop():
    while True:
        data = manager.get_data()
        sensor_data.clear()
        sensor_data.update(data)
        broadcast_sensor_data()

        time.sleep(1)

if __name__ == "__main__":
    Thread(target=run_sensor_loop).start()
    run_webserver()
