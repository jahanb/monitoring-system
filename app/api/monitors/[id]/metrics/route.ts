// app/api/monitors/[id]/metrics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '24');
    
    const db = await getDatabase();
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const metrics = await db.collection(Collections.METRICS)
      .find({
        monitor_id: params.id,
        timestamp: { $gte: startTime }
      })
      .sort({ timestamp: 1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}