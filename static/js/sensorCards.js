// ==============================
// Energy Monitor Sensor Cards JS
// ==============================

import { deviceList, setPaused, getIsPaused, socket, undoTimers, setSensorFilter } from './globals.js';
import { generateLogHTML, isSensorConnected, updateFilterButtonStates, clearSensorFilter, formatValue, normalizeFilterType, isSensorEntry } from './utils.js';


// Get GPIO status for a device from local storage
function getGpioStatus(deviceId) {
    // Check local storage for GPIO configuration
    const gpioConfig = JSON.parse(localStorage.getItem('gpio_config')) || {};
    return gpioConfig[deviceId] ? 'Enabled' : 'Disabled';
}

// Current sensor data cache for event handlers
let currentSensorData = {};


function setupGlobalSensorEventDelegation(container, data) {
    // Cache sensor data for event handlers
    currentSensorData = data;
    
    // Clean up existing event listener to prevent duplicates
    container.removeEventListener('click', handleGlobalSensorClick);
    
    // Attach event listener with delegation
    container.addEventListener('click', handleGlobalSensorClick);
    console.log('Global sensor event delegation established');
}

// Handle global click events on sensor cards
function handleGlobalSensorClick(e) {
    const target = e.target;
    
    // Handle edit button clicks
    if (target.classList.contains('edit-btn')) {
        handleEditButtonClick(e, target);
    }
    // Handle log button clicks
    else if (target.classList.contains('log-btn')) {
        handleLogButtonClick(e, target);
    }
    else if (target.id === 'clear-sensor-filter') {
        clearSensorFilter();
    }
    else if (target.id === 'add-new-sensor-card') {
        handleSensorAddClick();

    }    
}

