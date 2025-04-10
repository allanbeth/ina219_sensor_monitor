# sensor_monitor/webserver.py

from flask import Flask, render_template, request, redirect
from flask_socketio import SocketIO, emit
from sensor_monitor.sensor_manager import SensorManager
from sensor_monitor.config import WEB_SERVER_HOST, WEB_SERVER_PORT
from sensor_monitor.live_data import sensor_data
from pathlib import Path

root = Path(__file__).parents[1]
templatePath = root / "templates/"
app = Flask(__name__, template_folder=templatePath)
socketio = SocketIO(app)
manager = SensorManager()

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", sensors=sensor_data)

@app.route("/edit/<name>", methods=["GET", "POST"])
def edit_sensor(name):
    if request.method == "POST":
        new_name = request.form["name"]
        new_type = request.form["type"]
        manager.update_sensor(name, new_name, new_type)
        return redirect("/")
    return render_template("edit_sensor.html", sensor_name=name)

def broadcast_sensor_data():
    socketio.emit("sensor_update", sensor_data)

def run_webserver():
    
    socketio.run(app, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT, debug=False, allow_unsafe_werkzeug=True)
