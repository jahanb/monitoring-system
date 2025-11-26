import { NextResponse } from 'next/server';
import { getEmailService } from '@/lib/email/emailService';

export async function GET() {
    try {
        const emailService = getEmailService();

        // Test connection
        const connected = await emailService.testConnection();

        if (!connected) {
            return NextResponse.json({
                success: false,
                error: 'Failed to connect to email service'
            }, { status: 500 });
        }

        // Send test email
        const testMonitor: any = {
            monitor_name: 'Test Monitor',
            monitor_type: 'ping',
            monitor_instance: '8.8.8.8',
            business_owner: 'Admin',
            created_by: 'System'
        };

        const testAlert = {
            severity: 'alarm' as const,
            status: 'active',
            message: 'This is a test alert',
            current_value: 100,
            threshold_value: 50,
            consecutive_failures: 3,
            triggered_at: new Date()
        };

        const result = await emailService.sendAlertEmail(
            'jahanb@gmail.com', // Change this to your email
            testMonitor,
            testAlert
        );

        return NextResponse.json({
            success: result.success,
            messageId: result.messageId,
            error: result.error
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}