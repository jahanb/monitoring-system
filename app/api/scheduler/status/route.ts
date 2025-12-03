// app/api/scheduler/status/route.ts

import { NextResponse } from 'next/server';
import { MonitorScheduler } from '@/lib/scheduler/MonitorScheduler';

export async function GET() {
    try {
        const scheduler = MonitorScheduler.getInstance();
        const isRunning = scheduler.isRunning();

        console.log('📊 Status check - Running:', isRunning); // Debug log

        return NextResponse.json({
            running: isRunning,
            status: isRunning ? 'running' : 'stopped',
            checked_at: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('❌ Status check error:', error);
        return NextResponse.json(
            {
                running: false,
                error: error.message || 'Failed to check scheduler status'
            },
            { status: 500 }
        );
    }
}

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;