// Handle edit button click events
function handleEditButtonClick(e, target) {
    e.preventDefault();
    e.stopPropagation();
    
    const sensorName = target.getAttribute('data-name');
    if (!sensorName || !currentSensorData[sensorName]) return;
    
    const sensor = currentSensorData[sensorName];
    const deviceInfo = getDeviceInfo(sensor.device_id || sensorName);
    const deviceName = deviceInfo.deviceName;
    const deviceID = sensor.device_id || sensor.id || '';
    const hexAddress = sensor.address ? 
        `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : '0x00';
    const gpioStatus = getGpioStatus(sensor.device_id || sensorName);
    
    renderSensorEdit(sensorName, sensor.type, sensor.max_power, 
                    sensor.rating, hexAddress, gpioStatus, deviceName, deviceID);
}

// Handle edit button click events
function handleLogButtonClick(e, target) {
    e.preventDefault();
    e.stopPropagation();
    
    const sensorName = target.getAttribute('data-name');
    if (!sensorName || !currentSensorData[sensorName]) return;
    
    const sensor = currentSensorData[sensorName];
    const readings = sensor.data?.readings;
    const logHTML = generateLogHTML(Array.isArray(readings) ? readings : []);
    
    renderSensorLogs(sensorName, logHTML);
}

function handleSensorAddClick() {
    document.getElementById('add-sensor-card').classList.remove('hidden');
    document.getElementById('add-sensor-header-btn').classList.add('hidden');
    document.getElementById('no-sensors-card').classList.add('hidden');
}

// Check if currently on sensors page
function isOnSensorsPage() {
    const sensorContainer = document.getElementById('sensor-container');
    return sensorContainer && !sensorContainer.classList.contains('hidden');
}

// Load and render sensor cards with optional filtering
export function loadSensorCards(data, filterType = null) {
    // Update global filter state
    setSensorFilter(filterType);
    
    const container = document.getElementById('sensor-container'); 
    const cardGrid = document.getElementById('sensor-cards-grid');
    
    // Exit early if required DOM elements don't exist
    if (!container) {
        console.error('Sensor container element not found');
        return;
    }
    
    if (!cardGrid) {
        console.error('Sensor cards grid element not found');
        return;
    }
    
    // Clear existing cards and reset layout
    cardGrid.innerHTML = '';
    container.classList.remove('single-card');
    
    // Add "Add New Sensor" card first (always show)
    createAddSensorCard(cardGrid);

    // Validate incoming data
    if (!data || typeof data !== 'object') {
        console.warn('Invalid sensor data received:', data);
        showNoSensorsMessage(cardGrid, filterType);
        updateFilterButtonStates(filterType);
        return;
    }
    
    // Set up event handling for sensor interactions
    setupGlobalSensorEventDelegation(container, data);
    
    // Filter the data before processing if filter is specified
    const filteredData = filterType ? filterSensorData(data, filterType) : data;
    
    // Count actual sensor entries (not system data)
    const sensorCount = countActualSensors(filteredData);
    
    // Handle empty data case (either no data or no matches for filter)
    if (sensorCount === 0) {
        showNoSensorsMessage(cardGrid, filterType);
        updateFilterButtonStates(filterType);
        return;
    }
    
    // Process and create sensor cards with filtered data
    processSensorData(filteredData, cardGrid);
    
    // Update UI based on sensor count and screen size
    finalizeSensorCardsLayout(filteredData, container);
    
    // Update filter button states
    updateFilterButtonStates(filterType);
}

function filterSensorData(data, filterType) {
    if (!filterType) return data;
    
    console.log(`Filtering sensor data by type: ${filterType}`);
    
    const filtered = {};
    const targetType = normalizeFilterType(filterType);
    
    // Copy non-sensor data (system entries) to filtered result
    Object.entries(data).forEach(([name, sensor]) => {
        if (!isSensorEntry(name, sensor)) {
            filtered[name] = sensor;
            return;
        }
        
        // Include sensors that match the filter type
        if (sensor.type && sensor.type.toLowerCase() === targetType.toLowerCase()) {
            filtered[name] = sensor;
        }
    });
    
    console.log(`Filter result: ${Object.keys(filtered).filter(name => 
        isSensorEntry(name, filtered[name])).length} sensors match filter`);
    
    return filtered;
}



// Show message when no sensors are configured or match filter
function showNoSensorsMessage(cardGrid, filterType = null) {
    if (!isOnSensorsPage()) return;
    
    // Remove existing no-sensors card if it exists
    const existingNoSensorsCard = document.getElementById('no-sensors-card');
    if (existingNoSensorsCard) {
        existingNoSensorsCard.remove();
    }
    
    // Create no sensors card
    const noSensorsCard = document.createElement('div');
    noSensorsCard.className = 'sensor-card no-sensors-card';
    noSensorsCard.id = 'no-sensors-card';
    
    // Generate content based on filter state
    if (filterType) {
        const filterDisplayName = normalizeFilterType(filterType);
        noSensorsCard.innerHTML = `
            <div class="sensor-card-header">
                <div class="sensor-card-icon">
                    <i class="fa-solid fa-info"></i>
                </div>
                <div class="sensor-card-title">
                    <h3>No ${filterDisplayName} Sensors Found</h3>
                </div>
                <div class="action-btns">
                    <i class="fa-solid fa-xmark clear-filter-btn" id="clear-sensor-filter" title="Clear Sensor Filter"></i>
                </div>
            </div>
            <div class="sensor-card-content" id="no-sensors-content">
                <div class="sensor-entries">
                    <div class="sensor-entry">
                        <span class="sensor-label">No ${filterDisplayName.toLowerCase()} sensors configured.</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        noSensorsCard.innerHTML = `
            <div class="sensor-card-header">
                <div class="sensor-card-icon">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                </div>
                <div class="sensor-card-title">
                    <h3>No Sensors Configured</h3>
                </div>
                <div class="action-btns">
                    <i class="fa-solid fa-plus add-sensor-btn" id="add-new-sensor-card" title="Add New Sensor"></i>
                </div>
            </div>
            <div class="sensor-card-content" id="no-sensors-content">
                <div class="sensor-entries">
                    <div class="sensor-entry">
                        <span class="sensor-label">Add your first sensor to get started monitoring your energy systems.</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    cardGrid.appendChild(noSensorsCard);
}

// Process and create sensor cards from data
function processSensorData(data, cardGrid) {
    for (let [name, sensor] of Object.entries(data)) {
        // Skip non-sensor entries (system data, totals, etc.)
        if (!isSensorEntry(name, sensor)) continue;
        
        // Create and append sensor card
        const card = createSensorCard(name, sensor);
        cardGrid.appendChild(card);
        
        // Event listeners handled by global delegation
    }
}



// Create individual sensor card element
function createSensorCard(name, sensor) {
    // Get device information for this sensor
    const deviceInfo = getDeviceInfo(sensor.device_id);
    
    // Extract sensor properties with defaults
    const sensorProps = extractSensorProperties(sensor);
    
    // Create card element with styling
    const card = document.createElement('div');
    const typeClass = getSensorTypeClass(sensor.type);
    card.className = `sensor-card ${typeClass}`;
    card.id = `card-${name}`;
    
    // Generate card HTML content
    card.innerHTML = generateSensorCardHTML(name, sensor, deviceInfo, sensorProps);
    
    return card;
}

// Retrieve device information by ID
function getDeviceInfo(deviceId) {
    let deviceName = 'Default Device';
    let remoteGpio = 0;
    let deviceID = 0;
    
    for (const device of Object.values(deviceList)) {
        if (device.id === deviceId) {
            deviceID = device.id;
            deviceName = device.name || `Device ${device.id}`;
            remoteGpio = device.remote_gpio;
            break;
        }
    }
    
    return { deviceName, remoteGpio, deviceID };
}

// Extract sensor properties with defaults
function extractSensorProperties(sensor) {
    return {
        sensorType: sensor.type || '',
        maxPower: sensor.max_power || '',
        rating: sensor.rating || '',
        hexAddress: sensor.address ? 
            `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : '0x00'
    };
}

