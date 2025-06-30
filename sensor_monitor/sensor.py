from adafruit_ina219 import INA219
from collections import deque
import board
import busio
import datetime
import logging
import math

CALIBRATION_REGISTER = 0x05
DEFAULT_CALIBRATION = 4191

class Sensor:
    def __init__(self, name, address, sensor_type, max_power, rating, max_readings, i2c=None, pi=None):
        self.name = name
        self.type = sensor_type
        self.max_power = max_power
        self.address = address
        self.rating = rating
        self.max_readings = max_readings
        self.readings = deque(maxlen=self.max_readings)
        self.pi = pi
        self.i2c = i2c
        self.ina = None

        if self.pi:
            self.handle = self.pi.i2c_open(1, self.address)
            logging.info(f"Sensor {self.name}: Remote I2C handle {self.handle} opened at address {hex(self.address)}")
            self.calibrate()  # Calibrate when using remote GPIO
        else:
            try:
                self.i2c = i2c or busio.I2C(board.SCL, board.SDA)
                self.ina = INA219(self.i2c)
                self.ina.i2c_device.device_address = self.address
                logging.info(f"INA219 sensor connected on address {hex(self.address)}")
            except Exception as e:
                logging.info("INA219 sensor not detected: %s", str(e))
                self.ina = None

    def calibrate(self, value=DEFAULT_CALIBRATION):
        try:
            if self.pi and hasattr(self, 'handle'):
                # Write value as big-endian (high byte first)
                self.pi.i2c_write_word_data(self.handle, CALIBRATION_REGISTER, value)
                logging.info(f"Calibrated {self.name} with value {value}")
        except Exception as e:
            logging.error(f"Calibration failed for {self.name}: {e}")

    def fetch_data(self):
        try:
            if self.pi:
                raw_voltage = self.read_register_16(0x02)
                voltage = round((raw_voltage >> 3) * 0.004, 2)  # LSB = 4mV, right shift 3 bits
                raw_current = self.read_register_16(0x04)
                CURRENT_LSB = 3.2 / 32767  # ≈ 0.0000977
                current = round(raw_current * CURRENT_LSB, 2)
            else:
                voltage = round(self.ina.bus_voltage, 1) if self.ina else 0.0
                current = round(self.ina.current / 1000, 0) if self.ina else 0.0

            power = round(voltage * current, 0)
            time_stamp = datetime.datetime.now().strftime("%I:%M:%S%p on %B %d, %Y")
            new_readings = {"voltage": voltage, "current": current, "power": power, "time_stamp": time_stamp}

            if self.type == "Battery":
                new_readings["state_of_charge"] = self.estimate_soc(voltage)
            else:
                output = float(voltage / self.rating) * 100
                new_readings["output"] = round(output, 0)

            # Outlier rejection before appending
            if self.is_valid_reading(new_readings):
                self.readings.append(new_readings)
            else:
                logging.info(f"Outlier detected for {self.name}: {new_readings}")

            data = self.smoothed_data(time_stamp)
        except Exception as e:
            logging.info(f"Error reading sensor {self.name}: {e}")
            data = {
                "voltage": 0, "current": 0, "power": 0,
                "time_stamp": datetime.datetime.now().strftime("%I:%M%p on %B %d, %Y"),
                "state_of_charge": 0 if self.type == "Battery" else None,
                "output": 0 if self.type != "Battery" else None,
                "voltage_trend": 0,
                "current_trend": 0,
                "power_trend": 0
            }
        return data

    def is_valid_reading(self, new_reading, threshold=0.4):
        """
        Reject readings that deviate too much from the median of the last N readings.
        threshold: fraction of median (e.g., 0.4 = 40% deviation allowed)
        """
        if len(self.readings) < 3:
            return True  # Not enough data to judge
        keys = ["voltage", "current", "power"]
        for key in keys:
            values = [r[key] for r in self.readings if key in r]
            if not values:
                continue
            median = sorted(values)[len(values)//2]
            if median == 0:
                continue
            if abs(new_reading[key] - median) > threshold * abs(median):
                return False
        return True

    def smoothed_data(self, time_stamp, window=5):
        """
        Return moving average for each value over the last N readings.
        Also adds trend (rate of change) for voltage/current/power.
        """
        if not self.readings:
            return {
                "voltage": 0, "current": 0, "power": 0,
                "time_stamp": "No Data",
                "state_of_charge": 0 if self.type == "Battery" else None,
                "output": 0 if self.type != "Battery" else None,
                "voltage_trend": 0,
                "current_trend": 0,
                "power_trend": 0
            }
        readings = list(self.readings)
        n = len(readings)
        averaged = {
            "voltage": round(sum(r["voltage"] for r in readings) / n, 2),
            "current": round(sum(r["current"] for r in readings) / n, 2),
            "power": round(sum(r["power"] for r in readings) / n, 2),
            "time_stamp": time_stamp
        }
        if self.type == "Battery":
            averaged["state_of_charge"] = round(sum(r["state_of_charge"] for r in readings) / n, 0)
        else:
            averaged["output"] = round(sum(r["output"] for r in readings) / n, 0)

        # Trend calculation (difference per reading)
        if n > 1:
            dv = readings[-1]["voltage"] - readings[0]["voltage"]
            di = readings[-1]["current"] - readings[0]["current"]
            dp = readings[-1]["power"] - readings[0]["power"]
            averaged["voltage_trend"] = round(dv / (n-1), 3)
            averaged["current_trend"] = round(di / (n-1), 3)
            averaged["power_trend"] = round(dp / (n-1), 3)
        else:
            averaged["voltage_trend"] = 0
            averaged["current_trend"] = 0
            averaged["power_trend"] = 0

        return averaged

    def read_data(self):
        data = self.fetch_data()
        data["readings"] = list(self.readings)
        return data

    def average_data(self, time_stamp):
        if not self.readings:
            return {
                "voltage": 0, "current": 0, "power": 0,
                "time_stamp": "No Data",
                "state_of_charge": 0 if self.type == "Battery" else None,
                "output": 0 if self.type != "Battery" else None,
                "voltage_trend": 0,
                "current_trend": 0,
                "power_trend": 0
            }

        n = len(self.readings)
        averaged = {
            "voltage": round(sum(r["voltage"] for r in self.readings) / n, 1),
            "current": round(sum(r["current"] for r in self.readings) / n, 0),
            "power": round(sum(r["power"] for r in self.readings) / n, 0),
            "time_stamp": time_stamp
        }

        if self.type == "Battery":
            averaged["state_of_charge"] = round(sum(r["state_of_charge"] for r in self.readings) / n, 0)
        else:
            averaged["output"] = round(sum(r["output"] for r in self.readings) / n, 0)

        # Trend calculation for average_data as well
        if n > 1:
            readings = list(self.readings)
            dv = readings[-1]["voltage"] - readings[0]["voltage"]
            di = readings[-1]["current"] - readings[0]["current"]
            dp = readings[-1]["power"] - readings[0]["power"]
            averaged["voltage_trend"] = round(dv / (n-1), 3)
            averaged["current_trend"] = round(di / (n-1), 3)
            averaged["power_trend"] = round(dp / (n-1), 3)
        else:
            averaged["voltage_trend"] = 0
            averaged["current_trend"] = 0
            averaged["power_trend"] = 0

        return averaged

    def current_data(self):
        latest = self.readings[-1] if self.readings else {}
        data = {
            "voltage": latest.get('voltage', 0),
            "current": latest.get('current', 0),
            "power": latest.get('power', 0),
            "time_stamp": latest.get('time_stamp', 'No Data'),
            "readings": list(self.readings)
        }
        if self.type == "Battery":
            data["state_of_charge"] = latest.get("state_of_charge", 0)
        else:
            data["output"] = latest.get("output", 0)
        # Add trend for current_data
        n = len(self.readings)
        if n > 1:
            readings = list(self.readings)
            data["voltage_trend"] = round((readings[-1]["voltage"] - readings[0]["voltage"]) / (n-1), 3)
            data["current_trend"] = round((readings[-1]["current"] - readings[0]["current"]) / (n-1), 3)
            data["power_trend"] = round((readings[-1]["power"] - readings[0]["power"]) / (n-1), 3)
        else:
            data["voltage_trend"] = 0
            data["current_trend"] = 0
            data["power_trend"] = 0
        return data

    def estimate_soc(self, voltage):
        voltage = max(11.8, min(12.6, voltage))
        x = (voltage - 12.2) * 10
        soc = 1 / (1 + math.exp(-x))
        return int(soc * 100)

    def read_register_16(self, reg):
        if not self.pi:
            return 0
        try:
            data = self.pi.i2c_read_word_data(self.handle, reg)
            value = ((data & 0xFF) << 8) | ((data >> 8) & 0xFF)
            # Convert to signed 16-bit
            if value & 0x8000:
                value -= 0x10000
            return value
        except Exception as e:
            logging.error(f"Failed to read register {reg} from {self.name}: {e}")
            return 0