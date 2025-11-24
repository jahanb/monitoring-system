// scripts/scheduler.ts
// Run with: npx tsx scripts/scheduler.ts

require('dotenv').config({ path: '.env.local' });

async function runScheduler() {
  console.log('🚀 Starting monitoring scheduler...');

  setInterval(async () => {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Running monitors...`);
      const response = await fetch('http://localhost:3000/api/monitors/execute?period=due');
      const result = await response.json();
      console.log(`✅ Executed: ${result.executed}, Skipped: ${result.skipped}`);
    } catch (error) {
      console.error('❌ Scheduler error:', error);
    }
  }, 60000); // Run every 1 minute

  console.log('✅ Scheduler started - checking every 1 minute');
}

runScheduler();