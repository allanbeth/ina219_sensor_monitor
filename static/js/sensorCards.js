// ==============================
// Energy Monitor Sensor Cards JS
// ==============================
// Manages individual sensor card display, interactions, and real-time data updates
// Handles solar, wind, and battery sensor visualization with edit/log/delete functionality

import { deviceList, setPaused, getIsPaused, socket, undoTimers } from './globals.js';
import { updateHeaderTotals, generateLogHTML, isSensorConnected } from './utils.js';

// ========================================
// Device Information Helper Functions
// ========================================


/**
 * Get device name from device ID
 * @param {number|string} deviceId - Device identifier
 * @returns {string} Device name or default fallback
 */
function getDeviceName(deviceId) {
    for (const device of Object.values(deviceList)) {
        if (device.id === deviceId) {
            return device.name || `Device ${device.id}`;
        }
    }
    return 'Default Device';
}

/**
 * Get GPIO status for a device (for form field states)
 * @param {number|string} deviceId - Device identifier
 * @returns {string} 'Enabled' or 'Disabled' status
 */
function getGpioStatus(deviceId) {
    // Check local storage for GPIO configuration
    const gpioConfig = JSON.parse(localStorage.getItem('gpio_config')) || {};
    return gpioConfig[deviceId] ? 'Enabled' : 'Disabled';
}

// ========================================
// Global Event Management
// ========================================

// Global click handler for sensor card interactions
let globalSensorClickHandler = null;
// Current sensor data cache for event handlers
let currentSensorData = {};

/**
 * Set up responsive layout handler for sensor cards
 * Adjusts card layout based on screen size and number of cards
 */
export function setupSensorResponsiveLayoutHandler() {
    window.addEventListener('resize', handleSensorCardResize);
}

/**
 * Handle window resize events for sensor card layout
 * Applies appropriate CSS classes for mobile/desktop layouts
 */
function handleSensorCardResize() {
    const sensorContainer = document.getElementById('sensor-container');
    if (!sensorContainer) return;
    
    const cardCount = sensorContainer.children.length;
    
    // Reset layout classes
    sensorContainer.classList.remove('single-card');
    
    // Apply single-card layout for mobile when only one card exists
    if (cardCount === 1 && window.innerWidth <= 768) {
        sensorContainer.classList.add('single-card');
    }
}

/**
 * Set up global event delegation for sensor card interactions
 * Uses event bubbling to handle clicks on dynamically created elements
 * @param {HTMLElement} container - Container element for event delegation
 * @param {Object} data - Sensor data for event handlers
 */
function setupGlobalSensorEventDelegation(container, data) {
    // Cache sensor data for event handlers
    currentSensorData = data;
    
    // Clean up existing event listener to prevent duplicates
    if (globalSensorClickHandler) {
        container.removeEventListener('click', globalSensorClickHandler);
    }
    
    // Create global click handler with event delegation
    globalSensorClickHandler = handleGlobalSensorClick;
    
    // Attach event listener with delegation
    container.addEventListener('click', globalSensorClickHandler);
    console.log('Global sensor event delegation established');
}

/**
 * Handle global sensor card clicks using event delegation
 * @param {Event} e - Click event object
 */
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
}

/**
 * Handle edit button click events
 * @param {Event} e - Click event
 * @param {HTMLElement} target - Button element
 */
