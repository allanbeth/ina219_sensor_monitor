// ===========================
// Energy Monitor Utilities JS
// ===========================

import { deviceList, remoteGPIOCount, setDeviceList, setRemoteGpio, setDeviceCount, deviceCount, isRemoteGpio } from './globals.js';

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

export function setDeviceInfo() {
    return fetch("/get_settings")
        .then(res => res.json())
        .then(data => {
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
                // isRemoteGpio = true;
            }
            updateAddNewVisibility();

            setDeviceCount(Object.keys(deviceList).length);
            console.log(`Total devices: ${deviceCount}`);
            console.log("Device list updated:", deviceList);

        });
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

export function updateHeaderTotals(data) {
    const dataContainer = document.getElementById('header-totals');
    if (!dataContainer) {
        console.error('Header totals container not found');
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
        html += `<span class="totals-data battery-charging" title="Batteries Charging"><i class="fa-solid fa-arrow-down"></i><span class="totals-text"> ${data.battery_in_total.toFixed(1)}W</span></span>`;
    } else if (batteryNet < 0) {
        html += `<span class="totals-data battery-discharging" title="Batteries Discharging"><i class="fa-solid fa-arrow-up"></i><span class="totals-text"> ${data.battery_out_total.toFixed(1)}W</span></span>`;
    } else if (batteryNet == 0) {
        html += `<span class="totals-data battery-idle" title="Batteries Idle"><i class="fa-solid fa-pause"></i><span class="totals-text"> Idle</span></span>`;
    }
    dataContainer.innerHTML = html;
}


