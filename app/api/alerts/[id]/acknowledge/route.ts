
// app/api/alerts/[id]/acknowledge/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const body = await request.json();
    
    const result = await db.collection(Collections.ALERTS).updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          status: 'acknowledged',
          acknowledged_at: new Date(),
          acknowledged_by: body.acknowledged_by || 'system',
          acknowledgment_note: body.note || ''
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
    
    // Log the acknowledgment (optional)
    if (Collections.ALERT_HISTORY) {
      await db.collection(Collections.ALERT_HISTORY).insertOne({
        alert_id: params.id,
        action: 'acknowledged',
        performed_by: body.acknowledged_by || 'system',
        note: body.note || '',
        timestamp: new Date()
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to acknowledge alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}