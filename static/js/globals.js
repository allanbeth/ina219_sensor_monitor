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
export let deviceCount  = 0;
export let sensorFilter = null;


export function setSocket(newSocket) { socket = newSocket; }
export function setDeviceList(list) { deviceList = list; }
export function setPaused(paused) { isPaused = paused; }
export function getIsPaused() { return isPaused; }
export function setUndoTimers(timers) { undoTimers = timers; }
export function setRemoteGpio(remote) { isRemoteGpio = remote; }
export function setInitialLoad(load) { initialLoad = load; }
export function setDeviceCount(count) { deviceCount = count; }
export function setSensorFilter(filter) { sensorFilter = filter; }
export function getSensorFilter() { return sensorFilter; }
export function clearSensorFilter() { sensorFilter = null; }
