// ==========================
// Energy Monitor Config JS
// ==========================

import { deviceList } from './globals.js';
import { escapeHTML, sleep} from './utils.js';



// Fetch the settings from the server
export function fetchSettings() {
    fetch('/get_settings')
        .then(res => res.json())
        .then(data => {
            document.getElementById('solar-interval').value = data.poll_intervals.Solar ?? '';
            document.getElementById('wind-interval').value = data.poll_intervals.Wind ?? '';
            document.getElementById('battery-interval').value = data.poll_intervals.Battery ?? '';
            document.getElementById('max-log').value = data.max_log ?? '';
            document.getElementById('max-readings').value = data.max_readings ?? '';
            document.getElementById('mqtt-broker').value = data.mqtt_broker ?? '';
            document.getElementById('mqtt-port').value = data.mqtt_port ?? '';
            document.getElementById('webserver-host').value = data.webserver_host ?? '';
            document.getElementById('webserver-port').value = data.webserver_port ?? '';
            const deviceSettings = document.getElementById('devices-settings');
            deviceSettings.innerHTML = '';
            let html = '';
            for (const device of Object.values(deviceList)) {
                const checked = device.remote_gpio === 1 ? 'checked' : '';
                const disabled = device.remote_gpio === 0 ? 'disabled' : '';
                html += `
                    <hr class="divider">
                    <div class="settings-entry">
                        <label for="device-id"> Device ID:</label>
                        <input type="text" class="device-id-${device.id}" id="device-id" value="${device.id}" disabled/>
                     </div>
                    <div class="settings-entry">
                        <label for="device-name"> Device Name:</label>
                        <input type="text" class="device-name-${device.id}" id="device-name" value="${device.name}"/>
                     </div>
                    <div class="settings-entry">
                        <label for="remote-gpio"> Remote GPIO:</label>
                        <input type="checkbox" class="gpio-checkbox-${device.id}" id="remote-gpio" ${checked}/>
                    </div>
                    <div class="settings-entry">
                        <label for="gpio-address"> GPIO Address:</label>
                        <input type="text" class="gpio-address-${device.id}" id="gpio-address" value="${device.gpio_address}" ${disabled}/>
                    </div>
                `;
            }
            deviceSettings.innerHTML = html;
            for (const device of Object.values(deviceList)) {
                const remoteGpioCheckbox = document.querySelector(`.gpio-checkbox-${device.id}`);
                const i2cInput = document.querySelector(`.gpio-address-${device.id}`);
                if (remoteGpioCheckbox) {
                    remoteGpioCheckbox.addEventListener('change', function () {
                        i2cInput.disabled = !this.checked;
                    });
                }
            }
        });
}
// Save the settings to the server
export function saveSettings() {
    const maxLog = document.getElementById('max-log').value;
    const solarInterval = document.getElementById('solar-interval').value;
    const windInterval = document.getElementById('wind-interval').value;
    const batteryInterval = document.getElementById('battery-interval').value;
    const maxReadings = document.getElementById('max-readings').value;
    const mqttBroker = document.getElementById('mqtt-broker').value;
    const mqttPort = document.getElementById('mqtt-port').value;
    const webserverHost = document.getElementById('webserver-host').value;
    const webserverPort = document.getElementById('webserver-port').value;
    const deviceSettings = {};
    for (const device of Object.values(deviceList)) {
        const deviceNameInput = document.querySelector(`.device-name-${device.id}`);
        const gpioCheckbox = document.querySelector(`.gpio-checkbox-${device.id}`);
        const gpioAddrInput = document.querySelector(`.gpio-address-${device.id}`);
        if (deviceNameInput && gpioCheckbox && gpioAddrInput) {
            deviceSettings[device.id] = {
                name: deviceNameInput.value.trim(),
                remote_gpio: gpioCheckbox.checked ? 1 : 0,
                gpio_address: gpioAddrInput.value.trim()
            };
        }
    }
    fetch('/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            max_log: maxLog,
            solar_interval: solarInterval,
            wind_interval: windInterval,
            battery_interval: batteryInterval,
            max_readings: maxReadings,
            mqtt_broker: mqttBroker,
            mqtt_port: mqttPort,
            webserver_host: webserverHost,
            webserver_port: webserverPort,
            devices: deviceSettings
        })
    })
        .then(res => res.json())
        .then(() => {
            window.socket.emit('sensor_update_request');
        });
    document.getElementById('settings-container').classList.add('hidden');
}

