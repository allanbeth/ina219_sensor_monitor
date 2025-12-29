// ========================
// Energy Monitor Socket JS
// ========================

import { setSocket, updateSensorData, getSensorFilter, updateMqttConnectionStatus, setLastSensorData } from './globals.js';
import { loadSensorCards, handleSensorReadingsUpdate } from './sensorCards.js';
import { createDashboardStats, updateDashboardStats } from './dashboardCards.js';
import { updateSensorData as updateSettingsSensorData } from './settingsCards.js';
import { updateLoadingProgress, hideLoadingScreen } from './utils.js';

export function initializeSocket(url) {
    const socketInstance = io(url, { reconnection: true });
    setSocket(socketInstance);
    socketInstance.on('connect', () => {
        console.log('Socket Connected:', socketInstance.id);
        // Update progress for socket connection with delay to make it visible
        setTimeout(() => {
            console.log('Calling updateLoadingProgress for socket step');
            updateLoadingProgress('socket');
        }, 300);
    });
    
    // On first update, render all cards and create dashboard stats
    socketInstance.once('sensor_update', (data) => {
        console.log('First sensor update received:', data);
        try {
            // Store the complete dataset globally for filter operations
            setLastSensorData(data);
            
            // Update MQTT connection status if provided
            if (data.mqtt_connection_status !== undefined) {
                updateMqttConnectionStatus(data.mqtt_connection_status);
            }
            
            // Update progress for data received
            setTimeout(() => {
                console.log('Calling updateLoadingProgress for data step');
                updateLoadingProgress('data');
            }, 300);
            
            // Load cards with current filter (if any)
            const currentFilter = getSensorFilter();
            loadSensorCards(data, currentFilter);
            updateSensorData(data); // Update config page status
            updateSettingsSensorData(data); // Update settings status card
            createDashboardStats(data);
            
            
            // Update progress for cards rendered (this will hide loading screen)
            setTimeout(() => {
                console.log('Calling updateLoadingProgress for cards step - should hide loading screen');
                updateLoadingProgress('cards');
            }, 800); // Longer delay to ensure cards are rendered
            
            console.log('All data processing completed successfully');
        } catch (error) {
            console.error('Error processing sensor update:', error);
            // Hide loading screen on error
            hideLoadingScreen();
        }
    });
    
    // On subsequent updates, update readings and dashboard stats (and respect pause)
    socketInstance.on('sensor_update', (data) => {
        // Update MQTT connection status if provided
        if (data.mqtt_connection_status !== undefined) {
            updateMqttConnectionStatus(data.mqtt_connection_status);
        }
        
        handleSensorReadingsUpdate(data);
        updateDashboardStats(data);
        updateSensorData(data); // Update config page status
        updateSettingsSensorData(data); // Update settings status card
    });
    
    return socketInstance;
}
