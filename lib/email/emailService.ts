// lib/email/emailService.ts

import nodemailer from 'nodemailer';
import { Monitor } from '@/lib/models/Monitor';
import { Alert } from '@/lib/models/Alert';

/**
 * Email Service for sending alert and recovery notifications
 */
export class EmailService {
  private transporter: any;

  constructor() {
    // Initialize Gmail transporter
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: process.env.EMAIL_USER || "familyface.notification@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "your-app-password-here",
      },
    });
  }

  /**
   * Send alert notification email
   */
  async sendAlertEmail(
    recipient: string,
    monitor: Monitor,
    alert: Partial<Alert>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📧 Sending alert email to ${recipient}`);

      const subject = `🚨 [${alert.severity?.toUpperCase()}] Alert: ${monitor.monitor_name}`;
      const htmlBody = this.formatAlertEmailHTML(monitor, alert);
      const textBody = this.formatAlertEmailText(monitor, alert);

      const info = await this.transporter.sendMail({
        from: '"Monitoring System" <familyface.notification@gmail.com>',
        to: recipient,
        subject: subject,
        text: textBody,
        html: htmlBody,
      });

      console.log(`✅ Alert email sent: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error(`❌ Failed to send alert email to ${recipient}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send recovery notification email
   */
  async sendRecoveryEmail(
    recipient: string,
    monitor: Monitor,
    alert: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📧 Sending recovery email to ${recipient}`);

      const subject = `✅ [RECOVERED] ${monitor.monitor_name}`;
      const htmlBody = this.formatRecoveryEmailHTML(monitor, alert);
      const textBody = this.formatRecoveryEmailText(monitor, alert);

      const info = await this.transporter.sendMail({
        from: '"Monitoring System" <familyface.notification@gmail.com>',
        to: recipient,
        subject: subject,
        text: textBody,
        html: htmlBody,
      });

      console.log(`✅ Recovery email sent: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error(`❌ Failed to send recovery email to ${recipient}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Format alert email as HTML
   */
  private formatAlertEmailHTML(monitor: Monitor, alert: Partial<Alert>): string {
    const severityColor = alert.severity === 'alarm' ? '#dc3545' : '#ffc107';
    const duration = this.formatDuration(alert.triggered_at);
    
    // Check if there are solutions in metadata
    const solutions = alert.metadata?.solutions || [];
    const recentErrors = alert.metadata?.recentErrors || [];
    const matches = alert.metadata?.matches || [];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .alert-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${severityColor}; }
    .solution-box { background-color: #e8f5e9; padding: 15px; margin: 15px 0; border-left: 4px solid #4caf50; border-radius: 3px; }
    .solution-box h3 { margin-top: 0; color: #2e7d32; }
    .error-log { background-color: #263238; color: #aed581; padding: 15px; margin: 15px 0; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; min-width: 180px; }
    .info-value { color: #666; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-right: 5px; }
    .badge-critical { background-color: #dc3545; color: white; }
    .badge-high { background-color: #ff9800; color: white; }
    .badge-medium { background-color: #ffc107; color: #333; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Alert Triggered</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <h2 style="margin-top: 0; color: ${severityColor};">${monitor.monitor_name}</h2>
        <p style="font-size: 16px; margin: 10px 0;"><strong>${alert.message}</strong></p>
      </div>

      <h3>Alert Details</h3>
      <div class="info-row">
        <div class="info-label">Severity:</div>
        <div class="info-value" style="color: ${severityColor}; font-weight: bold;">${alert.severity?.toUpperCase()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Current Value:</div>
        <div class="info-value">${alert.current_value?.toFixed(2) || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Threshold:</div>
        <div class="info-value">${alert.threshold_value?.toFixed(2) || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Consecutive Failures:</div>
        <div class="info-value">${alert.consecutive_failures}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Triggered At:</div>
        <div class="info-value">${new Date(alert.triggered_at || new Date()).toLocaleString()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Duration:</div>
        <div class="info-value">${duration}</div>
      </div>

      ${matches.length > 0 ? `
      <h3>Issues Found (${matches.length})</h3>
      <div style="margin: 15px 0;">
        ${matches.slice(0, 5).map((match: any) => `
          <div style="background: white; padding: 10px; margin-bottom: 10px; border-left: 3px solid ${this.getSeverityColor(match.severity)};">
            <div style="margin-bottom: 5px;">
              <span class="badge badge-${match.severity}">${match.severity?.toUpperCase()}</span>
              <strong>${match.category}</strong>
            </div>
            <code style="font-size: 12px; color: #666;">${this.escapeHtml(match.line)}</code>
          </div>
        `).join('')}
        ${matches.length > 5 ? `<p style="color: #666; font-style: italic;">...and ${matches.length - 5} more</p>` : ''}
      </div>
      ` : ''}

      ${solutions.length > 0 ? `
      <div class="solution-box">
        <h3>💡 Recommended Solutions</h3>
        <ul>
          ${solutions.map((solution: string) => `<li>${solution}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${recentErrors.length > 0 ? `
      <h3>Recent Log Entries</h3>
      <div class="error-log">
        ${recentErrors.slice(0, 5).map((error: string) => this.escapeHtml(error)).join('<br>')}
      </div>
      ` : ''}

      <h3>Monitor Information</h3>
      <div class="info-row">
        <div class="info-label">Monitor Type:</div>
        <div class="info-value">${monitor.monitor_type}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Instance:</div>
        <div class="info-value">${monitor.monitor_instance || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Business Owner:</div>
        <div class="info-value">${monitor.business_owner}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Created By:</div>
        <div class="info-value">${monitor.created_by}</div>
      </div>

      <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107;">
        <strong>⚠️ Action Required:</strong> Please investigate this issue immediately.
      </p>
    </div>
    <div class="footer">
      <p>This is an automated alert from the Monitoring System</p>
      <p>Do not reply to this email</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#ff9800';
      case 'medium': return '#ffc107';
      default: return '#17a2b8';
    }
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
  

private formatAlertEmailText(monitor: Monitor, alert: Partial<Alert>): string {
  const duration = this.formatDuration(alert.triggered_at);

  return `
🚨 ALERT TRIGGERED

Monitor: ${monitor.monitor_name}
Severity: ${alert.severity?.toUpperCase()}
Message: ${alert.message}

Alert Details:
- Current Value: ${alert.current_value?.toFixed(2) || 'N/A'}
- Threshold: ${alert.threshold_value?.toFixed(2) || 'N/A'}
- Consecutive Failures: ${alert.consecutive_failures}
- Triggered At: ${new Date(alert.triggered_at || new Date()).toLocaleString()}
- Duration: ${duration}

Monitor Information:
- Type: ${monitor.monitor_type}
- Instance: ${monitor.monitor_instance || 'N/A'}
- Business Owner: ${monitor.business_owner}
- Created By: ${monitor.created_by}

⚠️ Action Required: Please investigate this issue immediately.
This is an automated alert from the Monitoring System
Do not reply to this email
  `.trim();
}

  /**
   * Format recovery email as HTML
   */

private formatRecoveryEmailHTML(monitor: Monitor, alert: any): string {
  const duration = this.formatDuration(alert.triggered_at, alert.recovered_at);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .success-box { background-color: #d4edda; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; border-radius: 3px; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; min-width: 180px; }
    .info-value { color: #666; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Alert Recovered</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <h2 style="margin-top: 0; color: #28a745;">${monitor.monitor_name}</h2>
        <p style="font-size: 16px; margin: 10px 0;">The alert has been automatically recovered. The system is now operating normally.</p>
      </div>

      <h3>Recovery Details</h3>
      <div class="info-row">
        <div class="info-label">Alert Duration:</div>
        <div class="info-value">${duration}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Triggered At:</div>
        <div class="info-value">${new Date(alert.triggered_at).toLocaleString()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Recovered At:</div>
        <div class="info-value">${new Date(alert.recovered_at).toLocaleString()}</div>
      </div>

      <h3>Original Alert</h3>
      <div class="info-row">
        <div class="info-label">Severity:</div>
        <div class="info-value">${alert.severity?.toUpperCase()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Message:</div>
        <div class="info-value">${alert.message}</div>
      </div>

      <h3>Monitor Information</h3>
      <div class="info-row">
        <div class="info-label">Monitor Type:</div>
        <div class="info-value">${monitor.monitor_type}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Instance:</div>
        <div class="info-value">${monitor.monitor_instance || 'N/A'}</div>
      </div>

      <p style="margin-top: 20px; padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745;">
        <strong>✅ System Status:</strong> All checks are now passing. No further action is required.
      </p>
    </div>
    <div class="footer">
      <p>This is an automated recovery notification from the Monitoring System</p>
      <p>Do not reply to this email</p>
    </div>
  </div>
</body>
</html>
  `;
}


 
  private formatRecoveryEmailText(monitor: Monitor, alert: any): string {
    const duration = this.formatDuration(alert.triggered_at, alert.recovered_at);

    return `
✅ ALERT RECOVERED

Monitor: ${monitor.monitor_name}

The alert has been automatically recovered. The system is now operating normally.

Recovery Details:
- Alert Duration: ${duration}
- Triggered At: ${new Date(alert.triggered_at).toLocaleString()}
- Recovered At: ${new Date(alert.recovered_at).toLocaleString()}

Original Alert:
- Severity: ${alert.severity?.toUpperCase()}
- Message: ${alert.message}

Monitor Information:
- Type: ${monitor.monitor_type}
- Instance: ${monitor.monitor_instance || 'N/A'}

✅ System Status: All checks are now passing. No further action is required.

---
This is an automated recovery notification from the Monitoring System
Do not reply to this email
    `.trim();
  }


  
  private formatDuration(start?: Date, end?: Date): string {
    if (!start) return 'N/A';
    
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    
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
   * Test email connection
   */
  
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
  