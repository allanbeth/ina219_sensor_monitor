// =======================
// Energy Monitor Main JS
// =======================

// --- Global Variables ---
const socket = io({ reconnection: true });
let paused = false;
let undoTimers = {};
let isRemoteGpio = false;

// --- DOMContentLoaded: Initial Setup ---
document.addEventListener("DOMContentLoaded", () => {
    fetch("/get_settings")
        .then(res => res.json())
        .then(data => {
            isRemoteGpio = data.remote_gpio == 1;
            updateGpioStatus();
        });

    setupEventHandlers();

    socket.on("connect", () => {
        console.log("Socket Connected:", socket.id);
    });

    socket.on("sensor_update", handleSensorUpdate);
});

// --- Event Handler Setup ---
function setupEventHandlers() {
    // Header buttons
    document.querySelector(".fa-gear").addEventListener("click", settings);
    document.querySelector(".fa-book").addEventListener("click", fullLog);
    document.querySelector(".fa-question").addEventListener("click", about);
    document.querySelector(".fa-rotate").addEventListener("click", restartConfirmation);

    document.getElementById("add-sensor-btn").addEventListener("click", () => {
        document.getElementById("add-sensor-container").classList.remove("hidden");
    });
    document.getElementById("add-sensor-cancel").addEventListener("click", () => {
        document.getElementById("add-sensor-container").classList.add("hidden");
    });
    document.getElementById("add-sensor-save").addEventListener("click", addSensor);


    // Settings
    document.getElementById("settings-container").addEventListener("click", (e) => {
        if (e.target.closest(".fa-arrow-left")) cancelSettings();
        if (e.target.closest(".fa-save")) saveSettings();
    });

    // About
    document.getElementById("about-container")?.addEventListener("click", (e) => {
        if (e.target.closest(".fa-arrow-left")) cancelAbout();
    });

    // Restart
    document.getElementById("restart-container")?.addEventListener("click", (e) => {
        if (e.target.closest(".cancel-btn")) cancelRestart();
        if (e.target.closest(".save-btn")) restartProgram();
    });

    // Log file
    document.getElementById("log-file-container")?.addEventListener("click", (e) => {
        if (e.target.closest(".fa-arrow-left")) closeFullLog();
    });
}

