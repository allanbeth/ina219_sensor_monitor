// =========================
// Energy Monitor Globals JS
// =========================

// Shared global state for the app
export let socket = null;
export let deviceList = {};
export let isPaused = false;
export let undoTimers = {};
export let isRemoteGpio = false;
export let remoteGPIOCount = 0;
export let initialLoad = true;

// Additional globals from old main.js
// Note: remoteCount has been removed as per refactoring

export function setSocket(newSocket) { socket = newSocket; }
export function setDeviceList(list) { deviceList = list; }
export function setPaused(paused) { isPaused = paused; }
export function setUndoTimers(timers) { undoTimers = timers; }
export function setRemoteGpio(remote) { isRemoteGpio = remote; }
export function setInitialLoad(load) { initialLoad = load; }
