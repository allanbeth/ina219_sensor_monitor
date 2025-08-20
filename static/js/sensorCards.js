// ==============================
// Energy Monitor Sensor Cards JS
// ==============================

import { deviceList, setPaused, getIsPaused } from './globals.js';
import { updateHeaderTotals, generateLogHTML } from './utils.js';


// Load sensor Card
export function loadSensorCards(data) {
    const container = document.getElementById('sensor-container'); 
    container.innerHTML = '';
    if (Object.keys(data).length === 0) {
        document.getElementById('no-sensors').classList.remove('hidden');
        return;
    }
    for (let [name, sensor] of Object.entries(data)) {
        // Only render cards for sensors that have a 'type' and 'data' property (not config/devices/totals)
        if (name === 'totals' || !sensor || !sensor.type || !sensor.data) continue;

        // Device info for sensor
        let deviceName = 'Default Device';
        let remoteGpio = 0;
        let deviceID = 0;
        for (const device of Object.values(deviceList)) {
            if (device.id === sensor.device_id) {
                deviceID = device.id;
                deviceName = device.name || `Device ${device.id}`;
                remoteGpio = device.remote_gpio;
            }
        }

        // Create variables for a sensor
        const gpioStatus = remoteGpio ? "" : "disabled";
        const sensorType = sensor.type ?? "";
        const typeClass = sensor.type === "Solar" ? "type-Solar" :
                sensor.type === "Wind" ? "type-Wind" : "type-Battery";
        const maxPower = sensor.max_power ?? "";
        const rating = sensor.rating ?? "";
        const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
        let logHTML = generateLogHTML(sensor.data && Array.isArray(sensor.data.readings) ? sensor.data.readings : []);
        let gpioIcon = '';
        let gpioClass = '';
        let iconType = 'fa-question';

        // Create GPIO Status Icon
        if (remoteGpio === 1) {
            gpioIcon = `<i class="fa-solid fa-wifi" title="${deviceName}"></i>`;
            gpioClass = "remote";
        } else {
            gpioIcon = `<i class="fa-solid fa-network-wired" title="${deviceName}"></i>`;
            gpioClass = "local";
        }

        // Determine type and icon  
        if (sensor.type === 'Solar') {
            iconType = 'fa-solar-panel';
        } else if (sensor.type === 'Wind') {
            iconType = 'fa-wind';
        } else if (sensor.type === 'Battery') {
            iconType = 'fa-car-battery';
        }

        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `card-${name}`;

        // Convert sensorHeader HTML string to DOM Node and append
        const sensorHeaderHTML = renderSensorHeader(name, typeClass, iconType, gpioClass, gpioIcon);
        const tempHeader = document.createElement('div');
        tempHeader.innerHTML = sensorHeaderHTML.trim();
        if (tempHeader.firstElementChild) {
            card.appendChild(tempHeader.firstElementChild);
        }

        const sensorView = document.createElement('div');
        sensorView.className = `sensor-view-${name}`;
        sensorView.id = `view-${name}`;
        // Render initial readings
        sensorView.innerHTML = renderSensorReadings(name, sensor);

        const sensorEdit = document.createElement('div');
        sensorEdit.className = `edit-form hidden`;
        sensorEdit.id = `edit-${name}`;
        // let sensorEditHTML = renderSensorEdit(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID);
        // sensorEdit.innerHTML = renderSensorEdit(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID);
        const sensorLog = document.createElement('div');
        sensorLog.className = `log-data hidden`;
        sensorLog.id = `log-${name}`;
        // sensorLog.innerHTML = renderSensorLogs(name, sensor);
        const sensorDelete = document.createElement('div');
        sensorDelete.className = `delete-confirmation hidden`;
        sensorDelete.id = `delete-${name}`;
        const sensorUndoDelete = document.createElement('div');
        sensorUndoDelete.className = `countdown hidden`;
        sensorUndoDelete.id = `undo-${name}`;

        card.appendChild(sensorView);
        card.appendChild(sensorEdit);
        card.appendChild(sensorLog);
        card.appendChild(sensorDelete);
        card.appendChild(sensorUndoDelete);

        // Attach event listeners for dynamic buttons
        card.querySelector(".edit-btn").addEventListener("click", () => renderSensorEdit(name, sensor.type, sensor.max_power, rating, hexAddress, gpioStatus, deviceName, deviceID));
        card.querySelector(".log-btn").addEventListener("click", () => renderSensorLogs(name, logHTML));

        // Append the card to the container
        container.appendChild(card);

        
    }
}

export function handleSensorReadingsUpdate(data) {
    // socket.emit("sensor_update_request");
    if (getIsPaused()) return;
    updateHeaderTotals(data.totals);

    for (let [name, sensor] of Object.entries(data)) {
        if (name === 'totals') continue; // Skip totals object
        // Only update if the view element exists
        document.getElementById(`view-${name}`).innerHTML = '';
        document.getElementById(`view-${name}`).innerHTML = renderSensorReadings(name, sensor);
}
}
        
        // if (viewElem) {
        //     viewElem.innerHTML = renderSensorReadings(name, sensor);
        // } else {
        //     // Optionally, create the card if it doesn't exist
        //     // Or log a warning
        //     console.warn(`Sensor card for ${name} not found in DOM.`);
        // }
