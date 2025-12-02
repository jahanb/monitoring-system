// lib/monitoring/AlertManager.ts

import { getDatabase, Collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { Monitor } from '@/lib/models/Monitor';
import { Alert, NotificationLog } from '@/lib/models/Alert';
import { CheckResult } from './types';

/**
 * AlertManager
 * Manages alert lifecycle:
 * - Creates alerts when thresholds are breached
 * - Tracks consecutive failures
 * - Auto-recovers alerts when checks succeed
 * - Triggers notifications
 * - Manages alert state transitions
 */
export class AlertManager {

  /**
   * Process check result and manage alerts
   */
  async processCheckResult(monitor: Monitor, result: CheckResult): Promise<void> {
    try {
      console.log(`🔔 AlertManager processing: ${monitor.monitor_name} - Status: ${result.status}, Success: ${result.success}`);

      const db = await getDatabase();

      // Get monitoring state from StateManager's collection
      let state = await this.getMonitorState(db, monitor._id);

      if (!state) {
        console.warn(`⚠️  No state found for monitor: ${monitor.monitor_name} (ID: ${monitor._id})`);
        return;
      }

      console.log(`   State: consecutive_failures=${state.consecutive_failures || 0}, consecutive_successes=${state.consecutive_successes || 0}`);

      // Determine if this is a failure
      const isFailure = !result.success ||
        result.status === 'alarm' ||
        result.status === 'warning';

      if (isFailure) {
        console.log(`   ❌ Failure detected for ${monitor.monitor_name}`);

        // Check if we should trigger an alert
        const shouldAlert = this.shouldTriggerAlert(monitor, state, result.status);

        console.log(`   Should trigger alert? ${shouldAlert} (threshold: alarm=${monitor.consecutive_alarm || 3}, warning=${monitor.consecutive_warning || 2})`);

        if (shouldAlert) {
          await this.createOrUpdateAlert(monitor, result, state);
        }

      } else {
        console.log(`   ✅ Success for ${monitor.monitor_name}`);

        // Success - check if we should recover active alerts
        const consecutiveSuccesses = state.consecutive_successes || 0;
        const requiredSuccesses = monitor.reset_after_m_ok || 2;
        const shouldRecover = consecutiveSuccesses >= requiredSuccesses;

        console.log(`   Should recover? ${shouldRecover} (consecutive_successes=${consecutiveSuccesses}, threshold=${requiredSuccesses})`);

        if (shouldRecover) {
          await this.recoverActiveAlerts(monitor);
        }
      }
    } catch (error: any) {
      console.error(`❌ AlertManager error for ${monitor.monitor_name}:`, error);
    }
  }

  /**
   * Get monitor state with fallback for different ID formats
   */
  private async getMonitorState(db: any, monitorId: any): Promise<any> {
    // Try ObjectId format first
    let state = await db.collection(Collections.MONITOR_STATES).findOne({
      monitor_id: monitorId
    });

    // If not found, try string version
    if (!state && monitorId) {
      state = await db.collection(Collections.MONITOR_STATES).findOne({
        monitor_id: monitorId.toString()
      });
    }

    // If still not found, try as ObjectId if it's a string
    if (!state && typeof monitorId === 'string') {
      try {
        state = await db.collection(Collections.MONITOR_STATES).findOne({
          monitor_id: new ObjectId(monitorId)
        });
      } catch (e) {
        // Not a valid ObjectId string
      }
    }

    return state;
  }

  /**
   * Determine if an alert should be triggered
   */
  private shouldTriggerAlert(monitor: Monitor, state: any, status: string): boolean {
    const consecutiveFailures = state.consecutive_failures || 0;

    // For alarms
    if (status === 'alarm') {
      const threshold = monitor.consecutive_alarm || 3;
      return consecutiveFailures >= threshold;
    }

    // For warnings
    if (status === 'warning') {
      const threshold = monitor.consecutive_warning || 2;
      return consecutiveFailures >= threshold;
    }

    return false;
  }

  /**
   * Create or update an alert
   * KEY FIX: Now properly handles notification logic for existing alerts
   */
  private async createOrUpdateAlert(monitor: Monitor, result: CheckResult, state: any): Promise<void> {
    try {
      const db = await getDatabase();

      console.log(`🚨 Creating/updating alert for ${monitor.monitor_name}`);
      console.log(`   Monitor ID: ${monitor._id}`);

      // Check if there's already an active alert for this monitor
      let existingAlert = await this.getExistingAlert(db, monitor._id);

      if (existingAlert) {
        console.log(`   📝 Found existing alert ${existingAlert._id!.toString}`);
        console.log(`   Alert status: ${existingAlert.status}`);
        console.log(`   Previous consecutive failures: ${existingAlert.consecutive_failures || 0}`);
        console.log(`   Current consecutive failures: ${state.consecutive_failures || 0}`);

        // Check if severity has escalated (warning -> alarm)
        const severityEscalated =
          existingAlert.severity === 'warning' &&
          result.status === 'alarm';

        // Check if this is a significant increase in failures
        const failuresIncreased =
          (state.consecutive_failures || 0) > (existingAlert.consecutive_failures || 0);

        // Determine if we should send a new notification
        const shouldNotify = severityEscalated ||
          (failuresIncreased && this.shouldSendReminderNotification(existingAlert));

        console.log(`   Severity escalated: ${severityEscalated}`);
        console.log(`   Failures increased: ${failuresIncreased}`);
        console.log(`   Should send notification: ${shouldNotify}`);

        // Update existing alert
        await db.collection(Collections.ALERTS).updateOne(
          { _id: existingAlert._id!.toString() },
          {
            $set: {
              severity: result.status === 'alarm' ? 'alarm' : 'warning',
              current_value: result.value || 0,
              consecutive_failures: state.consecutive_failures || 0,
              message: result.message,
              metadata: result.metadata,
              last_updated: new Date()
            }
          }
        );

        console.log(`   ✅ Updated alert for ${monitor.monitor_name}`);

        // Send notification if conditions are met
        if (shouldNotify) {
          console.log(`   📧 Sending notification for updated alert...`);
          await this.sendNotifications(
            monitor,
            {
              ...existingAlert,
              severity: result.status === 'alarm' ? 'alarm' : 'warning',
              current_value: result.value || 0,
              consecutive_failures: state.consecutive_failures || 0,
              message: result.message
            },
            existingAlert._id.toString(),
            severityEscalated ? 'escalation' : 'reminder'
          );
        } else {
          console.log(`   ℹ️  Skipping notification - no significant change`);
        }

      } else {
        console.log(`   🆕 Creating NEW alert for ${monitor.monitor_name}`);

        // Create new alert
        const alert: Partial<Alert> = {
          monitor_id: monitor._id?.toString() || '',
          monitor_name: monitor.monitor_name,
          severity: result.status === 'alarm' ? 'alarm' : 'warning',
          status: 'active',
          triggered_at: new Date(),
          current_value: result.value || 0,
          threshold_value: this.getThresholdValue(monitor, result.status),
          consecutive_failures: state.consecutive_failures || 0,
          recovery_attempts: [],
          notifications_sent: [],
          message: result.message,
          metadata: result.metadata
        };

        const insertResult = await db.collection(Collections.ALERTS).insertOne(alert);

        console.log(`   ✅ Created alert with ID: ${insertResult.insertedId}`);
        console.log(`   📧 NOW calling sendNotifications...`);

        // Send notifications for new alert
        await this.sendNotifications(monitor, alert, insertResult.insertedId.toString(), 'new');
      }
    } catch (error: any) {
      console.error(`❌ Failed to create/update alert:`, error);
      throw error;
    }
  }

  /**
   * Get existing active alert for monitor
   */
  private async getExistingAlert(db: any, monitorId: any): Promise<any> {
    // Try multiple ID formats for compatibility
    let existingAlert = await db.collection(Collections.ALERTS).findOne({
      monitor_id: monitorId?.toString(),
      status: { $in: ['active', 'acknowledged', 'in_recovery'] }
    });

    // Try ObjectId format if string didn't work
    if (!existingAlert && monitorId) {
      existingAlert = await db.collection(Collections.ALERTS).findOne({
        monitor_id: monitorId,
        status: { $in: ['active', 'acknowledged', 'in_recovery'] }
      });
    }

    return existingAlert;
  }

  /**
   * Determine if we should send a reminder notification
   * Send reminders every N failures (e.g., every 5 failures)
   */
  private shouldSendReminderNotification(existingAlert: any): boolean {
    const REMINDER_INTERVAL = 5; // Send reminder every 5 failures

    // Check if enough time has passed since last notification
    const lastNotification = existingAlert.notifications_sent?.slice(-1)[0];
    if (lastNotification) {
      const timeSinceLastNotification = Date.now() - new Date(lastNotification.sent_at).getTime();
      const MIN_REMINDER_INTERVAL = 15 * 60 * 1000; // 15 minutes

      // Don't spam - wait at least 15 minutes between reminders
      if (timeSinceLastNotification < MIN_REMINDER_INTERVAL) {
        return false;
      }
    }

    // Send reminder every N failures
    const consecutiveFailures = existingAlert.consecutive_failures || 0;
    return consecutiveFailures % REMINDER_INTERVAL === 0;
  }

  /**
   * Get threshold value based on status
   */
  private getThresholdValue(monitor: Monitor, status: string): number {
    if (status === 'alarm') {
      return monitor.high_value_threshold_alarm || monitor.low_value_threshold_alarm || 0;
    }
    if (status === 'warning') {
      return monitor.high_value_threshold_warning || monitor.low_value_threshold_warning || 0;
    }
    return 0;
  }

  /**
   * Recover active alerts for a monitor
   */
  private async recoverActiveAlerts(monitor: Monitor): Promise<void> {
    try {
      const db = await getDatabase();

      console.log(`🔄 Attempting to recover alerts for ${monitor.monitor_name}`);

      // Try both ID formats for update
      const result = await db.collection(Collections.ALERTS).updateMany(
        {
          $or: [
            { monitor_id: monitor._id?.toString() },
            { monitor_id: monitor._id }
          ],
          status: { $in: ['active', 'acknowledged', 'in_recovery'] }
        },
        {
          $set: {
            status: 'recovered',
            recovered_at: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Recovered ${result.modifiedCount} alert(s) for ${monitor.monitor_name}`);

        // Send recovery notifications
        const alerts = await db.collection(Collections.ALERTS).find({
          $or: [
            { monitor_id: monitor._id?.toString() },
            { monitor_id: monitor._id }
          ],
          status: 'recovered',
          recovered_at: { $gte: new Date(Date.now() - 60000) } // Last minute
        }).toArray();

        console.log(`   Found ${alerts.length} recently recovered alert(s) to notify`);

        for (const alert of alerts) {
          await this.sendRecoveryNotifications(monitor, alert);
        }
      } else {
        console.log(`   ℹ️  No active alerts found to recover for ${monitor.monitor_name}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to recover alerts:`, error);
    }
  }

  /**
   * Send notifications for a new alert
   */
  private async sendNotifications(
    monitor: Monitor,
    alert: Partial<Alert>,
    alertId: string,
    notificationType: 'new' | 'reminder' | 'escalation' = 'new'
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const notifications: NotificationLog[] = [];

      // Get email addresses from alarming_candidate
      const { getAlarmingEmails } = await import('@/lib/models/Monitor');
      const emailAddresses = getAlarmingEmails(monitor);

      console.log(`📧 Sending ${notificationType} notifications for alert ${alertId}`);
      console.log(`   Recipients: ${emailAddresses.join(', ') || 'none'}`);

      if (emailAddresses.length === 0) {
        console.log(`   ⚠️  No email recipients configured for this monitor`);
        return;
      }

      // Import email service dynamically to avoid initialization issues
      const { getEmailService } = await import('@/lib/email/emailService');
      const emailService = getEmailService();

      // Send email notifications
      for (const email of emailAddresses) {
        try {
          console.log(`   📧 Sending ${notificationType} alert notification to ${email}`);

          // Send actual email with notification type
          const result = await emailService.sendAlertEmail(email, monitor, alert, notificationType);

          const notification: NotificationLog = {
            channel: 'email',
            recipient: email,
            sent_at: new Date(),
            status: result.success ? 'sent' : 'failed'
            //    message_id: result.messageId,
            //    error_message: result.error
            ,
            alert_id: '',
            monitor_id: '',
            notification_type: 'email',
            recipients: [],
            success: false
          };

          notifications.push(notification);

          if (result.success) {
            console.log(`   ✅ Sent to ${email}`);
          } else {
            console.log(`   ❌ Failed to send to ${email}: ${result.error}`);
          }

        } catch (error: any) {
          console.error(`   ❌ Failed to send notification to ${email}:`, error);
          notifications.push({
            channel: 'email',
            recipient: email,
            sent_at: new Date(),
            status: 'failed'
            //   error_message: error.message
            ,
            alert_id: '',
            monitor_id: '',
            notification_type: 'email',
            recipients: [],
            success: false
          });
        }
      }

      // Update alert with notification logs
      if (notifications.length > 0) {
        await db.collection(Collections.ALERTS).updateOne(
          { _id: new ObjectId(alertId) },
          { $push: { notifications_sent: { $each: notifications } } }
        );
        console.log(`   ✅ Logged ${notifications.length} notification(s)`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send notifications:`, error);
    }
  }

  /**
   * Send recovery notifications
   */
  private async sendRecoveryNotifications(monitor: Monitor, alert: any): Promise<void> {
    console.log(`✅ Sending recovery notification for ${monitor.monitor_name}`);

    const db = await getDatabase();
    const notifications: NotificationLog[] = [];

    // Get email addresses from alarming_candidate
    const { getAlarmingEmails } = await import('@/lib/models/Monitor');
    const emailAddresses = getAlarmingEmails(monitor);

    if (emailAddresses.length === 0) {
      console.log(`   ⚠️  No email recipients configured for recovery notification`);
      return;
    }

    // Import email service dynamically
    const { getEmailService } = await import('@/lib/email/emailService');
    const emailService = getEmailService();

    for (const email of emailAddresses) {
      try {
        console.log(`   📧 Sending recovery notification to ${email}`);

        // Send actual recovery email
        const result = await emailService.sendRecoveryEmail(email, monitor, alert);

        const notification: NotificationLog = {
          channel: 'email',
          recipient: email,
          sent_at: new Date(),
          status: result.success ? 'sent' : 'failed'
          //message_id: result.messageId,
          // error_message: result.error
          ,
          alert_id: '',
          monitor_id: '',
          notification_type: 'email',
          recipients: [],
          success: false
        };

        notifications.push(notification);

      } catch (error: any) {
        console.error(`   ❌ Failed to send recovery notification to ${email}:`, error);
      }
    }

    // Update alert with recovery notification logs
    if (notifications.length > 0) {
      await db.collection(Collections.ALERTS).updateOne(
        { _id: alert._id!.toString() },
        { $push: { notifications_sent: { $each: notifications } } }
      );
    }
  }


  /**
   * Reset alert state for a specific monitor
   * Useful when you want to clear false positives or restart monitoring
   */
  async resetMonitorAlerts(monitorId: string | ObjectId): Promise<void> {
    try {
      const db = await getDatabase();

      console.log(`🔄 Resetting alerts for monitor: ${monitorId}`);

      // Mark all active alerts as resolved
      const result = await db.collection(Collections.ALERTS).updateMany(
        {
          $or: [
            { monitor_id: monitorId?.toString() },
            { monitor_id: monitorId }
          ],
          status: { $in: ['active', 'acknowledged', 'in_recovery'] }
        },
        {
          $set: {
            status: 'resolved',
            resolved_at: new Date(),
            resolved_reason: 'Manual reset'
          }
        }
      );

      console.log(`✅ Reset ${result.modifiedCount} alert(s)`);

    } catch (error: any) {
      console.error(`❌ Failed to reset alerts:`, error);
      throw error;
    }
  }

  /**
   * Get active alerts count for a monitor
   */
  async getActiveAlertsCount(monitorId: string): Promise<number> {
    const db = await getDatabase();
    return await db.collection(Collections.ALERTS).countDocuments({
      monitor_id: monitorId,
      status: 'active'
    });
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    const db = await getDatabase();
    const alerts = await db.collection(Collections.ALERTS)
      .find({ status: 'active' })
      .sort({ triggered_at: -1 })
      .toArray();

    return alerts as Alert[];
  }
}