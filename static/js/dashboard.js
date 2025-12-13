// ===========================
// Energy Monitor Dashboard JS
// ===========================

import { isSensorConnected } from './utils.js';

export function initializeDashboard() {
    console.log('Initializing dashboard...');
    try {
        setupNavigationEvents();
        setupDashboardButtons();
        setupResponsiveLayoutHandler();
        // Create initial dashboard with placeholder data
        createDashboardStats();
        console.log('Dashboard initialization complete');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

function setupNavigationEvents() {
    // Navigation link handlers
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
        });
    });

    // Dashboard/Sensors view toggle
    const dashboardLink = document.getElementById('dashboard-link');
    const sensorsLink = document.getElementById('sensors-link');
    const dashboardStats = document.getElementById('dashboard-container');
    const sensorContainer = document.getElementById('sensor-container');

    if (dashboardLink) {
        dashboardLink.addEventListener('click', () => {
            showDashboardView();
        });
    }

    if (sensorsLink) {
        sensorsLink.addEventListener('click', () => {
            showSensorsView();
        });
    }
}

function setupDashboardButtons() {
    // Refresh and fullscreen buttons have been removed from all pages
    // Dashboard now uses device and sensor count displays instead
}

function showDashboardView() {
    if (window.showPage) {
        window.showPage('dashboard');
    }
    // Collapse nav menu on mobile after page change
    collapseNavMenuOnMobile();
}

function showSensorsView() {
    if (window.showPage) {
        window.showPage('sensors');
    }
    // Collapse nav menu on mobile after page change
    collapseNavMenuOnMobile();
}

function collapseNavMenuOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }
    }
}



function setupResponsiveLayoutHandler() {
    window.addEventListener('resize', () => {
        const dashboardStats = document.getElementById('dashboard-container');
        if (dashboardStats) {
            const cardCount = dashboardStats.children.length;
            
            // Remove existing classes
            dashboardStats.classList.remove('single-card');
            
            // Apply single-card layout if only one card and mobile
            if (cardCount === 1 && window.innerWidth <= 768) {
                dashboardStats.classList.add('single-card');
            }
        }
    });
}

export function createDashboardStats(data = {}) {
    const dashboardStats = document.getElementById('dashboard-container');
    const dashboardGrid = document.getElementById('dashboard-cards-grid');
    if (!dashboardStats) return;

    // dashboardStats.innerHTML = '';
    dashboardGrid.innerHTML = '';

    // Remove any existing layout classes
    dashboardStats.classList.remove('single-card');

    // Use pre-calculated totals from sensor manager
    const totals = data.totals || {};
    const solarPower = totals.solar_total || 0;
    const windPower = totals.wind_total || 0;
    const batterySOC = totals.battery_soc_total || 0;
    const batteryInPower = totals.battery_in_total || 0;
    const batteryOutPower = totals.battery_out_total || 0;
    
    // Calculate additional metrics from individual sensors
    let totalPower = solarPower + windPower;
    let totalVoltage = 0;
    let totalCurrent = 0;
    let sensorCount = 0;
    let solarVoltage = 0;
    let solarPowerTrend = 0;
    let windVoltage = 0;
    let windPowerTrend = 0;
    let batteryVoltage = 0;
    let solarCurrent = 0;
    let windCurrent = 0;
    let batteryCharging = batteryInPower;
    let batteryDischarging = batteryOutPower;
    let solarSensors = 0;
    let windSensors = 0;
    let batterySensors = 0;

    // Calculate voltage and current metrics from individual sensors
    for (let [name, sensor] of Object.entries(data)) {
        if (name === 'totals' || !sensor || !sensor.type || !sensor.data) continue;
        
        sensorCount++;
        const voltage = sensor.data.voltage || 0;
        const current = sensor.data.current || 0;
        
        totalVoltage += voltage;
        totalCurrent += current;


        if (sensor.type === 'Solar') {
            solarVoltage += voltage;
            solarCurrent += current;
            solarSensors++;
        } else if (sensor.type === 'Wind') {
            windVoltage += voltage;
            windCurrent += current;
            windSensors++;
        } else if (sensor.type === 'Battery') {
            batteryVoltage = Math.max(batteryVoltage, voltage);
            batterySensors++;
        }
    }

    // Create stat cards using pre-calculated totals (removed Active Sensors and System Health cards)
    const stats = [
        {
            title: 'Total Power',
            value: totalPower.toFixed(1),
            unit: 'W',
            icon: 'fa-bolt',
            theme: 'total-theme',
            trend: 'N/A',
            voltage: (totalVoltage / Math.max(sensorCount, 1)).toFixed(1),
            current: totalCurrent.toFixed(1)
        },
        {
            title: 'Solar Power',
            value: solarPower.toFixed(1),
            unit: 'W',
            icon: 'fa-sun',
            theme: 'solar-theme',
            trend: solarPowerTrend >= 0 ? `+${solarPowerTrend.toFixed(1)}%` : `${solarPowerTrend.toFixed(1)}%`,
            voltage: solarVoltage.toFixed(1),
            current: solarCurrent.toFixed(1),
            totalSensors: solarSensors
        },
        {
            title: 'Wind Power',
            value: windPower.toFixed(1),
            unit: 'W',
            icon: 'fa-wind',
            theme: 'wind-theme',
            trend: windPowerTrend >= 0 ? `+${windPowerTrend.toFixed(1)}%` : `${windPowerTrend.toFixed(1)}%`,
            voltage: windVoltage.toFixed(1),
            current: windCurrent.toFixed(1),
            totalSensors: windSensors   
        },
        {
            title: 'Battery Status',
            value: batterySOC.toFixed(1),
            unit: '%',
            icon: 'fa-car-battery',
            theme: 'battery-theme',
            trend: 'N/A',
            voltage: batteryVoltage.toFixed(1),
            charge: batteryCharging.toFixed(1),
            discharge: batteryDischarging.toFixed(1),
            totalSensors: batterySensors
        }
    ];

    stats.forEach(stat => {
        const card = createStatCard(stat);
        dashboardGrid.appendChild(card);
    });
    
    // Apply single-card layout if only one card and mobile
    if (stats.length === 1 && window.innerWidth <= 768) {
        dashboardStats.classList.add('single-card');
    }
    
    // Calculate and update header counts
    let deviceIds = new Set();
    for (let [name, sensor] of Object.entries(data)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) continue;
        if (sensor.device_id !== undefined) {
            deviceIds.add(sensor.device_id);
        }
    }
    const deviceCount = deviceIds.size;
    updateHeaderCounts(deviceCount, sensorCount, data.system_status, data);
}

