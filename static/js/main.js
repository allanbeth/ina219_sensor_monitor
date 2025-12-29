// =======================
// Energy Monitor Main JS
// =======================

import {setDeviceInfo, initializeDashboard, showPage, updateLoadingProgress, hideLoadingScreen } from './utils.js';
import { initializeSocket } from './socket.js';
import { setupEventHandlers } from './events.js';


window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization...');
    
    // Small delay to ensure loading screen elements are rendered
    setTimeout(() => {
        console.log('Calling updateLoadingProgress for system step');
        updateLoadingProgress('system');
    }, 100);
    
    // Delay device info setup to make system step visible
    setTimeout(() => {
        setDeviceInfo();
        console.log('Device info set');
    }, 500);
    
    // Delay event handlers setup 
    setTimeout(() => {
        setupEventHandlers();
        console.log('Event handlers set up');
    }, 800);
    
    // Delay socket initialization to make steps more visible
    setTimeout(() => {
        initializeSocket(window.location.origin);
        console.log('Socket initialized');
    }, 1200);
    
    // Delay dashboard initialization
    setTimeout(() => {
        // Initialize dashboard
        initializeDashboard();
        console.log('Dashboard initialized');
        
        // Note: Sensor cards will be loaded when socket receives first data update
        // Progress tracking continues in socket.js
        
        // Show dashboard page by default
            showPage('dashboard');
            console.log('Dashboard page shown');
        
    }, 1500);
    
    // Fallback: Hide loading screen after 10 seconds if it hasn't been hidden yet
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('fade-out') && loadingScreen.style.display !== 'none') {
            console.warn('Loading screen not hidden by normal flow, hiding with fallback');
            hideLoadingScreen();
        }
    }, 10000); // Extended timeout to 10 seconds
});
