// lib/monitoring/checkers/UrlChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import { logger } from '@/lib/logger';
import * as https from 'https';
import * as http from 'http';

export class UrlChecker implements IChecker {
  readonly type = 'url';

  async check(monitor: Monitor): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const url = new URL(monitor.monitor_instance);
      const response = await this.makeRequest(url, monitor.timeout_in_second || 30);
      const responseTime = Date.now() - startTime;

      const statusCodeValid = this.validateStatusCode(response.statusCode, monitor.status_code || [200]);
      if (!statusCodeValid) {
        return {
          success: false,
          value: responseTime,
          status: 'error',
          message: `Invalid status code: ${response.statusCode}`,
          responseTime,
          statusCode: response.statusCode,
          timestamp: new Date()
        };
      }

      const patternResult = this.checkPatterns(response.body, monitor.positive_pattern, monitor.negative_pattern);
      if (!patternResult.valid) {
        return {
          success: false,
          value: responseTime,
          status: 'error',
          message: patternResult.message,
          responseTime,
          statusCode: response.statusCode,
          metadata: {
            patternMatch: {
              positive: patternResult.positiveMatch,
              negative: !patternResult.negativeMatch
            }
          },
          timestamp: new Date()
        };
      }

      let certificateInfo;
      if (url.protocol === 'https:') {
        certificateInfo = await this.checkCertificate(url);
      }

      const status = determineStatus(responseTime, {
        highWarning: monitor.high_value_threshold_warning,
        highAlarm: monitor.high_value_threshold_alarm
      });

      return {
        success: true,
        value: responseTime,
        status,
        message: `URL check successful - Response time: ${responseTime}ms`,
        responseTime,
        statusCode: response.statusCode,
        metadata: {
          certificateDaysRemaining: certificateInfo?.daysRemaining,
          certificateExpiry: certificateInfo?.expiryDate,
          certificateIssuer: certificateInfo?.issuer,
          patternMatch: {
            positive: patternResult.positiveMatch,
            negative: !patternResult.negativeMatch
          }
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      return createErrorResult(error, Date.now() - startTime);
    }
  }

  validate(monitor: Monitor): boolean | string {
    try {
      new URL(monitor.monitor_instance);
      if (monitor.status_code && monitor.status_code.length === 0) {
        return 'At least one status code must be specified';
      }
      if (monitor.positive_pattern) {
        try { new RegExp(monitor.positive_pattern); }
        catch (e) { return `Invalid positive pattern regex: ${monitor.positive_pattern}`; }
      }
      if (monitor.negative_pattern) {
        try { new RegExp(monitor.negative_pattern); }
        catch (e) { return `Invalid negative pattern regex: ${monitor.negative_pattern}`; }
      }
      return true;
    } catch (error: any) {
      return `Invalid URL: ${error.message}`;
    }
  }

  private makeRequest(url: URL, timeoutSeconds: number): Promise<{ statusCode: number; body: string; certificate?: any }> {
    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const timeout = timeoutSeconds * 1000;
      const options = { method: 'GET', timeout, headers: { 'User-Agent': 'MonitoringSystem/1.0' } };

      const req = protocol.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk.toString(); });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body,
            certificate: (res.socket as any)?.getPeerCertificate?.()
          });
        });
      });

      req.on('error', (error) => { reject(error); });
      req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout after ${timeoutSeconds}s`)); });
      req.end();
    });
  }

  private validateStatusCode(actualCode: number, expectedCodes: number[]): boolean {
    return expectedCodes.includes(actualCode);
  }

  private checkPatterns(
    body: string,
    positivePattern?: string,
    negativePattern?: string
  ): {
    valid: boolean;
    message: string;
    positiveMatch: boolean;
    negativeMatch: boolean;
  } {
    // LOG: Show response body (first 500 chars)
    logger.debug('Response Body (first 500 chars):', { bodySnippet: body.substring(0, 500) });
    logger.debug('Positive Pattern:', { pattern: positivePattern || 'None' });
    logger.debug('Negative Pattern:', { pattern: negativePattern || 'None' });

    let positiveMatch = true;
    let negativeMatch = false;

    // Check positive pattern (should exist)
    if (positivePattern) {
      const regex = new RegExp(positivePattern, 'i'); // Added 'i' flag for case-insensitive
      positiveMatch = regex.test(body);

      logger.debug(`Positive Pattern Match: ${positiveMatch}`);

      if (!positiveMatch) {
        return {
          valid: false,
          message: `Positive pattern not found: ${positivePattern}`,
          positiveMatch: false,
          negativeMatch: false
        };
      }
    }

    // Check negative pattern (should NOT exist)
    if (negativePattern) {
      const regex = new RegExp(negativePattern, 'i'); // Added 'i' flag for case-insensitive
      negativeMatch = regex.test(body);

      logger.debug(`Negative Pattern Found: ${negativeMatch}`);

      if (negativeMatch) {
        return {
          valid: false,
          message: `Negative pattern found: ${negativePattern}`,
          positiveMatch,
          negativeMatch: true
        };
      }
    }

    logger.debug('Pattern validation passed');

    return {
      valid: true,
      message: 'Pattern validation successful',
      positiveMatch,
      negativeMatch: false
    };
  }

  private async checkCertificate(url: URL): Promise<{ daysRemaining: number; expiryDate: Date; issuer: string; } | null> {
    return new Promise((resolve) => {
      const options = { host: url.hostname, port: url.port || 443, method: 'GET', rejectUnauthorized: false };
      const req = https.request(options, (res) => {
        const cert = (res.socket as any).getPeerCertificate();
        if (!cert || !cert.valid_to) { resolve(null); return; }
        const expiryDate = new Date(cert.valid_to);
        const now = new Date();
        const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        resolve({ daysRemaining, expiryDate, issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown' });
      });
      req.on('error', () => { resolve(null); });
      req.end();
    });
  }
}