// ===========================
// Energy Monitor Dashboard JS
// ===========================
// Handles the main dashboard interface for monitoring solar, wind, and battery systems
// Provides real-time power generation statistics and system health information

import { isSensorConnected } from './utils.js';

/**
 * Initialize the dashboard interface
 * Sets up navigation events, responsive layout handlers, and creates initial dashboard
 */
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

    // Set up view switching between Dashboard and Sensors pages
    const dashboardLink = document.getElementById('dashboard-link');
    const sensorsLink = document.getElementById('sensors-link');

    if (dashboardLink) {
        dashboardLink.addEventListener('click', showDashboardView);
    }

    if (sensorsLink) {
        sensorsLink.addEventListener('click', showSensorsView);
    }
}

/**
 * Set up dashboard-specific button handlers
 * Note: Refresh and fullscreen buttons have been removed - dashboard now shows device/sensor counts instead
 */
function setupDashboardButtons() {
    // Dashboard now uses device and sensor count displays for system status
    // Individual refresh functionality is handled by WebSocket real-time updates
}

/**
 * Switch to dashboard view and update UI accordingly
 * Handles mobile navigation collapse
 */
function showDashboardView() {
    if (window.showPage) {
        window.showPage('dashboard');
    }
    collapseNavMenuOnMobile();
}

/**
 * Switch to sensors view and update UI accordingly
 * Handles mobile navigation collapse
 */
function showSensorsView() {
    if (window.showPage) {
        window.showPage('sensors');
    }
    collapseNavMenuOnMobile();
}

/**
 * Collapse navigation menu on mobile devices for better UX
 * Called after page navigation to save screen space
 */
function collapseNavMenuOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }
    }
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

/**
 * Create and populate dashboard statistics cards
 * @param {Object} data - Sensor data object containing totals and individual sensor readings
 */
export function createDashboardStats(data = {}) {
    const dashboardStats = document.getElementById('dashboard-container');
    const dashboardGrid = document.getElementById('dashboard-cards-grid');
    
    // Exit early if required DOM elements don't exist
    if (!dashboardStats) return;

    // Clear existing cards and reset layout classes
    dashboardGrid.innerHTML = '';
    dashboardStats.classList.remove('single-card');

    // Extract pre-calculated totals from backend (more accurate than client-side calculations)
    const totals = data.totals || {};
    const solarPower = totals.solar_total || 0;
    const windPower = totals.wind_total || 0;
    const totalPower = totals.total_power || 0;  // Backend handles proper current direction and absolute values
    const batterySOC = totals.battery_soc_total || 0;
    const batteryInPower = totals.battery_in_total || 0;
    const batteryOutPower = totals.battery_out_total || 0;
    
    // Initialize metrics for individual sensor calculations
    const metrics = {
        total: { voltage: 0, current: 0, count: 0 },
        solar: { voltage: 0, current: 0, count: 0, powerTrend: 0 },
        wind: { voltage: 0, current: 0, count: 0, powerTrend: 0 },
        battery: { voltage: 0, count: 0, charging: batteryInPower, discharging: batteryOutPower }
    };

    // Process individual sensor data to calculate aggregated metrics
    for (let [name, sensor] of Object.entries(data)) {
        // Skip non-sensor data entries
        if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) {
            continue;
        }
        
        const voltage = sensor.data.voltage || 0;
        const current = sensor.data.current || 0;
        
        // Accumulate total metrics
        metrics.total.voltage += voltage;
        metrics.total.current += current;
        metrics.total.count++;

        // Accumulate type-specific metrics
        switch (sensor.type) {
            case 'Solar':
                metrics.solar.voltage += voltage;
                metrics.solar.current += current;
                metrics.solar.count++;
                break;
            case 'Wind':
                metrics.wind.voltage += voltage;
                metrics.wind.current += current;
                metrics.wind.count++;
                break;
            case 'Battery':
                // For batteries, use the highest voltage reading (represents system voltage)
                metrics.battery.voltage = Math.max(metrics.battery.voltage, voltage);
                metrics.battery.count++;
                break;
        }
    }

    // Create dashboard stat cards with calculated metrics
    const stats = [
        {
            title: 'Total Power',
            type: 'power',
            value: totalPower.toFixed(1),
            unit: 'W',
            icon: 'fa-bolt',
            theme: 'total-theme',
            trend: 'N/A',  // Trends calculated in backend for accuracy
            voltage: (metrics.total.voltage / Math.max(metrics.total.count, 1)).toFixed(1),
            current: metrics.total.current.toFixed(1)
        },
        {
            title: 'Battery Status',
            type: 'battery',
            value: batterySOC.toFixed(1),
            unit: '%',
            icon: 'fa-car-battery',
            theme: 'battery-theme',
            trend: 'N/A',
            voltage: metrics.battery.voltage.toFixed(1),
            charge: metrics.battery.charging.toFixed(1),
            discharge: metrics.battery.discharging.toFixed(1),
            totalSensors: metrics.battery.count
        },
        {
            title: 'Solar Power',
            type: 'solar',
            value: solarPower.toFixed(1),
            unit: 'W',
            icon: 'fa-sun',
            theme: 'solar-theme',
            trend: formatTrend(metrics.solar.powerTrend),
            voltage: metrics.solar.voltage.toFixed(1),
            current: metrics.solar.current.toFixed(1),
            totalSensors: metrics.solar.count
        },
        {
            title: 'Wind Power',
            type: 'wind',
            value: windPower.toFixed(1),
            unit: 'W',
            icon: 'fa-wind',
            theme: 'wind-theme',
            trend: formatTrend(metrics.wind.powerTrend),
            voltage: metrics.wind.voltage.toFixed(1),
            current: metrics.wind.current.toFixed(1),
            totalSensors: metrics.wind.count
        }
    ];

    // Create and append dashboard cards
    stats.forEach(stat => {
        const card = createStatCard(stat);
        dashboardGrid.appendChild(card);
    });
    
    // Apply responsive layout adjustments
    if (stats.length === 1 && window.innerWidth <= 768) {
        dashboardStats.classList.add('single-card');
    }
    
    // Calculate device count for header display
    const deviceIds = new Set();
    for (let [name, sensor] of Object.entries(data)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status' || !sensor || !sensor.type || !sensor.data) {
            continue;
        }
        if (sensor.device_id !== undefined) {
            deviceIds.add(sensor.device_id);
        }
    }
    
    // Update header with current system status
    updateHeaderCounts(deviceIds.size, metrics.total.count, data.system_status, data);
}

