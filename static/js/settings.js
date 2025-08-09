// ==========================
// Energy Monitor Settings JS
// ==========================

import { deviceList } from './globals.js';

export function fetchSettings() {
    fetch('/get_settings')
        .then(res => res.json())
        .then(data => {
            document.getElementById('solar-interval').value = data.poll_intervals.Solar ?? '';
            document.getElementById('wind-interval').value = data.poll_intervals.Wind ?? '';
            document.getElementById('battery-interval').value = data.poll_intervals.Battery ?? '';
            document.getElementById('max-log').value = data.max_log ?? '';
            document.getElementById('max-readings').value = data.max_readings ?? '';
            document.getElementById('mqtt-broker').value = data.mqtt_broker ?? '';
            document.getElementById('mqtt-port').value = data.mqtt_port ?? '';
            document.getElementById('webserver-host').value = data.webserver_host ?? '';
            document.getElementById('webserver-port').value = data.webserver_port ?? '';
            const deviceSettings = document.getElementById('devices-settings');
            deviceSettings.innerHTML = '';
            let html = '';
            for (const device of Object.values(deviceList)) {
                const checked = device.remote_gpio === 1 ? 'checked' : '';
                const disabled = device.remote_gpio === 0 ? 'disabled' : '';
                html += `
                    <hr class="divider">
                    <div class="settings-entry">
                        <label for="device-id"> Device ID:</label>
                        <input type="text" class="device-id-${device.id}" id="device-id" value="${device.id}" disabled/>
                     </div>
                    <div class="settings-entry">
                        <label for="device-name"> Device Name:</label>
                        <input type="text" class="device-name-${device.id}" id="device-name" value="${device.name}"/>
                     </div>
                    <div class="settings-entry">
                        <label for="remote-gpio"> Remote GPIO:</label>
                        <input type="checkbox" class="gpio-checkbox-${device.id}" id="remote-gpio" ${checked}/>
                    </div>
                    <div class="settings-entry">
                        <label for="gpio-address"> GPIO Address:</label>
                        <input type="text" class="gpio-address-${device.id}" id="gpio-address" value="${device.gpio_address}" ${disabled}/>
                    </div>
                `;
            }
            deviceSettings.innerHTML = html;
            for (const device of Object.values(deviceList)) {
                const remoteGpioCheckbox = document.querySelector(`.gpio-checkbox-${device.id}`);
                const i2cInput = document.querySelector(`.gpio-address-${device.id}`);
                if (remoteGpioCheckbox) {
                    remoteGpioCheckbox.addEventListener('change', function () {
                        i2cInput.disabled = !this.checked;
                    });
                }
            }
        });
}

export function saveSettings() {
    const maxLog = document.getElementById('max-log').value;
    const solarInterval = document.getElementById('solar-interval').value;
    const windInterval = document.getElementById('wind-interval').value;
    const batteryInterval = document.getElementById('battery-interval').value;
    const maxReadings = document.getElementById('max-readings').value;
    const mqttBroker = document.getElementById('mqtt-broker').value;
    const mqttPort = document.getElementById('mqtt-port').value;
    const webserverHost = document.getElementById('webserver-host').value;
    const webserverPort = document.getElementById('webserver-port').value;
    const deviceSettings = {};
    for (const device of Object.values(deviceList)) {
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
    fetch('/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            devices: deviceSettings
        })
    })
        .then(res => res.json())
        .then(() => {
            window.socket.emit('sensor_update_request');
        });
    document.getElementById('settings-container').classList.add('hidden');
}
