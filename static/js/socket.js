// ========================
// Energy Monitor Socket JS
// ========================

import { setSocket, getSensorFilter } from './globals.js';
import { loadSensorCards, handleSensorReadingsUpdate } from './sensorCards.js';
import { createDashboardStats, updateDashboardStats } from './dashboard.js';
import { updateSensorData } from './config.js';

export function initializeSocket(url) {
    const socketInstance = io(url, { reconnection: true });
    setSocket(socketInstance);
    socketInstance.on('connect', () => {
        console.log('Socket Connected:', socketInstance.id);
        // Update progress for socket connection with delay to make it visible
        setTimeout(() => {
            if (window.updateLoadingProgress) {
                console.log('Calling updateLoadingProgress for socket step');
                window.updateLoadingProgress('socket');
            }
        }, 300);
    });
    
    // On first update, render all cards and create dashboard stats
    socketInstance.once('sensor_update', (data) => {
        console.log('First sensor update received:', data);
        try {
            // Store the complete dataset globally for filter operations
            window.lastSensorData = data;
            
            // Update progress for data received
            setTimeout(() => {
                if (window.updateLoadingProgress) {
                    console.log('Calling updateLoadingProgress for data step');
                    window.updateLoadingProgress('data');
                }
            }, 300);
            
            // Load cards with current filter (if any)
            const currentFilter = getSensorFilter();
            loadSensorCards(data, currentFilter);
            createDashboardStats(data);
            updateSensorData(data); // Update config page status
            
            // Update progress for cards rendered (this will hide loading screen)
            setTimeout(() => {
                if (window.updateLoadingProgress) {
                    console.log('Calling updateLoadingProgress for cards step - should hide loading screen');
                    window.updateLoadingProgress('cards');
                }
            }, 800); // Longer delay to ensure cards are rendered
            
            console.log('All data processing completed successfully');
        } catch (error) {
            console.error('Error processing sensor update:', error);
            // Hide loading screen on error
            if (window.hideLoadingScreen) {
                window.hideLoadingScreen();
            }
        }
    });
    
    // On subsequent updates, update readings and dashboard stats (and respect pause)
    socketInstance.on('sensor_update', (data) => {
        handleSensorReadingsUpdate(data);
        updateDashboardStats(data);
        updateSensorData(data); // Update config page status
    });
    
    return socketInstance;
}
