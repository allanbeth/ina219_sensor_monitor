// ==========================
// Energy Monitor Config JS
// ==========================

import { deviceList } from './globals.js';
import { escapeHTML, sleep, isSensorConnected } from './utils.js';

// Global variable to store current sensor data for status updates
let currentSensorData = {};

// Update sensor data for status calculations
export function updateSensorData(data) {
    currentSensorData = data;
    updateStatusDisplay();
}

// Calculate connected sensors count using actual sensor data
function getConnectedSensorsInfo() {
    if (!currentSensorData || Object.keys(currentSensorData).length === 0) {
        return { count: 'Loading...', total: 0, connectionClass: 'status-connected' };
    }
    
    let totalSensors = 0;
    let connectedSensors = 0;
    
    // Count sensors and connected sensors
    for (let [name, sensor] of Object.entries(currentSensorData)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) continue;
        totalSensors++;
        if (isSensorConnected(sensor)) {
            connectedSensors++;
        }
    }
    
    let connectionClass = 'status-disconnected';
    if (connectedSensors === totalSensors && connectedSensors > 0) {
        connectionClass = 'status-connected';
    } else if (connectedSensors > 0) {
        connectionClass = 'status-partial';
    }
    
    return {
        count: totalSensors > 0 ? `${connectedSensors}/${totalSensors}` : 'No sensors',
        total: totalSensors,
        connectionClass: connectionClass
    };
}

// Fetch current system status information
function fetchStatusInfo() {
    // Use available device data and provide basic status info
    const devices = Object.values(deviceList) || [];
    const totalDevices = devices.length;
    const connectedDevices = totalDevices; // Assume configured devices are available
    
    const deviceConnectionClass = connectedDevices > 0 ? 'status-connected' : 'status-disconnected';
    const sensorInfo = getConnectedSensorsInfo();
    
    return Promise.resolve({
        service_status: 'Running',
        connected_devices: `${connectedDevices}/${totalDevices}`,
        connected_sensors: sensorInfo.count,
        device_connection_class: deviceConnectionClass,
        sensor_connection_class: sensorInfo.connectionClass,
        mqtt_status: 'Connected', // Default status
        last_updated: new Date().toLocaleTimeString()
    });
}

// Update the status display elements directly
function updateStatusDisplay() {
    const sensorStatusElement = document.getElementById('sensor-status');
    if (sensorStatusElement) {
        const sensorInfo = getConnectedSensorsInfo();
        sensorStatusElement.textContent = sensorInfo.count;
        sensorStatusElement.className = `status-value ${sensorInfo.connectionClass}`;
    }
    
    // Update last updated time
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = new Date().toLocaleTimeString();
    }
}



