// ========================
// Energy Monitor Events JS
// ========================


import * as settingsCards from './settingsCards.js';
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

    // Dashboard
    document.getElementById('dashboard-link').addEventListener('click', () => {
        utils.showPage('dashboard');
        utils.collapseNavMenuOnMobile();
    });

    // Sensors
    document.getElementById('sensors-link').addEventListener('click', () => {
        utils.showPage('sensors');
        utils.collapseNavMenuOnMobile();
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', async () => {
        utils.showPage('settings');
        // Ensure device info is loaded before fetching settings
        await utils.ensureDeviceInfoLoaded();
        settingsCards.fetchSettings();
        settingsCards.fetchBackups();
        utils.collapseNavMenuOnMobile();
    });

    // Log File  
    document.getElementById('log-file-btn').addEventListener('click', () => {
        utils.showPage('logs');
        utils.getLogFile();
        utils.collapseNavMenuOnMobile();
    });

    // About
    document.getElementById('about-btn').addEventListener('click', () => {
        utils.showPage('about');
        utils.getAbout();
        utils.collapseNavMenuOnMobile();
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
        settingsCards.confirmSettingSave('all') // Save all settings
    });

    // Refresh Logs (header button - only visible on logs page)
    document.getElementById('refresh-logs-header-btn').addEventListener('click', () => {
        utils.getLogFile();
    });
    

    //settings Card Buttons
    // =========================
    // System Save Button
    document.getElementById('system-save-btn').addEventListener('click', () => {
        // settingsCards.saveSettings(1); // Save only system settings
        settingsCards.confirmSettingSave('system');
    });

    // Polling Save Button
    document.getElementById('polling-save-btn').addEventListener('click', () => {
        settingsCards.confirmSettingSave('polling');
    });

    // MQTT Save Button
    document.getElementById('mqtt-save-btn').addEventListener('click', () => {
        settingsCards.confirmSettingSave('mqtt');   
    });

    // Web Server Save Button
    document.getElementById('webserver-save-btn').addEventListener('click', () => {
        settingsCards.confirmSettingSave('webserver');
    });

    // New Device Button
    document.getElementById('new-device-btn').addEventListener('click', () => {
        document.getElementById('new-device').classList.remove('hidden');
        document.getElementById('device-config-btns').classList.remove('hidden');
        document.getElementById('new-device-cancel').classList.remove('hidden');
        document.getElementById('new-device-save').classList.remove('hidden');
        document.getElementById('new-device-btn').classList.add('hidden');
        document.getElementById('device-card-content').classList.add('hidden');    
        settingsCards.openNewDeviceConfig();
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
        settingsCards.createBackup();
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
        settingsCards.fetchBackups();
    });
    

    // Restart Application Card

    // Refresh Button
    document.getElementById('refresh-btn').addEventListener('click', () => {        
        window.location.reload();
    });
    // Restart Button
    document.getElementById('restart-btn').addEventListener('click', () => {        
        settingsCards.restartConfirmation();
    });
    
    // Restart Cancel and Confirm buttons
    document.getElementById('restart-close').addEventListener('click', () => {
        settingsCards.closeRestart();
    });
    
    document.getElementById('restart-confirm').addEventListener('click', () => {
        settingsCards.restartApplication();
    });

// Initialize sidebar state based on screen size
    utils.initializeSidebarState();
}

