// lib/monitoring/StateManager.ts

import { Monitor } from '@/lib/models/Monitor';
import { MonitorState } from '@/lib/models/MonitorState';
import { Alert } from '@/lib/models/Alert';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { CheckResult } from './types';
import { CheckerRegistry } from './types';
import { ObjectId } from 'mongodb';

export class StateManager {
  async updateState(monitor: Monitor, result: CheckResult): Promise<void> {
    const db = await getDatabase();
    const monitorId = monitor._id?.toString() || '';
    let state = await db.collection(Collections.MONITOR_STATES).findOne({ monitor_id: monitorId }) as MonitorState | null;

    if (!state) {
      state = {
        monitor_id: monitorId,
        current_status: result.status,
        consecutive_failures: result.success ? 0 : 1,
        consecutive_successes: result.success ? 1 : 0,
        last_check_time: new Date(),
        last_value: result.value,
        recovery_in_progress: false,
        recovery_attempt_count: 0,
        updated_at: new Date()
      };
      await db.collection(Collections.MONITOR_STATES).insertOne(state);
    } else {
      const updates: Partial<MonitorState> = {
        last_check_time: new Date(),
        last_value: result.value,
        updated_at: new Date()
      };

      if (result.success && result.status === 'ok') {
        updates.consecutive_successes = (state.consecutive_successes || 0) + 1;
        updates.consecutive_failures = 0;
        if (state.active_alert_id && updates.consecutive_successes >= (monitor.reset_after_m_ok || 2)) {
          await this.recoverAlert(state.active_alert_id);
          updates.active_alert_id = undefined;
          updates.recovery_in_progress = false;
          updates.recovery_attempt_count = 0;
        }
      } else {
        updates.consecutive_failures = (state.consecutive_failures || 0) + 1;
        updates.consecutive_successes = 0;
      }

      updates.current_status = result.status;

      if (result.status === 'warning' && updates.consecutive_failures >= (monitor.consecutive_warning || 2)) {
        if (!state.active_alert_id || state.current_status !== 'warning') {
          const alertId = await this.createAlert(monitor, result, 'warning');
          updates.active_alert_id = alertId;
        }
      } else if (result.status === 'alarm' && updates.consecutive_failures >= (monitor.consecutive_alarm || 3)) {
        if (!state.active_alert_id || state.current_status !== 'alarm') {
          if (state.active_alert_id) {
            await this.upgradeAlert(state.active_alert_id, 'alarm');
          } else {
            const alertId = await this.createAlert(monitor, result, 'alarm');
            updates.active_alert_id = alertId;
          }
        }
      }

      if (!result.success) updates.last_error = result.message;

      await db.collection(Collections.MONITOR_STATES).updateOne({ monitor_id: monitorId }, { $set: updates });
    }
  }

  private async createAlert(monitor: Monitor, result: CheckResult, severity: 'warning' | 'alarm'): Promise<string> {
    const db = await getDatabase();
    const alert: Alert = {
      monitor_id: monitor._id?.toString() || '',
      monitor_name: monitor.monitor_name,
      severity,
      status: 'active',
      triggered_at: new Date(),
      current_value: result.value || 0,
      threshold_value: severity === 'warning' ? (monitor.high_value_threshold_warning || 0) : (monitor.high_value_threshold_alarm || 0),
      consecutive_failures: severity === 'warning' ? (monitor.consecutive_warning || 2) : (monitor.consecutive_alarm || 3),
      recovery_attempts: [],
      notifications_sent: [],
      message: result.message
    };
    const insertResult = await db.collection(Collections.ALERTS).insertOne(alert);
    console.log(`🚨 Created ${severity} alert for monitor: ${monitor.monitor_name}`);
    return insertResult.insertedId.toString();
  }

  private async upgradeAlert(alertId: string, newSeverity: 'alarm'): Promise<void> {
    const db = await getDatabase();
    await db.collection(Collections.ALERTS).updateOne({ _id: new ObjectId(alertId) }, { $set: { severity: newSeverity, message: `Alert upgraded to ${newSeverity}` } });
    console.log(`⬆️ Upgraded alert ${alertId} to ${newSeverity}`);
  }

  private async recoverAlert(alertId: string): Promise<void> {
    const db = await getDatabase();
    await db.collection(Collections.ALERTS).updateOne({ _id: new ObjectId(alertId) }, { $set: { status: 'recovered', recovered_at: new Date() } });
    console.log(`✅ Recovered alert ${alertId}`);
  }

  async getState(monitorId: string): Promise<MonitorState | null> {
    const db = await getDatabase();
    return await db.collection(Collections.MONITOR_STATES).findOne({ monitor_id: monitorId }) as MonitorState | null;
  }

  async getActiveAlerts(monitorId: string): Promise<Alert[]> {
    const db = await getDatabase();
    return await db.collection(Collections.ALERTS).find({ monitor_id: monitorId, status: 'active' }).toArray() as Alert[];
  }
}