// =======================
// Energy Monitor Main JS
// =======================

// --- Global Variables ---
const socket = io({ reconnection: true });
let devices = {};
let paused = false;
let undoTimers = {};
let isRemoteGpio = false;

// --- DOMContentLoaded: Initial Setup ---
document.addEventListener("DOMContentLoaded", () => {
    fetch("/get_settings")
        .then(res => res.json())
        .then(data => {
            devices = data.devices || {};
            remoteCount = 0;
            for (const device of Object.values(devices)) { 
                console.log(`Device loaded: ${device.id} - ${device.name}`);
                if (device.remote_gpio === 1) {
                    remoteCount++;
                }
            }
            console.log(`Total remote GPIO devices: ${remoteCount}`);
            if (remoteCount > 0) {
                isRemoteGpio = true;
            }
            updateAddSensorVisibility();
            
        });

    setupEventHandlers();

    socket.on("connect", () => {
        console.log("Socket Connected:", socket.id);
    });

    socket.on("sensor_update", handleSensorUpdate);
});

// --- Event Handler Setup ---
function setupEventHandlers() {
    // Header buttons

    // Add Sensor
    document.getElementById("add-sensor-btn").addEventListener("click", () => {
        document.getElementById("add-sensor-container").classList.remove("hidden");
    });
    document.getElementById("add-sensor-cancel").addEventListener("click", () => {
        document.getElementById("add-sensor-container").classList.add("hidden");
    });
    document.getElementById("add-sensor-save").addEventListener("click", addSensor);


    // Settings
    document.getElementById("settings-btn").addEventListener("click", () => {
        document.getElementById("settings-container").classList.remove("hidden");
        getSettings();
    });
    document.getElementById("settings-cancel").addEventListener("click", () => {
        document.getElementById("settings-container").classList.add("hidden");
    });
    document.getElementById("settings-restart").addEventListener("click", () => {
        document.getElementById("settings-container").classList.add("hidden");
        document.getElementById("restart-container").classList.remove("hidden");
        restartConfirmation();
    });
    document.getElementById("settings-backup").addEventListener("click", () => {
        document.getElementById("settings-container").classList.add("hidden");
        document.getElementById("backup-restore-container").classList.remove("hidden");
        document.getElementById("backup-config-card").classList.remove("hidden");
        
    });
    document.getElementById("settings-restore").addEventListener("click", () => {
        document.getElementById("settings-container").classList.add("hidden");
        document.getElementById("backup-restore-container").classList.remove("hidden");
        document.getElementById("restore-config-card").classList.remove("hidden");
        loadBackups() ;
    });
    document.getElementById("settings-save").addEventListener("click", saveSettings);

    // Backup Configuration
    document.getElementById("backup-config-cancel").addEventListener("click", () => {
    document.getElementById("backup-restore-container").classList.add("hidden");
    document.getElementById("settings-container").classList.remove("hidden");
    document.getElementById("backup-config-card").classList.add("hidden");
    document.getElementById("backup-config-data").classList.remove("hidden");
    document.getElementById("backup-config-btns").classList.remove("hidden");
    document.getElementById("backup-config-text").innerHTML = '<p>Choose which configuration files you want to include in your backup</p>';
    document.getElementById("program-config").checked = true;
    document.getElementById("sensor-config").checked = true;
    });
    document.getElementById("backup-config-save").addEventListener("click", backupConfig);

    

    // Restore Configuration
    document.getElementById("restore-config-cancel").addEventListener("click", () => {
    document.getElementById("backup-restore-container").classList.add("hidden");
    document.getElementById("settings-container").classList.remove("hidden");
    document.getElementById("restore-config-card").classList.add("hidden");
    
    });
    

    // About
    document.getElementById("about-btn").addEventListener("click", () => {
        document.getElementById("about-container").classList.remove("hidden");
        getAbout();
    });
    document.getElementById("about-cancel").addEventListener("click", () => {
        document.getElementById("about-container").classList.add("hidden");
    });

    document.getElementById("restart-cancel").addEventListener("click", () => {
        document.getElementById("restart-container").classList.add("hidden");
    });
    document.getElementById("restart-save").addEventListener("click", restartProgram);

    // Log file
    document.getElementById("log-file-btn").addEventListener("click", () => {
        document.getElementById("log-file-container").classList.remove("hidden");
        getLogFile();
    });
    document.getElementById("log-file-cancel").addEventListener("click", () => {
        document.getElementById("log-file-container").classList.add("hidden");
    });
    document.getElementById("log-file-refresh").addEventListener("click", () => {
        getLogFile();
    });
    
}

