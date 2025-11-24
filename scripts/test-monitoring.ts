// scripts/test-monitoring.ts
// Run with: npx tsx scripts/test-monitoring.ts

import { getExecutor } from '../lib/monitoring/MonitoringExecutor';
import { initializeCheckers } from '../lib/monitoring/checkers';
import { getDatabase, Collections } from '../lib/db/mongodb';

async function testMonitoring() {
  console.log('🧪 Starting Monitoring Engine Test...\n');

  // Initialize checkers
  initializeCheckers();

  // Get database
  const db = await getDatabase();

  // Check if we have any monitors
  const monitorCount = await db.collection(Collections.MONITORS).countDocuments();
  
  if (monitorCount === 0) {
    console.log('⚠️  No monitors found in database!');
    console.log('   Create a monitor first using the UI or this script.\n');
    
    // Create a test monitor
    console.log('📝 Creating test monitor...');
    const testMonitor = {
      monitor_name: 'Test Google Health Check',
      monitor_type: 'url',
      created_by: 'test-script',
      business_owner: 'Test',
      monitor_instance: 'https://www.google.com',
      description: 'Test monitor for Google',
      severity: 'medium',
      status_code: [200],
      positive_pattern: 'google',
      period_in_minute: 5,
      timeout_in_second: 30,
      consecutive_warning: 2,
      consecutive_alarm: 3,
      alarm_after_n_failure: 3,
      reset_after_m_ok: 2,
      active_disable: true,
      running_stopped: true,
      alarming_candidate: ['test@example.com'],
      dependencies: [],
      creation_date_time: new Date()
    };

    await db.collection(Collections.MONITORS).insertOne(testMonitor);
    console.log('✅ Test monitor created!\n');
  } else {
    console.log(`✅ Found ${monitorCount} monitor(s)\n`);
  }

  // Test 1: Execute all monitors
  console.log('═══════════════════════════════════════════════════');
  console.log('Test 1: Execute All Monitors');
  console.log('═══════════════════════════════════════════════════\n');

  const executor = getExecutor();
  const result = await executor.executeAllMonitors();

  console.log('\n📊 Results:');
  console.log(`   Total: ${result.total}`);
  console.log(`   Successful: ${result.successful}`);
  console.log(`   Failed: ${result.failed}\n`);

  // Show detailed results
  if (result.results.length > 0) {
    console.log('📋 Detailed Results:\n');
    result.results.forEach((r, index) => {
      console.log(`${index + 1}. ${r.monitorName}`);
      console.log(`   Status: ${r.result.status}`);
      console.log(`   Success: ${r.result.success ? '✅' : '❌'}`);
      console.log(`   Value: ${r.result.value}ms`);
      console.log(`   Message: ${r.result.message}`);
      
      if (r.result.metadata?.certificateDaysRemaining) {
        console.log(`   📜 Certificate Days Remaining: ${r.result.metadata.certificateDaysRemaining}`);
      }
      
      if (r.result.metadata?.patternMatch) {
        console.log(`   🔍 Pattern Match:`);
        console.log(`      Positive: ${r.result.metadata.patternMatch.positive ? '✅' : '❌'}`);
        console.log(`      Negative: ${r.result.metadata.patternMatch.negative ? '❌ (found)' : '✅ (not found)'}`);
      }
      console.log('');
    });
  }

  // Test 2: Check stored metrics
  console.log('═══════════════════════════════════════════════════');
  console.log('Test 2: Verify Metrics Storage');
  console.log('═══════════════════════════════════════════════════\n');

  const metricsCount = await db.collection(Collections.METRICS).countDocuments();
  console.log(`📈 Total metrics stored: ${metricsCount}`);

  const recentMetrics = await db
    .collection(Collections.METRICS)
    .find()
    .sort({ timestamp: -1 })
    .limit(5)
    .toArray();

  if (recentMetrics.length > 0) {
    console.log('\n📊 Recent metrics:');
    recentMetrics.forEach((metric: any, index) => {
      console.log(`\n${index + 1}. Monitor ID: ${metric.monitor_id}`);
      console.log(`   Timestamp: ${new Date(metric.timestamp).toLocaleString()}`);
      console.log(`   Value: ${metric.value}ms`);
      console.log(`   Status: ${metric.status}`);
    });
  }

  // Test 3: Check monitor states
  console.log('\n═══════════════════════════════════════════════════');
  console.log('Test 3: Check Monitor States');
  console.log('═══════════════════════════════════════════════════\n');

  const states = await db.collection(Collections.MONITOR_STATES).find().toArray();
  
  if (states.length > 0) {
    console.log(`📊 Monitor states:\n`);
    states.forEach((state: any, index) => {
      console.log(`${index + 1}. Monitor ID: ${state.monitor_id}`);
      console.log(`   Current Status: ${state.current_status}`);
      console.log(`   Consecutive Failures: ${state.consecutive_failures}`);
      console.log(`   Consecutive Successes: ${state.consecutive_successes}`);
      console.log(`   Last Check: ${new Date(state.last_check_time).toLocaleString()}`);
      console.log(`   Last Value: ${state.last_value}ms\n`);
    });
  } else {
    console.log('ℹ️  No states found (monitors haven\'t been checked yet)\n');
  }

  // Test 4: Check alerts
  console.log('═══════════════════════════════════════════════════');
  console.log('Test 4: Check Alerts');
  console.log('═══════════════════════════════════════════════════\n');

  const alerts = await db.collection(Collections.ALERTS).find().toArray();
  
  if (alerts.length > 0) {
    console.log(`🚨 Found ${alerts.length} alert(s):\n`);
    alerts.forEach((alert: any, index) => {
      console.log(`${index + 1}. ${alert.monitor_name}`);
      console.log(`   Severity: ${alert.severity}`);
      console.log(`   Status: ${alert.status}`);
      console.log(`   Triggered: ${new Date(alert.triggered_at).toLocaleString()}`);
      if (alert.recovered_at) {
        console.log(`   Recovered: ${new Date(alert.recovered_at).toLocaleString()}`);
      }
      console.log('');
    });
  } else {
    console.log('✅ No alerts (all systems nominal)\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Testing Complete!');
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(0);
}

// Run the test
testMonitoring().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
