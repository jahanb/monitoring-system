import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { Monitor } from '@/lib/models/Monitor';
import { MonitorMetric } from '@/lib/models/TimeSeries';
import {  Alert } from '@/lib/models/Alert';
import { ObjectId } from 'mongodb';

// GET /api/monitors/[id] - Get monitor by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const monitor = await db
      .collection(Collections.MONITORS)
      .findOne({ _id: new ObjectId(params.id) });
    
    if (!monitor) {
      return NextResponse.json(
        { success: false, error: 'Monitor not found' },
        { status: 404 }
      );
    }
    
    // Also get current state
    const state = await db
      .collection(Collections.MONITOR_STATES)
      .findOne({ monitor_id: params.id });
    
    return NextResponse.json({
      success: true,
      data: {
        ...monitor,
        currentState: state
      }
    });
  } catch (error) {
    console.error('Error fetching monitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitor' },
      { status: 500 }
    );
  }
}

// PUT /api/monitors/[id] - Update monitor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = await getDatabase();
    
    // Remove fields that shouldn't be updated
    delete body._id;
    delete body.creation_date_time;
    delete body.created_by;
    
    const result = await db
      .collection(Collections.MONITORS)
      .updateOne(
        { _id: new ObjectId(params.id) },
        { 
          $set: { 
            ...body, 
            updated_at: new Date() 
          } 
        }
      );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Monitor not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { _id: params.id, ...body }
    });
  } catch (error) {
    console.error('Error updating monitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update monitor' },
      { status: 500 }
    );
  }
}

// DELETE /api/monitors/[id] - Delete monitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    
    // Delete monitor
    const result = await db
      .collection(Collections.MONITORS)
      .deleteOne({ _id: new ObjectId(params.id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Monitor not found' },
        { status: 404 }
      );
    }
    
    // Clean up related data
    await db.collection(Collections.MONITOR_STATES)
      .deleteOne({ monitor_id: params.id });
    
    await db.collection(Collections.ALERTS)
      .updateMany(
        { monitor_id: params.id, status: 'active' },
        { $set: { status: 'recovered', recovered_at: new Date() } }
      );
    
    return NextResponse.json({
      success: true,
      message: 'Monitor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting monitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete monitor' },
      { status: 500 }
    );
  }
}