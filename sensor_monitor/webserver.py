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
        self.app = Flask(__name__, template_folder=self.templatePath)
        self.socketio = SocketIO(self.app)
        self.app.route("/", methods=["GET", "POST"])(self.main)
        self.app.route("/edit/<name>", methods=["GET", "POST"])(self.edit_sensor) 
        self.app.route("/add", methods=["GET", "POST"])(self.add_sensor) 



    def main(self):
        return render_template("index.html", sensors=sensor_data)

 
    def edit_sensor(self, name):
        sensor = next((s for s in self.manager.sensors if s.name == name), None)
        if request.method == "POST":
            new_name = request.form["name"]
            new_type = request.form["type"]
            max_power = int(request.form.get("max_power"))

            self.manager.update_sensor(name, new_name, new_type, max_power)
            return redirect("/")
        return render_template(
            "edit_sensor.html",
            sensor_name=name,
            sensor_type=sensor.type if sensor else "",
            max_power=sensor.max_power if sensor else 100
        )
    
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