// --- Sensor Update Handler ---
function handleSensorUpdate(data) {
    socket.emit("sensor_update_request");
    if (paused) return;
    updateHeaderTotals(data.totals);

    const container = document.getElementById("sensor-container");
    container.innerHTML = "";

    if (Object.keys(data).length === 0) {
        document.getElementById("no-sensors").classList.remove("hidden");
        return;
    }

    for (let [name, sensor] of Object.entries(data)) {
        const typeClass = sensor.type === "Solar" ? "type-Solar" :
            sensor.type === "Wind" ? "type-Wind" : "type-Battery";
        const card = document.createElement("div");
        card.className = "sensor-card";
        card.id = `card-${name}`;

        const maxPower = sensor.max_power ?? "";
        const rating = sensor.rating ?? "";
        const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
        
        const logHTML = generateLogHTML(sensor.data.readings ?? []);
        const i2cDisabled = isRemoteGpio ? "" : "disabled";
        const batteryState = sensor.data.status ?? "";
        let deviceName  = "Default Device"
        let remoteGpio = 0;
        let deviceID = 0;


            // set device information
        for (const device of Object.values(devices)) {
            if (device.id === sensor.device_id) {
                console.log(`Matched device for ${name}: ${device.id}`);
                deviceID = device.id;
                deviceName = device.name || `Device ${device.id}`;
                remoteGpio = device.remote_gpio;
                break;
            }
        }
     
        // Update the battery state if applicable
        if (sensor.type === "Battery") {

            // Add current state class
            if (batteryState == "charging") {
                iconClass = "battery-charging";
            } else if (batteryState == "discharging") {
                iconClass = "battery-discharging";
            } else if (batteryState == "idle") {
                iconClass = "battery-idle" ;
            } else {
                iconClass = "battery-offline";
            }
        }

        // Set type icon class
        if (sensor.type === "Solar") {
            iconType = "fa-solar-panel";
        } else if (sensor.type === "Wind") {
            iconType = "fa-wind";
        } else if (sensor.type === "Battery") {
            iconType = "fa-car-battery";
        } 

       

        let content = `
            <div class="sensor-header">
            <div class="sensor-header-left">
                <span id="${name}-gpio-status" class="sensor-gpio-status"></span>
                <span class="sensor-icon"><i class="fa-solid ${iconType}"></i></span>
                <span class="sensor-name name-${typeClass}">${name}</span> 
            </div>
                <div class="type-edit-container" id="btns-${name}">
                    <i class="fa-solid fa-book log-btn" data-name="${name}" title="Log"></i>
                    <i class="fa-solid fa-gear edit-btn" data-name="${name}" title="Edit"></i>
                </div>
            </div>
            <div id="view-${name}">
                <div class="sensor-readings">
                    <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                        <span class="icon"><i class="fa-solid fa-wave-square"></i></span>
                        <p class="voltage">${sensor.data.voltage ?? "N/A"} V</p>
                    </div>
                    <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                        <span class="icon"><i class="fa-solid fa-industry"></i></span>
                        <p class="current">${sensor.data.current ?? "N/A"} A</p>
                    </div>
                    <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                        <span class="icon"><i class="fa-solid fa-bolt"></i></span>
                        <p class="power">${sensor.data.power ?? "N/A"} W</p>
                    </div>
                    ${sensor.type === "Battery" ? `
                        <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                            <span class="icon"><i class="fa-solid fa-battery ${iconClass}" id="battery-icon"></i></span>
                            <p class="soc">${sensor.data.state_of_charge ?? 0}% </p>
                        </div>
                    </div>` : `
                        <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                            <span class="icon"><i class="fa-solid fa-plug"></i></span>
                            <p class="output">${sensor.max_power ?? 0} W</p>
                        </div>
                    </div>`}
                    <div class="timestamp" id="timestamp-${name}">Last Updated: ${sensor.data.time_stamp}</div>
                </div>
            </div>
            <div id="edit-${name}" class="edit-form hidden">
                <div class="sensor-edit-header">
                    <div class="back-btn">
                        <i class="fa-solid fa-arrow-left edit-back-btn" data-name="${name}" title="Back"></i>
                    </div>
                    <h4>Edit Sensor</h4>
                    <div class="sensor-btns">
                        <i class="fa-solid fa-trash delete-btn" data-name="${name}" title="Delete"></i>
                        <i class="fa-solid fa-save save-btn" data-name="${name}" title="Save"></i>
                    </div>
                </div>
                <div class="edit-data">
                    <div class="edit-entry">
                        <label>Name:</label>
                        <input type="text" id="name-${name}" value="${name}">
                    </div>
                    <div class="edit-entry">
                        <label>Type:</label>
                        <select id="type-${name}">
                            <option value="Solar" ${sensor.type === "Solar" ? "selected" : ""}>Solar</option>
                            <option value="Wind" ${sensor.type === "Wind" ? "selected" : ""}>Wind</option>
                            <option value="Battery" ${sensor.type === "Battery" ? "selected" : ""}>Battery</option>
                        </select>
                    </div>
                    <div class="edit-entry">
                        <label>Max Power:</label>
                        <input type="number" id="maxPower-${name}" value="${maxPower}">
                    </div>
                    <div class="edit-entry">
                        <label>Voltage Rating:</label>
                        <input type="number" id="rating-${name}" value="${rating}">
                    </div>
                    <div class="edit-entry">
                        <label>i2c Address:</label>
                        <input type="text" id="address-${name}" value="${hexAddress}" ${i2cDisabled}>
                    </div>
                    <div class="edit-entry">
                        <label>Device:</label>
                        <input type="text" id="device-${name}" value="${deviceName}" disabled>
                        <input type="text" id="device-id-${name}" value="${deviceID}" hidden>
                    </div>
                </div>
            </div>
            <div id="log-${name}" class="log-data hidden">
                <div class="sensor-log-header">
                    <div class="back-btn">
                        <i class="fa-solid fa-arrow-left log-back-btn" data-name="${name}" title="Back"></i>
                    </div>
                    <h4>Readings</h4>
                    <div class="sensor-btns">
                        <i class="fa-solid fa-sync-alt refresh-log-btn" data-name="${name}" title="Refresh"></i>
                    </div>
                </div>
                <div class="log-entries" id="log-entries-${name}">
                    ${logHTML}
                </div>
            </div>
            <div id="delete-${name}" class="delete-confirmation hidden">
                <h3 class="confirm">Confirm delete?</h3>
                <div class="edit-buttons">
                    <i class="fa-solid fa-check confirm-delete-btn" data-name="${name}" title="Yes"></i>
                    <i class="fa-solid fa-xmark cancel-delete-btn" data-name="${name}" title="No"></i>
                </div>
            </div>
            <div id="undo-${name}" class="countdown hidden">
                <p>Deleting in <span id="countdown-${name}">5</span> seconds...</p>
                <div class="edit-buttons">
                    <i class="fa-solid fa-undo undo-btn" data-name="${name}" title="Undo"></i>
                </div>
            </div>
        `;
        

        card.innerHTML = content;
        container.appendChild(card);

        // Update the GPIO status badge
        updateSensorGpioStatus(name, remoteGpio, deviceName);

        // Attach event listeners for dynamic buttons
        card.querySelector(".log-btn").addEventListener("click", () => openLog(name));
        card.querySelector(".edit-btn").addEventListener("click", () => enterEditMode(name));
        card.querySelector(".edit-back-btn").addEventListener("click", () => cancelEdit(name));
        card.querySelector(".save-btn").addEventListener("click", () => saveSensor(name));
        card.querySelector(".delete-btn").addEventListener("click", () => showDeleteConfirmation(name));
        card.querySelector(".log-back-btn").addEventListener("click", () => closeLog(name));
        card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name));
        card.querySelector(".confirm-delete-btn").addEventListener("click", () => startCountdown(name));
        card.querySelector(".cancel-delete-btn").addEventListener("click", () => cancelDelete(name));
        card.querySelector(".undo-btn").addEventListener("click", () => undo(name));
        card.querySelector(".edit-back-btn").addEventListener("click", () => cancelEdit(name));
        card.querySelector(".save-btn").addEventListener("click", () => saveSensor(name));
        card.querySelector(".delete-btn").addEventListener("click", () => showDeleteConfirmation(name));
        card.querySelector(".log-back-btn").addEventListener("click", () => closeLog(name));
        card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name));
    }
}