// Get CSS class for sensor type
function getSensorTypeClass(type) {
    const typeMap = {
        'Solar': 'solar-theme',
        'Wind': 'wind-theme',
        'Battery': 'battery-theme'
    };
    return typeMap[type] || 'battery-theme';
}

// Get icon class for sensor type
function getSensorIcon(type) {
    const iconMap = {
        'Solar': 'fa-solar-panel',
        'Wind': 'fa-wind',
        'Battery': 'fa-car-battery'
    };
    return iconMap[type] || 'fa-question';
}

// Generate connection status elements
function generateConnectionStatus(sensor, deviceInfo) {
    const isConnected = isSensorConnected(sensor);
    const connectionClass = isConnected ? 'sensor-connected' : 'sensor-disconnected';
    const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
    
    let gpioIcon, gpioClass;
    
    if (deviceInfo.remoteGpio === 1) {
        gpioIcon = `<i class="fa-solid fa-wifi ${connectionClass}" title="${deviceInfo.deviceName} - ${connectionStatus}"></i>`;
        gpioClass = 'remote';
    } else {
        gpioIcon = `<i class="fa-solid fa-network-wired ${connectionClass}" title="${deviceInfo.deviceName} - ${connectionStatus}"></i>`;
        gpioClass = 'local';
    }
    
    return { gpioIcon, gpioClass, connectionStatus };
}

// Generate HTML content for a sensor card
function generateSensorCardHTML(name, sensor, deviceInfo, sensorProps) {
    const connectionStatus = generateConnectionStatus(sensor, deviceInfo);
    const iconType = getSensorIcon(sensor.type);
    
    return `
        <div class="sensor-card-header">
            <div class="sensor-card-icon">
                <i class="fa-solid ${iconType}"></i>
            </div>
            <div class="sensor-card-title">
                <h3>${name}</h3>
                <p>${connectionStatus.gpioIcon} ${deviceInfo.deviceName} - ${connectionStatus.connectionStatus}</p>
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
                <!-- Edit form will be populated dynamically -->
            </div>
            <div class="sensor-logs hidden" id="log-${name}">
                <!-- Log data will be populated dynamically -->
            </div>
            <div class="sensor-delete hidden" id="delete-${name}">
                <!-- Delete confirmation will be populated dynamically -->
            </div>
            <div class="sensor-countdown hidden" id="undo-${name}">
                <!-- Undo delete countdown will be populated dynamically -->
            </div>
        </div>
    `;
}

// Create "Add New Sensor" card element
function createAddSensorCard(cardGrid) {
    // Check if add sensor card already exists to prevent duplicates
    const existingAddCard = document.getElementById('add-sensor-card');
    if (existingAddCard) {
        existingAddCard.remove();
    }
    
    const addCard = document.createElement('div');
    addCard.className = 'sensor-card add-sensor-card hidden';
    addCard.id = 'add-sensor-card';
    addCard.innerHTML = generateAddSensorCardHTML();
    
    cardGrid.appendChild(addCard);
    
    // Attach event listener for cancel button
    const cancelBtn = document.getElementById('new-sensor-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('add-sensor-card').classList.add('hidden');
            document.getElementById('add-sensor-header-btn').classList.remove('hidden');
        });
    }
}


