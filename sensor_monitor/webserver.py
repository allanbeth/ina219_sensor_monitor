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
        self.manager = manager
        self.root = Path(__file__).parents[1]
        self.templatePath = self.root / "templates/"
        self.stylePath = self.root / "static/"
        self.app = Flask(__name__, template_folder=self.templatePath, static_folder=self.stylePath)
        self.socketio = SocketIO(self.app)
        self.app.route("/", methods=["GET", "POST"])(self.main)
        self.app.route('/get_settings', methods=["GET", "POST"])(self.get_settings) 
        self.app.route('/update_settings', methods=["GET", "POST"])(self.update_settings) 
        self.app.route("/update_sensor", methods=["POST"])(self.update_sensor)
        self.app.route("/delete_sensor", methods=["POST"])(self.delete_sensor)
        #self.settings = self.manager.get_settings()



    def main(self):
        return render_template("index.html", sensors=sensor_data)
    
    def update_sensor(self):
        data = request.get_json()
        original_name = data["original_name"]
        new_name = data["name"]
        new_type = data.get("type", sensor_data[original_name]["type"])
        max_power = int(data.get("max_power", 100))
        rating = int(data.get("rating", 100))

        self.manager.update_sensor(original_name, new_name, new_type, max_power, rating)
        return jsonify({"status": "success"})

        
    def get_settings(self):
            
            return self.manager.config

    def update_settings(self):
        data = request.get_json()
        self.manager.save_settings(data)
    
    def delete_sensor(self):
        data = request.get_json()
        sensor_name = data.get("name")
        if sensor_name in sensor_data:
            self.manager.remove_sensor(sensor_name)
            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "error", "message": "Sensor not found"}), 404
        

    def broadcast_sensor_data(self):
        self.socketio.emit("sensor_update", sensor_data)

    def run_webserver(self): 

        self.socketio.run(self.app, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT, debug=False, allow_unsafe_werkzeug=True)
