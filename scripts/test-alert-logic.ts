
import { AlertManager } from '../lib/monitoring/AlertManager';
import { Monitor } from '../lib/models/Monitor';

// Mock Monitor
const mockMonitor: Monitor = {
    _id: 'test-monitor-id',
    monitor_name: 'Test Monitor',
    type: 'ssh',
    monitor_instance: 'test-host',
    consecutive_alarm: 3,
    consecutive_warning: 2,
    // ... other required fields mocked as needed
} as any;

// Mock State
const mockState = {
    consecutive_failures: 3,
    consecutive_successes: 0
};

// Access private method via any cast or just test public behavior if possible.
// Since shouldTriggerAlert is private, we might need to test processCheckResult or expose it.
// However, for quick verification script in this environment, I'll use a subclass or prototype access if needed,
// OR just copy the logic to verify my understanding if I can't easily import the class in a way that allows testing private methods.
// Actually, I can just use the public `processCheckResult` and mock the database calls, but that's complex.
// Let's try to access the private method using `any` casting which is allowed in TS with `noImplicitAny: false` or similar, or just `@ts-ignore`.

async function testAlertLogic() {
    const alertManager = new AlertManager();

    console.log('--- Testing Alert Logic ---');
    console.log(`Monitor Thresholds: Alarm=${mockMonitor.consecutive_alarm}, Warning=${mockMonitor.consecutive_warning}`);
    console.log(`Current State: Consecutive Failures=${mockState.consecutive_failures}`);

    // Access private method
    const shouldTrigger = (alertManager as any).shouldTriggerAlert(mockMonitor, mockState, 'error');

    console.log(`Result for status 'error': ${shouldTrigger}`);

    if (shouldTrigger === false) {
        console.log('❌ FAIL: Should have triggered alert for error status with 3 failures');
    } else {
        console.log('✅ PASS: Triggered alert for error status');
    }
}

testAlertLogic().catch(console.error);
