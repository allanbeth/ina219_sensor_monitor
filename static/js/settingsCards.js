// ==========================
// Energy Monitor Config JS
// ==========================

import { deviceList, currentConfigData, updateConfigData, deviceCount, connectedDeviceCount, sensorCount, connectedSensorCount } from './globals.js';
import { sleep, getConnectedDevicesInfo, getConnectedSensorsInfo } from './utils.js';

// Fetch current system status information
function fetchStatusInfo() {
    const deviceInfo = getConnectedDevicesInfo();
    const sensorInfo = getConnectedSensorsInfo();
    
    return Promise.resolve({
        service_status: 'Running',
        connected_devices: deviceInfo.count,
        connected_sensors: sensorInfo.count,
        device_connection_class: deviceInfo.connectionClass,
        sensor_connection_class: sensorInfo.connectionClass,
        mqtt_status: 'Connected', // Default status
        last_updated: new Date().toLocaleTimeString()
    });

}

// Update the status display elements directly
export function updateStatusDisplay() {
    // Update device status
    const deviceStatusElement = document.getElementById('device-status');
    if (deviceStatusElement) {
        const deviceInfo = getConnectedDevicesInfo();
        deviceStatusElement.textContent = deviceInfo.count;
        deviceStatusElement.className = `status-value ${deviceInfo.connectionClass}`;
    }
    
    // Update sensor status
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

// Update sensor data and refresh status display
export function updateSensorData(data) {
    // Store data in globals for utils functions to use
    window.currentSensorData = data;
    updateStatusDisplay();
}

// Fetch the settings from the server
export function fetchSettings() {
    Promise.all([
        fetch('/get_settings').then(res => res.json()),
        fetchStatusInfo()
    ]).then(([configData, statusData]) => {
        // currentConfigData = configData;
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
        
        const statusSettings = document.getElementById('status-card-entries');
        const systemSettings = document.getElementById('system-card-entries');
        const pollingSettings = document.getElementById('polling-card-entries');
        const mqttSettings = document.getElementById('mqtt-card-entries');
        const webSettings = document.getElementById('webserver-card-entries'); 
        
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
        `;

        systemHtml = `
                <div class="settings-entry">
                    <label class="settings-label" for="max-log">Max Log Size (MB):</label>
                    <input type="number" id="max-log" value="${configData.max_log ?? ''}" min="1" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="max-readings">Max Sensor Readings:</label>
                    <input type="number" id="max-readings" value="${configData.max_readings ?? ''}" min="1" />
                </div>
        `;

        pollingHtml = `
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
        `;

        mqttHtml = `
                <div class="settings-entry">
                    <label class="settings-label" for="mqtt-broker">MQTT Broker Address:</label>
                <input type="text" id="mqtt-broker" value="${configData.mqtt_broker ?? ''}" placeholder="Broker address" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="mqtt-port">MQTT Broker Port:</label>
                    <input type="number" id="mqtt-port" value="${configData.mqtt_port ?? ''}" placeholder="Broker port" min="1" />
                </div>
        `;

        webHtml = `
                <div class="settings-entry">
                    <label class="settings-label" for="webserver-host">Host Address</label>
                    <input type="text" id="webserver-host" value="${configData.webserver_host ?? ''}" placeholder="Webserver address" />
                </div>
                <div class="settings-entry">
                    <label class="settings-label" for="webserver-port">Port</label>
                    <input type="text" id="webserver-port" value="${configData.webserver_port ?? ''}" placeholder="Webserver port" />
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
export function saveSettings(settingsSaveFlag) {
    let maxLog = currentConfigData.max_log ?? '';
    let maxReadings = currentConfigData.max_readings ?? '';
    let solarInterval = currentConfigData.poll_intervals.Solar ?? '';
    let windInterval = currentConfigData.poll_intervals.Wind ?? '';
    let batteryInterval = currentConfigData.poll_intervals.Battery ?? '';
    let mqttBroker = currentConfigData.mqtt_broker ?? '';
    let mqttPort = currentConfigData.mqtt_port ?? '';
    let webserverHost = currentConfigData.webserver_host ?? '';
    let webserverPort = currentConfigData.webserver_port ?? '';
    let deviceSettings = currentConfigData.devices ?? {};
    let cardName = '';

    if (settingsSaveFlag === 0) {
        // Save all settings
        maxLog = document.getElementById('max-log').value;
        maxReadings = document.getElementById('max-readings').value;
        solarInterval = document.getElementById('solar-interval').value;
        windInterval = document.getElementById('wind-interval').value;
        batteryInterval = document.getElementById('battery-interval').value;
        mqttBroker = document.getElementById('mqtt-broker').value;
        mqttPort = document.getElementById('mqtt-port').value;
        webserverHost = document.getElementById('webserver-host').value;
        webserverPort = document.getElementById('webserver-port').value;
        cardName = 'all';
    } else if (settingsSaveFlag === 1) {
        // Save only system settings
        maxLog = document.getElementById('max-log').value;
        maxReadings = document.getElementById('max-readings').value;
        cardName = 'system';
    } else if (settingsSaveFlag === 2) {
        // Save only polling settings
        solarInterval = document.getElementById('solar-interval').value;
        windInterval = document.getElementById('wind-interval').value;
        batteryInterval = document.getElementById('battery-interval').value;
        cardName = 'polling';
    } else if (settingsSaveFlag === 3) {
        // Save only MQTT settings
        mqttBroker = document.getElementById('mqtt-broker').value;
        mqttPort = document.getElementById('mqtt-port').value;
        cardName = 'mqtt';
    } else if (settingsSaveFlag === 4) {
        // Save only webserver settings
        webserverHost = document.getElementById('webserver-host').value;
        webserverPort = document.getElementById('webserver-port').value;
        cardName = 'webserver';
    } else if (settingsSaveFlag === 5) {
        // Save only device settings
        cardName = 'devices';
    
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
        .then(async () => {
            document.getElementById(`${cardName}-card-entries`).classList.add('hidden');
            document.getElementById(`${cardName}-action-message`).classList.remove('hidden');
            let resultHtml = document.getElementById(`${cardName}-save-result`);
            resultHtml.innerHTML = `Settings Saved Successfully`;
            await sleep(2000);  
            resultHtml.innerHTML = ``;
            document.getElementById(`${cardName}-action-message`).classList.add('hidden');
            document.getElementById(`${cardName}-card-entries`).classList.remove('hidden');
            window.socket.emit('sensor_update_request');
        });
    }
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
    document.getElementById('new-device-btn').classList.add('hidden');

    document.getElementById('device-config-complete').classList.add('hidden');

    // Cancel Device Config
    document.getElementById('device-config-cancel').addEventListener('click', () => {
        document.getElementById('device-config').classList.add('hidden');
        document.getElementById('device-config-save').classList.add('hidden');
        document.getElementById('device-config-cancel').classList.add('hidden');
        document.getElementById('new-device-btn').classList.remove('hidden');
        document.getElementById('device-card-content').classList.remove('hidden');
        document.getElementById('device-config-add').classList.remove('hidden');
    });

    // Save Device Config
    document.getElementById('device-config-save').addEventListener('click', () => {
        saveSettings(5); // Save only device settings
        document.getElementById('device-config').classList.add('hidden');
        document.getElementById('device-config-btns').classList.add('hidden');
        document.getElementById('device-card-content').classList.remove('hidden');
        document.getElementById('device-config-add').classList.remove('hidden');
    });
    
}

// New Device Config
export function openNewDeviceConfig() { 
    const newDeviceDiv = document.getElementById('new-device');
    newDeviceDiv.innerHTML = '';
    let newDeviceHtml = '';
    newDeviceHtml = `
        <div class="settings-entry">
            <label class="settings-label" for="new-device-name">Device Name:</label>
            <input type="text" placeholder="Enter device name" id="new-device-name" />
        </div>
        <div class="settings-entry">
            <label class="settings-label" for="new-remote-gpio">Enable Remote GPIO:</label>
            <input type="checkbox" id="new-remote-gpio" />
        </div>
        <div class="settings-entry">
            <label class="settings-label" for="new-gpio-address">GPIO Address:</label>
            <input type="text" placeholder="GPIO address" id="new-gpio-address" />
        </div>
    `;
    
    newDeviceDiv.innerHTML = newDeviceHtml;

    document.getElementById('new-device-cancel').addEventListener('click', () => {
        document.getElementById('new-device').classList.add('hidden');
        document.getElementById('device-config-btns').classList.remove('hidden');
        document.getElementById('new-device-save').classList.add('hidden');
        document.getElementById('new-device-cancel').classList.add('hidden');
        document.getElementById('new-device-btn').classList.remove('hidden');
        document.getElementById('device-card-content').classList.remove('hidden');

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
}
// Restart Application
export async function restartApplication() {
    try {
        document.getElementById("restart-action").classList.add("hidden");
        document.getElementById("restart-confirmation").classList.add("hidden");
        document.getElementById("restart-message").classList.remove("hidden");
        document.getElementById("restart-message").innerHTML = "<label class=\"settings-label restart-message\">Restarting...</label>";
        await sleep(3000); // brief pause to show restarting message
        const res = await fetch("/restart", { method: "POST" });
        if (res.ok) {
            document.getElementById("restart-message").innerHTML = "";
            document.getElementById("restart-message").innerHTML = "<label class=\"settings-label restart-message\">Successfully Restarted</label>";
            await sleep(2000); // pause for 2 seconds
            document.getElementById("restart-action").classList.remove("hidden");
            document.getElementById("restart-confirmation").classList.add("hidden");
            document.getElementById("restart-message").classList.add("hidden");
            document.getElementById("restart-action-btns").classList.add("hidden");
        } else {
             document.getElementById("dialog-card-content").innerHTML += "<p>Failed To Restart Service</p>";
            document.getElementById("restart-message").innerHTML = "<p>Failed To Restart</p><p>Check logs for errors.</p>";
            await sleep(2000); // pause for 2 seconds
            document.getElementById("restart-action").classList.remove("hidden");
            document.getElementById("restart-message").classList.add("hidden");
            document.getElementById("restart-confirmation").classList.add("hidden");
            document.getElementById("restart-action-btns").classList.add("hidden");
        }
    } 
    catch (err) {
        document.getElementById("restart-message").innerHTML = "<p>Error restarting</p><p>" + err.message + "</p>";
    }
}


// Backup Management Functions
// Fetch and Display Backups
export function fetchBackups() {
    const backupContent = document.getElementById('config-file-selection');
    backupContent.innerHTML = '';
    fetch('/list_backups')
        .then(response => response.json())
        .then(data => {
            const files = data.backups;
            if (!files || files.length === 0) {
                backupContent.innerHTML = '<p>No backup files found.</p>';
                return;
            }
            files.forEach(filename => {
                const displayName = filename.replace(/\.json$/, '');
                const row = document.createElement('div');
                row.className = 'settings-entry';
                row.id = `backup-entry-${displayName}`;
                const nameDiv = document.createElement('div');
                nameDiv.className = 'settings-label';
                nameDiv.innerText = displayName;
                const actionDiv = document.createElement('div');
                actionDiv.className = 'settings-action';
                const deleteIcon = document.createElement('i');
                deleteIcon.className = 'fa-solid fa-trash';
                deleteIcon.title = 'Delete Config File';
                deleteIcon.setAttribute('data-filename', filename);
                deleteIcon.addEventListener('click', () => {
                    deleteBackupConfirmation(filename);
                });
                const restoreIcon = document.createElement('i');
                restoreIcon.className = 'fa-solid fa-file-import';
                restoreIcon.title = 'Restore Config File';
                restoreIcon.setAttribute('data-filename', filename);
                restoreIcon.addEventListener('click', () => {
                    restoreBackupConfirmation(filename);
                });
                actionDiv.appendChild(deleteIcon);
                actionDiv.appendChild(restoreIcon);
                row.appendChild(nameDiv);
                row.appendChild(actionDiv);
                
                backupContent.appendChild(row);
            });
        });
}

// Delete Backup Confirmation
export function deleteBackupConfirmation(filename) {
    document.getElementById('config-file-selection').classList.add('hidden');
    document.getElementById('delete-config-confirmation').classList.remove('hidden');
    document.getElementById('config-action-btns').classList.remove('hidden');
    document.getElementById('delete-config-cancel').classList.remove('hidden');
    document.getElementById('delete-config-confirm').classList.remove('hidden');
    const confirmDeleteHtml = document.getElementById('delete-file-name');
    confirmDeleteHtml.innerHTML = `${filename}`;

    // Confirm Delete Handler
    document.getElementById('delete-config-confirm').addEventListener('click', () => {
        document.getElementById('delete-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.remove('hidden');
        document.getElementById('delete-config-cancel').classList.add('hidden');
        document.getElementById('delete-config-confirm').classList.add('hidden');
        document.getElementById('config-action-message').classList.remove('hidden');
        document.getElementById('config-action-complete').classList.remove('hidden');

        deleteBackup(filename);
    });
}

// Restore Backup Confirmation
export function restoreBackupConfirmation(filename) {
    document.getElementById('restore-config-confirmation').classList.remove('hidden');
    document.getElementById('config-action-btns').classList.remove('hidden');
    document.getElementById('restore-config-cancel').classList.remove('hidden');
    document.getElementById('restore-config-confirm').classList.remove('hidden');
    const confirmRestoreHtml = document.getElementById('restore-file-name');
    confirmRestoreHtml.innerHTML = `${filename}`;

    // Confirm Restore Handler
    document.getElementById('restore-config-confirm').addEventListener('click', () => {
        document.getElementById('delete-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.remove('hidden');
        document.getElementById('restore-config-cancel').classList.add('hidden');
        document.getElementById('restore-config-confirm').classList.add('hidden');
        document.getElementById('config-action-message').classList.remove('hidden');
        document.getElementById('config-action-complete').classList.remove('hidden');
        restoreBackup(filename);
    });
}

// Create Backup
export function createBackup() {
    const programConfig = document.getElementById('program-config').checked ? 1 : 0;
    const sensorConfig = document.getElementById('sensor-config').checked ? 1 : 0;
    const backupMsg = document.getElementById('backup-result');
    fetch('/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programConfig, sensorConfig })
    })
    .then(response => response.json())
    .then(data => {
          const backupMsg = document.getElementById('backup-result');
        if (data.success) {
            backupMsg.innerHTML = 'Backup created successfully!';
        } else {
            backupMsg.innerHTML = 'Backup failed: ' + (data.error || 'Unknown error');
        }
    })
    .catch(error => {
        backupMsg.innerHTML = 'Backup failed: Network error';
        console.error('Backup error:', error);
    });
}

// Delete Backup
export function deleteBackup(filename) {
    fetch('/delete_backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    })
        .then(res => res.json())
        .then(() => {
            document.getElementById('config-action-result').innerHTML = 'Backup file deleted successful';
        })
        .catch(error => {
            document.getElementById('config-action-result').innerText = 'Failed to delete Backup.';
            console.error('Error restoring Backup:', error);
        });
}

// Restore Backup
export async function restoreBackup(filename) {
    document.getElementById('restore-config-confirmation').classList.add('hidden');
    document.getElementById('config-action-message').classList.remove('hidden');
    const restoreResult = document.getElementById('config-action-result');
    restoreResult.innerHTML = 'Restoring backup...';
    const restoreConfig = confirm('Restore config.json?');
    const restoreSensors = confirm('Restore sensors.json?');
    const res = await fetch('restore_backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, restore_config: restoreConfig, restore_sensors: restoreSensors })
    });
    const result = await res.json();
    restoreResult.innerHTML = '';
    if (result.success) {
        restoreResult.innerHTML = 'Restore successful. Please reload or restart the app.';
    } else {
        restoreResult.innerHTML = 'Restore failed: ' + result.error;
        
    }
}
