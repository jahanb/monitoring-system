// app/api/dashboard/route.ts

import { NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get all monitors with their latest state
    const monitorsWithState = await db.collection(Collections.MONITORS).aggregate([
      {
        $match: { active_disable: true }
      },
      {
        $lookup: {
          from: Collections.MONITOR_STATES,
          localField: '_id',
          foreignField: 'monitor_id',
          as: 'state'
        }
      },
      {
        $unwind: {
          path: '$state',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: Collections.METRICS,
          let: { monitorId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$monitor_id', '$$monitorId'] } } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
          ],
          as: 'latestMetric'
        }
      },
      {
        $unwind: {
          path: '$latestMetric',
          preserveNullAndEmptyArrays: true
        }
      }
    ]).toArray();

const statusCounts = { ok: 0, warning: 0, alarm: 0, error: 0 };
monitorsWithState.forEach((m: any) => {
  // Get status from latest metric if state is not available
  const status = m.state?.current_status || m.latestMetric?.status || 'error';
  if (status in statusCounts) {
    statusCounts[status as keyof typeof statusCounts]++;
  }
});

    
    // Get active alerts
    const activeAlerts = await db.collection(Collections.ALERTS)
      .find({ status: 'active' })
      .sort({ triggered_at: -1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: {
        statusCounts,
        totalMonitors: monitorsWithState.length,
        monitors: monitorsWithState,
        activeAlerts
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}