/**
 * Create a dashboard statistics card element
 * @param {Object} stat - Statistics object containing title, value, unit, icon, etc.
 * @returns {HTMLElement} - Configured dashboard card element
 */
function createStatCard(stat) {
    const card = document.createElement('div');
    card.className = `dashboard-card ${stat.theme}`;
    
    // Add data attributes for real-time updates and CSS targeting
    const dataType = stat.title.toLowerCase().replace(/\s+/g, '-');
    card.setAttribute('data-stat-type', dataType);
    card.setAttribute('data-update-field', getUpdateField(stat.title));
    
    // Determine card type for specialized layouts
    const isTotalPowerCard = stat.title === 'Total Power';
    const isBatteryCard = stat.title === 'Battery Status';
    
    // Generate HTML based on card type
    if (isTotalPowerCard) {
        // Total power card only
        card.innerHTML = createPowerCardHTML(stat);
    } else if (isBatteryCard) {
        // Battery status card with charge/discharge info
        card.innerHTML = createBatteryCardHTML(stat);
    } else {
        // Generic card layout for other stat types
        card.innerHTML = createGenericCardHTML(stat);
    }
    
    return card;
}

/**
 * Create HTML content for power generation cards (Total, Solar, Wind)
 * @param {Object} stat - Statistics object
 * @returns {string} - HTML string for power card
 */
function createPowerCardHTML(stat) {
    return `
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
                    <span class="dashboard-value">${stat.trend}</span>
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
}

/**
 * Create HTML content for battery status card
 * @param {Object} stat - Statistics object
 * @returns {string} - HTML string for battery card
 */
function createBatteryCardHTML(stat) {
    return `
        <div class="dashboard-card-header">
            <div class="dashboard-card-icon">
                <i class="fa-solid ${stat.icon}"></i>
            </div>
            <div class="dashboard-card-title">
                <h3>${stat.title}</h3>
                <p>Sensors: ${stat.totalSensors || 0}</p>
            </div>
            <div class="action-btns dashboard-actions">
                <i class="fa-solid fa-search dashboard-drill-btn" id="dashboard-drill-btn-${stat.type}" title="Sensors"></i>
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
}

/**
 * Create HTML content for generic dashboard cards
 * @param {Object} stat - Statistics object
 * @returns {string} - HTML string for generic card
 */