// --- Sensor Update Handler ---
function handleSensorUpdate(data) {
    socket.emit("sensor_update_request");
    if (paused) return;

    const container = document.getElementById("sensor-container");
    container.innerHTML = "";

    if (Object.keys(data).length === 0) {
        document.getElementById("no-sensors").classList.remove("hidden");
        return;
    }

    for (let [name, sensor] of Object.entries(data)) {
        const typeClass = sensor.type === "Solar" ? "type-Solar" :
            sensor.type === "Wind" ? "type-Wind" : "type-Battery";
        const card = document.createElement("div");
        card.className = "sensor-card";
        card.id = `card-${name}`;

        const maxPower = sensor.max_power ?? "";
        const rating = sensor.rating ?? "";
        const hexAddress = sensor.address ? `0x${parseInt(sensor.address).toString(16).padStart(2, '0')}` : "0x00";
        const logHTML = generateLogHTML(sensor.data.readings ?? []);
        const i2cDisabled = isRemoteGpio ? "" : "disabled";

        let content = `
            <div class="sensor-header">
                <span class="sensor-type ${typeClass}">${sensor.type} ${rating}V</span>
                <span class="sensor-name">${name}</span>
                <div class="type-edit-container" id="btns-${name}">
                    <i class="fa-solid fa-book log-btn" data-name="${name}" title="Log"></i>
                    <i class="fa-solid fa-gear edit-btn" data-name="${name}" title="Edit"></i>
                </div>
            </div>
            <div id="view-${name}">
                <div class="sensor-readings">
                    <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                        <span class="icon"><i class="fa-solid fa-wave-square"></i></span>
                        <p class="voltage">${sensor.data.voltage ?? "N/A"} V</p>
                    </div>
                    <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                        <span class="icon"><i class="fa-solid fa-industry"></i></span>
                        <p class="current">${sensor.data.current ?? "N/A"} A</p>
                    </div>
                    <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                        <span class="icon"><i class="fa-solid fa-bolt"></i></span>
                        <p class="power">${sensor.data.power ?? "N/A"} W</p>
                    </div>
                    ${sensor.type === "Battery" ? `
                        <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                            <span class="icon"><i class="fa-solid fa-battery"></i></span>
                            <p class="soc">${sensor.data.state_of_charge ?? 0}%</p>
                        </div>
                    </div>` : `
                        <div class="data-tile" id="${sensor.type.toLowerCase()}-data-tile">
                            <span class="icon"><i class="fa-solid fa-plug"></i></span>
                            <p class="output">${sensor.max_power ?? 0} W</p>
                        </div>
                    </div>`}
                    <div class="timestamp" id="timestamp-${name}">Last Updated: ${sensor.data.time_stamp}</div>
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
                        <input type="number" id="maxPower-${name}" value="${maxPower}">
                    </div>
                    <div class="edit-entry">
                        <label>Voltage Rating:</label>
                        <input type="number" id="rating-${name}" value="${rating}">
                    </div>
                    <div class="edit-entry">
                        <label>i2c Address:</label>
                        <input type="text" id="address-${name}" value="${hexAddress}" ${i2cDisabled}>
                    </div>
                </div>
            </div>
            <div id="log-${name}" class="log-data hidden">
                <div class="sensor-log-header">
                    <div class="back-btn">
                        <i class="fa-solid fa-arrow-left log-back-btn" data-name="${name}" title="Back"></i>
                    </div>
                    <h4>Readings</h4>
                    <div class="sensor-btns">
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

        card.innerHTML = content;
        container.appendChild(card);

        // Attach event listeners for dynamic buttons
        card.querySelector(".log-btn").addEventListener("click", () => openLog(name));
        card.querySelector(".edit-btn").addEventListener("click", () => enterEditMode(name));
        card.querySelector(".edit-back-btn").addEventListener("click", () => cancelEdit(name));
        card.querySelector(".save-btn").addEventListener("click", () => saveSensor(name));
        card.querySelector(".delete-btn").addEventListener("click", () => showDeleteConfirmation(name));
        card.querySelector(".log-back-btn").addEventListener("click", () => closeLog(name));
        card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name));
        card.querySelector(".confirm-delete-btn").addEventListener("click", () => startCountdown(name));
        card.querySelector(".cancel-delete-btn").addEventListener("click", () => cancelDelete(name));
        card.querySelector(".undo-btn").addEventListener("click", () => undo(name));
        card.querySelector(".edit-back-btn").addEventListener("click", () => cancelEdit(name));
        card.querySelector(".save-btn").addEventListener("click", () => saveSensor(name));
        card.querySelector(".delete-btn").addEventListener("click", () => showDeleteConfirmation(name));
        card.querySelector(".log-back-btn").addEventListener("click", () => closeLog(name));
        card.querySelector(".refresh-log-btn").addEventListener("click", () => refreshLog(name));
    }
}

function addSensor() {
    const name = document.getElementById("add-sensor-name").value;
    const type = document.getElementById("add-sensor-type").value;
    const max_power = document.getElementById("add-sensor-max-power").value;
    const rating = document.getElementById("add-sensor-rating").value;
    const address = document.getElementById("add-sensor-address").value;

    fetch("/add_sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, max_power, rating, address })
    })
    .then(res => res.json())
    .then(result => {
        if (result.status === "success") {
            document.getElementById("add-sensor-container").classList.add("hidden");
            socket.emit("sensor_update_request");
        } else {
            alert("Failed to add sensor: " + (result.message || "Unknown error"));
        }
    });
}

// --- GPIO Status Badge ---
function updateGpioStatus() {
    const statusSpan = document.getElementById("gpio-status");
    if (isRemoteGpio) {
        statusSpan.innerHTML = '<i class="fa-solid fa-cloud" title="Remote GPIO"></i>';
        statusSpan.className = "gpio-status remote";
    } else {
        statusSpan.innerHTML = '<i class="fa-solid fa-microchip" title="Local GPIO"></i>';
        statusSpan.className = "gpio-status local";
    }
    updateAddSensorVisibility();
}

function updateAddSensorVisibility() {
    const addBtn = document.getElementById("add-sensor-btn");
    if (isRemoteGpio) {
        addBtn.classList.remove("hidden");
    } else {
        addBtn.classList.add("hidden");
        document.getElementById("add-sensor-container").classList.add("hidden");
    }
}

// --- Sensor Edit Functions ---
function enterEditMode(name) {
    paused = true;
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`timestamp-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

function cancelEdit(name) {
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    document.getElementById(`timestamp-${name}`).classList.remove("hidden");
    document.getElementById(`edit-${name}`).classList.add("hidden");
    paused = false;
}

function saveSensor(originalName) {
    const newName = document.getElementById(`name-${originalName}`).value;
    const newType = document.getElementById(`type-${originalName}`).value;
    const maxPower = document.getElementById(`maxPower-${originalName}`).value;
    const rating = document.getElementById(`rating-${originalName}`).value;
    const hexAddress = document.getElementById(`address-${originalName}`).value;
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
            address: address
        })
    })
        .then(res => res.json())
        .then(() => {
            paused = false;
            socket.emit("sensor_update_request");
        });

    cancelEdit(originalName);
}

