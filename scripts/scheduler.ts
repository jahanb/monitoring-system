// scripts/scheduler.ts
// Run with: npx tsx scripts/scheduler.ts
/*
require('dotenv').config({ path: '.env.local' });

async function runScheduler() {
  console.log('🚀 Starting monitoring scheduler...');

  setInterval(async () => {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Running monitors...`);
      const response = await fetch('http://localhost:3010/systemup/api/monitors/execute?period=due');
      const result = await response.json();
      console.log(`✅ Executed: ${result.executed}, Skipped: ${result.skipped}`);
    } catch (error) {
      console.error('❌ Scheduler error:', error);
    }
  }, 60000); // Run every 1 minute

  console.log('✅ Scheduler started - checking every 1 minute');
}

runScheduler();
*/

// scripts/scheduler.ts
// Run with: npx tsx scripts/scheduler.ts
// OR: npm run scheduler

require('dotenv').config({ path: '.env.local' });

import { MonitorScheduler } from '@/lib/scheduler/MonitorScheduler';

async function runScheduler() {
  console.log('🚀 Starting monitoring scheduler...');

  const scheduler = MonitorScheduler.getInstance();

  // Start the scheduler
  await scheduler.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });

  console.log('✅ Scheduler running. Press Ctrl+C to stop.');
}

runScheduler().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});