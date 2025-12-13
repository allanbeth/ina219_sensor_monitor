// ==============================
// Energy Monitor Sensor Cards JS
// ==============================

import { deviceList, setPaused, getIsPaused, socket, undoTimers } from './globals.js';
import { updateHeaderTotals, generateLogHTML, isSensorConnected } from './utils.js';


// Helper functions for device info
function getDeviceName(deviceId) {
    for (const device of Object.values(deviceList)) {
        if (device.id === deviceId) {
            return device.name || `Device ${device.id}`;
        }
    }
    return 'Default Device';
}

function getGpioStatus(deviceId) {
    // Placeholder function - implement based on your GPIO logic
    const gpioConfig = JSON.parse(localStorage.getItem('gpio_config')) || {};
    return gpioConfig[deviceId] ? 'Enabled' : 'Disabled';
}



// Global click handler function
let globalSensorClickHandler = null;
let currentSensorData = {};

// Setup responsive layout handler for sensor cards
export function setupSensorResponsiveLayoutHandler() {
    window.addEventListener('resize', () => {
        const sensorContainer = document.getElementById('sensor-container');
        if (sensorContainer) {
            const cardCount = sensorContainer.children.length;
            
            // Remove existing classes
            sensorContainer.classList.remove('single-card');
            
            // Apply single-card layout if only one card and mobile
            if (cardCount === 1 && window.innerWidth <= 768) {
                sensorContainer.classList.add('single-card');
            }
        }
    });
}

function setupGlobalSensorEventDelegation(container, data) {
    // Store the data globally for the click handler
    currentSensorData = data;
    
    // Remove existing global event listener if it exists
    if (globalSensorClickHandler) {
        container.removeEventListener('click', globalSensorClickHandler);
    }
    
    // Define the click handler function
    globalSensorClickHandler = function(e) {
        const target = e.target;
        console.log("Global click detected on:", target.className);
        
        if (target.classList.contains('edit-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const sensorName = target.getAttribute('data-name');
            console.log("GLOBAL: Edit button clicked for:", sensorName);
            
            if (sensorName && currentSensorData[sensorName]) {
                const sensor = currentSensorData[sensorName];
                const deviceName = getDeviceName(sensor.device_id || sensorName);
                const deviceID = sensor.device_id || sensor.id || '';
                const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
                const gpioStatus = getGpioStatus(sensor.device_id || sensorName);
                
                renderSensorEdit(sensorName, sensor.type, sensor.max_power, sensor.type, hexAddress, gpioStatus, deviceName, deviceID);
            }
        } else if (target.classList.contains('log-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const sensorName = target.getAttribute('data-name');
            console.log("GLOBAL: Log button clicked for:", sensorName);
            
            if (sensorName && currentSensorData[sensorName]) {
                const sensor = currentSensorData[sensorName];
                const logHTML = generateLogHTML(sensor.data && Array.isArray(sensor.data.readings) ? sensor.data.readings : []);
                renderSensorLogs(sensorName, logHTML);
            }
        }
    };
    
    // Add the global event delegation
    container.addEventListener('click', globalSensorClickHandler);
    console.log("Global event delegation set up");
}

function attachSensorCardEventListeners(name, sensor) {
    const card = document.getElementById(`card-${name}`);
    if (!card) {
        console.log("Card not found for sensor:", name);
        return;
    }
    
    console.log("Attaching event listeners for sensor:", name);
    
    // Try direct button event listeners first
    const editBtn = card.querySelector(".edit-btn");
    const logBtn = card.querySelector(".log-btn");
    
    if (editBtn) {
        console.log("Found edit button, adding listener");
        editBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("EDIT BUTTON CLICKED for:", name);
            
            const deviceName = getDeviceName(sensor.device_id);
            const deviceID = sensor.device_id || sensor.id || '';
            const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
            const gpioStatus = getGpioStatus(sensor.device_id || name);
            
            renderSensorEdit(name, sensor.type, sensor.max_power, sensor.rating, hexAddress, gpioStatus, deviceName, deviceID);
        };
    } else {
        console.log("Edit button not found for:", name);
    }
    
    if (logBtn) {
        console.log("Found log button, adding listener");
        logBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("LOG BUTTON CLICKED for:", name);
            
            const logHTML = generateLogHTML(sensor.data && Array.isArray(sensor.data.readings) ? sensor.data.readings : []);
            renderSensorLogs(name, logHTML);
        };
    } else {
        console.log("Log button not found for:", name);
    }
}