// --- Settings Functions ---
function settings() {
    paused = true;
    document.getElementById("settings-container").classList.remove("hidden");
    document.getElementById("sensor-container").classList.add("hidden");
    document.getElementById("header-btns").classList.add("hidden");
    fetch("/get_settings")
        .then(res => res.json())
        .then(data => {
            document.getElementById("solar-interval").value = data.poll_intervals.Solar ?? "";
            document.getElementById("wind-interval").value = data.poll_intervals.Wind ?? "";
            document.getElementById("battery-interval").value = data.poll_intervals.Battery ?? "";
            document.getElementById("max-log").value = data.max_log ?? "";
            document.getElementById("max-readings").value = data.max_readings ?? "";
            document.getElementById("mqtt-broker").value = data.mqtt_broker ?? "";
            document.getElementById("mqtt-port").value = data.mqtt_port ?? "";
            document.getElementById("webserver-host").value = data.webserver_host ?? "";
            document.getElementById("webserver-port").value = data.webserver_port ?? "";
            document.getElementById("remote-gpio").checked = data.remote_gpio == 1;
            document.getElementById("gpio-address").value = data.gpio_address ?? "";

            isRemoteGpio = data.remote_gpio == 1;
            updateGpioStatus();

            // Enable/disable i2c address input based on remote gpio
            const i2cInput = document.getElementById("gpio-address");
            const remoteGpioCheckbox = document.getElementById("remote-gpio");
            i2cInput.disabled = !remoteGpioCheckbox.checked;
            remoteGpioCheckbox.addEventListener("change", function () {
                i2cInput.disabled = !this.checked;
            });
        });
}

function cancelSettings() {
    paused = false;
    document.getElementById("settings-container").classList.add("hidden");
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
}

function saveSettings() {
    const maxLog = document.getElementById("max-log").value;
    const solarInterval = document.getElementById("solar-interval").value;
    const windInterval = document.getElementById("wind-interval").value;
    const batteryInterval = document.getElementById("battery-interval").value;
    const maxReadings = document.getElementById("max-readings").value;
    const mqttBroker = document.getElementById("mqtt-broker").value;
    const mqttPort = document.getElementById("mqtt-port").value;
    const webserverHost = document.getElementById("webserver-host").value;
    const webserverPort = document.getElementById("webserver-port").value;
    const remoteGpio = document.getElementById("remote-gpio").checked ? 1 : 0;
    const gpioAddress = document.getElementById("gpio-address").value;

    fetch("/update_settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            remote_gpio: remoteGpio,
            gpio_address: gpioAddress,
        })
    })
        .then(res => res.json())
        .then(() => {
            socket.emit("sensor_update_request");
        });

    updateEditFormI2CInputs();
    updateGpioStatus();
    cancelSettings();
}

function updateEditFormI2CInputs() {
    document.querySelectorAll('input[id^="address-"]').forEach(input => {
        input.disabled = !isRemoteGpio;
    });
}

// --- About/README Functions ---
function about() {
    paused = true;
    document.getElementById("sensor-container").classList.add("hidden");
    document.getElementById("header-btns").classList.add("hidden");
    document.getElementById("about-container").classList.remove("hidden");
    fetch("/readme")
        .then(res => res.text())
        .then(markdown => {
            document.getElementById("about-content").innerHTML = marked.parse(markdown);
        })
        .catch(error => {
            document.getElementById("about-content").innerText = "Failed to load README.";
            console.error("Error loading README:", error);
        });
}

