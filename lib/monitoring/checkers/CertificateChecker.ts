// lib/monitoring/checkers/CertificateChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import { logger } from '@/lib/logger';
import * as https from 'https';
import * as tls from 'tls';

/**
 * CertificateChecker
 * Monitors SSL/TLS certificate expiration and validity
 * 
 * Features:
 * - Certificate expiration monitoring
 * - Configurable warning/alarm thresholds (days)
 * - Daily notifications for critical expiration periods
 * - Certificate chain validation
 * - Issuer information
 * - Subject Alternative Names (SANs) checking
 * - Self-signed certificate detection
 */
export class CertificateChecker implements IChecker {
    readonly type = 'certificate';

    async check(monitor: Monitor): Promise<CheckResult> {
        const startTime = Date.now();

        try {
            const config = this.parseCertificateConfig(monitor);

            if (!config.valid) {
                return {
                    success: false,
                    value: null,
                    status: 'error',
                    message: config.error || 'Invalid certificate configuration',
                    timestamp: new Date()
                };
            }

            logger.info(`🔒 Checking certificate for: ${config.hostname}:${config.port}`);

            // Get certificate information
            const certInfo = await this.getCertificateInfo(config.hostname, config.port, config.timeout);
            const responseTime = Date.now() - startTime;

            // Calculate days until expiration
            const daysRemaining = certInfo.daysRemaining;

            // Determine status based on days remaining
            let status: 'ok' | 'warning' | 'alarm' = 'ok';
            let message = '';

            if (daysRemaining < 0) {
                // Certificate already expired
                status = 'alarm';
                message = `🚨 CERTIFICATE EXPIRED ${Math.abs(daysRemaining)} days ago!`;
            } else if (daysRemaining <= (config.alarmThreshold || 7)) {
                // Critical - within alarm threshold
                status = 'alarm';
                message = `🚨 Certificate expires in ${daysRemaining} day(s)! URGENT renewal required.`;
            } else if (daysRemaining <= (config.warningThreshold || 30)) {
                // Warning - within warning threshold
                status = 'warning';
                message = `⚠️ Certificate expires in ${daysRemaining} day(s). Plan renewal soon.`;
            } else {
                // All good
                message = `✅ Certificate valid for ${daysRemaining} more day(s)`;
            }

            // Add warnings for other issues
            const warnings: string[] = [];

            if (certInfo.isSelfSigned) {
                warnings.push('Self-signed certificate detected');
            }

            if (certInfo.hasExpiredInChain) {
                warnings.push('Certificate chain contains expired certificates');
            }

            if (!certInfo.validHostname) {
                warnings.push(`Hostname mismatch: Certificate is for ${certInfo.commonName}`);
            }

            return {
                success: status !== 'alarm',
                value: daysRemaining,
                status,
                message,
                responseTime,
                metadata: {
                    daysRemaining: certInfo.daysRemaining,
                    expiryDate: certInfo.expiryDate,
                    issueDate: certInfo.issueDate,
                    issuer: certInfo.issuer,
                    subject: certInfo.subject,
                    commonName: certInfo.commonName,
                    subjectAltNames: certInfo.subjectAltNames,
                    serialNumber: certInfo.serialNumber,
                    signatureAlgorithm: certInfo.signatureAlgorithm,
                    keySize: certInfo.keySize,
                    isSelfSigned: certInfo.isSelfSigned,
                    validHostname: certInfo.validHostname,
                    hasExpiredInChain: certInfo.hasExpiredInChain,
                    warnings: warnings.length > 0 ? warnings : undefined,
                    checkTimestamp: new Date(),
                    thresholds: {
                        warning: config.warningThreshold,
                        alarm: config.alarmThreshold
                    }
                },
                timestamp: new Date()
            };

        } catch (error: any) {
            logger.error('❌ Certificate Check Failed:', error);
            return createErrorResult(error, Date.now() - startTime);
        }
    }

    validate(monitor: Monitor): boolean | string {
        const cert = (monitor as any).certificate_config;

        if (!cert) {
            return 'Certificate configuration is required';
        }

        if (!cert.hostname) {
            return 'Hostname is required';
        }

        // Validate hostname format
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!hostnameRegex.test(cert.hostname)) {
            return 'Invalid hostname format';
        }

        const port = cert.port || 443;
        if (port < 1 || port > 65535) {
            return 'Port must be between 1 and 65535';
        }

        if (cert.alarm_threshold_days !== undefined && cert.alarm_threshold_days < 0) {
            return 'Alarm threshold must be a positive number';
        }

        if (cert.warning_threshold_days !== undefined && cert.warning_threshold_days < 0) {
            return 'Warning threshold must be a positive number';
        }

