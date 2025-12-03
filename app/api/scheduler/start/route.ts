// app/api/scheduler/start/route.ts

import { NextResponse } from 'next/server';
import { MonitorScheduler } from '@/lib/scheduler/MonitorScheduler';

export async function POST() {
    try {
        console.log('📥 Received request to start scheduler');

        const scheduler = MonitorScheduler.getInstance();

        // Check if already running
        if (scheduler.isRunning()) {
            console.log('⚠️ Scheduler is already running');
            return NextResponse.json(
                {
                    error: 'Scheduler is already running',
                    status: 'running'
                },
                { status: 400 }
            );
        }

        // Start the scheduler
        console.log('🚀 Starting scheduler...');
        await scheduler.start();
        console.log('✅ Scheduler started successfully');

        return NextResponse.json({
            success: true,
            message: 'Scheduler started successfully',
            status: 'running',
            started_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Failed to start scheduler:', error);

        return NextResponse.json(
            {
                error: error.message || 'Failed to start scheduler',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

// Optional: Add GET method to check if endpoint is accessible
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/scheduler/start',
        method: 'POST',
        description: 'Start the monitor scheduler',
        usage: 'Send a POST request to this endpoint to start the scheduler'
    });
}