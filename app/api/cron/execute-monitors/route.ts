// app/api/cron/execute-monitors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getExecutor } from '@/lib/monitoring/MonitoringExecutor';

/**
 * Cron endpoint for scheduled monitor execution
 * This should be called periodically (e.g., every 1 minute) by a cron service
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/execute-monitors",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * Or use external cron services like:
 * - cron-job.org
 * - EasyCron
 * - GitHub Actions
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret to prevent unauthorized execution
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️  Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('⏰ Cron job triggered: Executing due monitors...');
    
    const executor = getExecutor();
    const startTime = Date.now();
    
    // Execute only monitors that are due based on their period
    const result = await executor.executeDueMonitors();
    
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ Cron execution completed in ${executionTime}ms`);
    console.log(`   Total: ${result.total} | Executed: ${result.executed} | Skipped: ${result.skipped}`);
    
    // Log summary of results
    const successful = result.results.filter(r => r.result.success).length;
    const failed = result.results.filter(r => !r.result.success).length;
    
    if (failed > 0) {
      console.log(`⚠️  ${failed} monitors failed:`);
      result.results
        .filter(r => !r.result.success)
        .forEach(r => {
          console.log(`   - ${r.monitorName}: ${r.result.message}`);
        });
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      summary: {
        total_monitors: result.total,
        executed: result.executed,
        skipped: result.skipped,
        successful,
        failed
      },
      results: result.results.map(r => ({
        monitor: r.monitorName,
        status: r.result.status,
        success: r.result.success
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Cron execution failed:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Cron execution failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility with some cron services
export async function POST(request: NextRequest) {
  return GET(request);
}