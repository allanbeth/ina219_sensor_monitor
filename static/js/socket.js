// ========================
// Energy Monitor Socket JS
// ========================

import { setSocket } from './globals.js';
import { loadSensorCards, handleSensorReadingsUpdate } from './sensorCards.js';
import { createDashboardStats, updateDashboardStats } from './dashboard.js';
import { updateSensorData } from './config.js';

export function initializeSocket(url) {
    const socketInstance = io(url, { reconnection: true });
    setSocket(socketInstance);
    socketInstance.on('connect', () => {
        console.log('Socket Connected:', socketInstance.id);
    });
    
    // On first update, render all cards and create dashboard stats
    socketInstance.once('sensor_update', (data) => {
        console.log('First sensor update received:', data);
        loadSensorCards(data);
        createDashboardStats(data);
        updateSensorData(data); // Update config page status
        
        // Hide loading screen with animation after first data load
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('Hiding loading screen...');
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                console.log('Loading screen hidden');
            }, 500); // Wait for fade animation to complete
        } else {
            console.warn('Loading screen element not found');
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