function createStatCard(stat) {
    const card = document.createElement('div');
    card.className = `dashboard-card ${stat.theme}`;
    
    // Add data attributes for real-time updates
    const dataType = stat.title.toLowerCase().replace(/\s+/g, '-');
    card.setAttribute('data-stat-type', dataType);
    card.setAttribute('data-update-field', getUpdateField(stat.title));
    
    const trendClass = stat.trend.startsWith('+') ? 'trend-up' : 
                      stat.trend.startsWith('-') ? 'trend-down' : '';
    
    // Special layout for power generation cards and battery status
    const isPowerCard = ['Total Power', 'Solar Generation', 'Wind Generation'].includes(stat.title);
    const isBatteryCard = stat.title === 'Battery Status';
    
    if (isPowerCard) {
        card.innerHTML = `
            <div class="dashboard-card-header">
                <div class="dashboard-card-icon">
                    <i class="fa-solid ${stat.icon}"></i>
                </div>
                <div class="dashboard-card-title">
                    <h3>${stat.title}</h3>
                    <p>Real-time power data</p>
                </div>
            </div>
            <div class="dashboard-card-content">
                <div class="dashboard-main-entry">
                    <div class="dashboard-main-value">${stat.value} <span class="dashboard-card-unit">W</span></div>
                </div>
                <div class="dashboard-entries">
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Trend:</span>
                        <span class="dashboard-value">${stat.trend}%</span>
                    </div>
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Voltage:</span>
                        <span class="dashboard-value">${stat.voltage || '0.0'}V</span>
                    </div>
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Current:</span>
                        <span class="dashboard-value">${stat.current || '0.0'}A</span>
                    </div>
                </div>
            </div>
        `;
    } else if (isBatteryCard) {
        card.innerHTML = `
            <div class="dashboard-card-header">
                <div class="dashboard-card-icon">
                    <i class="fa-solid ${stat.icon}"></i>
                </div>
                <div class="dashboard-card-title">
                    <h3>${stat.title}</h3>
                    <p>Sensors: ${stat.totalSensors || 0}</p>
                </div>
            </div>
            <div class="dashboard-card-content">
                <div class="dashboard-main-entry">
                    <div class="dashboard-main-value">${stat.value} <span class="dashboard-card-unit">%</span></div>
                </div>
                <div class="dashboard-entries">
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Voltage:</span>
                        <span class="dashboard-value">${stat.voltage}V</span>
                    </div>
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Charging:</span>
                        <span class="dashboard-value">${stat.charge}W</span>
                    </div>
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Discharging:</span>
                        <span class="dashboard-value">${stat.discharge}W</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="dashboard-card-header">
                <div class="dashboard-card-icon">
                    <i class="fa-solid ${stat.icon}"></i>
                </div>
                <div class="dashboard-card-title">
                    <h3>${stat.title}</h3>
                    <p>Sensors: ${stat.totalSensors || 0}</p>
                </div>
            </div>
            <div class="dashboard-card-content">
                <div class="dashboard-main-entry">
                    <div class="dashboard-main-value">${stat.value} <span class="dashboard-card-unit">${stat.unit}</span></div>
                </div>
                <div class="dashboard-entries">
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Trend:</span>
                        <span class="dashboard-value">${stat.trend}</span>
                    </div>
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Voltage:</span>
                        <span class="dashboard-value">${stat.voltage || 'N/A'}V</span>
                    </div>
                    <div class="dashboard-entry">
                        <span class="dashboard-label">Current:</span>
                        <span class="dashboard-value">${stat.current || 'N/A'}A</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    return card;
}

function getUpdateField(title) {
    switch (title) {
        case 'Total Power': return 'total-power';
        case 'Solar Generation': return 'solar-generation';
        case 'Wind Generation': return 'wind-generation';
        case 'Battery Status': return 'battery-status';
        default: return title.toLowerCase().replace(/\s+/g, '-');
    }
}

export function updateDashboardStats(data) {
    // Use pre-calculated totals from sensor manager
    const totals = data.totals || {};
    const solarPower = totals.solar_total || 0;
    const windPower = totals.wind_total || 0;
    const batterySOC = totals.battery_soc_total || 0;
    const batteryInPower = totals.battery_in_total || 0;
    const batteryOutPower = totals.battery_out_total || 0;
    
    const totalPower = solarPower + windPower;
    
    // Count sensors and devices
    let sensorCount = 0;
    let deviceIds = new Set();
    for (let [name, sensor] of Object.entries(data)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) continue;
        sensorCount++;
        if (sensor.device_id !== undefined) {
            deviceIds.add(sensor.device_id);
        }
    }
    const deviceCount = deviceIds.size;

    // Update values in existing cards using pre-calculated totals
    updateStatValue('total-power', totalPower.toFixed(2));
    updateStatValue('solar-generation', solarPower.toFixed(2));
    updateStatValue('wind-generation', windPower.toFixed(2));
    updateStatValue('battery-status', batterySOC.toFixed(1));
    
    // Update header with device and sensor counts using backend data
    updateHeaderCounts(deviceCount, sensorCount, data.system_status, data);
}

function updateStatValue(statType, newValue) {
    const valueElement = document.querySelector(`[data-value="${statType}"]`);
    if (valueElement) {
        valueElement.textContent = newValue;
        
        // Add update animation
        valueElement.classList.add('stat-updating');
        setTimeout(() => {
            valueElement.classList.remove('stat-updating');
        }, 300);
    }
}

function updateHeaderCounts(deviceCount, sensorCount, systemStatus = null, sensorData = null) {
    const deviceCountElement = document.getElementById('device-count');
    const sensorCountElement = document.getElementById('sensor-count');
    const deviceCountDisplay = document.getElementById('device-count-display');
    const sensorCountDisplay = document.getElementById('sensor-count-display');
    
    if (deviceCountElement) {
        deviceCountElement.textContent = deviceCount;
    }
    if (sensorCountElement) {
        sensorCountElement.textContent = sensorCount;
    }
    
    // Update device status indicator
    if (deviceCountDisplay && systemStatus) {
        const connectedDevices = systemStatus.connected_devices || 0;
        const totalDevices = systemStatus.total_devices || 1;
        const deviceIcon = deviceCountDisplay.querySelector('i');
        
        // Remove existing status classes
        deviceIcon.classList.remove('status-connected', 'status-partial', 'status-disconnected');
        
        if (connectedDevices === totalDevices && connectedDevices > 0) {
            deviceIcon.classList.add('status-connected');
            deviceCountDisplay.title = `All ${totalDevices} devices connected`;
        } else if (connectedDevices > 0) {
            deviceIcon.classList.add('status-partial');
            deviceCountDisplay.title = `${connectedDevices}/${totalDevices} devices connected`;
        } else {
            deviceIcon.classList.add('status-disconnected');
            deviceCountDisplay.title = `No devices connected (${totalDevices} configured)`;
        }
    }
    
    // Update sensor status indicator with actual connection logic
    if (sensorCountDisplay && sensorData) {
        let connectedSensors = 0;
        
        // Count actually connected sensors using our connection logic
        for (let [name, sensor] of Object.entries(sensorData)) {
            if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) continue;
            if (isSensorConnected(sensor)) {
                connectedSensors++;
            }
        }
        
        const sensorIcon = sensorCountDisplay.querySelector('i');
        
        // Remove existing status classes
        sensorIcon.classList.remove('status-connected', 'status-partial', 'status-disconnected');
        
        if (connectedSensors === sensorCount && connectedSensors > 0) {
            sensorIcon.classList.add('status-connected');
            sensorCountDisplay.title = `All ${sensorCount} sensors connected`;
        } else if (connectedSensors > 0) {
            sensorIcon.classList.add('status-partial');
            sensorCountDisplay.title = `${connectedSensors}/${sensorCount} sensors connected`;
        } else {
            sensorIcon.classList.add('status-disconnected');
            sensorCountDisplay.title = `No sensors connected (${sensorCount} configured)`;
        }
    }
}