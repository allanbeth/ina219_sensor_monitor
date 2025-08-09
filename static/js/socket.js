// ========================
// Energy Monitor Socket JS
// ========================

import { setSocket } from './globals.js';
import { handleSensorUpdate } from './sensorCards.js';

export function initializeSocket(url) {
    const socketInstance = io(url, { reconnection: true });
    setSocket(socketInstance);
    socketInstance.on('connect', () => {
        console.log('Socket Connected:', socketInstance.id);
    });
    socketInstance.on('sensor_update', handleSensorUpdate);
    return socketInstance;
}
