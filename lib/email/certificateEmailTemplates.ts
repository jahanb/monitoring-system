// lib/email/certificateEmailTemplates.ts

import { Monitor } from '@/lib/models/Monitor';
import { Alert } from '@/lib/models/Alert';

/**
 * Certificate Alert Email Templates
 * Provides rich, actionable email notifications for certificate expiration
 */

export function buildCertificateAlertEmail(
    monitor: Monitor,
    alert: Partial<Alert>,
    notificationType: 'new' | 'reminder' | 'escalation' | 'daily' = 'new'
): { subject: string; html: string; text: string } {

    const metadata = alert.metadata || {};
    const daysRemaining = metadata.daysRemaining || 0;
    const hostname = (monitor as any).certificate_config?.hostname || 'Unknown';
    const expiryDate = metadata.expiryDate ? new Date(metadata.expiryDate) : null;

    // Determine urgency level
    const isExpired = daysRemaining < 0;
    const isCritical = daysRemaining <= 7 && daysRemaining >= 0;
    const isWarning = daysRemaining > 7 && daysRemaining <= 30;

    // Build subject line
    let subject = '';
    if (isExpired) {
        subject = `🚨 EXPIRED: SSL Certificate for ${hostname}`;
    } else if (isCritical) {
        subject = `🚨 CRITICAL: SSL Certificate expires in ${daysRemaining} day(s) - ${hostname}`;
    } else if (isWarning) {
        subject = `⚠️ WARNING: SSL Certificate expires in ${daysRemaining} day(s) - ${hostname}`;
    } else {
        subject = `ℹ️ SSL Certificate Alert - ${hostname}`;
    }

    // Add notification type to subject
    if (notificationType === 'daily') {
        subject = `[DAILY REMINDER] ${subject}`;
    } else if (notificationType === 'reminder') {
        subject = `[REMINDER] ${subject}`;
    }

    // Build HTML email
    const html = buildCertificateAlertHTML(
        monitor,
        alert,
        hostname,
        daysRemaining,
        expiryDate,
        isExpired,
        isCritical,
        isWarning,
        notificationType
    );

    // Build plain text email
    const text = buildCertificateAlertText(
        monitor,
        alert,
        hostname,
        daysRemaining,
        expiryDate,
        isExpired,
        isCritical,
        isWarning,
        notificationType
    );

    return { subject, html, text };
}

