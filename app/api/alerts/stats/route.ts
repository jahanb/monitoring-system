

// app/api/alerts/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d
    
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }
    
    const [
      totalAlerts,
      activeAlerts,
      acknowledgedAlerts,
      recoveredAlerts,
      alertsByMonitor,
      alertsBySeverity
    ] = await Promise.all([
      db.collection(Collections.ALERTS).countDocuments({
        triggered_at: { $gte: startDate }
      }),
      db.collection(Collections.ALERTS).countDocuments({
        status: 'active',
        triggered_at: { $gte: startDate }
      }),
      db.collection(Collections.ALERTS).countDocuments({
        status: 'acknowledged',
        triggered_at: { $gte: startDate }
      }),
      db.collection(Collections.ALERTS).countDocuments({
        status: 'recovered',
        triggered_at: { $gte: startDate }
      }),
      db.collection(Collections.ALERTS).aggregate([
        { $match: { triggered_at: { $gte: startDate } } },
        { $group: { _id: '$monitor_name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),
      db.collection(Collections.ALERTS).aggregate([
        { $match: { triggered_at: { $gte: startDate } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]).toArray()
    ]);
    
    return NextResponse.json({
      period,
      stats: {
        total: totalAlerts,
        active: activeAlerts,
        acknowledged: acknowledgedAlerts,
        recovered: recoveredAlerts,
        by_monitor: alertsByMonitor,
        by_severity: alertsBySeverity
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch alert stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert stats' },
      { status: 500 }
    );
  }
}