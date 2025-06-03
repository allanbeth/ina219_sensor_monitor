# sensor_monitor/webserver.py

from flask import Flask, render_template, request, redirect, send_file, abort, send_from_directory, jsonify
from flask_socketio import SocketIO, emit
#from sensor_monitor.config import WEB_SERVER_HOST, WEB_SERVER_PORT
from sensor_monitor.live_data import sensor_data
from pathlib import Path
import json, os, sys, subprocess

class flaskWrapper:
    def __init__(self, manager):
        self.manager = manager
        self.root = Path(__file__).parents[1]
        self.templatePath = self.root / "templates/"
        self.stylePath = self.root / "static/"
        self.readmePath = self.root / "README.md"
        self.logFilePath = self.root / "sensor_monitor.log"
        self.app = Flask(__name__, template_folder=self.templatePath, static_folder=self.stylePath)
        self.socketio = SocketIO(self.app)
        self.app.route("/", methods=["GET", "POST"])(self.main)
        self.app.route('/get_settings', methods=["GET", "POST"])(self.get_settings) 
        self.app.route('/update_settings', methods=["GET", "POST"])(self.update_settings) 
        self.app.route("/update_sensor", methods=["POST"])(self.update_sensor)
        self.app.route("/delete_sensor", methods=["POST"])(self.delete_sensor)
        self.app.route("/get_log_file", methods=["GET", "POST"])(self.get_log_file)
        self.app.route("/readme", methods=["GET", "POST"])(self.serve_readme)
        self.app.route("/restart", methods=["POST"])(self.restart_program)


    def main(self):
        self.manager.logger.info(f"Loading index.html")
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
            self.manager.logger.info(f"Requesting config data")
            
            return self.manager.config.config_data

    def update_settings(self):
        data = request.get_json()
        self.manager.config.save_config(data)
    
    def delete_sensor(self):
        data = request.get_json()
        sensor_name = data.get("name")
        if sensor_name in sensor_data:
            self.manager.remove_sensor(sensor_name)
            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "error", "message": "Sensor not found"}), 404
        
    def serve_readme(self):
        if self.readmePath.exists():
            return send_file(self.readmePath, mimetype="text/markdown")
        else:
            return abort(404, "README.md not found")
        
 
    def get_log_file(self):
        if not self.logFilePath.exists():
            return jsonify({"logs": []})
            
        try:
            self.manager.logger.info(f"Retrieving Logs")
            with open(self.logFilePath, "r") as f:
                lines = f.readlines()

            # Return last N lines (e.g., 100)
            logs = [{"logs": line.strip()} for line in lines[-100:]][::-1]
            self.manager.logger.info(f"Loaded logs")
            return jsonify({"logs": logs})
        except Exception as e:
            return jsonify({"error": str(e), "logs": []}), 500

    def broadcast_sensor_data(self):
        self.socketio.emit("sensor_update", sensor_data)

    def restart_program(self):
        try:
            self.manager.logger.info(f"Restarting.....")
            subprocess.Popen(["sudo", "systemctl", "restart", "sensor_monitor.service"])
            self.manager.logger.info(f"Restarted Sucessfully ")
            return jsonify({"status": "restarting"}), 200
        except Exception as e:
            self.manager.logger.info(f"Failed to restart")
            return jsonify({"status": "error", "message": str(e)}), 500

    def run_webserver(self): 

        self.socketio.run(self.app, host=self.manager.config.config_data['webserver_host'], port=self.manager.config.config_data['webserver_port'], debug=False, allow_unsafe_werkzeug=True)
