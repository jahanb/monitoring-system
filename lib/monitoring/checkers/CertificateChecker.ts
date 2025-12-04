// lib/checkers/CertificateChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import * as tls from 'tls';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { IChecker, CheckResult } from '@/lib/monitoring/types';

interface CertificateInfo {
    valid: boolean;
    validFrom?: Date;
    validTo?: Date;
    daysUntilExpiry?: number;
    issuer?: string;
    subject?: string;
    san?: string[];
    error?: string;
}

export class CertificateChecker implements IChecker {
    readonly type = 'certificate';

    validate(monitor: Monitor): boolean | string {
        if (monitor.monitor_type !== 'certificate') {
            return 'Monitor type must be certificate';
        }
        if (!monitor.certificate_config) {
            return 'Certificate configuration is missing';
        }
        if (!monitor.certificate_config.hostname) {
            return 'Hostname is required in certificate configuration';
        }
        return true;
    }

    async check(monitor: Monitor): Promise<CheckResult> {
        const startTime = Date.now();
        const config = monitor.certificate_config;

        if (!config?.hostname) {
            return {
                success: false,
                message: 'Certificate configuration missing',
                value: 0,
                status: 'error',
                responseTime: Date.now() - startTime,
                statusCode: 500,
                timestamp: new Date(),
                metadata: { error: 'hostname is required' }
            };
        }

        try {
            console.log(`🔒 Checking certificate for ${config.hostname}:${config.port || 443}`);

            // Get certificate information
            const certInfo = await this.getCertificateInfo(
                config.hostname,
                config.port || 443,
                config.timeout || 30
            );

            if (!certInfo.valid) {
                return {
                    success: false,
                    message: certInfo.error || 'Certificate check failed',
                    value: 0,
                    status: 'error',
                    responseTime: Date.now() - startTime,
                    statusCode: 500,
                    timestamp: new Date(),
                    metadata: { error: certInfo.error }
                };
            }

            const daysUntilExpiry = certInfo.daysUntilExpiry!;

            // FIX: Ensure thresholds are numbers and handle 0 correctly
            const warningThreshold = Number(config.warning_threshold_days ?? 30);
            const alarmThreshold = Number(config.alarm_threshold_days ?? 7);

            console.log(`   📊 Expiry: ${daysUntilExpiry} days`);
            console.log(`   ⚠️  Warning Threshold: ${warningThreshold} days`);
            console.log(`   🚨 Alarm Threshold: ${alarmThreshold} days`);

            let success = true;
            let message = '';
            let status: 'ok' | 'warning' | 'alarm' = 'ok';
            let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

            // Determine alert level
            if (daysUntilExpiry < 0) {
                success = false;
                status = 'alarm';
                severity = 'critical';
                message = `🚨 CRITICAL: Certificate EXPIRED ${Math.abs(daysUntilExpiry)} days ago!`;
            } else if (daysUntilExpiry <= alarmThreshold) {
                success = false;
                status = 'alarm';
                severity = 'critical';
                message = `🔴 ALARM: Certificate expires in ${daysUntilExpiry} days (threshold: ${alarmThreshold})`;
            } else if (daysUntilExpiry <= warningThreshold) {
                success = false;
                status = 'warning';
                severity = 'high';
                message = `🟡 WARNING: Certificate expires in ${daysUntilExpiry} days (threshold: ${warningThreshold})`;
            } else {
                success = true;
                message = `✅ Certificate valid - expires in ${daysUntilExpiry} days`;
            }

            // NOTE: Daily reminder logic removed from here as it should be handled by AlertManager
            // to avoid duplicate notifications and ensure consistency.
            const shouldNotify = status === 'alarm' || status === 'warning';

            return {
                success,
                message,
                value: daysUntilExpiry,
                status,
                responseTime: Date.now() - startTime,
                statusCode: success ? 200 : 500,
                timestamp: new Date(),
                metadata: {
                    hostname: config.hostname,
                    port: config.port || 443,
                    days_until_expiry: daysUntilExpiry,
                    valid_from: certInfo.validFrom,
                    valid_to: certInfo.validTo,
                    issuer: certInfo.issuer,
                    subject: certInfo.subject,
                    san: certInfo.san,
                    severity: severity,
                    should_notify: shouldNotify,
                    warning_threshold: warningThreshold,
                    alarm_threshold: alarmThreshold,
                },
            };
        } catch (error: any) {
            console.error('   ❌ Certificate check error:', error);
            return {
                success: false,
                message: `Certificate check error: ${error.message}`,
                value: 0,
                status: 'error',
                responseTime: Date.now() - startTime,
                statusCode: 500,
                timestamp: new Date(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Get certificate information from hostname
     */
    private async getCertificateInfo(
        hostname: string,
        port: number = 443,
        timeout: number = 30
    ): Promise<CertificateInfo> {
        return new Promise((resolve) => {
            const options = {
                host: hostname,
                port: port,
                servername: hostname,
                rejectUnauthorized: false,
            };

            const timeoutId = setTimeout(() => {
                try {
                    socket.destroy();
                } catch (e) {
                    // Ignore error if socket already destroyed
                }
                resolve({
                    valid: false,
                    error: `Connection timeout after ${timeout} seconds`,
                });
            }, timeout * 1000);

            const socket = tls.connect(options, () => {
                clearTimeout(timeoutId);

                try {
                    const cert = socket.getPeerCertificate();

                    if (!cert || Object.keys(cert).length === 0) {
                        socket.destroy();
                        return resolve({
                            valid: false,
                            error: 'No certificate found',
                        });
                    }

                    const validFrom = new Date(cert.valid_from);
                    const validTo = new Date(cert.valid_to);
                    const now = new Date();

                    const daysUntilExpiry = Math.floor(
                        (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    const san = cert.subjectaltname
                        ? cert.subjectaltname.split(', ').map((s: string) => s.replace('DNS:', ''))
                        : [];

                    socket.destroy();

                    resolve({
                        valid: true,
                        validFrom,
                        validTo,
                        daysUntilExpiry,
                        issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
                        subject: cert.subject?.CN || hostname,
                        san,
                    });
                } catch (error: any) {
                    socket.destroy();
                    resolve({
                        valid: false,
                        error: `Failed to parse certificate: ${error.message}`,
                    });
                }
            });

            socket.on('error', (error: any) => {
                clearTimeout(timeoutId);
                resolve({
                    valid: false,
                    error: `Connection error: ${error.message}`,
                });
            });
        });
    }

    /**
     * Check if we should send daily reminder
     */
    private async shouldSendDailyReminder(
        monitor: Monitor,
        alertType: 'warning' | 'alarm'
    ): Promise<boolean> {
        try {
            const alertSettings = (monitor as any).alert_settings;
            if (!alertSettings?.send_daily_reminder) {
                console.log('   ℹ️ Daily reminders disabled');
                return true;
            }

            if (alertType !== 'alarm') {
                console.log('   ℹ️ Daily reminder only for alarms');
                return true;
            }

            const db = await getDatabase();

            const recentAlert = await db.collection(Collections.ALERTS)
                .findOne(
                    {
                        monitor_id: monitor._id?.toString(),
                        status: { $in: ['active', 'acknowledged'] },
                        severity: { $in: ['alarm', 'critical'] }
                    },
                    { sort: { triggered_at: -1 } }
                );

            if (!recentAlert) {
                console.log('   ✅ No existing alert found');
                return true;
            }

            const lastNotificationAt = recentAlert.last_notification_at
                ? new Date(recentAlert.last_notification_at)
                : new Date(recentAlert.triggered_at);

            const hoursSinceLastNotification =
                (Date.now() - lastNotificationAt.getTime()) / (1000 * 60 * 60);

            console.log(`   ⏰ Hours since last notification: ${hoursSinceLastNotification.toFixed(1)}`);

            if (hoursSinceLastNotification >= 20) {
                console.log('   ✅ Sending daily reminder (>20 hours)');

                await db.collection(Collections.ALERTS).updateOne(
                    { _id: recentAlert._id },
                    {
                        $set: {
                            last_notification_at: new Date(),
                            last_updated: new Date()
                        }
                    }
                );

                return true;
            }

            console.log('   ⏭️ Skipping (too soon)');
            return false;

        } catch (error) {
            console.error('   ❌ Error checking daily reminder:', error);
            return true;
        }
    }
}