from setuptools import setup, find_packages

setup(
    name="sensor_monitor",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "flask",
        "flask-socketio",
        "paho-mqtt",
        "smbus2",
        "adafruit-circuitpython-ina219"
    ],
    entry_points={
        "console_scripts": [
            "sensor-monitor = sensor_monitor.main:main",
        ]
    },
)
