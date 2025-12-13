// =======================
// Energy Monitor Main JS
// =======================

import {setDeviceInfo } from './utils.js';
import { initializeSocket } from './socket.js';
import { setupEventHandlers } from './events.js';
import { loadSensorCards } from './sensorCards.js';
import { initializeDashboard } from './dashboard.js';


window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization...');
    
    setDeviceInfo();
    
    setupEventHandlers();
    console.log('Event handlers set up');
    
    initializeSocket(window.location.origin);
    console.log('Socket initialized');
    
    // Initialize dashboard
    initializeDashboard();
    console.log('Dashboard initialized');
    
    // Initialize empty sensor cards - actual data will come via socket
    loadSensorCards({});
    console.log('Initial sensor cards loaded');
    
    // Show dashboard page by default
    if (window.showPage) {
        window.showPage('dashboard');
        console.log('Dashboard page shown');
    }
    
    // Fallback: Hide loading screen after 5 seconds if it hasn't been hidden yet
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('fade-out') && loadingScreen.style.display !== 'none') {
            console.warn('Loading screen not hidden by socket connection, hiding with fallback');
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 5000);
});