function handleEditButtonClick(e, target) {
    e.preventDefault();
    e.stopPropagation();
    
    const sensorName = target.getAttribute('data-name');
    if (!sensorName || !currentSensorData[sensorName]) return;
    
    const sensor = currentSensorData[sensorName];
    const deviceName = getDeviceName(sensor.device_id || sensorName);
    const deviceID = sensor.device_id || sensor.id || '';
    const hexAddress = sensor.address ? 
        `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : '0x00';
    const gpioStatus = getGpioStatus(sensor.device_id || sensorName);
    
    renderSensorEdit(sensorName, sensor.type, sensor.max_power, 
                    sensor.rating, hexAddress, gpioStatus, deviceName, deviceID);
}

/**
 * Handle log button click events
 * @param {Event} e - Click event
 * @param {HTMLElement} target - Button element
 */
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

/**
 * Attach individual event listeners to sensor card buttons
 * @param {string} name - Sensor name/identifier
 * @param {Object} sensor - Sensor configuration and data
 * @deprecated - This function is kept for fallback but global event delegation is preferred
 */
function attachSensorCardEventListeners(name, sensor) {
    const card = document.getElementById(`card-${name}`);
    if (!card) {
        console.warn(`Sensor card not found: ${name}`);
        return;
    }
    
    // Attach direct event listeners as fallback
    attachEditButtonListener(card, name, sensor);
    attachLogButtonListener(card, name, sensor);
}

/**
 * Attach edit button event listener
 * @param {HTMLElement} card - Card element
 * @param {string} name - Sensor name
 * @param {Object} sensor - Sensor data
 */
function attachEditButtonListener(card, name, sensor) {
    const editBtn = card.querySelector('.edit-btn');
    if (!editBtn) return;
    
    editBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const deviceName = getDeviceName(sensor.device_id);
        const deviceID = sensor.device_id || sensor.id || '';
        const hexAddress = sensor.address ? 
            `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : '0x00';
        const gpioStatus = getGpioStatus(sensor.device_id || name);
        
        renderSensorEdit(name, sensor.type, sensor.max_power, 
                        sensor.rating, hexAddress, gpioStatus, deviceName, deviceID);
    };
}

/**
 * Attach log button event listener
 * @param {HTMLElement} card - Card element
 * @param {string} name - Sensor name
 * @param {Object} sensor - Sensor data
 */
function attachLogButtonListener(card, name, sensor) {
    const logBtn = card.querySelector('.log-btn');
    if (!logBtn) return;
    
    logBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const readings = sensor.data?.readings;
        const logHTML = generateLogHTML(Array.isArray(readings) ? readings : []);
        renderSensorLogs(name, logHTML);
    };
}

// ========================================
// Utility Functions
// ========================================

/**
 * Check if the user is currently viewing the sensors page
 * @returns {boolean} True if sensors page is active
 */
function isOnSensorsPage() {
    const sensorContainer = document.getElementById('sensor-container');
    return sensorContainer && !sensorContainer.classList.contains('hidden');
}

// ========================================
// Main Sensor Card Management Functions
// ========================================

/**
 * Load and display sensor cards with current data
 * @param {Object} data - Complete sensor data from backend
 */
export function loadSensorCards(data) {
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
    
    // Validate incoming data
    if (!data || typeof data !== 'object') {
        console.warn('Invalid sensor data received:', data);
        showNoSensorsMessage();
        return;
    }
    
    // Set up event handling for sensor interactions
    setupGlobalSensorEventDelegation(container, data);
    
    // Handle empty data case
    if (Object.keys(data).length === 0) {
        showNoSensorsMessage();
        return;
    }
    
    // Process and create sensor cards
    processSensorData(data, cardGrid);
    
    // Add "Add New Sensor" card
    createAddSensorCard(cardGrid);
    
    // Update UI based on sensor count and screen size
    finalizeSensorCardsLayout(data, container);
}

/**
 * Show or hide the "no sensors" message based on current page
 */
function showNoSensorsMessage() {
    if (!isOnSensorsPage()) return;
    
    const noSensorsElement = document.getElementById('no-sensors');
    if (noSensorsElement) {
        noSensorsElement.classList.remove('hidden');
    }
}

/**
 * Process sensor data and create individual sensor cards
 * @param {Object} data - Sensor data object
 * @param {HTMLElement} cardGrid - Grid container for cards
 */
function processSensorData(data, cardGrid) {
    for (let [name, sensor] of Object.entries(data)) {
        // Skip non-sensor entries (system data, totals, etc.)
        if (!isSensorEntry(name, sensor)) continue;
        
        // Create and append sensor card
        const card = createSensorCard(name, sensor);
        cardGrid.appendChild(card);
        
        // Attach event listeners after DOM insertion
        setTimeout(() => {
            attachSensorCardEventListeners(name, sensor);
        }, 0);
    }
}

/**
 * Check if an entry represents a sensor (not system data)
 * @param {string} name - Entry name
 * @param {Object} sensor - Entry data
 * @returns {boolean} True if this is a sensor entry
 */
