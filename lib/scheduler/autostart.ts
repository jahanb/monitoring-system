// lib/scheduler/autostart.ts
// This will auto-start the scheduler when the Next.js server starts

import { MonitorScheduler } from './MonitorScheduler';

let initialized = false;

export async function initializeScheduler() {
  if (initialized) {
    console.log('⚠️ Scheduler already initialized');
    return;
  }

  // Only run in server environment (not in client or during build)
  if (typeof window !== 'undefined') {
    return;
  }

  // Only auto-start if environment variable is set
  if (process.env.AUTO_START_SCHEDULER !== 'true') {
    console.log('ℹ️ Auto-start scheduler disabled. Set AUTO_START_SCHEDULER=true to enable.');
    return;
  }

  try {
    console.log('🔄 Initializing scheduler on server startup...');

    const scheduler = MonitorScheduler.getInstance();

    // Small delay to ensure database is ready
    setTimeout(async () => {
      await scheduler.start();
      console.log('✅ Scheduler auto-started successfully');
    }, 3000); // 3 second delay

    initialized = true;
  } catch (error) {
    console.error('❌ Failed to auto-start scheduler:', error);
  }
}

// Initialize on import (if in server context)
if (typeof window === 'undefined' && process.env.AUTO_START_SCHEDULER === 'true') {
  initializeScheduler();
}