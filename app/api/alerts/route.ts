// app/api/alerts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const monitorId = searchParams.get('monitor_id');
    
    const query: any = {};
    if (status) query.status = status;
    if (monitorId) query.monitor_id = monitorId;
    
    const alerts = await db
      .collection(Collections.ALERTS)
      .find(query)
      .sort({ triggered_at: -1 })
      .limit(1000)
      .toArray();
    
    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}



