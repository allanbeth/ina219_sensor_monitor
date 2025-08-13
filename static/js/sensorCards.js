// ==============================
// Energy Monitor Sensor Cards JS
// ==============================

import { formatNumber } from './utils.js';
import { deviceList, isRemoteGpio, isPaused, setPaused, initialLoad, deviceCount } from './globals.js';
import { updateHeaderTotals, updateSensorGpioStatus, generateLogHTML } from './utils.js';

export function handleSensorUpdate(data) {
    if (isPaused) return;
    updateHeaderTotals(data.totals);
    const container = document.getElementById('sensor-container');
   
    container.innerHTML = '';
    if (Object.keys(data).length === 0) {
        document.getElementById('no-sensors').classList.remove('hidden');
        return;
    }
    for (let [name, sensor] of Object.entries(data)) {
        

        if (name === 'totals') continue; // Skip totals object

        // Device info
        let deviceName = 'Default Device';
        let remoteGpio = 0;
        let deviceID = 0;
        let count = 0;
        for (const device of Object.values(deviceList)) {
            
            if (device.id === sensor.device_id) {
                deviceID = device.id;
                deviceName = device.name || `Device ${device.id}`;
                remoteGpio = device.remote_gpio;

            }
    }
        
        const card = renderSensorCard(name, sensor, deviceName, deviceID);
        container.appendChild(card);
        

        // Update GPIO status
        // let deviceCount = Object.keys(deviceList).length;

        if (count <= deviceCount) {
            updateSensorGpioStatus(name, remoteGpio, deviceName);
            count++;
            console.log(count);
            console.log(deviceCount);
        }


        // Attach event listeners for dynamic buttons
        // Sensor edit card
        card.querySelector(".edit-btn").addEventListener("click", () => sensorEdit(name));
        card.querySelector(".edit-back-btn").addEventListener("click", () => closeEdit(name));
        card.querySelector(".save-btn").addEventListener("click", () => saveSensor(name));
        card.querySelector(".delete-btn").addEventListener("click", () => showDeleteConfirmation(name));
        card.querySelector(".confirm-delete-btn").addEventListener("click", () => startCountdown(name));
        card.querySelector(".cancel-delete-btn").addEventListener("click", () => cancelDelete(name));
        card.querySelector(".undo-btn").addEventListener("click", () => undo(name));
        // Sensor Log card
        card.querySelector(".log-btn").addEventListener("click", () => openLog(name));
        card.querySelector(".log-back-btn").addEventListener("click", () => closeLog(name));
        // card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name, sensor.data.readings ?? []));
    }
}


