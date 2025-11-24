// lib/monitoring/MonitoringExecutor.ts

import { Monitor } from '@/lib/models/Monitor';
import { MonitorMetric } from '@/lib/models/TimeSeries';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { CheckerRegistry, CheckResult } from './types';
import { StateManager } from './StateManager';
import { AlertManager } from './AlertManager';
import { logger } from '@/lib/logger';
import pLimit from 'p-limit';

// Import all checkers
import { UrlChecker } from './checkers/UrlChecker';
import { ApiPostChecker } from './checkers/ApiPostChecker';
import { SshChecker } from './checkers/SshChecker';
import { AwsChecker } from './checkers/AwsChecker';
import { PingChecker } from './checkers/PingChecker';

export class MonitoringExecutor {
  private stateManager: StateManager;
  private alertManager: AlertManager;
  private static checkersRegistered = false;
  private limit = pLimit(10); // Limit concurrency to 10

  constructor() {
    this.stateManager = new StateManager();
    this.alertManager = new AlertManager();

    // Register all checkers (only once)
    this.registerCheckers();
  }

  private registerCheckers(): void {
    if (MonitoringExecutor.checkersRegistered) {
      return; // Already registered
    }

    logger.info('🔧 Registering checkers...');

    try {
      CheckerRegistry.register(new UrlChecker());
      CheckerRegistry.register(new ApiPostChecker());
      CheckerRegistry.register(new SshChecker());
      CheckerRegistry.register(new AwsChecker());
      CheckerRegistry.register(new PingChecker());

      MonitoringExecutor.checkersRegistered = true;
      logger.info(`✅ Registered ${CheckerRegistry.getCount()} checkers: ${CheckerRegistry.getRegisteredTypes().join(', ')}`);
    } catch (error) {
      logger.error('❌ Failed to register checkers:', { error });
    }
  }

  async executeMonitor(monitor: Monitor): Promise<CheckResult> {
    logger.info(`🔍 Executing monitor: ${monitor.monitor_name} (${monitor.monitor_type})`, { monitorId: monitor._id });

    if (this.isInMaintenanceWindow(monitor)) {
      logger.info(`⏸️  Monitor in maintenance window: ${monitor.monitor_name}`, { monitorId: monitor._id });
      return { success: true, value: null, status: 'ok', message: 'Monitor in maintenance window', timestamp: new Date() };
    }

    const checker = CheckerRegistry.getChecker(monitor.monitor_type);
    if (!checker) {
      const error = `No checker found for type: ${monitor.monitor_type}`;
      logger.error(`❌ ${error}`, { monitorId: monitor._id, availableCheckers: CheckerRegistry.getRegisteredTypes() });
      return { success: false, value: null, status: 'error', message: error, timestamp: new Date() };
    }

    const validation = checker.validate(monitor);
    if (validation !== true) {
      const error = `Invalid monitor configuration: ${validation}`;
      logger.error(`❌ ${error}`, { monitorId: monitor._id });
      return { success: false, value: null, status: 'error', message: error, timestamp: new Date() };
    }

    let result: CheckResult;
    try {
      result = await checker.check(monitor);
      logger.info(`✅ Check completed: ${monitor.monitor_name} - ${result.status}`, { monitorId: monitor._id, status: result.status });
    } catch (error: any) {
      logger.error(`❌ Check failed: ${monitor.monitor_name}`, { monitorId: monitor._id, error });
      result = { success: false, value: null, status: 'error', message: error.message || 'Unknown error', timestamp: new Date() };
    }

    // Store metric first
    await this.storeMetric(monitor, result);

    // Update state (tracks consecutive failures/successes)
    await this.stateManager.updateState(monitor, result);

    // Process alerts (create, update, or recover alerts based on state)
    await this.alertManager.processCheckResult(monitor, result);

    return result;
  }

  async executeAllMonitors(): Promise<{ total: number; successful: number; failed: number; results: Array<{ monitorId: string; monitorName: string; result: CheckResult }>; }> {
    logger.info('🚀 Starting monitoring execution for all active monitors...');
    const db = await getDatabase();
    const monitors = await db.collection(Collections.MONITORS).find<Monitor>({ active_disable: true, running_stopped: true }).toArray();
    logger.info(`📊 Found ${monitors.length} active monitors`);
    if (monitors.length === 0) return { total: 0, successful: 0, failed: 0, results: [] };

    const results = await Promise.all(monitors.map((monitor) => this.limit(async () => {
      const result = await this.executeMonitor(monitor);
      return { monitorId: monitor._id?.toString() || '', monitorName: monitor.monitor_name, result };
    })));

    const successful = results.filter(r => r.result.success).length;
    const failed = results.filter(r => !r.result.success).length;
    logger.info(`✅ Execution complete: ${successful} successful, ${failed} failed`);
    return { total: monitors.length, successful, failed, results };
  }

  async executeDueMonitors(): Promise<{ total: number; executed: number; skipped: number; results: Array<{ monitorId: string; monitorName: string; result: CheckResult }>; }> {
    logger.info('⏰ Checking for monitors due for execution...');
    const db = await getDatabase();
    const now = new Date();

    const monitors = await db.collection(Collections.MONITORS).aggregate([
      { $match: { active_disable: true, running_stopped: true } },
      { $lookup: { from: Collections.MONITOR_STATES, localField: '_id', foreignField: 'monitor_id', as: 'state' } }
    ]).toArray();

    const dueMonitors = monitors.filter((monitor: any) => {
      const state = monitor.state?.[0];
      const lastCheck = state?.last_check_time ? new Date(state.last_check_time) : null;
      if (!lastCheck) return true;
      const periodMs = (monitor.period_in_minute || 5) * 60 * 1000;
      const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
      return timeSinceLastCheck >= periodMs;
    });

    logger.info(`📊 ${dueMonitors.length} of ${monitors.length} monitors are due`);

    const results = await Promise.all(dueMonitors.map((monitor: any) => this.limit(async () => {
      const result = await this.executeMonitor(monitor);
      return { monitorId: monitor._id?.toString() || '', monitorName: monitor.monitor_name, result };
    })));

    return { total: monitors.length, executed: dueMonitors.length, skipped: monitors.length - dueMonitors.length, results };
  }

  private async storeMetric(monitor: Monitor, result: CheckResult): Promise<void> {
    try {
      const db = await getDatabase();
      const metric: MonitorMetric = {
        monitor_id: monitor._id?.toString() || '',
        timestamp: result.timestamp,
        value: result.value,
        status: result.status,
        response_time: result.responseTime,
        status_code: result.statusCode,
        error_message: result.success ? undefined : result.message,
        metadata: result.metadata
      };
      await db.collection(Collections.METRICS).insertOne(metric as any);
    } catch (error) {
      logger.error('Failed to store metric:', { error });
    }
  }

  private isInMaintenanceWindow(monitor: Monitor): boolean {
    if (!monitor.maintenance_windows || monitor.maintenance_windows.length === 0) return false;
    const now = new Date();
    return monitor.maintenance_windows.some(window => {
      const start = new Date(window.start_date_time);
      const end = new Date(window.end_date_time);
      return now >= start && now <= end;
    });
  }
}

let executorInstance: MonitoringExecutor | null = null;
export function getExecutor(): MonitoringExecutor {
  if (!executorInstance) {
    executorInstance = new MonitoringExecutor();
  }
  return executorInstance;
}