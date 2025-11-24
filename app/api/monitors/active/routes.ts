// app/api/monitors/active/route.ts

import { NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
// import {   } from '@/lib/models/TimeSeries';
import { Monitor, MonitorDefaults } from '@/lib/models/Monitor';
// GET /api/monitors/active - Get all active and running monitors
export async function GET() {
  try {
    const db = await getDatabase();
    const monitors = await db
      .collection(Collections.MONITORS)
      .find({
        active_disable: true,
        running_stopped: true
      })
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: monitors,
      count: monitors.length
    });
  } catch (error) {
    console.error('Error fetching active monitors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active monitors' },
      { status: 500 }
    );
  }
}