function cancelAbout() {
    paused = false;
    document.getElementById("about-container").classList.add("hidden");
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
}

// --- Log Functions ---
function generateLogHTML(readings) {
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

function fullLog() {
    paused = true;
    document.getElementById("log-file-container").classList.remove("hidden");
    document.getElementById("sensor-container").classList.add("hidden");
    document.getElementById("header-btns").classList.add("hidden");

    const logContainer = document.getElementById("log-file-entries");
    logContainer.innerHTML = "<p>Loading logs...</p>";

    fetch("/get_log_file")
        .then(res => res.json())
        .then(data => {
            const logEntries = data.logs ?? [];
            if (logEntries.length === 0) {
                logContainer.innerHTML = "<p>No log data found.</p>";
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
            logContainer.innerHTML = logFileHTML;
        })
        .catch(error => {
            logContainer.innerHTML = "<p>Failed to load logs.</p>";
            console.error("Log fetch error:", error);
        });
}

function closeFullLog() {
    paused = false;
    document.getElementById("log-file-container").classList.add("hidden");
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
}

// --- Sensor Log Functions ---
function openLog(name) {
    paused = true;
    document.getElementById(`view-${name}`).classList.add("hidden");
    document.getElementById(`btns-${name}`).classList.add("hidden");
    document.getElementById(`log-${name}`).classList.remove("hidden");
}

function closeLog(name) {
    document.getElementById(`log-${name}`).classList.add("hidden");
    document.getElementById(`view-${name}`).classList.remove("hidden");
    document.getElementById(`btns-${name}`).classList.remove("hidden");
    paused = false;
}

function refreshLog(name) {
    fetch(`/get_sensor_log?name=${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
            const logHTML = generateLogHTML(data.readings ?? []);
            document.getElementById(`log-entries-${name}`).innerHTML = logHTML;
        })
        .catch(error => {
            document.getElementById(`log-entries-${name}`).innerHTML = "<p>Failed to load logs.</p>";
            console.error("Error refreshing logs:", error);
        });
}

// --- Sensor Delete Functions ---
function showDeleteConfirmation(name) {
    document.getElementById(`edit-${name}`).classList.add("hidden");
    document.getElementById(`delete-${name}`).classList.remove("hidden");
}

function cancelDelete(name) {
    document.getElementById(`delete-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

function startCountdown(name) {
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

function undo(name) {
    clearInterval(undoTimers[name]);
    document.getElementById(`undo-${name}`).classList.add("hidden");
    document.getElementById(`edit-${name}`).classList.remove("hidden");
}

function finalizeDelete(name) {
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

// --- Restart Functions ---
function cancelRestart() {
    document.getElementById("restart-container").classList.add("hidden");
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
    paused = false;
}

function restartConfirmation() {
    paused = true;
    const resetMsg = document.getElementById("restart-content");
    resetMsg.innerHTML = '<h5>Are you sure you want to restart the program?</h5>';
    document.getElementById("restart-container").classList.remove("hidden");
    document.getElementById("sensor-container").classList.add("hidden");
    document.getElementById("header-btns").classList.add("hidden");
}

function restartProgram() {
    const restartMsg = document.getElementById("restart-content");
    restartMsg.innerHTML = "<h5>Restarting...</h5>";
    const closeBtn = document.getElementById("restart-btns");
    closeBtn.innerHTML = '<button class="cancel-btn">Done</button>';

    fetch("/restart", { method: "POST" })
        .then(res => {
            if (res.ok) {
                restartMsg.innerHTML = "<h5>Successfully Restarted</h5>";
            } else {
                restartMsg.innerHTML = "<h5>Failed To Restart</h5><p>Check logs for errors.</p>";
            }
        });
}

function closeRestart() {
    const restartMsg = document.getElementById("restart-content");
    const restartBtns = document.getElementById("restart-btns");
    document.getElementById("restart-container").classList.add("hidden");
    restartMsg.innerHTML = '<h5>Are you sure you want to restart the program?</h5>';
    restartBtns.innerHTML = '<button class="cancel-btn">Cancel</button><button class="save-btn">Confirm</button>';
    document.getElementById("sensor-container").classList.remove("hidden");
    document.getElementById("header-btns").classList.remove("hidden");
    paused = false;
}

// --- Utility ---
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}