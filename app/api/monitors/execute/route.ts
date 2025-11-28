// app/api/monitors/execute/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getExecutor } from '@/lib/monitoring/MonitoringExecutor';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { Monitor } from '@/lib/models/Monitor';
import { CheckerRegistry } from '@/lib/monitoring/types';

// Import all checkers
import { UrlChecker } from '@/lib/monitoring/checkers/UrlChecker';
import { ApiPostChecker } from '@/lib/monitoring/checkers/ApiPostChecker';
import { SshChecker } from '@/lib/monitoring/checkers/SshChecker';
import { AwsChecker } from '@/lib/monitoring/checkers/AwsChecker';
import { PingChecker } from '@/lib/monitoring/checkers/PingChecker';
import { LogChecker } from '@/lib/monitoring/checkers/LogChecker';
import { CertificateChecker } from '@/lib/monitoring/checkers/CertificateChecker';

// Register all checkers immediately
CheckerRegistry.register(new UrlChecker());
CheckerRegistry.register(new ApiPostChecker());
CheckerRegistry.register(new SshChecker());
CheckerRegistry.register(new AwsChecker());
CheckerRegistry.register(new PingChecker());
CheckerRegistry.register(new LogChecker());
CheckerRegistry.register(new CertificateChecker());

// console.log('✅ Checkers registered:', CheckerRegistry.getRegisteredTypes().join(', '));

/**
 * GET /api/monitors/execute
 * Execute monitors based on query parameter
 * 
 * Query params:
 * - period=due - Execute only monitors that are due for execution (RECOMMENDED)
 * - period=1h|24h|7d|30d - Get execution statistics for the period
 * - (no params) - Get execution statistics for last 24h
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');

    // Special case: Execute due monitors (backward compatible with your scheduler)
    if (period === 'due') {
      console.log(`⏰ Executing monitors due for execution...`);

      const executor = getExecutor();
      const startTime = Date.now();
      const executionResult = await executor.executeDueMonitors();
      const executionTime = Date.now() - startTime;

      console.log(`✅ Execution completed in ${executionTime}ms`);
      console.log(`   Total: ${executionResult.total} | Executed: ${executionResult.executed} | Skipped: ${executionResult.skipped}`);

      const successful = executionResult.results.filter(r => r.result.success).length;
      const failed = executionResult.results.filter(r => !r.result.success).length;

      if (failed > 0) {
        console.log(`⚠️  ${failed} monitors failed:`);
        executionResult.results
          .filter(r => !r.result.success)
          .forEach(r => {
            console.log(`   - ${r.monitorName}: ${r.result.message}`);
          });
      }

      return NextResponse.json({
        success: true,
        message: `Executed ${executionResult.executed} of ${executionResult.total} monitors`,
        execution_time_ms: executionTime,
        total_monitors: executionResult.total,
        executed: executionResult.executed,
        skipped: executionResult.skipped,
        successful,
        failed,
        results: executionResult.results.map(r => ({
          monitor_id: r.monitorId,
          monitor_name: r.monitorName,
          success: r.result.success,
          status: r.result.status,
          value: r.result.value,
          message: r.result.message,
          timestamp: r.result.timestamp
        }))
      });
    }

    // Otherwise, return execution statistics
    const statsPeriod = period || '24h';
    const db = await getDatabase();

    let startDate = new Date();
    switch (statsPeriod) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setHours(startDate.getHours() - 24);
    }

    const [
      totalChecks,
      successfulChecks,
      failedChecks,
      checksByStatus,
      checksByMonitorType,
      recentChecks
    ] = await Promise.all([
      // Total checks in period
      db.collection(Collections.METRICS).countDocuments({
        timestamp: { $gte: startDate }
      }),

      // Successful checks
      db.collection(Collections.METRICS).countDocuments({
        timestamp: { $gte: startDate },
        status: 'ok'
      }),

      // Failed checks
      db.collection(Collections.METRICS).countDocuments({
        timestamp: { $gte: startDate },
        status: { $in: ['alarm', 'warning', 'error'] }
      }),

      // Breakdown by status
      db.collection(Collections.METRICS).aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray(),

      // Breakdown by monitor type
      db.collection(Collections.METRICS).aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $lookup: {
            from: Collections.MONITORS,
            let: { monitor_id: { $toObjectId: '$monitor_id' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$monitor_id'] } } },
              { $project: { monitor_type: 1 } }
            ],
            as: 'monitor'
          }
        },
        { $unwind: { path: '$monitor', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$monitor.monitor_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray(),

      // Recent checks (last 10)
      db.collection(Collections.METRICS).aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $sort: { timestamp: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: Collections.MONITORS,
            let: { monitor_id: { $toObjectId: '$monitor_id' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$monitor_id'] } } },
              { $project: { monitor_name: 1, monitor_type: 1 } }
            ],
            as: 'monitor'
          }
        },
        { $unwind: { path: '$monitor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            monitor_name: '$monitor.monitor_name',
            monitor_type: '$monitor.monitor_type',
            status: 1,
            value: 1,
            timestamp: 1,
            response_time: 1
          }
        }
      ]).toArray()
    ]);

    const successRate = totalChecks > 0
      ? ((successfulChecks / totalChecks) * 100).toFixed(2)
      : 0;

    return NextResponse.json({
      period: statsPeriod,
      summary: {
        total_checks: totalChecks,
        successful: successfulChecks,
        failed: failedChecks,
        success_rate: `${successRate}%`
      },
      by_status: checksByStatus.map(s => ({
        status: s._id,
        count: s.count
      })),
      by_monitor_type: checksByMonitorType.map(t => ({
        type: t._id || 'unknown',
        count: t.count
      })),
      recent_checks: recentChecks
    });

  } catch (error: any) {
    console.error('Failed to execute/get stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute monitors or get stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitors/execute
 * Manually trigger monitor execution
 * 
 * Body options:
 * - { monitor_id: "..." } - Execute specific monitor
 * - { type: "ping" } - Execute all monitors of a specific type
 * - {} or no body - Execute all active monitors
 */