function buildCertificateAlertHTML(
    monitor: Monitor,
    alert: Partial<Alert>,
    hostname: string,
    daysRemaining: number,
    expiryDate: Date | null,
    isExpired: boolean,
    isCritical: boolean,
    isWarning: boolean,
    notificationType: string
): string {
    const metadata = alert.metadata || {};
    const urgencyColor = isExpired ? '#dc2626' : isCritical ? '#ea580c' : '#f59e0b';
    const urgencyBg = isExpired ? '#fee2e2' : isCritical ? '#ffedd5' : '#fef3c7';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .alert-box { background: ${urgencyBg}; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-grid { display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin: 20px 0; }
    .info-label { font-weight: 600; color: #6b7280; }
    .info-value { color: #111827; }
    .action-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .action-box h3 { margin-top: 0; color: #111827; }
    .action-list { margin: 10px 0; padding-left: 20px; }
    .warning-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin: 5px 5px 5px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .countdown { font-size: 48px; font-weight: bold; color: ${urgencyColor}; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isExpired ? '🚨 Certificate EXPIRED' : isCritical ? '🚨 Critical Certificate Alert' : '⚠️ Certificate Expiration Warning'}</h1>
    </div>
    
    <div class="content">
      ${notificationType === 'daily' ? '<p style="background: #fef3c7; padding: 10px; border-radius: 4px; color: #92400e; font-weight: 600;">📅 Daily Reminder - Certificate Still Expiring Soon</p>' : ''}
      
      <div class="alert-box">
        <h2 style="margin-top: 0; color: ${urgencyColor};">
          ${isExpired ?
            `Certificate expired ${Math.abs(daysRemaining)} day(s) ago!` :
            `Certificate expires in ${daysRemaining} day(s)`}
        </h2>
        <p style="margin-bottom: 0;">
          ${isExpired ?
            'The SSL/TLS certificate has EXPIRED. Your service may be experiencing connection errors.' :
            isCritical ?
                'URGENT: Certificate expiration is imminent. Immediate action required to prevent service disruption.' :
                'Certificate renewal should be planned soon to ensure uninterrupted service.'}
        </p>
      </div>
      
      <div class="countdown">
        ${isExpired ? '❌ EXPIRED' : `${daysRemaining}`}
        ${!isExpired ? '<div style="font-size: 16px; color: #6b7280; margin-top: -10px;">day(s) remaining</div>' : ''}
      </div>
      
      <div class="info-grid">
        <div class="info-label">Hostname:</div>
        <div class="info-value"><strong>${hostname}</strong></div>
        
        <div class="info-label">Port:</div>
        <div class="info-value">${(monitor as any).certificate_config?.port || 443}</div>
        
        <div class="info-label">Expiry Date:</div>
        <div class="info-value">${expiryDate ? expiryDate.toLocaleString() : 'Unknown'}</div>
        
        <div class="info-label">Common Name:</div>
        <div class="info-value">${metadata.commonName || hostname}</div>
        
        <div class="info-label">Issuer:</div>
        <div class="info-value">${metadata.issuer || 'Unknown'}</div>
        
        <div class="info-label">Serial Number:</div>
        <div class="info-value" style="font-family: monospace; font-size: 12px;">${metadata.serialNumber || 'Unknown'}</div>
      </div>
      
      ${metadata.warnings && metadata.warnings.length > 0 ? `
        <div style="margin: 20px 0;">
          <strong>Additional Warnings:</strong><br>
          ${metadata.warnings.map((w: string) => `<span class="warning-badge">${w}</span>`).join('')}
        </div>
      ` : ''}
      
      ${metadata.subjectAltNames && metadata.subjectAltNames.length > 0 ? `
        <div style="margin: 20px 0;">
          <strong>Covered Domains:</strong><br>
          <span style="color: #6b7280; font-size: 14px;">${metadata.subjectAltNames.join(', ')}</span>
        </div>
      ` : ''}
      
      <div class="action-box">
        <h3>🔧 Recommended Actions</h3>
        <ol class="action-list">
          ${isExpired ? `
            <li><strong style="color: #dc2626;">IMMEDIATE:</strong> Service may be down - verify connectivity</li>
            <li><strong style="color: #dc2626;">IMMEDIATE:</strong> Renew certificate using your certificate provider</li>
            <li>Install the new certificate on your server</li>
            <li>Restart/reload your web server</li>
            <li>Verify certificate is working correctly</li>
          ` : isCritical ? `
            <li><strong style="color: #ea580c;">Initiate certificate renewal process immediately</strong></li>
            <li>Contact your certificate provider or use automated renewal (Let's Encrypt/certbot)</li>
            <li>Schedule installation during maintenance window</li>
            <li>Prepare rollback plan</li>
            <li>Notify stakeholders of scheduled renewal</li>
          ` : `
            <li>Plan certificate renewal within the next ${daysRemaining} days</li>
            <li>Review certificate renewal procedures</li>
            <li>Ensure automated renewal is configured if using Let's Encrypt</li>
            <li>Schedule installation during next maintenance window</li>
          `}
        </ol>
      </div>
      
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Quick Renewal Guide:</strong>
        <pre style="background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 13px; margin-top: 10px;">
# For Let's Encrypt (certbot)
sudo certbot renew --force-renewal
sudo systemctl reload nginx  # or apache2

# For manual renewal
# 1. Generate CSR: openssl req -new -key private.key -out domain.csr
# 2. Submit CSR to your CA
# 3. Download new certificate
# 4. Install and reload web server</pre>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
        <strong>Monitor:</strong> ${monitor.monitor_name}<br>
        <strong>Alert ID:</strong> ${alert._id || 'N/A'}<br>
        <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
        ${notificationType === 'daily' ? '<strong>Notification:</strong> Daily Reminder - Will be sent daily until resolved<br>' : ''}
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated alert from your Monitoring System</p>
      <p style="font-size: 12px; color: #9ca3af;">
        To stop receiving these alerts, renew the certificate or disable the monitor
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function buildCertificateAlertText(
    monitor: Monitor,
    alert: Partial<Alert>,
    hostname: string,
    daysRemaining: number,
    expiryDate: Date | null,
    isExpired: boolean,
    isCritical: boolean,
    isWarning: boolean,
    notificationType: string
): string {
    const metadata = alert.metadata || {};

    let text = '';

    if (isExpired) {
        text += '🚨 CERTIFICATE EXPIRED 🚨\n';
        text += '='.repeat(50) + '\n\n';
        text += `Certificate expired ${Math.abs(daysRemaining)} day(s) ago!\n\n`;
    } else if (isCritical) {
        text += '🚨 CRITICAL CERTIFICATE ALERT 🚨\n';
        text += '='.repeat(50) + '\n\n';
        text += `Certificate expires in ${daysRemaining} day(s)!\n\n`;
    } else {
        text += '⚠️ CERTIFICATE EXPIRATION WARNING\n';
        text += '='.repeat(50) + '\n\n';
        text += `Certificate expires in ${daysRemaining} day(s)\n\n`;
    }

    if (notificationType === 'daily') {
        text += '📅 DAILY REMINDER - Certificate Still Expiring Soon\n\n';
    }

    text += `CERTIFICATE DETAILS\n`;
    text += '-'.repeat(50) + '\n';
    text += `Hostname:      ${hostname}\n`;
    text += `Port:          ${(monitor as any).certificate_config?.port || 443}\n`;
    text += `Expiry Date:   ${expiryDate ? expiryDate.toLocaleString() : 'Unknown'}\n`;
    text += `Common Name:   ${metadata.commonName || hostname}\n`;
    text += `Issuer:        ${metadata.issuer || 'Unknown'}\n`;
    text += `Serial Number: ${metadata.serialNumber || 'Unknown'}\n\n`;

    if (metadata.warnings && metadata.warnings.length > 0) {
        text += `WARNINGS:\n`;
        metadata.warnings.forEach((w: string) => {
            text += `  ⚠️ ${w}\n`;
        });
        text += '\n';
    }

    text += `RECOMMENDED ACTIONS\n`;
    text += '-'.repeat(50) + '\n';

    if (isExpired) {
        text += `1. IMMEDIATE: Service may be down - verify connectivity\n`;
        text += `2. IMMEDIATE: Renew certificate using your certificate provider\n`;
        text += `3. Install the new certificate on your server\n`;
        text += `4. Restart/reload your web server\n`;
        text += `5. Verify certificate is working correctly\n\n`;
    } else if (isCritical) {
        text += `1. Initiate certificate renewal process IMMEDIATELY\n`;
        text += `2. Contact certificate provider or use automated renewal\n`;
        text += `3. Schedule installation during maintenance window\n`;
        text += `4. Prepare rollback plan\n`;
        text += `5. Notify stakeholders of scheduled renewal\n\n`;
    } else {
        text += `1. Plan certificate renewal within the next ${daysRemaining} days\n`;
        text += `2. Review certificate renewal procedures\n`;
        text += `3. Ensure automated renewal is configured\n`;
        text += `4. Schedule installation during maintenance window\n\n`;
    }

    text += `QUICK RENEWAL COMMANDS\n`;
    text += '-'.repeat(50) + '\n';
    text += `# For Let's Encrypt (certbot)\n`;
    text += `sudo certbot renew --force-renewal\n`;
    text += `sudo systemctl reload nginx\n\n`;

    text += `---\n`;
    text += `Monitor: ${monitor.monitor_name}\n`;
    text += `Timestamp: ${new Date().toLocaleString()}\n`;
    if (notificationType === 'daily') {
        text += `Note: This is a daily reminder that will be sent until resolved\n`;
    }
    text += `\n`;
    text += `This is an automated alert from your Monitoring System\n`;

    return text;
}

export function buildCertificateRecoveryEmail(
    monitor: Monitor,
    alert: any
): { subject: string; html: string; text: string } {

    const hostname = (monitor as any).certificate_config?.hostname || 'Unknown';
    const metadata = alert.metadata || {};
    const daysRemaining = metadata.daysRemaining || 0;

    const subject = `✅ RESOLVED: SSL Certificate Renewed - ${hostname}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Certificate Renewed Successfully</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <h2 style="margin-top: 0; color: #10b981;">Alert Resolved</h2>
        <p>The SSL/TLS certificate for <strong>${hostname}</strong> has been renewed successfully.</p>
      </div>
      <p><strong>New Certificate Valid For:</strong> ${daysRemaining} days</p>
      <p><strong>Next Expiry:</strong> ${metadata.expiryDate ? new Date(metadata.expiryDate).toLocaleString() : 'Unknown'}</p>
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
        Monitor: ${monitor.monitor_name}<br>
        Timestamp: ${new Date().toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>
  `;

    const text = `
✅ CERTIFICATE RENEWED SUCCESSFULLY

The SSL/TLS certificate for ${hostname} has been renewed.

New Certificate Valid For: ${daysRemaining} days
Next Expiry: ${metadata.expiryDate ? new Date(metadata.expiryDate).toLocaleString() : 'Unknown'}

Monitor: ${monitor.monitor_name}
Timestamp: ${new Date().toLocaleString()}

This is an automated recovery notification from your Monitoring System
  `.trim();

    return { subject, html, text };
}