// Helper function to check if we're currently on the sensors page
function isOnSensorsPage() {
    const sensorContainer = document.getElementById('sensor-container');
    return sensorContainer && !sensorContainer.classList.contains('hidden');
}

// Load sensor Card
export function loadSensorCards(data) {
    const container = document.getElementById('sensor-container'); 
    const cardGrid = document.getElementById('sensor-cards-grid');
    if (!container) {
        console.error('Sensor container element not found');
        return;
    }
    
    // container.innerHTML = ''; // Clear existing cards
    cardGrid.innerHTML = ''; // Clear existing cards
    
    // Remove any existing layout classes
    container.classList.remove('single-card');
    
    // Check if data is valid
    if (!data || typeof data !== 'object') {
        console.warn('loadSensorCards received invalid data:', data);
        // Only show "no sensors" message if we're currently on the sensors page
        if (isOnSensorsPage()) {
            const noSensorsElement = document.getElementById('no-sensors');
            if (noSensorsElement) {
                noSensorsElement.classList.remove('hidden');
            }
        }
        return;
    }
    
    // Set up global event delegation for sensor card buttons
    setupGlobalSensorEventDelegation(container, data);
    
    if (Object.keys(data).length === 0) {
        // Only show "no sensors" message if we're currently on the sensors page
        if (isOnSensorsPage()) {
            const noSensorsElement = document.getElementById('no-sensors');
            if (noSensorsElement) {
                noSensorsElement.classList.remove('hidden');
            }
        }
        return;
    }
    for (let [name, sensor] of Object.entries(data)) {
        // Only render cards for sensors that have a 'type' and 'data' property (not config/devices/totals/system_status)
        if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) continue;

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
        const typeClass = sensor.type === "Solar" ? "solar-theme" :
                sensor.type === "Wind" ? "wind-theme" : "battery-theme";
        const maxPower = sensor.max_power ?? "";
        const rating = sensor.rating ?? "";
        const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
        let logHTML = generateLogHTML(sensor.data && Array.isArray(sensor.data.readings) ? sensor.data.readings : []);
        let gpioIcon = '';
        let gpioClass = '';
        let iconType = 'fa-question';

        // Create GPIO Status Icon with dynamic connection status
        const isConnected = isSensorConnected(sensor);
        const connectionClass = isConnected ? 'sensor-connected' : 'sensor-disconnected';
        const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
        
        if (remoteGpio === 1) {
            gpioIcon = `<i class="fa-solid fa-wifi ${connectionClass}" title="${deviceName} - ${connectionStatus}"></i>`;
            gpioClass = "remote";
        } else {
            gpioIcon = `<i class="fa-solid fa-network-wired ${connectionClass}" title="${deviceName} - ${connectionStatus}"></i>`;
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
        card.className = `sensor-card ${typeClass}`;
        card.id = `card-${name}`;
        let sensorCardHtml = `
            <div class="sensor-card-header">
                <div class="sensor-card-icon">
                    <i class="fa-solid ${iconType}"></i>
                </div>
                <div class="sensor-card-title">
                    <h3>${name}</h3>
                    <p>${gpioIcon} ${deviceName} - ${connectionStatus}</p>
                </div>
                <div class="action-btns sensor-actions">
                    <i class="fa-solid fa-gear edit-btn" id="edit-btn-${name}" data-name="${name}" title="Edit"></i>
                    <i class="fa-solid fa-book log-btn" id="log-btn-${name}" data-name="${name}" title="Log"></i> 
                    <i class="fa-solid fa-trash delete-btn hidden" id="delete-btn-${name}" data-name="${name}" title="Delete"></i>
                    <i class="fa-solid fa-save save-btn hidden" id="save-btn-${name}" data-name="${name}" title="Save"></i>
                    <i class="fa-solid fa-xmark back-btn hidden" id="back-btn-${name}" data-name="${name}" title="Back"></i>
                </div>
            </div>  
            <div class="sensor-card-content">
                <div class="sensor-readings" id="view-${name}">
                    ${renderSensorReadings(name, sensor)}
                </div>
                <div class="sensor-settings hidden" id="edit-${name}">
                    <!-- Edit form will be populated here -->
                </div>
                <div class="sensor-logs hidden" id="log-${name}">
                    <!-- Log data will be populated here -->
                </div>
                <div class="sensor-delete hidden" id="delete-${name}">
                    <!-- Delete confirmation will be populated here -->
                </div>
                <div class="sensor-countdown hidden" id="undo-${name}">
                    <!-- Undo delete countdown will be populated here -->
                </div>
            </div>
            `;
        card.innerHTML = sensorCardHtml;
        cardGrid.appendChild(card);

        // Add event listeners after the card is in the DOM
        setTimeout(() => {
            console.log("Attempting to attach listeners for:", name);
            attachSensorCardEventListeners(name, sensor);
            
            // Double-check the buttons exist and add test logging
            const editBtn = card.querySelector(".edit-btn");
            const logBtn = card.querySelector(".log-btn");
            console.log("Buttons found:", { edit: !!editBtn, log: !!logBtn });
            
        }, 0);

        
    }
    
    // Count actual sensor cards (excluding totals, devices, system_status)
    const sensorCount = Object.keys(data).filter(key => {
        const sensor = data[key];
        return key !== 'totals' && key !== 'devices' && key !== 'system_status' && sensor && sensor.type && sensor.data;
    }).length;

     // add Add new sensor card at the end
    const addCard = document.createElement('div');
    addCard.className = 'sensor-card add-sensor-card hidden';
    addCard.id = 'add-sensor-card';
    addCard.innerHTML = `
            <div class="sensor-card-header">
                <div class="sensor-card-icon">
                    <i class="fa-solid fa-plus"></i>
                </div>
                <div class="sensor-card-title">
                <h3>Add New Sensor</h3>
                </div>
                <div class="action-btns">
                    <i class="fa-solid fa-xmark" id="new-sensor-cancel" title="Back"></i>
                    <i class="fa-solid fa-save" id="add-sensor-save" title="Save New Sensor"></i>
                </div>
            </div>
            <div class="sensor-card-content" id="add-sensor-content">
            <div class="sensor-entries">
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-name">Senor Name:</label>
                    <input type="text" id="add-sensor-name" placeholder="Name" />
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-type">Senor Type:</label>
                    <select id="add-sensor-type">
                        <option value="" disabled selected><span class="select-placeholder">Select Sensor Type</span>
                        </option>
                        <option value="Solar">Solar</option>
                        <option value="Wind">Wind</option>
                        <option value="Battery">Battery</option>
                    </select>
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-max-power"> Senor Max Power:</label>
                    <input type="number" id="add-sensor-max-power" placeholder="Max Power (W)" />
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-rating">Sensor Rating:</label>
                    <input type="number" id="add-sensor-rating" placeholder="Voltage Rating (V)" />
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-address">Senor Address:</label>
                    <input type="text" id="add-sensor-address" placeholder="I2C Address (hex)" />
                </div>
            </div>
        </div>
        `;
        cardGrid.appendChild(addCard); 

          // Close Add Device Card
    document.getElementById('new-sensor-cancel').addEventListener('click', () => {
        document.getElementById('add-sensor-card').classList.add('hidden');
    });

    
    // Hide "no sensors" message if we have sensors and we're on the sensors page
    if (isOnSensorsPage()) {
        const noSensorsElement = document.getElementById('no-sensors');
        if (noSensorsElement) {
            if (sensorCount > 0) {
                noSensorsElement.classList.add('hidden');
            } else {
                noSensorsElement.classList.remove('hidden');
            }
        }
    }
    
    // Apply single-card layout if only one sensor and mobile
    if (sensorCount === 1 && window.innerWidth <= 768) {
        container.classList.add('single-card');
    }
}

