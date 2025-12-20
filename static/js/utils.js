// ===========================
// Energy Monitor Utilities JS
// ===========================

import { deviceList, remoteGPIOCount, setDeviceList, setRemoteGpio, setDeviceCount, deviceCount, isRemoteGpio, setSensorFilter} from './globals.js';
import { loadSensorCards } from './sensorCards.js';


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