// Fetch the settings from the server
export function fetchSettings() {
    Promise.all([
        fetch('/get_settings').then(res => res.json()),
        fetchStatusInfo()
    ]).then(([configData, statusData]) => {
        // Populate individual form fields for backward compatibility
        const solarInterval = document.getElementById('solar-interval');
        const windInterval = document.getElementById('wind-interval');
        const batteryInterval = document.getElementById('battery-interval');
        const maxLog = document.getElementById('max-log');
        const maxReadings = document.getElementById('max-readings');
        const mqttBroker = document.getElementById('mqtt-broker');
        const mqttPort = document.getElementById('mqtt-port');
        
        if (solarInterval) solarInterval.value = configData.poll_intervals.Solar ?? '';
        if (windInterval) windInterval.value = configData.poll_intervals.Wind ?? '';
        if (batteryInterval) batteryInterval.value = configData.poll_intervals.Battery ?? '';
        if (maxLog) maxLog.value = configData.max_log ?? '';
        if (maxReadings) maxReadings.value = configData.max_readings ?? '';
        if (mqttBroker) mqttBroker.value = configData.mqtt_broker ?? '';
        if (mqttPort) mqttPort.value = configData.mqtt_port ?? '';
        
        const statusSettings = document.getElementById('status-card-content');
        const systemSettings = document.getElementById('system-card-content');
        const pollingSettings = document.getElementById('polling-card-content');
        const mqttSettings = document.getElementById('mqtt-card-content');
        const webSettings = document.getElementById('webserver-card-content'); 
        
        statusSettings.innerHTML = '';
        systemSettings.innerHTML = '';
        pollingSettings.innerHTML = '';
        mqttSettings.innerHTML = '';
        webSettings.innerHTML = '';        

        let statusHtml = '';
        let systemHtml = '';
        let pollingHtml = '';
        let mqttHtml = '';
        let webHtml = '';


        statusHtml = `
            <div class="settings-entries">
                <div class="settings-entry">
                    <label class="settings-label">Service Status</label>
                    <span class="status-value status-connected" id="service-status">${statusData.service_status || 'Running'}</span>
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Connected Devices</label>
                    <span class="status-value ${statusData.device_connection_class || 'status-connected'}" id="device-status">${statusData.connected_devices || 'Loading...'}</span>
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Connected Sensors</label>
                    <span class="status-value ${statusData.sensor_connection_class || 'status-connected'}" id="sensor-status">${statusData.connected_sensors || 'Loading...'}</span>
                </div>
                <div class="settings-entry">
                    <label class="settings-label">MQTT Connection</label>
                    <span class="status-value ${statusData.mqtt_status === 'Connected' ? 'status-connected' : 'status-disconnected'}" id="mqtt-status">${statusData.mqtt_status || 'Unknown'}</span>
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Last Updated</label>
                    <span class="status-value" id="last-updated">${statusData.last_updated || new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;

        systemHtml = `
            <div class="settings-entries">
                <div class="settings-entry">
                    <label class="settings-label" for="max-log">Max Log Size (MB):</label>
                    <input type="number" id="max-log" value="${configData.max_log ?? ''}" min="1" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="max-readings">Max Sensor Readings:</label>
                    <input type="number" id="max-readings" value="${configData.max_readings ?? ''}" min="1" />
                </div>
            </div>
        `;

        pollingHtml = `
            <div class="settings-entries">
                <div class="settings-entry">
                    <label class="settings-label" for="solar-interval">Solar Poll Interval (s):</label>
                    <input type="number" id="solar-interval" value="${configData.poll_intervals.Solar ?? ''}" min="1" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="wind-interval">Wind Poll Interval (s):</label>
                    <input type="number" id="wind-interval" value="${configData.poll_intervals.Wind ?? ''}" min="1" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="battery-interval">Battery Poll Interval (s):</label>
                    <input type="number" id="battery-interval" value="${configData.poll_intervals.Battery ?? ''}" min="1" />
                </div>
            </div>
        `;

        mqttHtml = `
            <div class="settings-entries">
                <div class="settings-entry">
                    <label class="settings-label" for="mqtt-broker">MQTT Broker Address:</label>
                <input type="text" id="mqtt-broker" value="${configData.mqtt_broker ?? ''}" placeholder="Broker address" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="mqtt-port">MQTT Broker Port:</label>
                    <input type="number" id="mqtt-port" value="${configData.mqtt_port ?? ''}" placeholder="Broker port" min="1" />
                </div>
            </div>
        `;

        webHtml = `
            <div class="settings-entries">
                <div class="settings-entry">
                    <label class="settings-label" for="webserver-host">Host Address</label>
                    <input type="text" id="webserver-host" value="${configData.webserver_host ?? ''}" placeholder="Webserver address" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="webserver-port">Port</label>
                    <input type="text" id="webserver-port" value="${configData.webserver_port ?? ''}" placeholder="Webserver port" />
                </div>
            </div>
        `;

        statusSettings.innerHTML = statusHtml;
        systemSettings.innerHTML = systemHtml;
        pollingSettings.innerHTML = pollingHtml;
        mqttSettings.innerHTML = mqttHtml;
        webSettings.innerHTML = webHtml;

        // Generate device entries

        const deviceContent = document.getElementById('device-card-content');
        deviceContent.innerHTML = '';
        const deviceEntries = document.createElement('div');
        deviceEntries.className = 'settings-entries';
        deviceEntries.id = 'device-entries';
        let deviceEntriesHtml = '';
                
        if (Object.keys(deviceList).length === 0) {
            deviceEntriesHtml = `
                <div class="settings-entry" id="device-entry-null">
                    <div class="device-entry-null">
                        <label class="settings-label">No devices configured.</label>
                    </div>
                </div>
                `;
        } else {
        for (const device of Object.values(deviceList)) {
            const checked = device.remote_gpio === 1 ? 'checked' : '';
            const disabled = device.remote_gpio === 0 ? 'disabled' : '';
            deviceEntriesHtml += `
                <div class="settings-entry" id="device-entry-${device.id}">
                    <span class="settings-label">
                        ${device.name}
                    </span>
                    <span class="settings-action">
                        <i class="fa-solid fa-gear action-btns" id="device-gear-${device.id}" title="Configure Device"></i>
                    </span>
                </div>
                `;

            // deviceEntriesHtml += deviceEntriesHtml;
        }
        }
        deviceEntries.innerHTML = deviceEntriesHtml;
        deviceContent.appendChild(deviceEntries);

        // Add event listeners for gear icons after the HTML is set
        for (const device of Object.values(deviceList)) {
            const gearButton = document.getElementById(`device-gear-${device.id}`);
            if (gearButton) {
                gearButton.addEventListener('click', () => {
                    openDevicesConfig(device.id);
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
    document.getElementById('sensor-container').classList.add('hidden');

}

// devices content
export function openDevicesConfig(deviceId) {
    document.getElementById('device-card-content').classList.add('hidden');

    const deviceID = deviceId;
    let deviceHTML = '';
    
    deviceHTML += `
        <div class="settings-entry">
            <label class="settings-label" for="device-name-${deviceID}">Device Name:</label>
            <input type="text" class="device-name-${deviceID}" id="device-name-${deviceID}" value="${deviceList[deviceID].name}" />
        </div>
        <div class="settings-entry">
            <label class="settings-label" for="remote-gpio-${deviceID}">Enable Remote GPIO:</label>
            <input type="checkbox" class="gpio-checkbox-${deviceID}" id="remote-gpio-${deviceID}" ${deviceList[deviceID].remote_gpio === 1 ? 'checked' : ''} />
        </div>
        <div class="settings-entry">
            <label class="settings-label" for="gpio-address-${deviceID}">GPIO Address:</label>
            <input type="text" class="gpio-address-${deviceID}" id="gpio-address-${deviceID}" value="${deviceList[deviceID].gpio_address}" ${deviceList[deviceID].remote_gpio === 1 ? '' : 'disabled'} />
        </div>
    `;

    const remoteGpioCheckbox = document.querySelector(`.gpio-checkbox-${deviceID}`);
    const i2cInput = document.querySelector(`.gpio-address-${deviceID}`);

    if (remoteGpioCheckbox) {
        remoteGpioCheckbox.addEventListener('change', function () {
            i2cInput.disabled = !this.checked;
        });
    }

    const deviceConfigDiv = document.getElementById('device-config');
    deviceConfigDiv.innerHTML = deviceHTML;
    document.getElementById('device-config').classList.remove('hidden');
    document.getElementById('device-config-btns').classList.remove('hidden');
    document.getElementById('device-config-cancel').classList.remove('hidden');
    document.getElementById('device-config-save').classList.remove('hidden');
    document.getElementById('device-config-add').classList.add('hidden');

    document.getElementById('device-config-complete').classList.add('hidden');

    // Cancel Device Config
    document.getElementById('device-config-cancel').addEventListener('click', () => {
        document.getElementById('device-config').classList.add('hidden');
        document.getElementById('device-config-save').classList.add('hidden');
        document.getElementById('device-config-cancel').classList.add('hidden');
        document.getElementById('device-card-content').classList.remove('hidden');
        document.getElementById('device-config-add').classList.remove('hidden');
    });

    // Save Device Config
    document.getElementById('device-config-save').addEventListener('click', () => {
        saveSettings();
        document.getElementById('device-config').classList.add('hidden');
        document.getElementById('device-config-btns').classList.add('hidden');
        document.getElementById('device-card-content').classList.remove('hidden');
        document.getElementById('device-config-add').classList.remove('hidden');
    });
    
}

// Restart Confirmation
export function restartConfirmation() {
    document.getElementById("restart-action").classList.add("hidden");
    document.getElementById("restart-confirmation").classList.remove("hidden");
    document.getElementById("restart-action-btns").classList.remove("hidden");
}

// Close Restart Confirmation
export function closeRestart() {
    document.getElementById("restart-confirmation").classList.add("hidden");
    document.getElementById("restart-message").classList.add("hidden");
    document.getElementById("restart-action-btns").classList.add("hidden");
    document.getElementById("restart-action").classList.remove("hidden");
    
    // Re-enable restart card clicking
    // if (window.resetRestartCard) {
    //     window.resetRestartCard();
    // }
}
// Restart Application
export async function restartApplication() {
    try {
        // document.getElementById("dialog-containter").classList.remove("hidden");
        document.getElementById("restart-action").classList.add("hidden");
        document.getElementById("restart-confirmation").classList.add("hidden");
        document.getElementById("restart-message").classList.remove("hidden");
        document.getElementById("restart-message").innerHTML = "<label class=\"settings-label restart-message\">Restarting...</label>";
        await sleep(3000); // brief pause to show restarting message
        const res = await fetch("/restart", { method: "POST" });
        if (res.ok) {
            document.getElementById("restart-message").innerHTML = "";
            document.getElementById("restart-message").innerHTML = "<label class=\"settings-label restart-message\">Successfully Restarted</label>";
            // document.getElementById("dialog-card-content").innerHTML += "<p>Successfully Restarted Service</p>";
            await sleep(2000); // pause for 2 seconds
            document.getElementById("restart-action").classList.remove("hidden");
            document.getElementById("restart-confirmation").classList.add("hidden");
            document.getElementById("restart-message").classList.add("hidden");
            document.getElementById("restart-action-btns").classList.add("hidden");
            // document.getElementById("dialog-containter").classList.remove("hidden");
            
        // Re-enable restart card clicking
        // if (window.resetRestartCard) {
        //     window.resetRestartCard();
        // }
        } else {
             document.getElementById("dialog-card-content").innerHTML += "<p>Failed To Restart Service</p>";
            document.getElementById("restart-message").innerHTML = "<p>Failed To Restart</p><p>Check logs for errors.</p>";
            await sleep(2000); // pause for 2 seconds
            document.getElementById("restart-action").classList.remove("hidden");
            document.getElementById("restart-message").classList.add("hidden");
            document.getElementById("restart-confirmation").classList.add("hidden");
            document.getElementById("restart-action-btns").classList.add("hidden");
            
        // Re-enable restart card clicking
        // if (window.resetRestartCard) {
        //     window.resetRestartCard();
        // }
        }
    } 
    catch (err) {
        document.getElementById("restart-message").innerHTML = "<p>Error restarting</p><p>" + err.message + "</p>";
        
        // Re-enable restart card clicking even on error
        // if (window.resetRestartCard) {
        //     window.resetRestartCard();
        // }
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
            document.getElementById("add-sensor-card").classList.add("hidden");
            socket.emit("sensor_update_request");
        } else {
            alert("Failed to add sensor: " + (result.message || "Unknown error"));
        }
    });
}

// Get Log File
export async function getLogFile() {
    const logContainer = document.getElementById('log-file-entries');
    logContainer.innerHTML = '<label class="log-file-label">Retrieving logs...</label>';
    await sleep(2000); // brief pause to show loading message
    fetch('/get_log_file')
        .then(res => res.json())
        .then(data => {
            const logEntries = data.logs ?? [];
            if (logEntries.length === 0) {
                logContainer.innerHTML = '<label class="log-file-label">No log data found.</label>';
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
            logContainer.innerHTML = '';
            logContainer.innerHTML = logFileHTML;
        })
        .catch(error => {
            logContainer.innerHTML = '<label class="log-file-label">Failed to load logs.</label>';
            console.error('Log fetch error:', error);
        });
}

// Get About Information
export function getAbout() {
    fetch('/readme')
        .then(res => res.text())
        .then(markdown => {
            document.getElementById('about-file').innerHTML = marked.parse(markdown);
        })
        .catch(error => {
            document.getElementById('about-file').innerText = 'Failed to load README.';
            console.error('Error loading README:', error);
        });
}