// Restart Confirmation
export function restartConfirmation() {
    const resetMsg = document.getElementById("restart-content");
    resetMsg.innerHTML = '<h5>Are you sure you want to restart the program?</h5>';
}

// Close Restart Confirmation
export function closeRestart() {
    const restartMsg = document.getElementById("restart-content");
    const restartBtns = document.getElementById("restart-btns");
    document.getElementById("restart-container").classList.add("hidden");
    restartMsg.innerHTML = '<h5>Are you sure you want to restart the program?</h5>';
    restartBtns.innerHTML = '<button class="cancel-btn">Cancel</button><button class="save-btn">Confirm</button>';
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
}
// Restart Application
export async function restartApplication() {
  const restartMsg = document.getElementById("restart-content");
  restartMsg.innerHTML = "<h5>Restarting...</h5>";

  try {
    const res = await fetch("/restart", { method: "POST" });

    if (res.ok) {
      restartMsg.innerHTML = "<h5>Successfully Restarted</h5>";
      await sleep(2000); // pause for 2 seconds
      document.getElementById("restart-container").classList.add("hidden");
      document.getElementById("restart-container").classList.add("hidden");
    } else {
      restartMsg.innerHTML = "<h5>Failed To Restart</h5><p>Check logs for errors.</p>";
    }
  } catch (err) {
    restartMsg.innerHTML = "<h5>Error restarting</h5><p>" + err.message + "</p>";
  }
}

// Add Sensor
export function addSensor() {
    const name = document.getElementById("add-sensor-name").value;
    const type = document.getElementById("add-sensor-type").value;
    const max_power = document.getElementById("add-sensor-max-power").value;
    const rating = document.getElementById("add-sensor-rating").value;
    const address = document.getElementById("add-sensor-address").value;

    fetch("/add_sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, max_power, rating, address })
    })
    .then(res => res.json())
    .then(result => {
        if (result.status === "success") {
            document.getElementById("add-sensor-container").classList.add("hidden");
            socket.emit("sensor_update_request");
        } else {
            alert("Failed to add sensor: " + (result.message || "Unknown error"));
        }
    });
}

// Get Log File
export function getLogFile() {
    const logContainer = document.getElementById('log-file-entries');
    fetch('/get_log_file')
        .then(res => res.json())
        .then(data => {
            const logEntries = data.logs ?? [];
            if (logEntries.length === 0) {
                logContainer.innerHTML = '<p>No log data found.</p>';
                return;
            }
            const logFileHTML = logEntries.map(entry => {
                const logText = entry.logs.trim();
                const match = logText.match(/^\s*[\d\-:, ]+\s+([A-Z]+)\s+(.*)$/);
                if (match) {
                    const logType = match[1];
                    const logMessage = match[2];
                    return `
                        <div class="log-file-entry">
                            <p><strong style="color:green;">${escapeHTML(logType)}</strong> ${escapeHTML(logMessage)}</p>
                        </div>
                    `;
                } else {
                    return `<div class="log-file-entry"><p>${escapeHTML(logText)}</p></div>`;
                }
            }).join('');
            logContainer.innerHTML = logFileHTML;
        })
        .catch(error => {
            logContainer.innerHTML = '<p>Failed to load logs.</p>';
            console.error('Log fetch error:', error);
        });
}

// Get About Information
export function getAbout() {
    fetch('/readme')
        .then(res => res.text())
        .then(markdown => {
            document.getElementById('about-content').innerHTML = marked.parse(markdown);
        })
        .catch(error => {
            document.getElementById('about-content').innerText = 'Failed to load README.';
            console.error('Error loading README:', error);
        });
}


