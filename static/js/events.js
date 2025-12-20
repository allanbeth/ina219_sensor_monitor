// ========================
// Energy Monitor Events JS
// ========================

import * as config from './config.js';
import * as backup from './backup.js';
import * as utils from './utils.js';

export function setupEventHandlers() {

    // Header Buttons
    // =========================

    // Desktop Burger Menu Toggle
    document.getElementById('burger-menu').addEventListener('click', () => {
        const dashboard = document.querySelector('.dashboard');
        const sidebar = document.querySelector('.sidebar');
        
        // Desktop behavior - toggle sidebar width
        dashboard.classList.toggle('sidebar-collapsed');
        sidebar.classList.toggle('collapsed');
    });

    // Mobile Burger Menu Toggle
    const mobileBurger = document.getElementById('mobile-burger-menu');
    if (mobileBurger) {
        mobileBurger.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            // Mobile behavior - toggle nav menu visibility
            sidebar.classList.toggle('collapsed');
        });
    }

    // Sidebar Overlay Click (close sidebar on mobile) - Not needed for new mobile layout
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
        if (window.innerWidth > 768) {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            
            sidebar.classList.add('collapsed');
            overlay.classList.remove('active');
        }
    });

    // Navigation Links
    // =========================
    // Settings
    document.getElementById('settings-btn').addEventListener('click', async () => {
        showPage('settings');
        // Ensure device info is loaded before fetching settings
        await utils.ensureDeviceInfoLoaded();
        config.fetchSettings();
        utils.fetchBackups();
        collapseNavMenuOnMobile();
    });

    // Log File  
    document.getElementById('log-file-btn').addEventListener('click', () => {
        showPage('logs');
        config.getLogFile();
        collapseNavMenuOnMobile();
    });

    // About
    document.getElementById('about-btn').addEventListener('click', () => {
        showPage('about');
        config.getAbout();
        collapseNavMenuOnMobile();
    });

    // Header Action Buttons
    // =========================
    // Solar Sensors Filter
    document.getElementById('solar-sensor-filter-header-btn').addEventListener('click', () => {
        utils.filterSensorsByType('solar');
    });

    // Wind Sensors Filter
    document.getElementById('wind-sensor-filter-header-btn').addEventListener('click', () => {
        utils.filterSensorsByType('wind');
    });

    // Battery Sensors Filter
    document.getElementById('battery-sensor-filter-header-btn').addEventListener('click', () => {
        utils.filterSensorsByType('battery');
    });

    // Clear Sensor Filter
    document.getElementById('clear-sensor-filter-header-btn').addEventListener('click', () => {
        utils.clearSensorFilter();
    });
    
    // Add Sensor (header button - only visible on sensors page)
    document.getElementById('add-sensor-header-btn').addEventListener('click', () => {
        document.getElementById('add-sensor-card').classList.remove('hidden');
        document.getElementById('add-sensor-header-btn').classList.add('hidden');
    });

    // Settings Save (header button - only visible on settings page)
    document.getElementById('settings-save-header-btn').addEventListener('click', () => {
        config.saveSettings(0); // Save all settings
    });

    // Refresh Logs (header button - only visible on logs page)
    document.getElementById('refresh-logs-header-btn').addEventListener('click', () => {
        config.getLogFile();
    });
    
    

    // Add Device Card Buttons
    // =========================
    

    // Close Add Sensor Card
    // document.getElementById('add-sensor-cancel').addEventListener('click', () => {
    //     document.getElementById('add-sensor-card').classList.add('hidden');
    // });
    // Save New Sensor
    // document.getElementById('add-sensor-save').addEventListener('click', () => {
    //     config.addSensor();
    // });

    //settings Card Buttons
    // =========================
    // System Save Button
    document.getElementById('system-save-btn').addEventListener('click', () => {
        config.saveSettings(1); // Save only system settings
    });

    // Polling Save Button
    document.getElementById('polling-save-btn').addEventListener('click', () => {
        config.saveSettings(2); // Save only polling settings
    });

    // MQTT Save Button
    document.getElementById('mqtt-save-btn').addEventListener('click', () => {
        config.saveSettings(3); // Save only MQTT settings
    });

    // Web Server Save Button
    document.getElementById('webserver-save-btn').addEventListener('click', () => {
        config.saveSettings(4); // Save only web server settings
    });

    // New Device Button
    document.getElementById('new-device-btn').addEventListener('click', () => {
        document.getElementById('new-device').classList.remove('hidden');
        document.getElementById('device-config-btns').classList.remove('hidden');
        document.getElementById('new-device-cancel').classList.remove('hidden');
        document.getElementById('new-device-save').classList.remove('hidden');
        document.getElementById('new-device-btn').classList.add('hidden');
        document.getElementById('device-card-content').classList.add('hidden');    
        config.openNewDeviceConfig();
    });

    // Backup and Restore Configuration Buttons
    // =========================

    // Backup Configuration Card
    document.getElementById('run-backup').addEventListener('click', () => {
        document.getElementById('backup-program-selection').classList.add('hidden');
        document.getElementById('backup-sensor-selection').classList.add('hidden');
        document.getElementById('run-backup').classList.add('hidden');
        document.getElementById('backup-confirmation').classList.remove('hidden');
        document.getElementById('backup-cancel').classList.remove('hidden');
        document.getElementById('backup-confirm').classList.remove('hidden');
    });
    
    // Backup Cancel button
    document.getElementById('backup-cancel').addEventListener('click', () => {
        document.getElementById('backup-confirmation').classList.add('hidden');
        document.getElementById('run-backup').classList.remove('hidden');
        document.getElementById('backup-cancel').classList.add('hidden');
        document.getElementById('backup-confirm').classList.add('hidden');
        document.getElementById('backup-complete').classList.add('hidden');
        document.getElementById('backup-program-selection').classList.remove('hidden');
        document.getElementById('backup-sensor-selection').classList.remove('hidden');
    });
    
    // Backup Confirm button
    document.getElementById('backup-confirm').addEventListener('click', () => {
        document.getElementById('backup-confirmation').classList.add('hidden');
        document.getElementById('backup-message').classList.remove('hidden');
        document.getElementById('backup-complete').classList.remove('hidden');
        document.getElementById('run-backup').classList.add('hidden');
        utils.createBackup();
    });
    
    // Backup Complete button
    document.getElementById('backup-complete').addEventListener('click', () => {
        document.getElementById('backup-message').classList.add('hidden');
        document.getElementById('backup-program-selection').classList.remove('hidden');
        document.getElementById('backup-sensor-selection').classList.remove('hidden');
        document.getElementById('run-backup').classList.remove('hidden');
        document.getElementById('backup-cancel').classList.add('hidden');
        document.getElementById('backup-confirm').classList.add('hidden');
        document.getElementById('backup-complete').classList.add('hidden');
        // Reset checkboxes to default state
        document.getElementById('program-config').checked = true;
        document.getElementById('sensor-config').checked = true;
    });

    // Restore Configuration Card

    // Cancel Delete
    document.getElementById('delete-config-cancel').addEventListener('click', () => {
        document.getElementById('delete-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.add('hidden');
        document.getElementById('config-file-selection').classList.remove('hidden');
    });

    // Cancel Restore
    document.getElementById('restore-config-cancel').addEventListener('click', () => {
        document.getElementById('restore-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.add('hidden');
        document.getElementById('config-file-selection').classList.remove('hidden');
    });
    
    // Action Complete button
    document.getElementById('config-action-complete').addEventListener('click', () => {
        document.getElementById('config-action-message').classList.add('hidden');
        document.getElementById('delete-config-confirmation').classList.add('hidden');
        document.getElementById('restore-config-confirmation').classList.add('hidden');
        document.getElementById('config-action-btns').classList.add('hidden');
        document.getElementById('config-file-selection').classList.remove('hidden');
        utils.fetchBackups();
    });
    

    // Restart Application Card
    // let restartCardClickable = true;
    document.getElementById('restart-btn').addEventListener('click', () => {
        // Only show confirmation if clicking the card itself, not the buttons
        // if (e.target.closest('.restart-action-btns')) return;
        
        // Only allow if card is in clickable state
        // if (!restartCardClickable) return;
        
        config.restartConfirmation();
        // restartCardClickable = false; // Disable until reset
    });
    
    // Function to re-enable restart card clicking
    // window.resetRestartCard = () => {
    //     restartCardClickable = true;
    // };
    
    // Restart Cancel and Confirm buttons
    document.getElementById('restart-close').addEventListener('click', () => {
        // e.stopPropagation(); // Prevent card click event
        config.closeRestart();
    });
    
    document.getElementById('restart-confirm').addEventListener('click', () => {
        // e.stopPropagation(); // Prevent card click event
        config.restartApplication();
    });
 
    





    // Log File Card Buttons
    // =========================

    // Note: Logs is now inline, no back button needed
    // Refresh Log File functionality moved to header button

    // About Device Buttons
    // =========================

    // Note: About is now inline, no back button needed
    
    // Refresh Application Card Buttons
    // =========================


    // Legacy settings restart handler (keeping for backward compatibility)
    const legacyRestartBtn = document.getElementById("settings-restart");
    if (legacyRestartBtn) {
        legacyRestartBtn.addEventListener("click", () => {
            document.getElementById("settings-container").classList.add("hidden");
            document.getElementById("restart-container").classList.remove("hidden");
            config.restartConfirmation();
        });
    }
    
    // Backup Config Card Buttons
    // =========================

    // Close Backup Config Card
    // document.getElementById('backup-config-cancel').addEventListener('click', () => {
    //     document.getElementById('backup-restore-container').classList.add('hidden');
    //     document.getElementById('settings-container').classList.remove('hidden');
    //     document.getElementById('backup-config-card').classList.add('hidden');
    //     document.getElementById('backup-config-data').classList.remove('hidden');
    //     document.getElementById('backup-config-btns').classList.remove('hidden');
    //     document.getElementById('backup-config-text').innerHTML = '<p>Choose which configuration files you want to include in your backup</p>';
    //     document.getElementById('program-config').checked = true;
    //     document.getElementById('sensor-config').checked = true;
    // });
    // Create Backup
    // document.getElementById('backup-config-save').addEventListener('click', backup.createBackup);

    // Restore Config Card Buttons
    // =========================


    // Initialize sidebar state based on screen size
    initializeSidebarState();
}



// Initialize sidebar state on page load
function initializeSidebarState() {
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
function collapseNavMenuOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }
    }
}

// Helper function to show specific page and hide others
function showPage(pageName) {
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
window.showPage = showPage;
