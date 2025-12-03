// app/api/scheduler/stop/route.ts

import { NextResponse } from 'next/server';
import { MonitorScheduler } from '@/lib/scheduler/MonitorScheduler';

export async function POST() {
    try {
        const scheduler = MonitorScheduler.getInstance();

        if (!scheduler.isRunning()) {
            return NextResponse.json(
                { error: 'Scheduler is already stopped' },
                { status: 400 }
            );
        }

        scheduler.stop();

        return NextResponse.json({
            success: true,
            message: 'Scheduler stopped successfully',
            status: 'stopped',
            stopped_at: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Failed to stop scheduler:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to stop scheduler' },
            { status: 500 }
        );
    }
}