// Generate HTML content for "Add New Sensor" card
function generateAddSensorCardHTML() {
    return `
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
                    <label class="sensor-label" for="add-sensor-name">Sensor Name:</label>
                    <input type="text" id="add-sensor-name" placeholder="Name" />
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-type">Sensor Type:</label>
                    <select id="add-sensor-type">
                        <option value="" disabled selected>Select Sensor Type</option>
                        <option value="Solar">Solar</option>
                        <option value="Wind">Wind</option>
                        <option value="Battery">Battery</option>
                    </select>
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-max-power">Sensor Max Power:</label>
                    <input type="number" id="add-sensor-max-power" placeholder="Max Power (W)" />
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-rating">Sensor Rating:</label>
                    <input type="number" id="add-sensor-rating" placeholder="Voltage Rating (V)" />
                </div>
                <div class="sensor-entry">
                    <label class="sensor-label" for="add-sensor-address">Sensor Address:</label>
                    <input type="text" id="add-sensor-address" placeholder="I2C Address (hex)" />
                </div>
            </div>
        </div>
    `;
}

// Finalize layout adjustments after rendering cards
function finalizeSensorCardsLayout(data, container) {    
    // Adjust layout for mobile single-sensor view
    const sensorCount = countActualSensors(data);
    if (sensorCount === 1 && window.innerWidth <= 768) {
        container.classList.add('single-card');
    }
}

// Count actual sensor entries (not system data)
function countActualSensors(data) {
    return Object.keys(data).filter(name => 
        isSensorEntry(name, data[name])
    ).length;
}

// Handle sensor readings update on subsequent data updates
export function handleSensorReadingsUpdate(data) {
    // Store data globally for filter operations
    window.lastSensorData = data;
    // Exit early if updates are paused (e.g., during editing)
    if (getIsPaused()) return;

    // Update individual sensor cards with new readings
    for (let [name, sensor] of Object.entries(data)) {
        // Skip system data entries
        if (!isSensorEntry(name, sensor)) continue;
        
        const viewElement = document.getElementById(`view-${name}`);
        if (viewElement) {
            // Update sensor readings display
            viewElement.innerHTML = renderSensorReadings(name, sensor);
            
            // Update connection status indicator
            updateSensorConnectionStatus(name, sensor);
            
            // Event listeners handled by global delegation
        }
    }
}

// Update sensor connection status indicator in card title
function updateSensorConnectionStatus(name, sensor) {
    // Find device information for this sensor
    const deviceInfo = getDeviceInfo(sensor.device_id);
    
    // Generate connection status elements using existing function
    const connectionInfo = generateConnectionStatus(sensor, deviceInfo);

    // Update the connection status in the card title
    const cardTitleElement = document.querySelector(`#card-${name} .sensor-card-title p`);
    if (cardTitleElement) {
        cardTitleElement.innerHTML = `${connectionInfo.gpioIcon} ${deviceInfo.deviceName} - ${connectionInfo.connectionStatus}`;
    }
}

// Render sensor readings HTML
export function renderSensorReadings(name, sensor) {
    // Validate sensor data availability
    if (!sensor?.data) {
        console.warn(`No sensor data available for ${name}`);
        return generateNoDataHTML();
    }

    // Extract current readings and sensor properties
    const data = sensor.data;
    const { type = 'Unknown', max_power: maxPower = 0, rating = 0 } = sensor;
    
    // Format readings with appropriate precision
    const voltage = formatValue(data.voltage, 'V', 2);
    const current = formatValue(data.current, 'A', 3);
    const power = formatValue(data.power,'', 2);
    
    // Generate sensor readings with proper CSS class structure
    let html = `
        <div class="sensor-main-entry">
            <div class="sensor-main-value">${power}<span class="sensor-card-unit">W</span></div>
        </div>
        <div class="sensor-entries"> 
            <div class="sensor-entry">
                <span class="sensor-label">Voltage:</span>
                <span class="sensor-value">${voltage}</span>
            </div>
            <div class="sensor-entry">
                <span class="sensor-label">Current:</span>
                <span class="sensor-value">${current}</span>
            </div>`;
    
    // Add type-specific readings
    if (type === 'Battery' && data.state_of_charge !== undefined && data.state_of_charge !== null) {
        const soc = Math.round(data.state_of_charge * 100) / 100;
        html += `
            <div class="sensor-entry">
                <span class="sensor-label">SOC:</span>
                <span class="sensor-value">${soc}%</span>
            </div>`;
    } else if (type !== 'Battery') {
        // For non-battery sensors, show trend or other info if available
        const trend = data.power_trend || 0;
        html += `
            <div class="sensor-entry">
                <span class="sensor-label">Trend:</span>
                <span class="sensor-value">${trend}%</span>
            </div>`;
    }
    
    // Add timestamp
    const timestamp = data.time_stamp || 'N/A';
    const connectionStatus = isSensorConnected(sensor) ? 
        `Last Updated: ${timestamp}` : 
        'Sensor not connected';
    
    html += `
            <div class="sensor-entry">
                <span class="sensor-label timestamp">${connectionStatus}</span>
            </div>
        </div>`;
    
    return html;
}

