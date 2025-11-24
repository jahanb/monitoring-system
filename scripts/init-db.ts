// scripts/init-db.ts
// Run this script with: npm run init-db

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'monitoring_system';

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Create collections
    console.log('\n📦 Creating collections...');
    
    // Create time-series collection for metrics
    try {
      await db.createCollection('metrics', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'monitor_id',
          granularity: 'minutes'
        },
        expireAfterSeconds: 7776000 // 90 days
      });
      console.log('✅ Created time-series collection: metrics');
    } catch (error: any) {
      if (error.code === 48) {
        console.log('ℹ️  Collection "metrics" already exists');
      } else {
        throw error;
      }
    }
    
    // Create regular collections
    const collections = ['monitors', 'alerts', 'monitor_states', 'notification_queue', 'audit_log'];
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } catch (error: any) {
        if (error.code === 48) {
          console.log(`ℹ️  Collection "${collectionName}" already exists`);
        } else {
          throw error;
        }
      }
    }
    
    // Create indexes
    console.log('\n🔍 Creating indexes...');
    
    // Monitors indexes
    await db.collection('monitors').createIndexes([
      { key: { monitor_name: 1 }, unique: true, name: 'monitor_name_unique' },
      { key: { monitor_type: 1 }, name: 'monitor_type_idx' },
      { key: { active_disable: 1 }, name: 'active_disable_idx' },
      { key: { running_stopped: 1 }, name: 'running_stopped_idx' },
      { key: { created_by: 1 }, name: 'created_by_idx' },
      { key: { business_owner: 1 }, name: 'business_owner_idx' },
      { key: { creation_date_time: -1 }, name: 'creation_date_idx' },
      { key: { severity: 1 }, name: 'severity_idx' }
    ]);
    console.log('✅ Created indexes for monitors collection');
    
    // Metrics indexes
    await db.collection('metrics').createIndexes([
      { key: { monitor_id: 1, timestamp: -1 }, name: 'monitor_timestamp_idx' },
      { key: { timestamp: -1 }, name: 'timestamp_idx' },
      { key: { status: 1 }, name: 'status_idx' }
    ]);
    console.log('✅ Created indexes for metrics collection');
    
    // Alerts indexes
    await db.collection('alerts').createIndexes([
      { key: { monitor_id: 1, triggered_at: -1 }, name: 'monitor_triggered_idx' },
      { key: { status: 1 }, name: 'alert_status_idx' },
      { key: { severity: 1 }, name: 'alert_severity_idx' },
      { key: { triggered_at: -1 }, name: 'triggered_at_idx' }
    ]);
    console.log('✅ Created indexes for alerts collection');
    
    // Monitor states indexes
    await db.collection('monitor_states').createIndexes([
      { key: { monitor_id: 1 }, unique: true, name: 'monitor_id_unique' },
      { key: { current_status: 1 }, name: 'current_status_idx' },
      { key: { updated_at: -1 }, name: 'updated_at_idx' }
    ]);
    console.log('✅ Created indexes for monitor_states collection');
    
    // Notification queue indexes
    await db.collection('notification_queue').createIndexes([
      { key: { status: 1 }, name: 'queue_status_idx' },
      { key: { scheduled_at: 1 }, name: 'scheduled_at_idx' },
      { key: { created_at: -1 }, name: 'created_at_idx' }
    ]);
    console.log('✅ Created indexes for notification_queue collection');
    
    // Insert sample monitor (optional)
    console.log('\n📝 Inserting sample data...');
    const sampleMonitor = {
      monitor_name: 'Sample API Monitor',
      monitor_type: 'url',
      creation_date_time: new Date(),
      created_by: 'admin',
      business_owner: 'IT Team',
      alarming_candidate: ['admin@example.com'],
      dependencies: ['authentication-service'],
      description: 'Monitor main API endpoint availability',
      severity: 'high',
      monitor_instance: 'https://api.example.com/health',
      positive_pattern: 'status.*ok',
      status_code: [200],
      high_value_threshold_warning: 1000,
      high_value_threshold_alarm: 2000,
      consecutive_warning: 2,
      consecutive_alarm: 3,
      period_in_minute: 5,
      timeout_in_second: 30,
      alarm_after_n_failure: 3,
      reset_after_m_ok: 2,
      active_disable: true,
      running_stopped: true,
      maintenance_windows: []
    };
    
    try {
      await db.collection('monitors').insertOne(sampleMonitor);
      console.log('✅ Inserted sample monitor');
    } catch (error: any) {
      if (error.code === 11000) {
        console.log('ℹ️  Sample monitor already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n✨ Database initialization completed successfully!');
    console.log(`\nDatabase: ${DB_NAME}`);
    console.log(`Collections created: ${collections.length + 1}`);
    console.log('\nYou can now start the application with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the initialization
initializeDatabase();