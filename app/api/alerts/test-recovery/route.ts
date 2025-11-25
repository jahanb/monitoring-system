// app/api/alerts/test-recovery/route.ts

import { NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
    const db = await getDatabase();

    // Get a monitor
    const monitor = await db.collection(Collections.MONITORS)
        .findOne({ monitor_name: "ping" });

    if (!monitor) {
        return NextResponse.json({ error: "Monitor not found" });
    }

    // Get its state
    const state = await db.collection(Collections.MONITOR_STATES)
        .findOne({ monitor_id: monitor._id });

    // Get its alerts
    const alerts = await db.collection(Collections.ALERTS)
        .find({ monitor_id: monitor._id.toString() })
        .sort({ triggered_at: -1 })
        .limit(5)
        .toArray();

    return NextResponse.json({
        monitor: {
            name: monitor.monitor_name,
            reset_after_m_ok: monitor.reset_after_m_ok,
            consecutive_alarm: monitor.consecutive_alarm,
            consecutive_warning: monitor.consecutive_warning
        },
        state: {
            consecutive_failures: state?.consecutive_failures,
            consecutive_successes: state?.consecutive_successes,
            last_status: state?.last_status
        },
        alerts: alerts.map(a => ({
            status: a.status,
            triggered_at: a.triggered_at,
            recovered_at: a.recovered_at,
            consecutive_failures: a.consecutive_failures
        })),
        recovery_logic: {
            should_recover: state?.consecutive_successes >= (monitor.reset_after_m_ok || 2),
            current_successes: state?.consecutive_successes,
            required_successes: monitor.reset_after_m_ok || 2
        }
    });
}