export function handleSensorReadingsUpdate(data) {
    // socket.emit("sensor_update_request");
    if (getIsPaused()) return;
    updateHeaderTotals(data.totals);

    for (let [name, sensor] of Object.entries(data)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status') continue; // Skip system objects
        
        // Update the view element content
        const viewElement = document.getElementById(`view-${name}`);
        if (viewElement) {
            viewElement.innerHTML = renderSensorReadings(name, sensor);
            
            // Update connection status in card header
            updateSensorConnectionStatus(name, sensor);
            
            // Re-attach event listeners after content update
            setTimeout(() => {
                attachSensorCardEventListeners(name, sensor);
            }, 0);
        }
    }
}

function updateSensorConnectionStatus(name, sensor) {
    // Find device info for this sensor
    let deviceName = 'Default Device';
    let remoteGpio = 0;
    for (const device of Object.values(deviceList)) {
        if (device.id === sensor.device_id) {
            deviceName = device.name || `Device ${device.id}`;
            remoteGpio = device.remote_gpio;
            break;
        }
    }

    // Determine connection status
    const isConnected = isSensorConnected(sensor);
    const connectionClass = isConnected ? 'sensor-connected' : 'sensor-disconnected';
    const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
    
    // Create GPIO icon
    let gpioIcon = '';
    if (remoteGpio === 1) {
        gpioIcon = `<i class="fa-solid fa-wifi ${connectionClass}" title="${deviceName} - ${connectionStatus}"></i>`;
    } else {
        gpioIcon = `<i class="fa-solid fa-network-wired ${connectionClass}" title="${deviceName} - ${connectionStatus}"></i>`;
    }

    // Update the connection status in the card title
    const cardTitleElement = document.querySelector(`#card-${name} .sensor-card-title p`);
    if (cardTitleElement) {
        cardTitleElement.innerHTML = `${gpioIcon} ${deviceName} - ${connectionStatus}`;
    }
}


