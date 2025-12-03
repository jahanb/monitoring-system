// lib/scheduler/MonitorScheduler.ts

import * as SchedulerState from './SchedulerState';

export class MonitorScheduler {
    private static instance: MonitorScheduler;
    private apiBaseUrl: string;

    private constructor() {
        // Use environment variable or default to localhost
        this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/systemup';

        // Log initialization
        console.log('📦 MonitorScheduler instance created');
        console.log('   Current state - Running:', SchedulerState.isRunning());
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): MonitorScheduler {
        if (!MonitorScheduler.instance) {
            MonitorScheduler.instance = new MonitorScheduler();
        }
        return MonitorScheduler.instance;
    }

    /**
     * Check if scheduler is running
     */
    public isRunning(): boolean {
        return SchedulerState.isRunning();
    }

    /**
     * Start the scheduler
     */
    public async start(): Promise<void> {
        if (SchedulerState.isRunning()) {
            console.log('⚠️ Scheduler is already running');
            return;
        }

        console.log('🚀 Starting Monitor Scheduler...');
        SchedulerState.setRunning(true);

        // Run checks immediately on start
        await this.runChecks();

        // Set up interval to run every minute
        const intervalId = setInterval(async () => {
            if (SchedulerState.isRunning()) {
                await this.runChecks();
            }
        }, 60000); // 60 seconds = 1 minute

        SchedulerState.setIntervalId(intervalId);

        console.log('✅ Scheduler started - checking every 1 minute');
    }

    /**
     * Stop the scheduler
     */
    public stop(): void {
        if (!SchedulerState.isRunning()) {
            console.log('⚠️ Scheduler is already stopped');
            return;
        }

        console.log('🛑 Stopping Monitor Scheduler...');

        const state = SchedulerState.getSchedulerState();
        if (state.intervalId) {
            clearInterval(state.intervalId);
        }

        SchedulerState.clearState();

        console.log('✅ Scheduler stopped');
    }

    /**
     * Run all monitor checks
     */
    private async runChecks(): Promise<void> {
        try {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`\n⏰ ${timestamp} - Running monitors...`);

            SchedulerState.setLastCheck(new Date());

            // Call the existing API endpoint that executes monitors
            const response = await fetch(`${this.apiBaseUrl}/api/monitors/execute?period=due`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            console.log(`✅ Executed: ${result.executed || 0}, Skipped: ${result.skipped || 0}`);

            // Log any errors if present
            if (result.errors && result.errors.length > 0) {
                console.log(`⚠️ Errors: ${result.errors.length}`);
                result.errors.forEach((error: any, index: number) => {
                    console.error(`   ${index + 1}. ${error.monitor_name}: ${error.error}`);
                });
            }

            return result;
        } catch (error: any) {
            console.error('❌ Scheduler error:', error.message || error);
        }
    }

    /**
     * Get scheduler status
     */
    public getStatus() {
        const state = SchedulerState.getSchedulerState();
        return {
            running: state.running,
            interval: '1 minute',
            apiUrl: this.apiBaseUrl,
            startedAt: state.startedAt,
            lastCheck: state.lastCheck,
        };
    }

    /**
     * Manually trigger a check (for testing)
     */
    public async triggerCheck(): Promise<void> {
        console.log('🔄 Manually triggering check...');
        await this.runChecks();
    }
}

// Export singleton instance getter
export const getScheduler = () => MonitorScheduler.getInstance();