// ===========================
// Energy Monitor Utilities JS
// ===========================

import { deviceList, remoteGPIOCount, setDeviceList, setRemoteGpio } from './globals.js';

export function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
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

}

export function setDeviceInfo() {
    fetch("/get_settings")
        .then(res => res.json())
        .then(data => {
            setDeviceList(data.devices);
            // remoteGPIOCount = 0;
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
            
        });
}

export function updateAddNewVisibility() {
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

export function generateLogHTML(readings) {
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


