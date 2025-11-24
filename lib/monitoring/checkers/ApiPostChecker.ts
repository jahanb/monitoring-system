// lib/monitoring/checkers/ApiPostChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import * as https from 'https';
import * as http from 'http';

/**
 * API POST Checker
 * - Makes POST request to endpoint
 * - Sends JSON body
 * - Validates response status code
 * - Checks positive/negative patterns in response
 * - Measures response time
 */
export class ApiPostChecker implements IChecker {
  readonly type = 'api_post';

  async check(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const url = new URL(monitor.monitor_instance);
    
    let postBody = {};
    try {
      postBody = JSON.parse((monitor as any).post_body || '{}');
      console.log('📤 Sending POST Body:', JSON.stringify(postBody, null, 2));
    } catch (e) {
      return {
        success: false,
        value: null,
        status: 'error',
        message: 'Invalid POST body JSON format',
        timestamp: new Date()
      };
    }
    

  /*
  async check(monitor: Monitor): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const url = new URL(monitor.monitor_instance);
      
      // Parse POST body from monitor metadata
      let postBody = {};
      try {
        // Expected format: monitor should have post_body field with JSON string
        postBody = JSON.parse((monitor as any).post_body || '{}');
      } catch (e) {
        return {
          success: false,
          value: null,
          status: 'error',
          message: 'Invalid POST body JSON format',
          timestamp: new Date()
        };
      }
*/
      // Perform POST request
      const response = await this.makePostRequest(
        url,
        postBody,
        monitor.timeout_in_second || 30
      );
      const responseTime = Date.now() - startTime;

      // Check status code
      const statusCodeValid = this.validateStatusCode(
        response.statusCode,
        monitor.status_code || [200, 201]
      );

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

      // Check response body patterns
      const patternResult = this.checkPatterns(
        response.body,
        monitor.positive_pattern,
        monitor.negative_pattern
      );

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
            },
            responseBody: response.body.substring(0, 500) // First 500 chars
          },
          timestamp: new Date()
        };
      }

      // Determine status based on response time thresholds
      const status = determineStatus(responseTime, {
        highWarning: monitor.high_value_threshold_warning,
        highAlarm: monitor.high_value_threshold_alarm
      });

      return {
        success: true,
        value: responseTime,
        status,
        message: `API POST check successful - Response time: ${responseTime}ms`,
        responseTime,
        statusCode: response.statusCode,
        metadata: {
          patternMatch: {
            positive: patternResult.positiveMatch,
            negative: !patternResult.negativeMatch
          },
          responseBody: response.body.substring(0, 500)
        },
        timestamp: new Date()
      };

    } catch (error: any) {
      return createErrorResult(error, Date.now() - startTime);
    }
  }

  validate(monitor: Monitor): boolean | string {
    try {
      // Validate URL format
      new URL(monitor.monitor_instance);

      // Validate POST body JSON
      try {
        JSON.parse((monitor as any).post_body || '{}');
      } catch (e) {
        return 'Invalid POST body: Must be valid JSON';
      }

      // Validate status codes
      if (monitor.status_code && monitor.status_code.length === 0) {
        return 'At least one status code must be specified';
      }

      // Validate patterns if provided
      if (monitor.positive_pattern) {
        try {
          new RegExp(monitor.positive_pattern);
        } catch (e) {
          return `Invalid positive pattern regex: ${monitor.positive_pattern}`;
        }
      }

      if (monitor.negative_pattern) {
        try {
          new RegExp(monitor.negative_pattern);
        } catch (e) {
          return `Invalid negative pattern regex: ${monitor.negative_pattern}`;
        }
      }

      return true;
    } catch (error: any) {
      return `Invalid URL: ${error.message}`;
    }
  }

  /**
   * Make HTTP/HTTPS POST request
   */
  private makePostRequest(
    url: URL,
    body: any,
    timeoutSeconds: number
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const timeout = timeoutSeconds * 1000;
      const postData = JSON.stringify(body);

      const options = {
        method: 'POST',
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'MonitoringSystem/1.0'
        }
      };

      const req = protocol.request(url, options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: responseBody
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeoutSeconds}s`));
      });

      // Write POST data
      req.write(postData);
      req.end();
    });
  }

  /**
   * Validate HTTP status code
   */
  private validateStatusCode(
    actualCode: number,
    expectedCodes: number[]
  ): boolean {
    return expectedCodes.includes(actualCode);
  }

  /**
   * Check positive and negative patterns in response body
   */
  /*
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
    let positiveMatch = true;
    let negativeMatch = false;

    // Check positive pattern (should exist)
    if (positivePattern) {
      const regex = new RegExp(positivePattern);
      positiveMatch = regex.test(body);

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
      const regex = new RegExp(negativePattern);
      negativeMatch = regex.test(body);

      if (negativeMatch) {
        return {
          valid: false,
          message: `Negative pattern found: ${negativePattern}`,
          positiveMatch,
          negativeMatch: true
        };
      }
    }

    return {
      valid: true,
      message: 'Pattern validation successful',
      positiveMatch,
      negativeMatch: false
    };
  }
    */
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
  console.log('📄 POST Response Body (first 500 chars):', body.substring(0, 500));
  console.log('🔍 Positive Pattern:', positivePattern || 'None');
  console.log('🔍 Negative Pattern:', negativePattern || 'None');

  let positiveMatch = true;
  let negativeMatch = false;

  if (positivePattern) {
    const regex = new RegExp(positivePattern, 'i');
    positiveMatch = regex.test(body);
    console.log(`✓ Positive Pattern Match: ${positiveMatch}`);

    if (!positiveMatch) {
      return {
        valid: false,
        message: `Positive pattern not found: ${positivePattern}`,
        positiveMatch: false,
        negativeMatch: false
      };
    }
  }

  if (negativePattern) {
    const regex = new RegExp(negativePattern, 'i');
    negativeMatch = regex.test(body);
    console.log(`✗ Negative Pattern Found: ${negativeMatch}`);

    if (negativeMatch) {
      return {
        valid: false,
        message: `Negative pattern found: ${negativePattern}`,
        positiveMatch,
        negativeMatch: true
      };
    }
  }

  console.log('✅ Pattern validation passed');

  return {
    valid: true,
    message: 'Pattern validation successful',
    positiveMatch,
    negativeMatch: false
  };
}
}