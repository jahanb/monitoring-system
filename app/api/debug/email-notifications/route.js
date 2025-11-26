// app/api/debug/email-notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { getAlarmingEmails } from '@/lib/models/Monitor';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monitorName = searchParams.get('monitor') || 'ping';

    const db = await getDatabase();

    // Get the monitor
    const monitor = await db.collection(Collections.MONITORS).findOne({
      monitor_name: monitorName
    });

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' });
    }

    // Get recent alerts for this monitor
    const alerts = await db.collection(Collections.ALERTS)
      .find({ monitor_id: monitor._id?.toString() })
      .sort({ triggered_at: -1 })
      .limit(5)
      .toArray();

    // Extract email addresses
    const emailAddresses = getAlarmingEmails(monitor as any);

    // Check notification logs from alerts
    const notificationLogs = alerts.map(alert => ({
      alert_id: alert._id,
      status: alert.status,
      triggered_at: alert.triggered_at,
      notifications_sent: alert.notifications_sent || [],
      notification_count: (alert.notifications_sent || []).length
    }));

    return NextResponse.json({
      monitor: {
        name: monitor.monitor_name,
        id: monitor._id,
        alarming_candidate: monitor.alarming_candidate,
        alarming_candidate_type: Array.isArray(monitor.alarming_candidate)
          ? (typeof monitor.alarming_candidate[0] === 'string' ? 'string_array' : 'object_array')
          : 'undefined',
        email_addresses_extracted: emailAddresses
      },
      alerts: notificationLogs,
      diagnosis: {
        has_contacts: emailAddresses.length > 0,
        contact_count: emailAddresses.length,
        alert_emails_sent: notificationLogs.reduce((sum, a) => sum + a.notification_count, 0),
        most_recent_alert_status: alerts[0]?.status || 'none',
        most_recent_notifications: alerts[0]?.notifications_sent || []
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}