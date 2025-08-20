// =======================
// Energy Monitor Main JS
// =======================

import {setDeviceInfo } from './utils.js';
import { initializeSocket } from './socket.js';
import { setupEventHandlers } from './events.js';
import { loadSensorCards } from './sensorCards.js';


window.addEventListener('DOMContentLoaded', () => {
    setDeviceInfo();
    
    setupEventHandlers();
    initializeSocket(window.location.origin);
    loadSensorCards();
    updateSocket(window.location.origin);
});
