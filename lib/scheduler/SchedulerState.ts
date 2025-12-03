// lib/scheduler/SchedulerState.ts
// Global state that persists across module reloads

interface SchedulerState {
    running: boolean;
    startedAt: Date | null;
    lastCheck: Date | null;
    intervalId: NodeJS.Timeout | null;
}

// Use global object to persist state across hot reloads
const globalForScheduler = global as typeof globalThis & {
    schedulerState?: SchedulerState;
};

if (!globalForScheduler.schedulerState) {
    globalForScheduler.schedulerState = {
        running: false,
        startedAt: null,
        lastCheck: null,
        intervalId: null,
    };
}

export const schedulerState = globalForScheduler.schedulerState;

export function getSchedulerState(): SchedulerState {
    return schedulerState;
}

export function setRunning(running: boolean) {
    schedulerState.running = running;
    if (running && !schedulerState.startedAt) {
        schedulerState.startedAt = new Date();
    } else if (!running) {
        schedulerState.startedAt = null;
    }
}

export function setLastCheck(date: Date) {
    schedulerState.lastCheck = date;
}

export function setIntervalId(id: NodeJS.Timeout | null) {
    schedulerState.intervalId = id;
}

export function isRunning(): boolean {
    return schedulerState.running;
}

export function clearState() {
    schedulerState.running = false;
    schedulerState.startedAt = null;
    schedulerState.lastCheck = null;
    if (schedulerState.intervalId) {
        clearInterval(schedulerState.intervalId);
        schedulerState.intervalId = null;
    }
}