function generateNoDataHTML() {
    return `
        <div class="sensor-error">
            <i class="fa-solid fa-exclamation-triangle"></i>
            <p>No data available</p>
            <small>Sensor may be disconnected or experiencing issues</small>
        </div>
    `;
}

// Render sensor edit form
export function renderSensorEdit(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID) {
    // Pause real-time updates during editing
    setPaused(true);
    
    // Hide view elements and show edit interface
    toggleEditMode(name, true);
    
    // Generate edit form HTML
    const html = generateEditFormHTML(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID);
    
    // Populate edit form and setup event handlers
    const editElement = document.getElementById(`edit-${name}`);
    editElement.innerHTML = html;
    editElement.classList.remove('hidden');
    
    // Setup back button handler
    setupEditEventHandlers(name);
}

// Toggle between view and edit modes for a sensor card
function toggleEditMode(name, editMode) {
    const elements = {
        view: document.getElementById(`view-${name}`),
        edit: document.getElementById(`edit-${name}`),
        editBtn: document.getElementById(`edit-btn-${name}`),
        logBtn: document.getElementById(`log-btn-${name}`),
        deleteBtn: document.getElementById(`delete-btn-${name}`),
        saveBtn: document.getElementById(`save-btn-${name}`),
        backBtn: document.getElementById(`back-btn-${name}`)
    };
    
    if (editMode) {
        elements.view?.classList.add('hidden');
        elements.editBtn?.classList.add('hidden');
        elements.logBtn?.classList.add('hidden');
        elements.deleteBtn?.classList.remove('hidden');
        elements.saveBtn?.classList.remove('hidden');
        elements.backBtn?.classList.remove('hidden');
    } else {
        elements.view?.classList.remove('hidden');
        elements.edit?.classList.add('hidden');
        elements.editBtn?.classList.remove('hidden');
        elements.logBtn?.classList.remove('hidden');
        elements.deleteBtn?.classList.add('hidden');
        elements.saveBtn?.classList.add('hidden');
        elements.backBtn?.classList.add('hidden');
    }
}

// Generate HTML for sensor edit form
function generateEditFormHTML(name, sensorType, maxPower, rating, hexAddress, gpioStatus, deviceName, deviceID) {
    return `
        <div class="settings-entry">
            <label class="settings-label">Name:</label>
            <input type="text" id="name-${name}" value="${name}">
        </div>
        <div class="settings-entry">
            <label class="settings-label">Type:</label>
            <select id="type-${name}">
                <option value="Solar" ${sensorType === 'Solar' ? 'selected' : ''}>Solar</option>
                <option value="Wind" ${sensorType === 'Wind' ? 'selected' : ''}>Wind</option>
                <option value="Battery" ${sensorType === 'Battery' ? 'selected' : ''}>Battery</option>
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
            <label class="settings-label">I2C Address:</label>
            <input type="text" id="address-${name}" value="${hexAddress}" ${gpioStatus}>
        </div>
        <div class="settings-entry">
            <label class="settings-label">Device:</label>
            <input type="text" id="device-${name}" value="${deviceName}" disabled>
            <input type="text" id="device-id-${name}" value="${deviceID}" hidden>
        </div>
    `;
}

// Setup event handlers for edit mode buttons
function setupEditEventHandlers(name) {
    const backBtn = document.getElementById(`back-btn-${name}`);
    if (backBtn) {
        backBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeSensorEdit(name);
        };
    }
}

// Close sensor edit mode and resume updates
export function closeSensorEdit(name) {
    // Switch back to view mode
    toggleEditMode(name, false);
    
    // Clear edit form
    const editElement = document.getElementById(`edit-${name}`);
    if (editElement) {
        editElement.innerHTML = '';
    }
    
    // Resume real-time updates
    setPaused(false);
}

// Render sensor logs view
export function renderSensorLogs(name, logHTML) {
    // Pause updates during log viewing
    setPaused(true);
    
    // Hide main view
    document.getElementById(`view-${name}`).classList.add('hidden');
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
    document.getElementById(`log-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).classList.remove("hidden");
    document.getElementById(`back-btn-${name}`).onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeSensorLogs(name);
}
}

// Render sensor delete confirmation
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

// Render sensor undo countdown
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