function addSensor() {
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

// --- GPIO Status Badge ---

function updateSensorGpioStatus(name, remoteGpio, deviceName) {
    let gpioStatusSpan = document.getElementById(`${name}-gpio-status`);
    console.log(`Updating GPIO status for ${name}: ${remoteGpio} on device ${deviceName}`);
    let html = '';
    if (remoteGpio === 1) {
        html = `<i class="fa-solid fa-wifi" title="${deviceName}"></i>`;
        gpioStatusSpan.classList.add("remote");
    } else {
        html = `<i class="fa-solid fa-network-wired" title="${deviceName}"></i>`;
        gpioStatusSpan.classList.add("local");
    }
    gpioStatusSpan.innerHTML = html;

}

function updateGpioStatus() {
    const statusSpan = document.getElementById("gpio-status");
    if (isRemoteGpio) {
        statusSpan.innerHTML = '<i class="fa-solid fa-wifi" title="Remote GPIO"></i>';
        statusSpan.className = "gpio-status remote";
    } else {
        statusSpan.innerHTML = '<i class="fa-solid fa-network-wired" title="Local GPIO"></i>';
        statusSpan.className = "gpio-status local";
    }
    updateAddSensorVisibility();
}

function updateAddSensorVisibility() {
    const addBtn = document.getElementById("add-sensor-btn");
    if (isRemoteGpio) {
        addBtn.classList.remove("hidden");
        console.log("Remote GPIO enabled, showing Add Sensor button");
    } else {
        addBtn.classList.add("hidden");
        document.getElementById("add-sensor-container").classList.add("hidden");
        console.log("Remote GPIO disabled, hiding Add Sensor button");
    }
}

function updateHeaderTotals(data) {
    const dataContainer = document.getElementById("header-totals");
    if (!dataContainer) {
        console.error("Header totals container not found");
        return;
    }
    const batteryNet = data.battery_in_total - data.battery_out_total;
    let html = `
        <span class="totals-data" title="Solar Total"><i class="fa-solid fa-solar-panel"></i><span class="totals-text"> ${data.solar_total.toFixed(1)}W</span></span>
        <span class="totals-data" title="Wind Total"><i class="fa-solid fa-wind"></i><span class="totals-text"> ${data.wind_total.toFixed(1)}W</span></span>
    `;
    if (data.battery_soc_total < 5) {
        html += `<span class="totals-data battery-empty" title="Total SoC"><i class="fa-solid fa-car-battery"></i><span class="totals-text"> ${data.battery_soc_total.toFixed(0)}%</span></span>`;
    } else if (data.battery_soc_total < 25) {
        html += `<span class="totals-data battery-low" title="Total SoC"><i class="fa-solid fa-car-battery"></i><span class="totals-text"> ${data.battery_soc_total.toFixed(0)}%</span></span>`;
    } else if (data.battery_soc_total < 50) {
        html += `<span class="totals-data battery-medium" title="Total SoC"><i class="fa-solid fa-car-battery"></i><span class="totals-text"> ${data.battery_soc_total.toFixed(0)}%</span></span>`;
    } else if (data.battery_soc_total < 75) {
        html += `<span class="totals-data battery-high" title="Total SoC"><i class="fa-solid fa-car-battery"></i><span class="totals-text"> ${data.battery_soc_total.toFixed(0)}%</span></span>`;
    } else {
        html += `<span class="totals-data battery-full" title="Total SoC"><i class="fa-solid fa-car-battery"></i><span class="totals-text"> ${data.battery_soc_total.toFixed(0)}%</span></span>`;
    }
    
    if (batteryNet > 0) {
        html += `<span class="totals-data battery-charging" title="Battery In"><i class="fa-solid fa-arrow-down"></i><span class="totals-text"> ${data.battery_in_total.toFixed(1)}W</span></span>`;
    } else if (batteryNet < 0) {
        html += `<span class="totals-data battery-discharging" title="Battery Out"><i class="fa-solid fa-arrow-up"></i><span class="totals-text"> ${data.battery_out_total.toFixed(1)}W</span></span>`;
    } else if (batteryNet == 0) {
        html += `<span class="totals-data battery-idle" title="Battery Idle"><i class="fa-solid fa-pause"></i><span class="totals-text"> Idle</span></span>`;
    }
    dataContainer.innerHTML = html;
}



// --- Sensor Edit Functions ---
function enterEditMode(name) {
    paused = true;
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`timestamp-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

function cancelEdit(name) {
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    document.getElementById(`timestamp-${name}`).classList.remove("hidden");
    document.getElementById(`edit-${name}`).classList.add("hidden");
    paused = false;
}

function saveSensor(originalName) {
    const newName = document.getElementById(`name-${originalName}`).value;
    const newType = document.getElementById(`type-${originalName}`).value;
    const maxPower = document.getElementById(`maxPower-${originalName}`).value;
    const rating = document.getElementById(`rating-${originalName}`).value;
    const hexAddress = document.getElementById(`address-${originalName}`).value;
    const deviceID = document.getElementById(`device-id-${originalName}`).value;
    const address = parseInt(hexAddress, 16);

    fetch("/update_sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            original_name: originalName,
            name: newName,
            type: newType,
            max_power: maxPower,
            rating: rating,
            address: address,
            device_id: deviceID
        })
    })
        .then(res => res.json())
        .then(() => {
            paused = false;
            socket.emit("sensor_update_request");
        });

    cancelEdit(originalName);
}

// --- Settings Functions ---
function getSettings() {
    fetch("/get_settings")
        .then(res => res.json())
        .then(data => {
            document.getElementById("solar-interval").value = data.poll_intervals.Solar ?? "";
            document.getElementById("wind-interval").value = data.poll_intervals.Wind ?? "";
            document.getElementById("battery-interval").value = data.poll_intervals.Battery ?? "";
            document.getElementById("max-log").value = data.max_log ?? "";
            document.getElementById("max-readings").value = data.max_readings ?? "";
            document.getElementById("mqtt-broker").value = data.mqtt_broker ?? "";
            document.getElementById("mqtt-port").value = data.mqtt_port ?? "";
            document.getElementById("webserver-host").value = data.webserver_host ?? "";
            document.getElementById("webserver-port").value = data.webserver_port ?? "";
            // document.getElementById("remote-gpio").checked = data.remote_gpio == 1;
            // document.getElementById("gpio-address").value = data.gpio_address ?? "";

            // Add device information
            const deviceSettings = document.getElementById("devices-settings");
            deviceSettings.innerHTML = ""; // Clear previous entries
            let html = "";
            // Loop through devices and create settings entries
            // If remote GPIO is enabled, disable the input field
            for (const device of Object.values(devices)) {
                const checked = device.remote_gpio === 1 ? "checked" : "";
                const disabled = device.remote_gpio === 1 ? "disabled" : "";
                
                html += `
                    <h5> -- Device ID: ${device.id}</h5>
                    <div class="settings-entry">
                        <label for="device-name">Device Name:</label>
                        <input type="text" class="gpio-address-${device.id}" id="device-name" value="${device.name}"/>
                     </div>
                    <div class="settings-entry">
                        <label for="remote-gpio">Remote GPIO:</label>
                        <input type="checkbox" class="gpio-checkbox-${device.id}" id="remote-gpio" ${checked}/>
                    </div>
                    <div class="settings-entry">
                        <label for="gpio-address">GPIO Address:</label>
                        <input type="text" class="gpio-address-${device.id}" id="gpio-address" value="${device.gpio_address}" ${disabled}/>
                    </div>
                `;

            } 
            deviceSettings.innerHTML = html;
            

            // Enable/disable remote GPIO based on checkbox
            for (const device of Object.values(devices)) {
                const remoteGpioCheckbox = document.querySelector(`.gpio-checkbox-${device.id}`);
                const i2cInput = document.querySelector(`.gpio-address-${device.id}`);
                if (remoteGpioCheckbox) {
                    remoteGpioCheckbox.addEventListener("change", function () {
                        i2cInput.disabled = !this.checked;
                    });
                    // Set initial state
                    i2cInput.disabled = !remoteGpioCheckbox.checked;
                }
            }

            // isRemoteGpio = data.remote_gpio == 1;
            // updateGpioStatus();

            // // Enable/disable i2c address input based on remote gpio
            // const i2cInput = document.getElementById("gpio-address");
            // const remoteGpioCheckbox = document.getElementById("remote-gpio");
            // i2cInput.disabled = !remoteGpioCheckbox.checked;
            // remoteGpioCheckbox.addEventListener("change", function () {
            //     i2cInput.disabled = !this.checked;
            // });
        });
}

function saveSettings() {
    const maxLog = document.getElementById("max-log").value;
    const solarInterval = document.getElementById("solar-interval").value;
    const windInterval = document.getElementById("wind-interval").value;
    const batteryInterval = document.getElementById("battery-interval").value;
    const maxReadings = document.getElementById("max-readings").value;
    const mqttBroker = document.getElementById("mqtt-broker").value;
    const mqttPort = document.getElementById("mqtt-port").value;
    const webserverHost = document.getElementById("webserver-host").value;
    const webserverPort = document.getElementById("webserver-port").value;
    // const remoteGpio = document.getElementById("remote-gpio").checked ? 1 : 0;
    // const gpioAddress = document.getElementById("gpio-address").value;

    const deviceSettings = {};
    for (const device of Object.values(devices)) {
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


    fetch("/update_settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            // remote_gpio: remoteGpio,
            // gpio_address: gpioAddress,
            devices: deviceSettings
        })
    })
        .then(res => res.json())
        .then(() => {
            socket.emit("sensor_update_request");
        });

    // updateEditFormI2CInputs();
    // updateSensorGpioStatus(name, remoteGpio, deviceName)
    // updateGpioStatus();
    document.getElementById("settings-container").classList.add("hidden");
}

function updateEditFormI2CInputs() {
    document.querySelectorAll('input[id^="address-"]').forEach(input => {
        input.disabled = !isRemoteGpio;
    });
}


function backupConfig() {
    const programConfig = document.getElementById("program-config").checked ? 1 : 0;
    const sensorConfig = document.getElementById("sensor-config").checked ? 1 : 0;
    const backupMsg = document.getElementById("backup-config-text");

    fetch("/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            programConfig: programConfig,
            sensorConfig: sensorConfig,
        })
    })
       
    document.getElementById("backup-config-data").classList.add("hidden");
    document.getElementById("backup-config-btns").classList.add("hidden");
    backupMsg.innerHTML = '<p>Backup Successful</p>';

}

function restoreConfig() {

    const configFile = document.getElementById("restore-config-file").value;

    fetch("/restore_backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            configFile: programConfig,
        })
    })
        .then(res => res.json())
        .then(() => {
            document.getElementById("restore-config-data").innerHTML = "Restore Successful" ;
        })

        .catch(error => {
            document.getElementById("restore-config-data").innerText = "Failed to restore Backup.";
            console.error("Error restoring Backup:", error);
        });

}

function loadBackups() {
    const backupContainer = document.getElementById("restore-config-entries");
    backupContainer.innerHTML = ""; // clear previous entries

    fetch("/list_backups")
        .then(response => response.json())
        .then(data => {
            const files = data.backups;  // ✅ access the actual list

            if (!files || files.length === 0) {
                backupContainer.innerHTML = "<p>No backup files found.</p>";
                return;
            }

            files.forEach(filename => {
                const displayName = filename.replace(/\.json$/, ""); // Clean display
                const row = document.createElement("div");
                row.className = "restore-config-entry";

                const nameDiv = document.createElement("div");
                nameDiv.className = "restore-config-file-name";
                nameDiv.innerText = displayName;

                const deleteIcon = document.createElement("i");
                deleteIcon.className = "fas fa-trash";
                deleteIcon.title = "Delete";
                deleteIcon.setAttribute("data-filename", filename);
                deleteIcon.addEventListener("click", () => {
                    confirmDeleteBackup(filename);
                });

                const restoreIcon = document.createElement("i");
                restoreIcon.className = "fas fa-file-import";
                restoreIcon.title = "Restore";
                restoreIcon.setAttribute("data-filename", filename);
                restoreIcon.addEventListener("click", () => {
                    confirmRestoreBackup(filename);
                });

                row.appendChild(nameDiv);
                row.appendChild(deleteIcon);
                row.appendChild(restoreIcon);
                backupContainer.appendChild(row);
            });
        });
}

function confirmRestoreBackup(filename) {
    const confirmText = document.getElementById("restore-config-text")
    confirmText.innerHTML = "";
    confirmText.innerHTML = `        
        <div class="restore-config-text" id="restore-config-text">
        <p>Are you sure you want to restore "${filename}"?</p>
        </div>
        `;

    
    const confirmDiv = document.getElementById("restore-config-entries")
    confirmDiv.innerHTML = "";
    confirmDiv.innerHTML = `
        <div class="confirm-btns">
        <i class="fas fa-xmark" id="cancel-restore" title="Cancel"></i>
        <i class="fas fa-check" id="confirm-restore" title="Delete"></i>
        </div>
        `;

    
    document.getElementById("cancel-restore").addEventListener("click", () => {
        loadBackups();
    });
    document.getElementById("confirm-restore").addEventListener("click", () => {
        restoreBackup(filename);
    });

}

async function restoreBackup(filename) {
    const restoreConfig = confirm("Restore config.json?");
    const restoreSensors = confirm("Restore sensors.json?");

    const res = await fetch('restore_backup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            filename,
            restore_config: restoreConfig,
            restore_sensors: restoreSensors
        })
    });

    const result = await res.json();
    if (result.success) {
        alert("Restore successful. Please reload or restart the app.");
    } else {
        alert("Restore failed: " + result.error);
    }
}

function confirmDeleteBackup(filename) {
    const confirmText = document.getElementById("restore-config-text")
    confirmText.innerHTML = "";
    confirmText.innerHTML = `        
        <div class="restore-config-text" id="restore-config-text">
        <p>Are you sure you want to delete "${filename}"?</p>
        </div>
        `;

    const confirmDiv = document.getElementById("restore-config-entries")
    confirmDiv.innerHTML = "";
    confirmDiv.innerHTML = `
        <div class="confirm-btns">
        <i class="fas fa-xmark" id="cancel-delete" title="Cancel"></i>
        <i class="fas fa-check" id="confirm-delete" title="Delete"></i>
        </div>
        `;

    
    document.getElementById("cancel-delete").addEventListener("click", () => {
        confirmText.innerHTML = 
        loadBackups();
    });
    document.getElementById("confirm-delete").addEventListener("click", () => {
        deleteBackup(filename);
    });

}

function deleteBackup(filename) {

    fetch('/delete_backup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ filename })
    })
        .then(res => res.json())
        .then(() => {
            document.getElementById("restore-config-entries").innerHTML = "Backup file deleted successful" ;
        })

        .catch(error => {
            document.getElementById("restore-config-data").innerText = "Failed to delete Backup.";
            console.error("Error restoring Backup:", error);
        });
        }

// --- About/README Functions ---
function getAbout() {
    fetch("/readme")
        .then(res => res.text())
        .then(markdown => {
            document.getElementById("about-content").innerHTML = marked.parse(markdown);
        })
        .catch(error => {
            document.getElementById("about-content").innerText = "Failed to load README.";
            console.error("Error loading README:", error);
        });
}

// --- Log Functions ---
function generateLogHTML(readings) {
    if (!Array.isArray(readings) || readings.length === 0) {
        return '<p>No logs available.</p>';
    }
    return readings.slice().reverse().map(reading => `
        <div class="log-entry">
            <p>
                <strong>${reading.time_stamp ?? ''}</strong>
            </p>
            <p class="reading-details">
                <strong>V:</strong> ${reading.voltage ?? 'N/A'} V | 
                <strong>C:</strong> ${reading.current ?? 'N/A'} A | 
                <strong>P:</strong> ${reading.power ?? 'N/A'} W | 
                <strong>T:</strong> ${reading.output ?? reading.state_of_charge}
            </p>
        </div>
    `).join('');
}

function getLogFile() {

    const logContainer = document.getElementById("log-file-entries");
    // logContainer.innerHTML = "<p>Loading logs...</p>";

    

    fetch("/get_log_file")
        .then(res => res.json())
        .then(data => {
            const logEntries = data.logs ?? [];
            if (logEntries.length === 0) {
                logContainer.innerHTML = "<p>No log data found.</p>";
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
            logContainer.innerHTML = "<p>Failed to load logs.</p>";
            console.error("Log fetch error:", error);
        });
}


// --- Sensor Log Functions ---
function openLog(name) {
    paused = true;
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`log-${name}`).classList.remove("hidden");
}

function closeLog(name) {
    document.getElementById(`log-${name}`).classList.add("hidden");
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    paused = false;
}

function refreshLog(name) {
    fetch(`/get_sensor_log?name=${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
            const logHTML = generateLogHTML(data.readings ?? []);
            document.getElementById(`log-entries-${name}`).innerHTML = logHTML;
        })
        .catch(error => {
            document.getElementById(`log-entries-${name}`).innerHTML = "<p>Failed to load logs.</p>";
            console.error("Error refreshing logs:", error);
        });
}

