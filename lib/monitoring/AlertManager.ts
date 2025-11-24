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
    const db = await getDatabase();
    
    // Get monitoring state from StateManager's collection
    const state = await db.collection(Collections.MONITOR_STATES).findOne({
      monitor_id: monitor._id
    });
    
    if (!state) {
      console.warn(`⚠️  No state found for monitor: ${monitor.monitor_name}`);
      return;
    }
    
    // Determine if this is a failure
    const isFailure = !result.success || 
                     result.status === 'alarm' || 
                     result.status === 'warning';
    
    if (isFailure) {
      // Check if we should trigger an alert
      const shouldAlert = this.shouldTriggerAlert(monitor, state, result.status);
      
      if (shouldAlert) {
        await this.createOrUpdateAlert(monitor, result, state);
      }
      
    } else {
      // Success - check if we should recover active alerts
      const shouldRecover = state.consecutive_successes >= (monitor.reset_after_m_ok || 2);
      
      if (shouldRecover) {
        await this.recoverActiveAlerts(monitor);
      }
    }
  }
  
  /**
   * Determine if an alert should be triggered
   */
  private shouldTriggerAlert(monitor: Monitor, state: any, status: string): boolean {
    // For alarms
    if (status === 'alarm') {
      return state.consecutive_failures >= (monitor.consecutive_alarm || 3);
    }
    
    // For warnings
    if (status === 'warning') {
      return state.consecutive_failures >= (monitor.consecutive_warning || 2);
    }
    
    return false;
  }
  
  /**
   * Create or update an alert
   */
  private async createOrUpdateAlert(monitor: Monitor, result: CheckResult, state: any): Promise<void> {
    const db = await getDatabase();
    
    // Check if there's already an active alert for this monitor
    const existingAlert = await db.collection(Collections.ALERTS).findOne({
      monitor_id: monitor._id?.toString(),
      status: { $in: ['active', 'acknowledged', 'in_recovery'] }
    });
    
    if (existingAlert) {
      // Update existing alert
      await db.collection(Collections.ALERTS).updateOne(
        { _id: existingAlert._id },
        {
          $set: {
            current_value: result.value || 0,
            consecutive_failures: state.consecutive_failures,
            message: result.message,
            metadata: result.metadata,
            last_updated: new Date()
          }
        }
      );
      
      console.log(`📝 Updated existing alert for ${monitor.monitor_name}`);
      
    } else {
      // Create new alert
      const alert: Partial<Alert> = {
        monitor_id: monitor._id?.toString() || '',
        monitor_name: monitor.monitor_name,
        severity: result.status === 'alarm' ? 'alarm' : 'warning',
        status: 'active',
        triggered_at: new Date(),
        current_value: result.value || 0,
        threshold_value: this.getThresholdValue(monitor, result.status),
        consecutive_failures: state.consecutive_failures,
        recovery_attempts: [],
        notifications_sent: [],
        message: result.message,
        metadata: result.metadata
      };
      
      const insertResult = await db.collection(Collections.ALERTS).insertOne(alert);
      
      console.log(`🚨 Created new alert for ${monitor.monitor_name}`);
      
      // Send notifications
      await this.sendNotifications(monitor, alert, insertResult.insertedId.toString());
    }
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
    const db = await getDatabase();
    
    const result = await db.collection(Collections.ALERTS).updateMany(
      {
        monitor_id: monitor._id?.toString(),
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
        monitor_id: monitor._id?.toString(),
        status: 'recovered',
        recovered_at: { $gte: new Date(Date.now() - 60000) } // Last minute
      }).toArray();
      
      for (const alert of alerts) {
        await this.sendRecoveryNotifications(monitor, alert);
      }
    }
  }
  
  /**
   * Send notifications for a new alert
   */
  private async sendNotifications(monitor: Monitor, alert: Partial<Alert>, alertId: string): Promise<void> {
    const db = await getDatabase();
    const notifications: NotificationLog[] = [];
    
    // Send email notifications
    for (const email of monitor.alarming_candidate || []) {
      try {
        console.log(`📧 Sending alert notification to ${email}`);
        
        // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
        // For now, we'll just log it
        
        const notification: NotificationLog = {
          channel: 'email',
          recipient: email,
          sent_at: new Date(),
          status: 'sent',
          message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        notifications.push(notification);
        
        // In production, uncomment and implement:
        // await this.sendEmail({
        //   to: email,
        //   subject: `[${alert.severity?.toUpperCase()}] ${monitor.monitor_name}`,
        //   body: this.formatAlertEmail(monitor, alert)
        // });
        
      } catch (error: any) {
        console.error(`Failed to send notification to ${email}:`, error);
        notifications.push({
          channel: 'email',
          recipient: email,
          sent_at: new Date(),
          status: 'failed',
          error_message: error.message
        });
      }
    }
    
    // Update alert with notification logs
    if (notifications.length > 0) {
      await db.collection(Collections.ALERTS).updateOne(
        { _id: new ObjectId(alertId) },
        { $push: { notifications_sent: { $each: notifications } } }
      );
    }
  }
  
  /**
   * Send recovery notifications
   */
  private async sendRecoveryNotifications(monitor: Monitor, alert: any): Promise<void> {
    console.log(`✅ Sending recovery notification for ${monitor.monitor_name}`);
    
    const db = await getDatabase();
    const notifications: NotificationLog[] = [];
    
    for (const email of monitor.alarming_candidate || []) {
      try {
        console.log(`📧 Sending recovery notification to ${email}`);
        
        const notification: NotificationLog = {
          channel: 'email',
          recipient: email,
          sent_at: new Date(),
          status: 'sent',
          message_id: `msg_recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        notifications.push(notification);
        
        // TODO: Send actual recovery email
        // await this.sendEmail({
        //   to: email,
        //   subject: `[RECOVERED] ${monitor.monitor_name}`,
        //   body: this.formatRecoveryEmail(monitor, alert)
        // });
        
      } catch (error: any) {
        console.error(`Failed to send recovery notification to ${email}:`, error);
      }
    }
    
    // Update alert with recovery notification logs
    if (notifications.length > 0) {
      await db.collection(Collections.ALERTS).updateOne(
        { _id: alert._id },
        { $push: { notifications_sent: { $each: notifications } } }
      );
    }
  }
  
  /**
   * Format alert email content
   */
  private formatAlertEmail(monitor: Monitor, alert: Partial<Alert>): string {
    return `
🚨 ALERT: ${monitor.monitor_name}

Severity: ${alert.severity?.toUpperCase()}
Status: ${alert.status}

Message: ${alert.message}

Details:
- Current Value: ${alert.current_value}
- Threshold: ${alert.threshold_value}
- Consecutive Failures: ${alert.consecutive_failures}
- Triggered At: ${alert.triggered_at}

Monitor Information:
- Type: ${monitor.monitor_type}
- Instance: ${monitor.monitor_instance}
- Business Owner: ${monitor.business_owner}
- Created By: ${monitor.created_by}

Please investigate this issue immediately.

---
This is an automated alert from the Monitoring System
    `.trim();
  }
  
  /**
   * Format recovery email content
   */
  private formatRecoveryEmail(monitor: Monitor, alert: any): string {
    const duration = alert.recovered_at && alert.triggered_at 
      ? this.formatDuration(alert.triggered_at, alert.recovered_at)
      : 'Unknown';
      
    return `
✅ RECOVERED: ${monitor.monitor_name}

The alert has been automatically recovered.

Duration: ${duration}

Original Alert:
- Severity: ${alert.severity?.toUpperCase()}
- Message: ${alert.message}
- Triggered At: ${new Date(alert.triggered_at).toLocaleString()}
- Recovered At: ${new Date(alert.recovered_at).toLocaleString()}

Monitor Information:
- Type: ${monitor.monitor_type}
- Instance: ${monitor.monitor_instance}

The system is now operating normally.

---
This is an automated recovery notification from the Monitoring System
    `.trim();
  }
  
  /**
   * Format duration between two dates
   */
  private formatDuration(start: Date, end: Date): string {
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
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
  
  /**
   * Placeholder for email sending (implement with your email service)
   */
  private async sendEmail(options: { to: string; subject: string; body: string }): Promise<void> {
    // TODO: Implement with SendGrid, AWS SES, Nodemailer, etc.
    // Example with SendGrid:
    // import sgMail from '@sendgrid/mail';
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    // await sgMail.send({
    //   to: options.to,
    //   from: 'alerts@yourcompany.com',
    //   subject: options.subject,
    //   text: options.body
    // });
    
    console.log(`📧 Email would be sent to ${options.to}: ${options.subject}`);
  }
}