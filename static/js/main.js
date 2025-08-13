// =======================
// Energy Monitor Main JS
// =======================

import {setDeviceInfo } from './utils.js';
import { initializeSocket } from './socket.js';
import { setupEventHandlers } from './events.js';
import { setInitialLoad } from './globals.js';

window.addEventListener('DOMContentLoaded', () => {
    setDeviceInfo();
    setupEventHandlers();
    
    initializeSocket(window.location.origin);
});