// --- Sensor Delete Functions ---
function showDeleteConfirmation(name) {
    document.getElementById(`edit-${name}`).classList.add("hidden");
    document.getElementById(`delete-${name}`).classList.remove("hidden");
}

function cancelDelete(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

function startCountdown(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`undo-${name}`).classList.remove("hidden");

    let counter = 5;
    document.getElementById(`countdown-${name}`).textContent = counter;

    undoTimers[name] = setInterval(() => {
        counter--;
        if (counter >= 0) {
            document.getElementById(`countdown-${name}`).textContent = counter;
        }
        if (counter <= 0) {
            clearInterval(undoTimers[name]);
            finalizeDelete(name);
        }
    }, 1000);
}

function undo(name) {
    clearInterval(undoTimers[name]);
    document.getElementById(`undo-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

function finalizeDelete(name) {
    fetch('/delete_sensor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                document.getElementById(`view-${name}`).classList.add("hidden");
                socket.emit("sensor_update_request");
                location.reload();
            } else {
                alert('Failed to delete sensor.');
            }
        });
}

// --- Restart Functions ---


function restartConfirmation() {
    const resetMsg = document.getElementById("restart-content");
    resetMsg.innerHTML = '<h5>Are you sure you want to restart the program?</h5>';
}


async function restartProgram() {
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


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function closeRestart() {
    const restartMsg = document.getElementById("restart-content");
    const restartBtns = document.getElementById("restart-btns");
    document.getElementById("restart-container").classList.add("hidden");
    restartMsg.innerHTML = '<h5>Are you sure you want to restart the program?</h5>';
    restartBtns.innerHTML = '<button class="cancel-btn">Cancel</button><button class="save-btn">Confirm</button>';
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
    paused = false;
}

// --- Utility ---
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}