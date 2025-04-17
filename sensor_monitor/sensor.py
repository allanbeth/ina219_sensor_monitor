from adafruit_ina219 import INA219
import board
import busio
import datetime
import logging

class Sensor:
    def __init__(self, name, address, sensor_type, max_power):
        self.name = name
        self.type = sensor_type
        self.max_power = max_power
        self.address = address
        self.i2c = busio.I2C(board.SCL, board.SDA)      

        try:
            self.ina = INA219(self.i2c)
            addr = hex(self.address)
            self.ina.i2c_device.device_address = int(str(addr), 16)
            logging.info(f"INA219 sensor connected on address {addr}")
        except Exception as e:
            logging.info("INA219 sensor not detected: %s", str(e))
            self.ina = None
            
        

    def read_data(self):
        try:
            voltage = round(self.ina.bus_voltage, 1) if self.ina else 0.0
            current = round(self.ina.current / 1000,1) if self.ina else 0.0 # Convert mA to A
            power = round(voltage * current, 2)
            time_stamp =  datetime.datetime.now().strftime("%I:%M%p on %B %d, %Y")
            data = {"voltage": voltage, "current": current, "power": power, "time_stamp": time_stamp}
            if self.type == 'battery':
                soc = max(0, min(100, int(((voltage - 11.8) / (12.6 - 11.8)) * 100)))
                data["state_of_charge"] = soc
            else:
                output = float((voltage/self.max_power)*100)
                data["output"] = round(output, 2)
            return data
        except Exception as e:
            logging.info(f"Error reading sensor {self.name}: {e}")
            return {"voltage": 0, "current": 0, "power": 0}
