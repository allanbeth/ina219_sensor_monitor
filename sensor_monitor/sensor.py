from adafruit_ina219 import INA219
from collections import deque
import board
import busio
import datetime
import logging
import math

class Sensor:
    def __init__(self, name, address, sensor_type, max_power, rating):
        self.name = name
        self.type = sensor_type
        self.max_power = max_power
        self.address = address
        self.rating = rating
        self.max_readings = 5
        self.readings = deque(maxlen=self.max_readings)
        self.i2c = busio.I2C(board.SCL, board.SDA)      

        try:
            self.ina = INA219(self.i2c)
            addr = hex(self.address)
            self.ina.i2c_device.device_address = int(str(addr), 16)
            logging.info(f"INA219 sensor connected on address {addr}")
        except Exception as e:
            #logging.info("INA219 sensor not detected: %s", str(e))
            self.ina = None

           

    def fetch_data(self):
        try:
            voltage = round(self.ina.bus_voltage, 1) if self.ina else 0.0
            current = round(self.ina.current / 1000,0) if self.ina else 0.0 # Convert mA to A
            power = round(voltage * current, 0)
            time_stamp =  datetime.datetime.now().strftime("%I:%M%p on %B %d, %Y")
            readings = {"voltage": voltage, "current": current, "power": power, "time_stamp": time_stamp}
            self.readings.append(readings)
            averaged = self.average_data()

            return averaged
        
        except Exception as e:
            logging.info(f"Error reading sensor {self.name}: {e}")
            

            
        
    def read_data(self):
        try:
            reading = self.fetch_data()
            data = {"voltage": reading['voltage'], "current": reading['current'], "power": reading['power'], "time_stamp": reading['time_stamp']}
            if self.type == 'Battery':
                soc = self.estimate_soc(data['voltage'])
                data["state_of_charge"] = soc
            else:
                output = float((data['voltage']/self.max_power)*100)
                data["output"] = round(output, 2)                
        except Exception as e:
            if self.type == 'battery':
                data = {"voltage": 0, "current": 0, "power": 0, "time_stamp": "Not Connected", "state_of_charge": 0}
            else:
                data = {"voltage": 0, "current": 0, "power": 0, "time_stamp": "Not Connected", "output": "Off"}

        data["readings"] = list(self.readings)
        return data    
        
    def average_data(self):
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
        latest_time = self.readings[-1]["time_stamp"]

        averaged = {
            "voltage": round(total_voltage / n, 1),
            "current": round(total_current / n, 0),
            "power": round(total_power / n, 0),
            "time_stamp": latest_time
        }

        if self.type == "Battery":
            averaged["state_of_charge"] = self.estimate_soc(averaged["voltage"])
        else:
            output = float((averaged["voltage"] / self.rating) * 100)
            averaged["output"] = round(output, 0)

        return averaged    
    
    def estimate_soc(self, voltage):
        voltage = max(11.8, min(12.6, voltage))
        x = (voltage - 12.2) * 10  # center around 12.2V
        soc = 1 / (1 + math.exp(-x))  # sigmoid curve
        return int(soc * 100)