export async function POST(request: NextRequest) {
  try {
    const executor = getExecutor();
    const body = await request.json().catch(() => ({}));
    const { monitor_id, type } = body;

    if (monitor_id) {
      // Execute specific monitor
      console.log(`🎯 Executing specific monitor: ${monitor_id}`);

      const db = await getDatabase();
      const monitor = await db.collection(Collections.MONITORS).findOne({
        _id: new ObjectId(monitor_id)
      });

      if (!monitor) {
        return NextResponse.json(
          { error: 'Monitor not found' },
          { status: 404 }
        );
      }

      const result = await executor.executeMonitor(monitor as unknown as Monitor);

      return NextResponse.json({
        success: true,
        monitor: monitor.monitor_name,
        result: {
          success: result.success,
          status: result.status,
          value: result.value,
          message: result.message,
          timestamp: result.timestamp
        }
      });

    } else if (type) {
      // Execute all monitors of a specific type
      console.log(`🎯 Executing all ${type} monitors`);

      const db = await getDatabase();
      const monitors = await db.collection(Collections.MONITORS).find({
        monitor_type: type,
        active_disable: true,
        running_stopped: true
      }).toArray();

      if (monitors.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No active ${type} monitors found`,
          total: 0,
          results: []
        });
      }

      const results = await Promise.all(
        monitors.map(async (monitor: any) => {
          const result = await executor.executeMonitor(monitor as Monitor);
          return {
            monitor_id: monitor._id.toString(),
            monitor_name: monitor.monitor_name,
            success: result.success,
            status: result.status,
            message: result.message
          };
        })
      );

      const successful = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        message: `Executed ${monitors.length} ${type} monitors`,
        total: monitors.length,
        successful,
        failed: monitors.length - successful,
        results
      });

    } else {
      // Execute all active monitors
      console.log(`🎯 Executing all active monitors`);

      const executionResult = await executor.executeAllMonitors();

      return NextResponse.json({
        success: true,
        message: `Executed ${executionResult.total} monitors`,
        ...executionResult
      });
    }

  } catch (error: any) {
    console.error('Failed to execute monitors:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute monitors' },
      { status: 500 }
    );
  }
}