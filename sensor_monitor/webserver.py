# sensor_monitor/webserver.py

import json
import subprocess
import sys
try:
    from flask import Flask, render_template, request, send_file, abort, jsonify
    from flask_socketio import SocketIO
    from sensor_monitor.live_data import sensor_data
    from sensor_monitor.config_manager import ROOT
    from sensor_monitor.logger import logger
except Exception as ex:
    print("Error loading config: " + str(ex))
    sys.exit()

class flaskWrapper:
    def __init__(self, config_manager, sensor_config):
        self.config_manager = config_manager
        self.sensor_config = sensor_config
        self.templatePath = ROOT / "templates/"
        self.stylePath = ROOT / "static/"
        self.readmePath = ROOT / "README.md"
        self.logFilePath = ROOT / "sensor_monitor.log"
        self.app = Flask(__name__, template_folder=self.templatePath, static_folder=self.stylePath)
        self.socketio = SocketIO(self.app, async_mode='threading', ping_timeout=60,ping_interval=25)
        self.app.route("/", methods=["GET", "POST"])(self.main)
        self.app.route('/get_settings', methods=["GET", "POST"])(self.get_settings) 
        self.app.route('/update_settings', methods=["GET", "POST"])(self.update_settings) 
        self.app.route("/update_sensor", methods=["POST"])(self.update_sensor)
        self.app.route("/delete_sensor", methods=["POST"])(self.delete_sensor)
        self.app.route("/get_log_file", methods=["GET", "POST"])(self.get_log_file)
        self.app.route("/readme", methods=["GET", "POST"])(self.serve_readme)
        self.app.route("/restart", methods=["POST"])(self.restart_program)
        self.app.route("/add_sensor", methods=["POST"])(self.add_sensor)
        self.app.route("/backup", methods=["POST"])(self.backup_config)
        self.app.route("/delete_backup", methods=["POST"])(self.delete_backup)
        self.app.route("/restore_backup", methods=["POST"])(self.restore_backup)
        self.app.route("/list_backups", methods=["GET", "POST"])(self.list_backups)


    def main(self):
        logger.info("Loading index.html")
        self.broadcast_sensor_data()

        return render_template("index.html", sensors=sensor_data)
    
    def update_sensor(self):
        data = request.get_json()
        original_name = data["original_name"]
        new_name = data["name"]
        new_type = data.get("type", sensor_data[original_name]["type"])
        max_power = int(data.get("max_power", 100))
        rating = int(data.get("rating", 100))
        address = data.get("address", sensor_data[original_name]["address"])

        self.sensor_config.update_sensor(original_name, new_name, new_type, max_power, rating, address)
        return jsonify({"status": "success"})

        
    def get_settings(self):
            logger.info("Requesting config data")
            
            return self.config_manager.config_data

    def update_settings(self):
        data = request.get_json()
        self.config_manager.save_config(data)

    def backup_config(self):
        logger.info("Backing up configuration file(s)")
        data = request.get_json()
        program = data["programConfig"]
        sensor = data["sensorConfig"]

        self.config_manager.backup_config(program, sensor)

    def restore_backup(self):
        logger.info("Restoring configuration file(s)")
        data = request.get_json()
        filename = data.get("filename")
        restore_config = data.get("restore_config", True)
        restore_sensors = data.get("restore_sensors", True)        

        self.config_manager.restore_backup(filename, restore_config, restore_sensors)

    def delete_backup(self):
        data = request.json
        filename = data.get("filename")
        self.config_manager.delete_backup(filename)
        return jsonify({"status": "success"})
        
    def list_backups(self):
        logger.info("Listing backup files")
        backups = self.config_manager.list_backups()
        return jsonify({"backups": backups})
    
    def delete_sensor(self):
        data = request.get_json()
        sensor_name = data.get("name")
        if sensor_name in sensor_data:
            self.sensor_config.remove_sensor(sensor_name)
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
            logger.info("Retrieving Logs")
            with open(self.logFilePath, "r") as f:
                lines = f.readlines()

            # Return last N lines (e.g., 100)
            logs = [{"logs": line.strip()} for line in lines[-100:]][::-1]
            logger.info("Loaded logs")
            return jsonify({"logs": logs})
        except Exception as e:
            return jsonify({"error": str(e), "logs": []}), 500

    def broadcast_sensor_data(self):
        self.socketio.emit("sensor_update", sensor_data)

    def restart_program(self):
        try:
            logger.info("Restarting.....")
            subprocess.Popen(["sudo", "systemctl", "restart", "sensor_monitor.service"])
            logger.info("Restarted Sucessfully ")
            return jsonify({"status": "restarting"}), 200
        except Exception as e:
            logger.info("Failed to restart")
            return jsonify({"status": "error", "message": str(e)}), 500

    def add_sensor(self):
        data = request.get_json()
        name = data.get("name")
        sensor_type = data.get("type")
        max_power = int(data.get("max_power", 100))
        rating = int(data.get("rating", 12))
        address = data.get("address")
        try:
            # Add to config and save
            new_sensor = {
                "name": name,
                "address": address,
                "type": sensor_type,
                "max_power": max_power,
                "rating": rating
            }
            # Load, append, and save
            with open(self.config_manager.SENSOR_FILE, "r") as f:
                sensors = json.load(f)
            sensors.append(new_sensor)
            with open(self.config_manager.SENSOR_FILE, "w") as f:
                json.dump(sensors, f)
            logger.info(f"Added new sensor: {name}")
            return jsonify({"status": "success"})
        except Exception as e:
            logger.error(f"Failed to add sensor: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    def run_webserver(self): 

        self.socketio.run(self.app, host=self.config_manager.config_data['webserver_host'], port=self.config_manager.config_data['webserver_port'], debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
