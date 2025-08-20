// ========================
// Energy Monitor Socket JS
// ========================

import { setSocket } from './globals.js';
import { loadSensorCards, handleSensorReadingsUpdate } from './sensorCards.js';

export function initializeSocket(url) {
    const socketInstance = io(url, { reconnection: true });
    setSocket(socketInstance);
    socketInstance.on('connect', () => {
        console.log('Socket Connected:', socketInstance.id);
    });
    // On first update, render all cards
    socketInstance.once('sensor_update', loadSensorCards);
    // On subsequent updates, only update readings (and respect pause)
    socketInstance.on('sensor_update', handleSensorReadingsUpdate);
    return socketInstance;
}
