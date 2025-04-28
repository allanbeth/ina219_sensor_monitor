from adafruit_ina219 import INA219
import board
import busio
import datetime
import logging

class Sensor:
    def __init__(self, name, address, sensor_type, max_power, rating):
        self.name = name
        self.type = sensor_type
        self.max_power = max_power
        self.address = address
        self.rating = rating
        self.i2c = busio.I2C(board.SCL, board.SDA)      

        try:
            self.ina = INA219(self.i2c)
            addr = hex(self.address)
            self.ina.i2c_device.device_address = int(str(addr), 16)
            logging.info(f"INA219 sensor connected on address {addr}")
        except Exception as e:
            #logging.info("INA219 sensor not detected: %s", str(e))
            self.ina = None
            
    def estimate_soc(self,voltage):
        # Clamp voltage between 11.8V (empty) and 12.6V (full)
        voltage = max(11.8, min(12.6, voltage))
        
        # Normalize voltage to 0 - 1 range
        normalized = (voltage - 11.8) / (12.6 - 11.8)
        
        # Apply slight curve adjustment (quadratic)
        soc = normalized ** 1.4  # 1.4 is a curve factor; tweakable
        
        return int(soc * 100)
    

    def read_data(self):
        try:
            voltage = round(self.ina.bus_voltage, 1) if self.ina else 0.0
            current = round(self.ina.current / 1000,0) if self.ina else 0.0 # Convert mA to A
            power = round(voltage * current, 0)
            time_stamp =  datetime.datetime.now().strftime("%I:%M%p on %B %d, %Y")
            data = {"voltage": voltage, "current": current, "power": power, "time_stamp": time_stamp}
            if self.type == 'Battery':
                soc = self.estimate_soc(voltage)
                data["state_of_charge"] = soc
            else:
                output = float((voltage/self.max_power)*100)
                data["output"] = round(output, 2)
            return data
        except Exception as e:
            #logging.info(f"Error reading sensor {self.name}: {e}")
            if self.type == 'battery':
                data = {"voltage": 0, "current": 0, "power": 0, "time_stamp": "Not Connected", "state_of_charge": 0}
            else:
                data = {"voltage": 0, "current": 0, "power": 0, "time_stamp": "Not Connected", "output": "Off"}
            return data
