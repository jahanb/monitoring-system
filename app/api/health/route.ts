// app/api/health/route.ts

import { NextResponse } from 'next/server';
import { checkConnection, getDatabase, Collections } from '@/lib/db/mongodb';

export async function GET() {
  try {
    const isConnected = await checkConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        message: 'MongoDB connection failed',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
    
    const db = await getDatabase();
    const stats = await db.stats();
    
    const collections = await Promise.all([
      db.collection(Collections.MONITORS).countDocuments(),
      db.collection(Collections.METRICS).countDocuments(),
      db.collection(Collections.ALERTS).countDocuments(),
      db.collection(Collections.MONITOR_STATES).countDocuments(),
    ]);
    
    return NextResponse.json({
      status: 'healthy',
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: db.databaseName,
        size: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        collections: {
          monitors: collections[0],
          metrics: collections[1],
          alerts: collections[2],
          monitor_states: collections[3]
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        mongodbUri: process.env.MONGODB_URI ? '✓ Configured' : '✗ Missing',
        emailConfigured: process.env.EMAIL_HOST ? '✓ Yes' : '✗ No',
        twilioConfigured: process.env.TWILIO_ACCOUNT_SID ? '✓ Yes' : '✗ No'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}