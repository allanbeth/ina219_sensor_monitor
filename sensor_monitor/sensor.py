# sensor_monitor/sensor.py

from adafruit_ina219 import INA219
from collections import deque
import board
import busio
import datetime
import logging
import math

class Sensor:
    def __init__(self, name, address, sensor_type, max_power, rating, max_readings, i2c=None):
        self.name = name
        self.type = sensor_type
        self.max_power = max_power
        self.address = address
        self.rating = rating
        self.max_readings = max_readings
        self.readings = deque(maxlen=self.max_readings)
        self.i2c = i2c or busio.I2C(board.SCL, board.SDA)     

        try:
            self.ina = INA219(self.i2c)
            addr = hex(self.address)
            self.ina.i2c_device.device_address = int(str(addr), 16)
            logging.info(f"INA219 sensor connected on address {addr}")
        except Exception as e:
            logging.info("INA219 sensor not detected: %s", str(e))
            self.ina = None

           

    def fetch_data(self):
        try:
            voltage = round(self.ina.bus_voltage, 1) if self.ina else 0.0
            current = round(self.ina.current / 1000,0) if self.ina else 0.0 # Convert mA to A
            power = round(voltage * current, 0)
            time_stamp =  datetime.datetime.now().strftime("%I:%M:%S%p on %B %d, %Y")
            new_readings = {"voltage": voltage, "current": current, "power": power, "time_stamp": time_stamp}
            if self.type == "Battery":
                SoC = self.estimate_soc(voltage)
                new_readings["state_of_charge"] = SoC
            else:
                output = float(voltage / self.rating) * 100
                new_readings["output"] = round(output, 0)       

            self.readings.append(new_readings)
            data = self.average_data(time_stamp)


        except Exception as e:
            logging.info(f"Error reading sensor {self.name}: {e}")
            readings = {"voltage": 0, "current": 0, "power": 0, "time_stamp": datetime.datetime.now().strftime("%I:%M%p on %B %d, %Y"),"state_of_charge": 0 if self.type == "Battery" else None,
            "output": 0 if self.type != "Battery" else None,}
           
        
        

        return data
            
        
    def read_data(self):
        data = self.fetch_data()
        data["readings"] = list(self.readings)
        return data    
        
    def average_data(self, time_stamp):
        if not self.readings:
            return {
                "voltage": 0,
                "current": 0,
                "power": 0,
                "time_stamp": "No Data",
                "state_of_charge" if self.type == "Battery" else "output": 0
            }

        n = len(self.readings)
        total_voltage = sum(r["voltage"] for r in self.readings)
        total_current = sum(r["current"] for r in self.readings)
        total_power = sum(r["power"] for r in self.readings)
        

        
        averaged = {
            "voltage": round(total_voltage / n, 1),
            "current": round(total_current / n, 0),
            "power": round(total_power / n, 0),
            "time_stamp": time_stamp
        }
        
        if self.type == "Battery":
            total_SoC = sum(r["state_of_charge"] for r in self.readings)
            averaged['state_of_charge'] = round(total_SoC / n, 0)
        else:
            total_output = sum(r["output"] for r in self.readings)
            averaged['output'] = round(total_output / n, 0)

        
        
        return averaged    
    
    def estimate_soc(self, voltage):
        voltage = max(11.8, min(12.6, voltage))
        x = (voltage - 12.2) * 10  # center around 12.2V
        soc = 1 / (1 + math.exp(-x))  # sigmoid curve
        return int(soc * 100)
    
    def current_data(self):
        data = {"voltage": self.readings[-1]['voltage'], "current": self.readings[-1]['current'], "power": self.readings[-1]['power'], "time_stamp": self.readings[-1]['time_stamp']}
        if self.type == "Battery":
            data["state_of_charge"] = self.readings[-1]['state_of_charge']
        else:
            data["output"] = self.readings[-1]['output']
        
        data["readings"] = list(self.readings)
        return data  