function createGenericCardHTML(stat) {
    return `
        <div class="dashboard-card-header">
            <div class="dashboard-card-icon">
                <i class="fa-solid ${stat.icon}"></i>
            </div>
            <div class="dashboard-card-title">
                <h3>${stat.title}</h3>
                <p>Sensors: ${stat.totalSensors || 0}</p>
            </div>
            <div class="action-btns dashboard-actions">
                <i class="fa-solid fa-search dashboard-drill-btn" id="dashboard-drill-btn-${stat.type}" title="Sensors"></i>
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

/**
 * Format trend value for display
 * @param {number} trend - Trend value (positive/negative percentage)
 * @returns {string} - Formatted trend string
 */
function formatTrend(trend) {
    if (trend === 0) return '0%';
    return trend >= 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
}

/**
 * Get update field identifier for dashboard card
 * @param {string} title - Card title
 * @returns {string} - Field identifier for updates
 */
function getUpdateField(title) {
    const fieldMap = {
        'Total Power': 'total-power',
        'Solar Power': 'solar-generation', 
        'Wind Power': 'wind-generation',
        'Battery Status': 'battery-status'
    };
    
    return fieldMap[title] || title.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Update dashboard statistics with new data (real-time updates)
 * @param {Object} data - Updated sensor data from WebSocket
 */
export function updateDashboardStats(data) {
    // Extract pre-calculated totals from backend
    const totals = data.totals || {};
    const solarPower = totals.solar_total || 0;
    const windPower = totals.wind_total || 0;
    const totalPower = totals.total_power || 0;
    const batterySOC = totals.battery_soc_total || 0;
    
    // Count active sensors and devices
    let sensorCount = 0;
    const deviceIds = new Set();
    
    for (let [name, sensor] of Object.entries(data)) {
        // Skip non-sensor entries
        if (name === 'totals' || name === 'devices' || name === 'system_status' || 
            !sensor || !sensor.type || !sensor.data) {
            continue;
        }
        
        sensorCount++;
        if (sensor.device_id !== undefined) {
            deviceIds.add(sensor.device_id);
        }
    }

    // Update dashboard card values with animation
    updateStatValue('total-power', totalPower.toFixed(2));
    updateStatValue('solar-generation', solarPower.toFixed(2));
    updateStatValue('wind-generation', windPower.toFixed(2));
    updateStatValue('battery-status', batterySOC.toFixed(1));
    
    // Update header status indicators
    updateHeaderCounts(deviceIds.size, sensorCount, data.system_status, data);
}

/**
 * Update individual statistic value with animation
 * @param {string} statType - Type of statistic to update
 * @param {string} newValue - New value to display
 */
function updateStatValue(statType, newValue) {
    const valueElement = document.querySelector(`[data-value="${statType}"]`);
    if (!valueElement) return;
    
    // Update the value
    valueElement.textContent = newValue;
    
    // Add visual feedback animation
    valueElement.classList.add('stat-updating');
    setTimeout(() => {
        valueElement.classList.remove('stat-updating');
    }, 300);
}

/**
 * Update header counts and status indicators
 * @param {number} deviceCount - Total number of configured devices
 * @param {number} sensorCount - Total number of configured sensors
 * @param {Object} systemStatus - System status from backend
 * @param {Object} sensorData - Complete sensor data for connection analysis
 */
function updateHeaderCounts(deviceCount, sensorCount, systemStatus = null, sensorData = null) {
    // Update numeric counts in header
    updateCountElements(deviceCount, sensorCount);
    
    // Update device connection status indicators
    if (systemStatus) {
        updateDeviceStatusIndicator(deviceCount, systemStatus);
    }
    
    // Update sensor connection status indicators
    if (sensorData) {
        updateSensorStatusIndicator(sensorCount, sensorData);
    }
}

/**
 * Update count elements in the header
 * @param {number} deviceCount - Number of devices
 * @param {number} sensorCount - Number of sensors
 */
function updateCountElements(deviceCount, sensorCount) {
    const deviceCountElement = document.getElementById('device-count');
    const sensorCountElement = document.getElementById('sensor-count');
    
    if (deviceCountElement) {
        deviceCountElement.textContent = deviceCount;
    }
    if (sensorCountElement) {
        sensorCountElement.textContent = sensorCount;
    }
}

/**
 * Update device status indicator in header
 * @param {number} totalDevices - Total configured devices
 * @param {Object} systemStatus - System status information
 */
function updateDeviceStatusIndicator(totalDevices, systemStatus) {
    const deviceCountDisplay = document.getElementById('device-count-display');
    if (!deviceCountDisplay) return;
    
    const connectedDevices = systemStatus.connected_devices || 0;
    const deviceIcon = deviceCountDisplay.querySelector('i');
    
    if (!deviceIcon) return;
    
    // Reset status classes
    deviceIcon.classList.remove('status-connected', 'status-partial', 'status-disconnected');
    
    // Apply appropriate status class and tooltip
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

/**
 * Update sensor status indicator in header
 * @param {number} totalSensors - Total configured sensors
 * @param {Object} sensorData - Complete sensor data
 */
function updateSensorStatusIndicator(totalSensors, sensorData) {
    const sensorCountDisplay = document.getElementById('sensor-count-display');
    if (!sensorCountDisplay) return;
    
    // Count actually connected sensors using connection logic
    let connectedSensors = 0;
    for (let [name, sensor] of Object.entries(sensorData)) {
        if (name === 'totals' || name === 'devices' || name === 'system_status' || 
            !sensor || !sensor.type || !sensor.data) {
            continue;
        }
        if (isSensorConnected(sensor)) {
            connectedSensors++;
        }
    }
    
    const sensorIcon = sensorCountDisplay.querySelector('i');
    if (!sensorIcon) return;
    
    // Reset status classes
    sensorIcon.classList.remove('status-connected', 'status-partial', 'status-disconnected');
    
    // Apply appropriate status class and tooltip
    if (connectedSensors === totalSensors && connectedSensors > 0) {
        sensorIcon.classList.add('status-connected');
        sensorCountDisplay.title = `All ${totalSensors} sensors connected`;
    } else if (connectedSensors > 0) {
        sensorIcon.classList.add('status-partial');
        sensorCountDisplay.title = `${connectedSensors}/${totalSensors} sensors connected`;
    } else {
        sensorIcon.classList.add('status-disconnected');
        sensorCountDisplay.title = `No sensors connected (${totalSensors} configured)`;
    }
}