export function renderSensorHeader(name, typeClass, iconType, gpioClass, gpioIcon) {
    return `
        <div class="sensor-header">
            <div class="sensor-header-left">
                <span id="${name}-gpio-status" class="sensor-gpio-status ${gpioClass}">${gpioIcon}</span>
                <span class="sensor-icon"><i class="fa-solid ${iconType}"></i></span>
                <span class="sensor-name name-${typeClass}">${name}</span>
            </div>
            <div class="type-edit-container" id="btns-${name}">
                <i class="fa-solid fa-book log-btn" data-name="${name}" title="Log"></i>
                <i class="fa-solid fa-gear edit-btn" data-name="${name}" title="Edit"></i>
            </div>
        </div>
    `;
}

export function renderSensorReadings(name, sensor) {
    // Battery icon logic
    let batterySoc = 'fa-battery-empty';
    let iconClass = '';
    if (sensor.type === 'Battery') {
        let batteryState = sensor.data?.battery_state || 'offline';
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
            iconClass = "battery-idle";
        } else {
            iconClass = "battery-offline";
        }
    }
    // Card content (sections are siblings, not nested)
    let sensorReadings = `
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
    `;
    return sensorReadings;
}

export function renderSensorEdit(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID) {
    setPaused(true);
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`timestamp-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).innerHTML = '';
    let html = `
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
                        <option value="Solar" ${sensorType === "Solar" ? "selected" : ""}>Solar</option>
                        <option value="Wind" ${sensorType === "Wind" ? "selected" : ""}>Wind</option>
                        <option value="Battery" ${sensorType === "Battery" ? "selected" : ""}>Battery</option>
                    </select>
                </div>
                <div class="edit-entry">
                    <label>Max Power:</label>
                    <input type="number" id="maxPower-${name}" value="${maxPower ?? ''}">
                </div>
                <div class="edit-entry">
                    <label>Voltage Rating:</label>
                    <input type="number" id="rating-${name}" value="${rating ?? ''}">
                </div>
                <div class="edit-entry">
                    <label>i2c Address:</label>
                    <input type="text" id="address-${name}" value="${hexAddress}" ${gpioStatus}>
                </div>
                <div class="edit-entry">
                    <label>Device:</label>
                    <input type="text" id="device-${name}" value="${deviceName}" disabled>
                    <input type="text" id="device-id-${name}" value="${deviceID}" hidden>
                </div>
            </div>
    `;
    document.getElementById(`edit-${name}`).innerHTML = html;
    const card = document.getElementById(`card-${name}`);
    card.querySelector(".edit-back-btn").addEventListener("click", () => closeSensorEdit(name));
    card.querySelector(".save-btn").addEventListener("click", () => saveSensor(name));
    card.querySelector(".delete-btn").addEventListener("click", () => renderSensorDelete(name));
    document.getElementById(`edit-${name}`).classList.remove("hidden");

}

export function closeSensorEdit(name) {
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    document.getElementById(`timestamp-${name}`).classList.remove("hidden");
    document.getElementById(`edit-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).innerHTML = '';
    setPaused(false);
    }

export function renderSensorLogs(name, logHTML) {
    setPaused(true);
    // let logHTML = generateLogHTML(sensorReadings);
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    let html =  `
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
    `;

    document.getElementById(`log-${name}`).innerHTML = '';
    document.getElementById(`log-${name}`).innerHTML = html;
    const card = document.getElementById(`card-${name}`);
    card.querySelector(".log-back-btn").addEventListener("click", () => closeSensorLogs(name));
    // card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name, sensor.data.readings ?? []));
    document.getElementById(`log-${name}`).classList.remove("hidden");
}

export function renderSensorDelete(name) {
    document.getElementById(`edit-${name}`).classList.add("hidden");
    let html =  `
        <h3 class="confirm">Confirm delete?</h3>
            <div class="edit-buttons">
                <i class="fa-solid fa-check confirm-delete-btn" data-name="${name}" title="Yes"></i>
                <i class="fa-solid fa-xmark cancel-delete-btn" data-name="${name}" title="No"></i>
            </div>
    `;
    document.getElementById(`delete-${name}`).innerHTML = '';
    document.getElementById(`delete-${name}`).innerHTML = html;
    const card = document.getElementById(`card-${name}`);
    card.querySelector(".confirm-delete-btn").addEventListener("click", () => startCountdown(name));
    card.querySelector(".cancel-delete-btn").addEventListener("click", () => cancelSensorDelete(name));
    document.getElementById(`delete-${name}`).classList.remove("hidden");
}

export function renderSensorUndo(name) {
    clearInterval(undoTimers[name]);
    document.getElementById(`undo-${name}`).classList.add("hidden");

    let html =  `
        <p>Deleting in <span id="countdown-${name}">5</span> seconds...</p>
            <div class="edit-buttons">
                <i class="fa-solid fa-undo undo-btn" data-name="${name}" title="Undo"></i>
            </div>
    `;
    document.getElementById(`undo-${name}`).innerHTML = '';
    document.getElementById(`undo-${name}`).innerHTML = html;
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}


export function closeSensorLogs(name) {
    document.getElementById(`log-${name}`).classList.add("hidden");
    document.getElementById(`log-${name}`).innerHTML = '';
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    setPaused(false);    
}

export function cancelSensorDelete(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`delete-${name}`).innerHTML = '';
    document.getElementById(`edit-${name}`).classList.remove("hidden");
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

    closeSensorEdit(originalName);
}



export function startCountdown(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`undo-${name}`).classList.remove("hidden");
    card.querySelector(".undo-btn").addEventListener("click", () => undo(name));

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