        return true;
    }

    /**
     * Parse certificate configuration from monitor
     */
    private parseCertificateConfig(monitor: Monitor) {
        const cert = (monitor as any).certificate_config;

        if (!cert) {
            return {
                valid: false,
                error: 'Certificate config missing',
                hostname: '',
                port: 443,
                timeout: 30,
                warningThreshold: 30,
                alarmThreshold: 7
            };
        }

        return {
            valid: true,
            hostname: cert.hostname,
            port: cert.port || 443,
            timeout: cert.timeout || 30,
            warningThreshold: cert.warning_threshold_days || 30,
            alarmThreshold: cert.alarm_threshold_days || 7,
            checkChain: cert.check_chain !== false // Default true
        };
    }

    /**
     * Get certificate information from server
     */
    private async getCertificateInfo(
        hostname: string,
        port: number,
        timeoutSeconds: number
    ): Promise<{
        daysRemaining: number;
        expiryDate: Date;
        issueDate: Date;
        issuer: string;
        subject: string;
        commonName: string;
        subjectAltNames: string[];
        serialNumber: string;
        signatureAlgorithm: string;
        keySize: number | null;
        isSelfSigned: boolean;
        validHostname: boolean;
        hasExpiredInChain: boolean;
    }> {
        return new Promise((resolve, reject) => {
            const options: tls.ConnectionOptions = {
                host: hostname,
                port: port,
                servername: hostname, // For SNI (Server Name Indication)
                rejectUnauthorized: false, // We want to check even invalid certs
                timeout: timeoutSeconds * 1000
            };

            const socket = tls.connect(options, () => {
                try {
                    const cert = socket.getPeerCertificate(true); // true = include certificate chain

                    if (!cert || Object.keys(cert).length === 0) {
                        socket.destroy();
                        reject(new Error('No certificate received from server'));
                        return;
                    }

                    // Parse certificate details
                    const expiryDate = new Date(cert.valid_to);
                    const issueDate = new Date(cert.valid_from);
                    const now = new Date();

                    // Calculate days remaining
                    const daysRemaining = Math.floor(
                        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    // Extract issuer information
                    const issuer = this.formatCertificateSubject(cert.issuer);
                    const subject = this.formatCertificateSubject(cert.subject);
                    const commonName = cert.subject?.CN || hostname;

                    // Get Subject Alternative Names (SANs)
                    const subjectAltNames = this.extractSANs(cert);

                    // Check if certificate is self-signed
                    const isSelfSigned = issuer === subject;

                    // Validate hostname against certificate
                    const validHostname = this.validateHostname(hostname, commonName, subjectAltNames);

                    // Check certificate chain for expired certificates
                    const hasExpiredInChain = this.checkCertificateChain(cert);

                    // Get key information
                    const keySize = this.extractKeySize(cert);

                    socket.destroy();

                    resolve({
                        daysRemaining,
                        expiryDate,
                        issueDate,
                        issuer,
                        subject,
                        commonName,
                        subjectAltNames,
                        serialNumber: cert.serialNumber || 'Unknown',
                        signatureAlgorithm: cert.sigAlg || 'Unknown',
                        keySize,
                        isSelfSigned,
                        validHostname,
                        hasExpiredInChain
                    });

                } catch (error: any) {
                    socket.destroy();
                    reject(error);
                }
            });

            socket.on('error', (error) => {
                reject(new Error(`TLS connection failed: ${error.message}`));
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error(`Connection timeout after ${timeoutSeconds}s`));
            });
        });
    }

    /**
     * Format certificate subject/issuer for display
     */
    private formatCertificateSubject(subject: any): string {
        if (!subject) return 'Unknown';

        const parts: string[] = [];

        if (subject.CN) parts.push(`CN=${subject.CN}`);
        if (subject.O) parts.push(`O=${subject.O}`);
        if (subject.OU) parts.push(`OU=${subject.OU}`);
        if (subject.C) parts.push(`C=${subject.C}`);

        return parts.join(', ') || 'Unknown';
    }

    /**
     * Extract Subject Alternative Names from certificate
     */
    private extractSANs(cert: any): string[] {
        if (!cert.subjectaltname) return [];

        return cert.subjectaltname
            .split(',')
            .map((san: string) => san.trim().replace(/^DNS:/, ''))
            .filter((san: string) => san.length > 0);
    }

    /**
     * Validate if hostname matches certificate
     */
    private validateHostname(hostname: string, commonName: string, sans: string[]): boolean {
        // Check exact match with CN
        if (hostname === commonName) return true;

        // Check against SANs
        for (const san of sans) {
            if (this.matchesHostname(hostname, san)) {
                return true;
            }
        }

        // Check if CN is a wildcard that matches
        if (this.matchesHostname(hostname, commonName)) {
            return true;
        }

        return false;
    }

    /**
     * Check if hostname matches pattern (supports wildcards)
     */
    private matchesHostname(hostname: string, pattern: string): boolean {
        if (hostname === pattern) return true;

        // Handle wildcard certificates (*.example.com)
        if (pattern.startsWith('*.')) {
            const domain = pattern.substring(2);
            const hostParts = hostname.split('.');

            // *.example.com matches sub.example.com but not example.com
            if (hostParts.length > 1) {
                const hostDomain = hostParts.slice(1).join('.');
                return hostDomain === domain;
            }
        }

        return false;
    }

    /**
     * Check certificate chain for expired certificates
     */
    private checkCertificateChain(cert: any): boolean {
        const now = new Date();

        // Check current certificate
        if (new Date(cert.valid_to) < now) {
            return true;
        }

        // Check issuer certificate if available
        if (cert.issuerCertificate && cert.issuerCertificate !== cert) {
            return this.checkCertificateChain(cert.issuerCertificate);
        }

        return false;
    }

    /**
     * Extract key size from certificate
     */
    private extractKeySize(cert: any): number | null {
        try {
            // Try to get key size from public key info
            if (cert.pubkey && cert.pubkey.length) {
                return cert.pubkey.length * 8; // Convert bytes to bits
            }

            // Alternative: parse from modulus length (RSA)
            if (cert.modulus) {
                return cert.modulus.length * 4; // Hex string, 4 bits per char
            }
        } catch (error) {
            logger.debug('Could not extract key size:', error);
        }

        return null;
    }
}