export function renderSensorCard(name, sensor, deviceName, deviceID) {
    // Create card element for a sensor
    const card = document.createElement('div');
    card.className = 'sensor-card';
    card.id = `card-${name}`;
    // Create variables for a sensor
    
    const typeClass = sensor.type === "Solar" ? "type-Solar" :
            sensor.type === "Wind" ? "type-Wind" : "type-Battery";
    const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
    const logHTML = generateLogHTML(sensor.data && Array.isArray(sensor.data.readings) ? sensor.data.readings : []);
    const i2cDisabled = isRemoteGpio ? "" : "disabled";

    // Determine type and icon
    let iconType = 'fa-question';
    if (sensor.type === 'Solar') {
        iconType = 'fa-solar-panel';
    } else if (sensor.type === 'Wind') {
        iconType = 'fa-wind';
    } else if (sensor.type === 'Battery') {
        iconType = 'fa-car-battery';
    }

    // Battery icon logic
    let batterySoc = 'fa-battery-empty';
    let iconClass = '';
    let batteryState = sensor.data?.battery_state || 'offline';
    if (sensor.type === 'Battery') {
    const soc = sensor.data && sensor.data.state_of_charge !== undefined ? sensor.data.state_of_charge : 0;
        if (soc < 5) batterySoc = 'fa-battery-empty';
        else if (soc < 25) batterySoc = 'fa-battery-quarter';
        else if (soc < 50) batterySoc = 'fa-battery-half';
        else if (soc < 75) batterySoc = 'fa-battery-three-quarters';
        else batterySoc = 'fa-battery-full';
        
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

    // Card content (sections are siblings, not nested)
    card.innerHTML = `
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
                <div class="data-tile" id="${sensor.type ? sensor.type.toLowerCase() : 'unknown'}-data-tile">
                    <span class="icon"><i class="fa-solid fa-wave-square"></i></span>
                    <p class="voltage">${sensor.data && sensor.data.voltage !== undefined ? sensor.data.voltage : "N/A"} V</p>
                </div>
                <div class="data-tile" id="${sensor.type ? sensor.type.toLowerCase() : 'unknown'}-data-tile">
                    <span class="icon"><i class="fa-solid fa-industry"></i></span>
                    <p class="current">${sensor.data && sensor.data.current !== undefined ? sensor.data.current : "N/A"} A</p>
                </div>
                <div class="data-tile" id="${sensor.type ? sensor.type.toLowerCase() : 'unknown'}-data-tile">
                    <span class="icon"><i class="fa-solid fa-bolt"></i></span>
                    <p class="power">${sensor.data && sensor.data.power !== undefined ? sensor.data.power : "N/A"} W</p>
                </div>
                ${sensor.type === "Battery" ? `
                <div class="data-tile" id="${sensor.type ? sensor.type.toLowerCase() : 'unknown'}-data-tile">
                    <span class="icon"><i class="fa-solid ${batterySoc} ${iconClass}" id="battery-icon"></i></span>
                    <p class="soc">${sensor.data && sensor.data.state_of_charge !== undefined ? sensor.data.state_of_charge : 0}% </p>
                </div>
                ` : `
                <div class="data-tile" id="${sensor.type ? sensor.type.toLowerCase() : 'unknown'}-data-tile">
                    <span class="icon"><i class="fa-solid fa-plug"></i></span>
                    <p class="output">${sensor.max_power ?? 0} W</p>
                </div>
                `}
            </div>
                <div class="timestamp" id="timestamp-${name}">Last Updated: ${sensor.data && sensor.data.time_stamp ? sensor.data.time_stamp : "N/A"}</div>
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
                    <input type="number" id="maxPower-${name}" value="${sensor.max_power ?? ''}">
                </div>
                <div class="edit-entry">
                    <label>Voltage Rating:</label>
                    <input type="number" id="rating-${name}" value="${sensor.rating ?? ''}">
                </div>
                <div class="edit-entry">
                    <label>i2c Address:</label>
                    <input type="text" id="address-${name}" value="${sensor.address ?? ''}">
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
                <div class="sensor-btns" hidden>
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
    return card;
}

export function sensorEdit(name) {
    setPaused(true);
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`timestamp-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

export function closeEdit(name) {
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    document.getElementById(`timestamp-${name}`).classList.remove("hidden");
    document.getElementById(`edit-${name}`).classList.add("hidden");
    setPaused(false);
}

export function saveSensor(originalName) {
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

    closeEdit(originalName);
}
// --- Sensor Log Functions ---
export function openLog(name) {
    setPaused(true);
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`log-${name}`).classList.remove("hidden");
}

export function closeLog(name) {
    document.getElementById(`log-${name}`).classList.add("hidden");
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    setPaused(false);
}
// export function refreshLog(name, readings) {
//     let logContainer = document.getElementById(`log-entries-${name}`);
//     let logHTML = generateLogHTML(readings ?? []);
//     logContainer.innerHTML = "";
//     logContainer.innerHTML =  logHTML;
// }

// --- Sensor Delete Functions ---
export function showDeleteConfirmation(name) {
    document.getElementById(`edit-${name}`).classList.add("hidden");
    document.getElementById(`delete-${name}`).classList.remove("hidden");
}

export function cancelDelete(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

export function startCountdown(name) {
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

export function undo(name) {
    clearInterval(undoTimers[name]);
    document.getElementById(`undo-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

export function finalizeDelete(name) {
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

