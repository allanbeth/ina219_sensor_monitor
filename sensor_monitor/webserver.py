# sensor_monitor/webserver.py

from flask import Flask, render_template, request, redirect
from flask_socketio import SocketIO, emit
from sensor_monitor.sensor_manager import SensorManager
from sensor_monitor.config import WEB_SERVER_HOST, WEB_SERVER_PORT
from sensor_monitor.live_data import sensor_data
from pathlib import Path
import json

class flaskWrapper:
    def __init__(self, manager):
        #self.sensor_data = sensor_data
        self.manager = manager
        self.root = Path(__file__).parents[1]
        self.templatePath = self.root / "templates/"
        self.stylePath = self.root / "static/"
        self.app = Flask(__name__, template_folder=self.templatePath, static_folder=self.stylePath)
        self.socketio = SocketIO(self.app)
        self.app.route("/", methods=["GET", "POST"])(self.main)
        self.app.route("/add", methods=["GET", "POST"])(self.add_sensor) 
        self.app.route("/update_sensor", methods=["POST"])(self.update_sensor)



    def main(self):
        return render_template("index.html", sensors=sensor_data)
    
    def update_sensor(self):
        data = request.get_json()
        original_name = data["original_name"]
        new_name = data["name"]
        new_type = data.get("type", sensor_data[original_name]["type"])  # Fallback to current type if not provided
        max_power = int(data.get("max_power", 100))

        self.manager.update_sensor(original_name, new_name, new_type, max_power)
        return jsonify({"status": "success"})


    
    def add_sensor(self):
        
        if request.method == "POST":
            new_name = request.form["name"]
            new_address = request.form["address"]
            new_type = request.form["type"]
            max_power = request.form["max_power"]
            data = [{"name": new_name, "address": new_address, "type": new_type, "max_power": max_power}]

            self.manager.add_sensor(data)

            return redirect("/")
        return render_template("add_sensor.html")

    def broadcast_sensor_data(self):
        self.socketio.emit("sensor_update", sensor_data)

    def run_webserver(self): 


        self.socketio.run(self.app, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT, debug=False, allow_unsafe_werkzeug=True)
