// ========================
// Energy Monitor Events JS
// ========================

import * as config from './config.js';
import * as backup from './backup.js';

export function setupEventHandlers() {

    // Header Buttons
    // =========================

    // Add Sensor
    document.getElementById('add-sensor-btn').addEventListener('click', () => {
        document.getElementById('add-sensor-container').classList.remove('hidden');
    });
    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-container').classList.remove('hidden');
        config.fetchSettings();
    });
    // Log File
    document.getElementById('log-file-btn').addEventListener('click', () => {
        document.getElementById('log-file-container').classList.remove('hidden');
        config.getLogFile();
    });
    // About
    document.getElementById('about-btn').addEventListener('click', () => {
        document.getElementById('about-container').classList.remove('hidden');
        config.getAbout();
    });

    // Add Device Card Buttons
    // =========================

    // Close Add Device Card
    document.getElementById('add-sensor-cancel').addEventListener('click', () => {
        document.getElementById('add-sensor-container').classList.add('hidden');
    });
    // Save New Device
    document.getElementById('add-sensor-save').addEventListener('click', () => {
        config.addSensor();
    });

    // Settings Card Buttons
    // =========================
    
    // Close Settings Card
    document.getElementById('settings-cancel').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
    });
    // Restart Applicastion
    document.getElementById('settings-restart').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
        document.getElementById('restart-container').classList.remove('hidden');
        // TODO: Implement restartConfirmation logic
    });
    // Backup Config Card
    document.getElementById('settings-backup').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
        document.getElementById('backup-restore-container').classList.remove('hidden');
        document.getElementById('backup-config-card').classList.remove('hidden');
    });
    // Restore Config Card
    document.getElementById('settings-restore').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
        document.getElementById('backup-restore-container').classList.remove('hidden');
        document.getElementById('restore-config-card').classList.remove('hidden');
        backup.fetchBackups();
    });
    // Save Settings Card
    document.getElementById('settings-save').addEventListener('click', config.saveSettings);

    // Log File Card Buttons
    // =========================

    // Close Log file Card
    document.getElementById('log-file-cancel').addEventListener('click', () => {
        document.getElementById('log-file-container').classList.add('hidden');
    });
    // Refresh Log File Card
    document.getElementById('log-file-refresh').addEventListener('click', () => {
        config.getLogFile();
    });

    // About Device Buttons
    // =========================

    // Close About Card
    document.getElementById("about-cancel").addEventListener("click", () => {
        document.getElementById("about-container").classList.add("hidden");
    });
    
    // Refresh Application Card Buttons
    // =========================

    // Close Refresh Card
    document.getElementById("restart-cancel").addEventListener("click", () => {
        document.getElementById("restart-container").classList.add("hidden");
    });
    // Confirm Restart
    document.getElementById("settings-restart").addEventListener("click", () => {
        document.getElementById("settings-container").classList.add("hidden");
        document.getElementById("restart-container").classList.remove("hidden");
        config.restartConfirmation();
    });
    // Restart Application
    document.getElementById("restart-confirm").addEventListener("click", () => {
        config.restartApplication();
    });

    // Backup Config Card Buttons
    // =========================

    // Close Backup Config Card
    document.getElementById('backup-config-cancel').addEventListener('click', () => {
        document.getElementById('backup-restore-container').classList.add('hidden');
        document.getElementById('settings-container').classList.remove('hidden');
        document.getElementById('backup-config-card').classList.add('hidden');
        document.getElementById('backup-config-data').classList.remove('hidden');
        document.getElementById('backup-config-btns').classList.remove('hidden');
        document.getElementById('backup-config-text').innerHTML = '<p>Choose which configuration files you want to include in your backup</p>';
        document.getElementById('program-config').checked = true;
        document.getElementById('sensor-config').checked = true;
    });
    // Create Backup
    document.getElementById('backup-config-save').addEventListener('click', backup.createBackup);

    // Restore Config Card Buttons
    // =========================

    // Close Restore Configuration Card
    document.getElementById('restore-config-cancel').addEventListener('click', () => {
        document.getElementById('backup-restore-container').classList.add('hidden');
        document.getElementById('settings-container').classList.remove('hidden');
        document.getElementById('restore-config-card').classList.add('hidden');
    });
    // Confirm Restore Backup
    // TODO: Implement confirmRestoreBackup logic
    
}
