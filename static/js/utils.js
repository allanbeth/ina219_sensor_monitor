// ===========================
// Energy Monitor Utilities JS
// ===========================

import { deviceList, remoteGPIOCount, setDeviceList, currentSensorData, setRemoteGpio, setDeviceCount, setConnectedDeviceCount, deviceCount, connectedDeviceCount, setSensorCount, setConnectedSensorCount, sensorCount, connectedSensorCount, isRemoteGpio, setSensorFilter, mqttConnectionStatus} from './globals.js';
import { loadSensorCards } from './sensorCards.js';
import { createDashboardStats } from './dashboardCards.js';


// Initialize sidebar state on page load
export function initializeSidebarState() {
    const dashboard = document.querySelector('.dashboard');
    const sidebar = document.querySelector('.sidebar');
    
    if (window.innerWidth <= 768) {
        // Mobile: Ensure nav menu is collapsed (minimized) on load
        dashboard.classList.remove('sidebar-collapsed');
        sidebar.classList.add('collapsed');
    }
    // Desktop: Keep collapsed classes (already set in HTML)
}

// Helper function to collapse nav menu on mobile devices
export function collapseNavMenuOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }
    }
}

// Helper function to show specific page and hide others
export function showPage(pageName) {
    const pages = {
        'dashboard': 'dashboard-container',
        'sensors': 'sensor-container',
        'settings': 'settings-container',
        'logs': 'log-file-container',
        'about': 'about-container'
    };
    
    // Update navigation active states
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    const activeNavLink = document.getElementById(`${pageName}-link`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
    
    // Update header based on page
    const pageHeading = document.getElementById('page-heading');
    const headerTotals = document.getElementById('header-totals');
    const solarSensorsFilterBtn = document.getElementById('solar-sensor-filter-header-btn');
    const windSensorsFilterBtn = document.getElementById('wind-sensor-filter-header-btn');
    const batterySensorsFilterBtn = document.getElementById('battery-sensor-filter-header-btn');
    const clearSensorFilterBtn = document.getElementById('clear-sensor-filter-header-btn');
    const addSensorBtn = document.getElementById('add-sensor-header-btn');
    const settingsSaveBtn = document.getElementById('settings-save-header-btn');
    const refreshLogsBtn = document.getElementById('refresh-logs-header-btn');
    const deviceCountDisplay = document.getElementById('device-count-display');
    const sensorCountDisplay = document.getElementById('sensor-count-display');
    
    // Hide all pages first
    Object.values(pages).forEach(pageId => {
        const element = document.getElementById(pageId);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show requested page
    const targetPageId = pages[pageName];
    if (targetPageId) {
        const element = document.getElementById(targetPageId);
        if (element) {
            element.classList.remove('hidden');
        }
    }
    
    // Handle "no-sensors" element visibility based on current page
    const noSensorsElement = document.getElementById('no-sensors');
    if (noSensorsElement) {
        if (pageName === 'sensors') {
            // On sensors page, show/hide based on actual sensor data (will be managed by loadSensorCards)
            // Don't change its state here, let the sensor loading logic handle it
        } else {
            // On any other page (dashboard, settings, etc.), always hide it
            noSensorsElement.classList.add('hidden');
        }
    }
    
    if (pageHeading && headerTotals && solarSensorsFilterBtn && windSensorsFilterBtn && batterySensorsFilterBtn && clearSensorFilterBtn && addSensorBtn && settingsSaveBtn && refreshLogsBtn && deviceCountDisplay && sensorCountDisplay) {
        switch(pageName) {
            case 'dashboard':
                pageHeading.textContent = 'Dashboard';
                pageHeading.style.display = 'block';
                solarSensorsFilterBtn.classList.add('hidden');
                solarSensorsFilterBtn.style.display = 'none';
                windSensorsFilterBtn.classList.add('hidden');
                windSensorsFilterBtn.style.display = 'none';
                batterySensorsFilterBtn.classList.add('hidden');
                batterySensorsFilterBtn.style.display = 'none';
                clearSensorFilterBtn.classList.add('hidden');
                addSensorBtn.classList.add('hidden');
                addSensorBtn.style.display = 'none'; // Ensure inline style hides it
                settingsSaveBtn.classList.add('hidden');
                refreshLogsBtn.classList.add('hidden');
                deviceCountDisplay.classList.remove('hidden');
                sensorCountDisplay.classList.remove('hidden');
                break;
            case 'sensors':
                pageHeading.textContent = 'Sensors';
                pageHeading.style.display = 'block';
                solarSensorsFilterBtn.classList.remove('hidden');
                solarSensorsFilterBtn.style.display = ''; // Clear inline style
                windSensorsFilterBtn.classList.remove('hidden');
                windSensorsFilterBtn.style.display = ''; // Clear inline style
                batterySensorsFilterBtn.classList.remove('hidden');
                batterySensorsFilterBtn.style.display = ''; // Clear inline style
                addSensorBtn.classList.remove('hidden');
                addSensorBtn.style.display = ''; // Clear inline style
                settingsSaveBtn.classList.add('hidden');
                refreshLogsBtn.classList.add('hidden');
                deviceCountDisplay.classList.add('hidden');
                sensorCountDisplay.classList.add('hidden');
                break;
            case 'settings':
                pageHeading.textContent = 'Settings';
                pageHeading.style.display = 'block';
                addSensorBtn.classList.add('hidden');
                addSensorBtn.style.display = 'none'; // Ensure inline style hides it
                solarSensorsFilterBtn.classList.add('hidden');
                windSensorsFilterBtn.classList.add('hidden');
                batterySensorsFilterBtn.classList.add('hidden');
                clearSensorFilterBtn.classList.add('hidden');
                settingsSaveBtn.classList.remove('hidden');
                refreshLogsBtn.classList.add('hidden');
                deviceCountDisplay.classList.add('hidden');
                sensorCountDisplay.classList.add('hidden');
                break;
            case 'logs':
                pageHeading.textContent = 'Logs';
                pageHeading.style.display = 'block';
                solarSensorsFilterBtn.classList.add('hidden');
                windSensorsFilterBtn.classList.add('hidden');
                batterySensorsFilterBtn.classList.add('hidden');
                clearSensorFilterBtn.classList.add('hidden');
                addSensorBtn.classList.add('hidden');
                addSensorBtn.style.display = 'none'; // Ensure inline style hides it
                settingsSaveBtn.classList.add('hidden');
                refreshLogsBtn.classList.remove('hidden');
                deviceCountDisplay.classList.add('hidden');
                sensorCountDisplay.classList.add('hidden');
                break;
            case 'about':
                pageHeading.textContent = 'About';
                pageHeading.style.display = 'block';
                solarSensorsFilterBtn.classList.add('hidden');
                windSensorsFilterBtn.classList.add('hidden');
                batterySensorsFilterBtn.classList.add('hidden');
                clearSensorFilterBtn.classList.add('hidden');
                addSensorBtn.classList.add('hidden');
                addSensorBtn.style.display = 'none'; // Ensure inline style hides it
                settingsSaveBtn.classList.add('hidden');
                refreshLogsBtn.classList.add('hidden');
                deviceCountDisplay.classList.add('hidden');
                sensorCountDisplay.classList.add('hidden');
                break;
            default:
                pageHeading.style.display = 'none';
                headerTotals.classList.add('hidden');
                addSensorBtn.classList.add('hidden');
                settingsSaveBtn.classList.add('hidden');
                refreshLogsBtn.classList.add('hidden');
                deviceCountDisplay.classList.add('hidden');
                sensorCountDisplay.classList.add('hidden');
        }
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    const dashboard = document.querySelector('.dashboard');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth > 768) {
        // Desktop - restore collapsed state (default)
        dashboard.classList.add('sidebar-collapsed');
        sidebar.classList.add('collapsed');
        overlay.classList.remove('active');
    } else {
        // Mobile - ensure nav menu collapsed (minimized) by default
        dashboard.classList.remove('sidebar-collapsed');
        sidebar.classList.add('collapsed');
        overlay.classList.remove('active');
    }
});

// Make showPage available globally
// window.showPage = showPage;

// Initialize the dashboard event handlers and layout
export function initializeDashboard() {
    console.log('Initializing dashboard...');
    try {
        setupNavigationEvents();
        // setupDashboardButtons();
        setupResponsiveLayoutHandler();
        // Create initial dashboard with placeholder data
        createDashboardStats();
        console.log('Dashboard initialization complete');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }

     // Add drill button event delegation
    document.addEventListener('click', handleDashboardDrillClick);
}

function handleDashboardDrillClick(e) {
    if (!e.target.classList.contains('dashboard-drill-btn')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const buttonId = e.target.id;
    const sensorType = buttonId.replace('dashboard-drill-btn-', '').toLowerCase();
    
    console.log(`Dashboard drill: navigating to sensors page with ${sensorType} filter`);
    
    setSensorFilter(sensorType);
    showPage('sensors');
        
    // Apply filter after a short delay to ensure page is loaded
    setTimeout(() => {
        if (sensorType && sensorType !== 'all') {
            filterSensorsByType(sensorType);
        } else {
            clearSensorFilter();
        }
    }, 50);
    
    // Collapse mobile menu if applicable
    collapseNavMenuOnMobile();
}

/**
 * Set up navigation event handlers for dashboard and sensors views
 * Manages active states and view switching
 */
function setupNavigationEvents() {
    // Set up active state management for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Update active states when navigation links are clicked
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}


/**
 * Set up responsive layout handler for dashboard cards
 * Adjusts layout based on screen size and number of cards
 */
function setupResponsiveLayoutHandler() {
    window.addEventListener('resize', handleResponsiveLayout);
}

/**
 * Handle responsive layout adjustments on window resize
 * Applies appropriate CSS classes for mobile/desktop layouts
 */
function handleResponsiveLayout() {
    const dashboardStats = document.getElementById('dashboard-container');
    if (!dashboardStats) return;
    
    const cardCount = dashboardStats.children.length;
    
    // Reset layout classes
    dashboardStats.classList.remove('single-card');
    
    // Apply single-card layout for mobile when only one card is present
    if (cardCount === 1 && window.innerWidth <= 768) {
        dashboardStats.classList.add('single-card');
    }
}

// Calculate connected devices count using actual sensor data (same logic as dashboard)
export function getConnectedDevicesInfo() {
    if (!currentSensorData || Object.keys(currentSensorData).length === 0) {
        return { count: 'Loading...', total: 0, connectionClass: 'status-disconnected' };
    }
    
    const deviceIds = new Set();
    const devicesWithSensors = new Set();
    
    // Count unique devices from actual sensor data - these are devices with associated sensors
    for (let [name, sensor] of Object.entries(currentSensorData)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status' || 
            !sensor || !sensor.type || !sensor.data) {
            continue;
        }
        if (sensor.device_id !== undefined) {
            devicesWithSensors.add(sensor.device_id);
            // Check if sensor is actually connected
            if (isSensorConnected(sensor)) {
                deviceIds.add(sensor.device_id);
            }
        }
    }
    
    const connectedDevices = deviceIds.size;
    const totalDevicesWithSensors = devicesWithSensors.size;
    
    let connectionClass = 'status-disconnected';
    if (connectedDevices === totalDevicesWithSensors && connectedDevices > 0) {
        connectionClass = 'status-connected';
    } else if (connectedDevices > 0) {
        connectionClass = 'status-partial';
    }

    setDeviceCount(totalDevicesWithSensors);
    setConnectedDeviceCount(connectedDevices);
    
    return {
        count: totalDevicesWithSensors > 0 ? `${connectedDevices}/${totalDevicesWithSensors}` : 'No devices',
        // connectedCount: connectedDevices,
        total: totalDevicesWithSensors,
        connectionClass: connectionClass
    };
}
// Calculate connected sensors count using actual sensor data
export function getConnectedSensorsInfo() {
    if (!currentSensorData || Object.keys(currentSensorData).length === 0) {
        return { count: 'Loading...', total: 0, connectionClass: 'status-disconnected' };
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

    setSensorCount(totalSensors);
    setConnectedSensorCount(connectedSensors);
    
    return {
        count: sensorCount > 0 ? `${connectedSensorCount}/${sensorCount}` : 'No sensors',
        total: sensorCount,
        connectionClass: connectionClass
    };
}

export function getMqttConnectionInfo() {
    // Return current MQTT status with appropriate CSS classes
    return {
        status: mqttConnectionStatus === 1 ? 'Connected' : 'Disconnected',
        connectionClass: mqttConnectionStatus === 1 ? 'status-connected' : 'status-disconnected'
    };
}

// // Fetch current system status information
// export function fetchStatusInfo() {
//     const deviceInfo = getConnectedDevicesInfo();
//     const sensorInfo = getConnectedSensorsInfo();
    
//     return Promise.resolve({
//         service_status: 'Running',
//         connected_devices: deviceInfo.count,
//         connected_sensors: sensorInfo.count,
//         device_connection_class: deviceInfo.connectionClass,
//         sensor_connection_class: sensorInfo.connectionClass,
//         mqtt_status: 'Connected', // Default status
//         last_updated: new Date().toLocaleTimeString()
//     });
// }

// Update the status display elements directly
function updateStatusDisplay() {
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


export function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
}

// Helper function to determine if sensor is connected
export function isSensorConnected(sensor) {
    // Check if sensor has valid data
    if (!sensor.data) return false;
    
    // Check for explicit disconnection status
    if (sensor.data.status === "disconnected" || 
        sensor.data.status === "offline" || 
        sensor.data.status === "battery-offline" ||
        sensor.data.status === "no data") {
        return false;
    }
    
    // Check for invalid or missing timestamps
    const hasValidTimestamp = sensor.data.time_stamp && 
                             sensor.data.time_stamp !== "N/A" && 
                             sensor.data.time_stamp !== "No Data" &&
                             sensor.data.time_stamp !== "Not Updated";
    
    if (!hasValidTimestamp) return false;
    
    // Check if sensor data indicates actual meaningful connection
    const hasValidData = (
        sensor.data.voltage !== undefined && sensor.data.voltage !== null &&
        sensor.data.current !== undefined && sensor.data.current !== null &&
        sensor.data.power !== undefined && sensor.data.power !== null
    );
    
    if (!hasValidData) return false;
    
    // More meaningful connection check - not just presence of data but actual activity
    // A sensor reading all zeros likely means it's not connected to anything meaningful
    const voltage = parseFloat(sensor.data.voltage) || 0;
    const current = parseFloat(sensor.data.current) || 0;
    const power = parseFloat(sensor.data.power) || 0;
    
    // For battery sensors, check if voltage is within reasonable range
    if (sensor.type === "Battery") {
        // Battery voltage should be above 1V to be considered connected to actual battery
        return voltage > 1.0;
    }
    
    // For solar/wind sensors, check if there's any measurable activity
    // Either voltage > 1V OR power > 0.1W indicates some kind of connection
    return voltage > 1.0 || power > 0.1;
}

export async function ensureDeviceInfoLoaded() {
    // If deviceList is empty, load it
    if (Object.keys(deviceList).length === 0) {
        console.log("Device list empty, loading device info...");
        await setDeviceInfo();
    }
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function getElement(id) {
    return document.getElementById(id);
}

export function updateSensorGpioStatus(name, remoteGpio, deviceName) {

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

    // setInitialLoad(false);
  

}

export async function setDeviceInfo() {
    const res = await fetch("/get_settings");
    const data = await res.json();
    setDeviceList(data.devices);
    let remoteGPIOCount = 0;
    for (const device of Object.values(deviceList)) {
        console.log(`Device loaded: ${device.id} - ${device.name}`);
        if (device.remote_gpio === 1) {
            remoteGPIOCount++;
        }
    }
    console.log(`Total remote GPIO devices: ${remoteGPIOCount}`);
    if (remoteGPIOCount > 0) {
        setRemoteGpio(true);
    }
    updateAddNewVisibility();
    setDeviceCount(Object.keys(deviceList).length);
    console.log(`Total devices: ${deviceCount}`);
    console.log("Device list updated:", deviceList);
}

export function updateAddNewVisibility() {
    const addBtn = document.getElementById("add-sensor-header-btn");
    const addContainer = document.getElementById("add-sensor-container");
    
    if (!addBtn) {
        console.warn("add-sensor-header-btn element not found");
        return;
    }
    
    if (isRemoteGpio) {
        addBtn.classList.remove("hidden");
        console.log("Remote GPIO enabled, showing Add Sensor button");
    } else {
        addBtn.classList.add("hidden");
        if (addContainer) {
            addContainer.classList.add("hidden");
        }
        console.log("Remote GPIO disabled, hiding Add Sensor button");
    }
}

export function generateLogHTML(readings) {
    if (!Array.isArray(readings) || readings.length === 0) {
        return '<p>No logs available.</p>';
    }
    return readings.slice().reverse().map(reading => `
        <div class="sensor-log-entry">
            <label class="sensor-label sensor-reading-timestamp">
                ${reading.time_stamp ?? ''}
            </label>
            <span class="sensor-value reading-details">
                Voltage: ${reading.voltage ?? 'N/A'} ,
                Current: ${reading.current ?? 'N/A'} ,
                Power: ${reading.power ?? 'N/A'} .
            </span>
        </div>
    `).join('');
}

export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    children.forEach(child => el.appendChild(child));
    return el;
}

export function escapeHTML(str) {
    return String(str).replace(/[&<>"]|'/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Sensor Card Filter Functions
export function updateFilterButtonStates(activeFilter) {
    const filterButtons = [
        { id: 'solar-sensor-filter-header-btn', type: 'solar' },
        { id: 'wind-sensor-filter-header-btn', type: 'wind' },
        { id: 'battery-sensor-filter-header-btn', type: 'battery' }
    ];
    
    const clearButton = document.getElementById('clear-sensor-filter-header-btn');
    
    // Update individual filter buttons
    filterButtons.forEach(({ id, type }) => {
        const button = document.getElementById(id);
        if (!button) return;
        
        if (activeFilter && type === activeFilter.toLowerCase()) {
            // Hide the active filter button since it's already applied
            button.classList.add('hidden');
            button.classList.remove('filter-active');
        } else {
            // Show inactive filter buttons
            button.classList.remove('hidden', 'filter-active');
            button.setAttribute('title', `Show only ${type} sensors`);
        }
    });
    
    // Update clear button visibility and state
    if (clearButton) {
        if (activeFilter) {
            clearButton.classList.remove('hidden');
            clearButton.classList.add('filter-visible');
            clearButton.setAttribute('title', 'Show all sensors');
        } else {
            clearButton.classList.add('hidden');
            clearButton.classList.remove('filter-visible');
        }
    }
}

export function filterSensorsByType(type) {
    console.log(`Applying ${type} sensor filter`);
    
    // Use the stored sensor data with the filter
    if (window.lastSensorData) {
        loadSensorCards(window.lastSensorData, type);
    } else {
        console.warn('No sensor data available for filtering');
    }
}

export function clearSensorFilter() {
    console.log('Clearing sensor filter');
    
    // Reload all sensors without filter
    if (window.lastSensorData) {
        loadSensorCards(window.lastSensorData, null);
    } else {
        console.warn('No sensor data available for clearing filter');
    }
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


// // Backup Management Functions
// // Fetch and Display Backups
// export function fetchBackups() {
//     const backupContent = document.getElementById('config-file-selection');
//     backupContent.innerHTML = '';
//     fetch('/list_backups')
//         .then(response => response.json())
//         .then(data => {
//             const files = data.backups;
//             if (!files || files.length === 0) {
//                 backupContent.innerHTML = '<p>No backup files found.</p>';
//                 return;
//             }
//             files.forEach(filename => {
//                 const displayName = filename.replace(/\.json$/, '');
//                 const row = document.createElement('div');
//                 row.className = 'settings-entry';
//                 row.id = `backup-entry-${displayName}`;
//                 const nameDiv = document.createElement('div');
//                 nameDiv.className = 'settings-label';
//                 nameDiv.innerText = displayName;
//                 const actionDiv = document.createElement('div');
//                 actionDiv.className = 'settings-action';
//                 const deleteIcon = document.createElement('i');
//                 deleteIcon.className = 'fa-solid fa-trash';
//                 deleteIcon.title = 'Delete Config File';
//                 deleteIcon.setAttribute('data-filename', filename);
//                 deleteIcon.addEventListener('click', () => {
//                     deleteBackupConfirmation(filename);
//                 });
//                 const restoreIcon = document.createElement('i');
//                 restoreIcon.className = 'fa-solid fa-file-import';
//                 restoreIcon.title = 'Restore Config File';
//                 restoreIcon.setAttribute('data-filename', filename);
//                 restoreIcon.addEventListener('click', () => {
//                     restoreBackupConfirmation(filename);
//                 });
//                 actionDiv.appendChild(deleteIcon);
//                 actionDiv.appendChild(restoreIcon);
//                 row.appendChild(nameDiv);
//                 row.appendChild(actionDiv);
                
//                 backupContent.appendChild(row);
//             });
//         });
// }

// // Delete Backup Confirmation
// export function deleteBackupConfirmation(filename) {
//     document.getElementById('config-file-selection').classList.add('hidden');
//     document.getElementById('delete-config-confirmation').classList.remove('hidden');
//     document.getElementById('config-action-btns').classList.remove('hidden');
//     document.getElementById('delete-config-cancel').classList.remove('hidden');
//     document.getElementById('delete-config-confirm').classList.remove('hidden');
//     const confirmDeleteHtml = document.getElementById('delete-file-name');
//     confirmDeleteHtml.innerHTML = `${filename}`;

//     // Confirm Delete Handler
//     document.getElementById('delete-config-confirm').addEventListener('click', () => {
//         document.getElementById('delete-config-confirmation').classList.add('hidden');
//         document.getElementById('config-action-btns').classList.remove('hidden');
//         document.getElementById('delete-config-cancel').classList.add('hidden');
//         document.getElementById('delete-config-confirm').classList.add('hidden');
//         document.getElementById('config-action-message').classList.remove('hidden');
//         document.getElementById('config-action-complete').classList.remove('hidden');

//         deleteBackup(filename);
//     });
// }

// // Restore Backup Confirmation
// export function restoreBackupConfirmation(filename) {
//     document.getElementById('restore-config-confirmation').classList.remove('hidden');
//     document.getElementById('config-action-btns').classList.remove('hidden');
//     document.getElementById('restore-config-cancel').classList.remove('hidden');
//     document.getElementById('restore-config-confirm').classList.remove('hidden');
//     const confirmRestoreHtml = document.getElementById('restore-file-name');
//     confirmRestoreHtml.innerHTML = `${filename}`;

//     // Confirm Restore Handler
//     document.getElementById('restore-config-confirm').addEventListener('click', () => {
//         document.getElementById('delete-config-confirmation').classList.add('hidden');
//         document.getElementById('config-action-btns').classList.remove('hidden');
//         document.getElementById('restore-config-cancel').classList.add('hidden');
//         document.getElementById('restore-config-confirm').classList.add('hidden');
//         document.getElementById('config-action-message').classList.remove('hidden');
//         document.getElementById('config-action-complete').classList.remove('hidden');
//         restoreBackup(filename);
//     });
// }

// // Create Backup
// export function createBackup() {
//     const programConfig = document.getElementById('program-config').checked ? 1 : 0;
//     const sensorConfig = document.getElementById('sensor-config').checked ? 1 : 0;
//     const backupMsg = document.getElementById('backup-result');
//     fetch('/backup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ programConfig, sensorConfig })
//     })
//     .then(response => response.json())
//     .then(data => {
//     	  const backupMsg = document.getElementById('backup-result');
//         if (data.success) {
//             backupMsg.innerHTML = 'Backup created successfully!';
//         } else {
//             backupMsg.innerHTML = 'Backup failed: ' + (data.error || 'Unknown error');
//         }
//     })
//     .catch(error => {
//         backupMsg.innerHTML = 'Backup failed: Network error';
//         console.error('Backup error:', error);
//     });
// }

// // Delete Backup
// export function deleteBackup(filename) {
//     fetch('/delete_backup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ filename })
//     })
//         .then(res => res.json())
//         .then(() => {
//             document.getElementById('config-action-result').innerHTML = 'Backup file deleted successful';
//         })
//         .catch(error => {
//             document.getElementById('config-action-result').innerText = 'Failed to delete Backup.';
//             console.error('Error restoring Backup:', error);
//         });
// }

// // Restore Backup
// export async function restoreBackup(filename) {
//     document.getElementById('restore-config-confirmation').classList.add('hidden');
//     document.getElementById('config-action-message').classList.remove('hidden');
//     const restoreResult = document.getElementById('config-action-result');
//     restoreResult.innerHTML = 'Restoring backup...';
//     const restoreConfig = confirm('Restore config.json?');
//     const restoreSensors = confirm('Restore sensors.json?');
//     const res = await fetch('restore_backup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ filename, restore_config: restoreConfig, restore_sensors: restoreSensors })
//     });
//     const result = await res.json();
//     restoreResult.innerHTML = '';
//     if (result.success) {
//         restoreResult.innerHTML = 'Restore successful. Please reload or restart the app.';
//     } else {
//         restoreResult.innerHTML = 'Restore failed: ' + result.error;
        
//     }
// }