export function renderSensorReadings(name, sensor) {
    // Determine icon type based on sensor type
    let iconType = 'fa-question';
    let iconClass = '';
    if (sensor.type === 'Solar') {
        iconType = 'fa-solar-panel';
    } else if (sensor.type === 'Wind') {
        iconType = 'fa-wind';
    } else if (sensor.type === 'Battery') {
        iconType = 'fa-car-battery';
    }

    let sensorIcon = '';
    if (sensor.type === 'Solar') {
        sensorIcon = '<i class="fa-solid fa-solar-panel"></i> ';
    } else if (sensor.type === 'Wind') {
        sensorIcon = '<i class="fa-solid fa-wind"></i> ';
    } else if (sensor.type === 'Battery') {
        sensorIcon = '<i class="fa-solid fa-car-battery"></i> ';
    }

    // Determine GPIO connection status icon
    let gpioIcon = '';
    let gpioClass = '';
    let deviceName = 'Default Device';
    let remoteGpio = 0;
    
    // Find device info for this sensor
    for (const device of Object.values(deviceList)) {
        if (device.id === sensor.device_id) {
            deviceName = device.name || `Device ${device.id}`;
            remoteGpio = device.remote_gpio;
            break;
        }
    }
    
    // Create GPIO Status Icon with dynamic connection status
    const isConnected = isSensorConnected(sensor);
    const connectionClass = isConnected ? 'sensor-connected' : 'sensor-disconnected';
    const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
    
    if (remoteGpio === 1) {
        gpioIcon = `<i class="fa-solid fa-wifi ${connectionClass}" title="Remote: ${deviceName} - ${connectionStatus}"></i>`;
        gpioClass = "remote";
    } else {
        gpioIcon = `<i class="fa-solid fa-network-wired ${connectionClass}" title="Local: ${deviceName} - ${connectionStatus}"></i>`;
        gpioClass = "local";
    }
 

    // Battery icon logic
    let batterySoc = 'fa-battery-empty';
    
    if (sensor.type === 'Battery') {
        let batteryState = sensor.data?.status || 'offline';
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

        // <div class="sensor-card-icon">
        //     ${sensor.type === "Battery" ? `<i class="fa-solid ${batterySoc} ${iconClass}"></i>` : `<i class="fa-solid ${iconType}"></i>`}
        // </div>
    }
    // Card content matching dashboard structure but using sensor-card classes
    let sensorReadings = `
            <div class="sensor-main-entry">
                <div class="sensor-main-value">${sensor.data && sensor.data.power !== undefined ? sensor.data.power : "N/A"} <span class="sensor-card-unit">W</span></div>
            </div>
            <div class="sensor-entries">
                <div class="sensor-entry">
                    <span class="sensor-label">Voltage:</span>
                    <span class="sensor-value">${sensor.data && sensor.data.voltage !== undefined ? sensor.data.voltage : "N/A"}V</span>
                </div>
                <div class="sensor-entry">
                    <span class="sensor-label">Current:</span>
                    <span class="sensor-value">${sensor.data && sensor.data.current !== undefined ? sensor.data.current : "N/A"}A</span>
                </div>
                <div class="sensor-entry">
                    <span class="sensor-label">${sensor.type === "Battery" ? "SOC:" : "Trend:"}</span>
                    <span class="sensor-value">${sensor.type === "Battery" ? 
                        (sensor.data && sensor.data.state_of_charge !== undefined ? sensor.data.state_of_charge : 0) + "%" : 
                        (sensor.data && sensor.data.power_trend !== undefined ? sensor.data.power_trend : 0) + "%"}</span>
                </div>
                <div class="sensor-entry" id="timestamp-${name}">
                    <span class="sensor-label timestamp">${isSensorConnected(sensor) ? 
                        `Last Updated: ${sensor.data && sensor.data.time_stamp ? sensor.data.time_stamp : "N/A"}` : 
                        "Sensor not connected"}</span>
                </div>
            </div>        
    `;
    return sensorReadings;
}

