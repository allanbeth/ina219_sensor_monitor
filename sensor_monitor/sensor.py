import time
import logging
import datetime
from adafruit_ina219 import INA219
import board
import busio
from sensor_monitor.logger import sensor_logger

class Sensor:
    def __init__(self, name, address, sensor_type):
        self.name = name
        self.type = sensor_type
        self.logger = sensor_logger()
        self.address = hex(address)
        self.i2c = busio.I2C(board.SCL, board.SDA)
        self.last_sensor_check = time.time()        
        self.init_sensor()
        
    def init_sensor(self):

        try:
            self.ina = INA219(self.i2c)
            self.ina.i2c_device.device_address = 0x40
            self.logger.info("INA219 sensor connected")
        except Exception as e:
            self.logger.info("INA219 sensor not detected: %s", str(e))
            self.ina = None
            
        

    def read_data(self):

        if time.time() - self.last_sensor_check >= 900:  # Check every 15 minutes
            self.init_sensor()
        try:
            voltage = self.ina.bus_voltage if self.ina else 0
            current = (self.ina.current / 1000) if self.ina else 0  / 1000  # Convert mA to A
            power = voltage * current
            type = self.type
            time_stamp =  datetime.datetime.now().strftime("%I:%M%p on %B %d, %Y")
            port = self.ina.i2c_device.device_address
            data = {"voltage": voltage, "current": current, "power": power, "type": type, "time_stamp": time_stamp, "port": port}
            self.logger.log_data(self.name, data)
            return data
        except Exception as e:
            self.logger.info(f"Error reading sensor {self.name}: {e}")
            return {"voltage": 0, "current": 0, "power": 0}