function isSensorEntry(name, sensor) {
    const systemEntries = ['totals', 'devices', 'system_status'];
    return !systemEntries.includes(name) && sensor && sensor.type && sensor.data;
}
/**
 * Create a single sensor card element
 * @param {string} name - Sensor name
 * @param {Object} sensor - Sensor configuration and data
 * @returns {HTMLElement} Created sensor card element
 */
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

/**
 * Get device information for a sensor
 * @param {number|string} deviceId - Device identifier
 * @returns {Object} Device information object
 */
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

/**
 * Extract sensor properties with defaults
 * @param {Object} sensor - Sensor data object
 * @returns {Object} Extracted properties
 */
function extractSensorProperties(sensor) {
    return {
        sensorType: sensor.type || '',
        maxPower: sensor.max_power || '',
        rating: sensor.rating || '',
        hexAddress: sensor.address ? 
            `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : '0x00'
    };
}

/**
 * Get CSS theme class for sensor type
 * @param {string} type - Sensor type (Solar, Wind, Battery)
 * @returns {string} CSS class name
 */
function getSensorTypeClass(type) {
    const typeMap = {
        'Solar': 'solar-theme',
        'Wind': 'wind-theme',
        'Battery': 'battery-theme'
    };
    return typeMap[type] || 'battery-theme';
}

/**
 * Get icon type for sensor
 * @param {string} type - Sensor type
 * @returns {string} FontAwesome icon class
 */
function getSensorIcon(type) {
    const iconMap = {
        'Solar': 'fa-solar-panel',
        'Wind': 'fa-wind',
        'Battery': 'fa-car-battery'
    };
    return iconMap[type] || 'fa-question';
}

/**
 * Generate connection status icon and text
 * @param {Object} sensor - Sensor data
 * @param {Object} deviceInfo - Device information
 * @returns {Object} Connection status information
 */
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

/**
 * Generate HTML content for sensor card
 * @param {string} name - Sensor name
 * @param {Object} sensor - Sensor data
 * @param {Object} deviceInfo - Device information
 * @param {Object} sensorProps - Sensor properties
 * @returns {string} HTML content for card
 */
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
/**
 * Create "Add New Sensor" card
 * @param {HTMLElement} cardGrid - Grid container element
 */
function createAddSensorCard(cardGrid) {
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
        });
    }
}

/**
 * Generate HTML for "Add New Sensor" card
 * @returns {string} HTML content for add sensor card
 */
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

/**
 * Finalize sensor cards layout and UI adjustments
 * @param {Object} data - Sensor data object
 * @param {HTMLElement} container - Main container element
 */
function finalizeSensorCardsLayout(data, container) {
    // Hide "no sensors" message since we have cards
    const noSensorsElement = document.getElementById('no-sensors');
    if (noSensorsElement) {
        noSensorsElement.classList.add('hidden');
    }
    
    // Adjust layout for mobile single-sensor view
    const sensorCount = countActualSensors(data);
    if (sensorCount === 1 && window.innerWidth <= 768) {
        container.classList.add('single-card');
    }
}

/**
 * Count actual sensor entries (excluding system data)
 * @param {Object} data - Data object to count
 * @returns {number} Number of actual sensors
 */
function countActualSensors(data) {
    return Object.keys(data).filter(name => 
        !['totals', 'devices', 'system_status'].includes(name) && 
        data[name].type && data[name].data
    ).length;
}

/**
 * Handle real-time sensor readings updates from WebSocket
 * @param {Object} data - Complete sensor data update from backend
 */
export function handleSensorReadingsUpdate(data) {
    // Exit early if updates are paused (e.g., during editing)
    if (getIsPaused()) return;
    
    // Update dashboard header totals
    updateHeaderTotals(data.totals);

    // Update individual sensor cards with new readings
    for (let [name, sensor] of Object.entries(data)) {
        // Skip system data entries
        if (['totals', 'devices', 'system_status'].includes(name)) continue;
        
        const viewElement = document.getElementById(`view-${name}`);
        if (viewElement) {
            // Update sensor readings display
            viewElement.innerHTML = renderSensorReadings(name, sensor);
            
            // Update connection status indicator
            updateSensorConnectionStatus(name, sensor);
            
            // Re-attach event listeners after DOM update
            setTimeout(() => {
                attachSensorCardEventListeners(name, sensor);
            }, 0);
        }
    }
}

/**
 * Update sensor connection status display in card header
 * @param {string} name - Sensor name
 * @param {Object} sensor - Sensor data object
 */
function updateSensorConnectionStatus(name, sensor) {
    // Find device information for this sensor
    const deviceInfo = getDeviceInfo(sensor.device_id);
    
    // Generate connection status elements
    const connectionInfo = generateConnectionStatus(sensor, deviceInfo);

    // Determine connection status
    const isConnected = isSensorConnected(sensor);
    const connectionClass = isConnected ? 'sensor-connected' : 'sensor-disconnected';
    const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
    
    // Create GPIO icon
    let gpioIcon = '';
    if (deviceInfo.remoteGpio === 1) {
        gpioIcon = `<i class="fa-solid fa-wifi ${connectionClass}" title="${deviceInfo.deviceName} - ${connectionStatus}"></i>`;
    } else {
        gpioIcon = `<i class="fa-solid fa-network-wired ${connectionClass}" title="${deviceInfo.deviceName} - ${connectionStatus}"></i>`;
    }

    // Update the connection status in the card title
    const cardTitleElement = document.querySelector(`#card-${name} .sensor-card-title p`);
    if (cardTitleElement) {
        cardTitleElement.innerHTML = `${gpioIcon} ${deviceInfo.deviceName} - ${connectionStatus}`;
    }
}

// ========================================
// Sensor Data Display Functions
// ========================================

/**
 * Render current sensor readings in the main view
 * @param {string} name - Sensor name
 * @param {Object} sensor - Sensor configuration and data
 * @returns {string} HTML string for sensor readings
 */
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
    const power = formatValue(data.power, 'W', 2);
    
    // Generate sensor readings with proper CSS class structure
    let html = `
        <div class="sensor-main-entry">
            <div class="sensor-main-value">${power} <span class="sensor-card-unit">W</span></div>
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

/**
 * Generate HTML for sensors with no data
 * @returns {string} HTML string for no data state
 */
function generateNoDataHTML() {
    return `
        <div class="sensor-error">
            <i class="fa-solid fa-exclamation-triangle"></i>
            <p>No data available</p>
            <small>Sensor may be disconnected or experiencing issues</small>
        </div>
    `;
}

// ========================================
// Sensor Edit and Management Functions
// ========================================

/**
 * Render sensor edit form in card
 * @param {string} name - Sensor name
 * @param {string} sensorType - Current sensor type
 * @param {number} maxPower - Maximum power rating
 * @param {number} rating - Voltage rating
 * @param {string} hexAddress - I2C address in hex format
 * @param {string} gpioStatus - GPIO status (enabled/disabled)
 * @param {string} deviceName - Device name
 * @param {number|string} deviceID - Device identifier
 */
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

/**
 * Toggle between view and edit modes for a sensor card
 * @param {string} name - Sensor name
 * @param {boolean} editMode - True for edit mode, false for view mode
 */
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

/**
 * Generate HTML for sensor edit form
 * @param {string} name - Sensor name
 * @param {string} sensorType - Sensor type
 * @param {number} maxPower - Max power rating
 * @param {number} rating - Voltage rating
 * @param {string} hexAddress - I2C address
 * @param {string} gpioStatus - GPIO status
 * @param {string} deviceName - Device name
 * @param {number|string} deviceID - Device ID
 * @returns {string} HTML for edit form
 */
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

/**
 * Setup event handlers for edit mode
 * @param {string} name - Sensor name
 */
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

/**
 * Close sensor edit mode and return to view mode
 * @param {string} name - Sensor name
 */
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

/**
 * Render sensor logs in card
 * @param {string} name - Sensor name
 * @param {string} logHTML - Pre-generated log HTML content
 */
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

// ========================================
// Utility and Helper Functions
// ========================================

/**
 * Format sensor values with appropriate units and precision
 * @param {number|null|undefined} value - Value to format
 * @param {string} unit - Unit suffix (e.g., 'V', 'A', 'W')
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted value string
 */
export function formatValue(value, unit = '', decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) {
        return `-- ${unit}`.trim();
    }
    
    // Handle very small numbers (treat as zero)
    if (Math.abs(value) < Math.pow(10, -decimals)) {
        return `0.00 ${unit}`.trim();
    }
    
    return `${value.toFixed(decimals)} ${unit}`.trim();
}