export function renderSensorEdit(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID) {
    setPaused(true);
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`edit-btn-${name}`).classList.add("hidden");
    document.getElementById(`log-btn-${name}`).classList.add("hidden");
    // Hide the new action buttons structure
    // const actionsElement = document.querySelector(`[data-name="${name}"]`)?.closest('.sensor-actions');
    // if (actionsElement) actionsElement.classList.add("hidden");
    // // document.getElementById(`timestamp-${name}`).classList.add("hidden");
    // document.getElementById(`edit-${name}`).innerHTML = '';
    let html = `
                <div class="settings-entry">
                    <label class="settings-label">Name:</label>
                    <input type="text" id="name-${name}" value="${name}">
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Type:</label>
                    <select id="type-${name}">
                        <option value="Solar" ${sensorType === "Solar" ? "selected" : ""}>Solar</option>
                        <option value="Wind" ${sensorType === "Wind" ? "selected" : ""}>Wind</option>
                        <option value="Battery" ${sensorType === "Battery" ? "selected" : ""}>Battery</option>
                    </select>
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Max Power:</label>
                    <input type="number" id="maxPower-${name}" value="${maxPower ?? ''}">
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Voltage Rating:</label>
                    <input type="number" id="rating-${name}" value="${rating ?? ''}">
                </div>
                <div class="settings-entry">
                    <label class="settings-label">i2c Address:</label>
                    <input type="text" id="address-${name}" value="${hexAddress}" ${gpioStatus}>
                </div>
                <div class="settings-entry">
                    <label class="settings-label">Device:</label>
                    <input type="text" id="device-${name}" value="${deviceName}" disabled>
                    <input type="text" id="device-id-${name}" value="${deviceID}" hidden>
                </div>
    `;
    document.getElementById(`edit-${name}`).innerHTML = '';
    document.getElementById(`edit-${name}`).innerHTML = html;
    document.getElementById(`edit-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).classList.remove("hidden");
    document.getElementById(`delete-btn-${name}`).classList.remove("hidden");
    document.getElementById(`save-btn-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeSensorEdit(name); 
    }
}

export function closeSensorEdit(name) {
    document.getElementById(`edit-btn-${name}`).classList.remove("hidden");
    document.getElementById(`log-btn-${name}`).classList.remove("hidden");
    document.getElementById(`delete-btn-${name}`).classList.add("hidden");
    document.getElementById(`save-btn-${name}`).classList.add("hidden");
    document.getElementById(`back-btn-${name}`).classList.add("hidden");
    document.getElementById(`view-${name}`).classList.remove("hidden"); 
    document.getElementById(`edit-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).innerHTML = '';
    setPaused(false);
    }

export function renderSensorLogs(name, logHTML) {
    setPaused(true);
    // let logHTML = generateLogHTML(sensorReadings);
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`edit-btn-${name}`).classList.add("hidden");
    document.getElementById(`log-btn-${name}`).classList.add("hidden");
    // Hide the new action buttons structure
    // const actionsElement = document.querySelector(`[data-name="${name}"]`)?.closest('.sensor-actions');
    // if (actionsElement) actionsElement.classList.add("hidden");

    let html =  `
            <div class="sensor-log-entries settings-overflow" id="log-entries-${name}">
                ${logHTML}
            </div>
    `;

    document.getElementById(`log-${name}`).innerHTML = '';
    document.getElementById(`log-${name}`).innerHTML = html;
    // const card = document.getElementById(`card-${name}`);
    // card.querySelector(".log-back-btn").addEventListener("click", () => closeSensorLogs(name));
    // // card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name, sensor.data.readings ?? []));
    document.getElementById(`log-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeSensorLogs(name);
}
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
    document.getElementById(`edit-btn-${name}`).classList.remove("hidden");
    document.getElementById(`log-btn-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).classList.add("hidden");
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
            setPaused(false);
            socket.emit("sensor_update_request");
        });

    closeSensorEdit(originalName);
}



export function startCountdown(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`undo-${name}`).classList.remove("hidden");
    const card = document.getElementById(`card-${name}`);
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

