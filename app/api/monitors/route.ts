// app/api/monitors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { Monitor, MonitorDefaults } from '@/lib/models/Monitor';


import { CheckerRegistry } from '@/lib/monitoring/types';
import { UrlChecker } from '@/lib/monitoring/checkers/UrlChecker';
import { ApiPostChecker } from '@/lib/monitoring/checkers/ApiPostChecker';
import { SshChecker } from '@/lib/monitoring/checkers/SshChecker';
import { AwsChecker } from '@/lib/monitoring/checkers/AwsChecker';
import { PingChecker } from '@/lib/monitoring/checkers/PingChecker';


// Register immediately
CheckerRegistry.register(new UrlChecker());
CheckerRegistry.register(new ApiPostChecker());
CheckerRegistry.register(new SshChecker());
CheckerRegistry.register(new AwsChecker());
CheckerRegistry.register(new PingChecker());

// GET /api/monitors - List all monitors
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;

    // Build filter from query params
    const filter: any = {};

    if (searchParams.get('type')) {
      filter.monitor_type = searchParams.get('type');
    }
    if (searchParams.get('status')) {
      filter.active_disable = searchParams.get('status') === 'active';
    }
    if (searchParams.get('severity')) {
      filter.severity = searchParams.get('severity');
    }
    if (searchParams.get('owner')) {
      filter.business_owner = searchParams.get('owner');
    }

    const monitors = await db
      .collection(Collections.MONITORS)
      .find(filter)
      .sort({ creation_date_time: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: monitors,
      count: monitors.length
    });
  } catch (error) {
    console.error('Error fetching monitors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitors' },
      { status: 500 }
    );
  }
}

// POST /api/monitors - Create new monitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'monitor_name',
      'monitor_type',
      'created_by',
      'business_owner',
      'monitor_instance',
      'severity'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Merge with defaults
    const monitor: Monitor = {
      ...MonitorDefaults,
      ...body,
      creation_date_time: new Date(),
      updated_at: new Date()
    };

    // Additional validation based on monitor type
    if (monitor.monitor_type === 'url' && !monitor.status_code) {
      monitor.status_code = [200, 201, 204];
    }

    const db = await getDatabase();

    // Check for duplicate monitor name
    const existing = await db
      .collection(Collections.MONITORS)
      .findOne({ monitor_name: monitor.monitor_name });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Monitor name already exists' },
        { status: 409 }
      );
    }

    // Insert monitor
    const result = await db
      .collection(Collections.MONITORS)
      .insertOne(monitor);

    // Initialize monitor state
    await db.collection(Collections.MONITOR_STATES).insertOne({
      monitor_id: result.insertedId.toString(),
      current_status: 'ok',
      consecutive_failures: 0,
      consecutive_successes: 0,
      last_check_time: new Date(),
      last_value: null,
      recovery_in_progress: false,
      recovery_attempt_count: 0,
      updated_at: new Date()
    });

    return NextResponse.json({
      success: true,
      data: { _id: result.insertedId, ...monitor }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating monitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create monitor' },
      { status: 500 }
    );
  }
}
