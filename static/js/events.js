// ========================
// Energy Monitor Events JS
// ========================

import { fetchSettings, saveSettings } from './settings.js';
import { createBackup, fetchBackups, restoreBackup, confirmRestoreBackup, confirmDeleteBackup, deleteBackup } from './backup.js';
import { getAbout, getLogFile } from './utils.js';

export function setupEventHandlers() {
    // Add Sensor
    document.getElementById('add-sensor-btn').addEventListener('click', () => {
        document.getElementById('add-sensor-container').classList.remove('hidden');
    });
    document.getElementById('add-sensor-cancel').addEventListener('click', () => {
        document.getElementById('add-sensor-container').classList.add('hidden');
    });
    document.getElementById('add-sensor-save').addEventListener('click', () => {
        // TODO: Implement addSensor logic
    });
    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-container').classList.remove('hidden');
    fetchSettings();
    });
    document.getElementById('settings-cancel').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
    });
    document.getElementById('settings-restart').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
        document.getElementById('restart-container').classList.remove('hidden');
        // TODO: Implement restartConfirmation logic
    });
    document.getElementById('settings-backup').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
        document.getElementById('backup-restore-container').classList.remove('hidden');
        document.getElementById('backup-config-card').classList.remove('hidden');
    });
    document.getElementById('settings-restore').addEventListener('click', () => {
        document.getElementById('settings-container').classList.add('hidden');
        document.getElementById('backup-restore-container').classList.remove('hidden');
        document.getElementById('restore-config-card').classList.remove('hidden');
        fetchBackups();
    });
    document.getElementById('settings-save').addEventListener('click', saveSettings);
    // Backup Configuration
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
    document.getElementById('backup-config-save').addEventListener('click', createBackup);
    // Restore Configuration
    document.getElementById('restore-config-cancel').addEventListener('click', () => {
        document.getElementById('backup-restore-container').classList.add('hidden');
        document.getElementById('settings-container').classList.remove('hidden');
        document.getElementById('restore-config-card').classList.add('hidden');
    });
    // About
    document.getElementById('about-btn').addEventListener('click', () => {
        document.getElementById('about-container').classList.remove('hidden');
        getAbout();
    });
    document.getElementById('about-cancel').addEventListener('click', () => {
        document.getElementById('about-container').classList.add('hidden');
    });
    document.getElementById('restart-cancel').addEventListener('click', () => {
        document.getElementById('restart-container').classList.add('hidden');
    });
    document.getElementById('restart-save').addEventListener('click', () => {
        // TODO: Implement restartProgram logic
    });
    // Log file
    document.getElementById('log-file-btn').addEventListener('click', () => {
        document.getElementById('log-file-container').classList.remove('hidden');
        getLogFile();
    });
    document.getElementById('log-file-cancel').addEventListener('click', () => {
        document.getElementById('log-file-container').classList.add('hidden');
    });
    document.getElementById('log-file-refresh').addEventListener('click', () => {
        getLogFile();
    });
}
