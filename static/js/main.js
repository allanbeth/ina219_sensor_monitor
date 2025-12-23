// =======================
// Energy Monitor Main JS
// =======================

import {setDeviceInfo, initializeDashboard, showPage } from './utils.js';
import { initializeSocket } from './socket.js';
import { setupEventHandlers } from './events.js';
import { loadSensorCards } from './sensorCards.js';
// import { initializeDashboard } from './dashboard.js';

// Loading progress tracking
let loadingProgress = 0;
const loadingSteps = {
    system: { progress: 25, message: "System components loaded" },
    socket: { progress: 50, message: "Connected to server" },
    data: { progress: 75, message: "Sensor data received" },
    cards: { progress: 100, message: "Interface ready" }
};

/**
 * Update loading progress and UI
 * @param {string} step - Current loading step
 */
function updateLoadingProgress(step) {
    console.log(`[Progress] Updating loading progress to step: ${step}`);
    
    if (!loadingSteps[step]) {
        console.warn(`Unknown loading step: ${step}`);
        return;
    }
    
    // Get progress and message from loadingSteps
    const stepData = loadingSteps[step];
    loadingProgress = stepData.progress;
    
    // Get elements
    const progressFill = document.getElementById('loading-progress-fill');
    const progressText = document.getElementById('loading-progress');
    
    console.log('[Progress] Element check:');
    console.log('- Progress fill:', !!progressFill);
    console.log('- Progress text:', !!progressText);
    
    if (!progressFill) {
        console.warn('[Progress] Progress fill element not found!');
        return;
    }
    
    // Update progress bar
    progressFill.style.width = `${loadingProgress}%`;
    console.log(`[Progress] Set progress bar to ${loadingProgress}%`);
    
    // Update progress text
    if (progressText) {
        progressText.textContent = `${stepData.message}`;
        console.log(`[Progress] Updated text to: ${stepData.message}`);
    }
    
    console.log(`[Progress] Loading progress: ${step} (${loadingProgress}%)`);
    
    // Hide loading screen when fully complete
    if (loadingProgress >= 100) {
        console.log('[Progress] Loading complete! Hiding loading screen in 1 second...');
        setTimeout(() => {
            hideLoadingScreen();
        }, 1000);
    }
}

// Make progress functions available globally for socket.js
window.updateLoadingProgress = updateLoadingProgress;
window.hideLoadingScreen = hideLoadingScreen;

/**
 * Hide the loading screen with animation
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
        console.log('Hiding loading screen...');
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            console.log('Loading screen hidden');
        }, 500);
    }
}

// Make functions available globally
window.updateLoadingProgress = updateLoadingProgress;
window.hideLoadingScreen = hideLoadingScreen;


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
