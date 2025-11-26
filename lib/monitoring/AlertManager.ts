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
      // Try both ObjectId and string formats for compatibility
      let state = await db.collection(Collections.MONITOR_STATES).findOne({
        monitor_id: monitor._id
      });
      
      // If not found, try string version
      if (!state && monitor._id) {
        state = await db.collection(Collections.MONITOR_STATES).findOne({
          monitor_id: monitor._id.toString()
        });
      }
      
      // If still not found, try as ObjectId if it's a string
      if (!state && typeof monitor._id === 'string') {
        try {
          state = await db.collection(Collections.MONITOR_STATES).findOne({
            monitor_id: new ObjectId(monitor._id)
          });
        } catch (e) {
          // Not a valid ObjectId string
        }
      }
      
      if (!state) {
        console.warn(`⚠️  No state found for monitor: ${monitor.monitor_name} (ID: ${monitor._id})`);
        console.log(`   Available states:`, await db.collection(Collections.MONITOR_STATES).find({}).limit(5).toArray());
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
   */
  private async createOrUpdateAlert(monitor: Monitor, result: CheckResult, state: any): Promise<void> {
    try {
      const db = await getDatabase();
      
      console.log(`🚨 Creating/updating alert for ${monitor.monitor_name}`);
      console.log(`   Monitor ID: ${monitor._id}`);
      console.log(`   Alarming candidate:`, monitor.alarming_candidate);
      
      // Check if there's already an active alert for this monitor
      // Try multiple ID formats for compatibility
      let existingAlert = await db.collection(Collections.ALERTS).findOne({
        monitor_id: monitor._id?.toString(),
        status: { $in: ['active', 'acknowledged', 'in_recovery'] }
      });
      
      // Try ObjectId format if string didn't work
      if (!existingAlert && monitor._id) {
        existingAlert = await db.collection(Collections.ALERTS).findOne({
          monitor_id: monitor._id,
          status: { $in: ['active', 'acknowledged', 'in_recovery'] }
        });
      }
      
      if (existingAlert) {
        console.log(`   📝 Updating existing alert ${existingAlert._id}`);
        console.log(`   ⚠️  NOTE: Alert already exists - no new notification will be sent`);
        console.log(`   Existing notifications:`, existingAlert.notifications_sent?.length || 0);
        
        // Update existing alert
        await db.collection(Collections.ALERTS).updateOne(
          { _id: existingAlert._id },
          {
            $set: {
              current_value: result.value || 0,
              consecutive_failures: state.consecutive_failures || 0,
              message: result.message,
              metadata: result.metadata,
              last_updated: new Date()
            }
          }
        );
        
        console.log(`   ✅ Updated alert for ${monitor.monitor_name}`);
        
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
        
        console.log(`   Alert data:`, JSON.stringify(alert, null, 2));
        
        const insertResult = await db.collection(Collections.ALERTS).insertOne(alert);
        
        console.log(`   ✅ Created alert with ID: ${insertResult.insertedId}`);
        console.log(`   📧 NOW calling sendNotifications...`);
        
        // Send notifications - THIS IS WHERE EMAILS SHOULD BE SENT
        await this.sendNotifications(monitor, alert, insertResult.insertedId.toString());
      }
    } catch (error: any) {
      console.error(`❌ Failed to create/update alert:`, error);
      throw error;
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
  private async sendNotifications(monitor: Monitor, alert: Partial<Alert>, alertId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const notifications: NotificationLog[] = [];
      
      // Get email addresses from alarming_candidate
      const { getAlarmingEmails } = await import('@/lib/models/Monitor');
      const emailAddresses = getAlarmingEmails(monitor);
      
      console.log(`📧 Sending notifications for alert ${alertId}`);
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
          console.log(`   📧 Sending alert notification to ${email}`);
          
          // Send actual email
          const result = await emailService.sendAlertEmail(email, monitor, alert);
          
          const notification: NotificationLog = {
            channel: 'email',
            recipient: email,
            sent_at: new Date(),
            status: result.success ? 'sent' : 'failed',
            message_id: result.messageId,
            error_message: result.error
          };
          
          notifications.push(notification);
          
        } catch (error: any) {
          console.error(`   ❌ Failed to send notification to ${email}:`, error);
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
          status: result.success ? 'sent' : 'failed',
          message_id: result.messageId,
          error_message: result.error
        };
        
        notifications.push(notification);
        
      } catch (error: any) {
        console.error(`   ❌ Failed to send recovery notification to ${email}:`, error);
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