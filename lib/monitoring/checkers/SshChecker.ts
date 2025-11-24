// lib/monitoring/checkers/SshChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import { Client } from 'ssh2';

/**
 * SSH Checker
 * - Connects to remote server via SSH
 * - Executes script or command
 * - Parses output for metrics (CPU, Memory, etc.)
 * - Validates output patterns
 */
export class SshChecker implements IChecker {
  readonly type = 'ssh';

  async check(monitor: Monitor): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      // Parse SSH configuration from monitor
      const sshConfig = this.parseSshConfig(monitor);
      
      if (!sshConfig.valid) {
        return {
          success: false,
          value: null,
          status: 'error',
          message: sshConfig.error || 'Invalid SSH configuration',
          timestamp: new Date()
        };
      }

      console.log(`🔐 Connecting to ${sshConfig.host}:${sshConfig.port} as ${sshConfig.username}`);

      // Execute command via SSH
      const output = await this.executeCommand(
        sshConfig.host,
        sshConfig.port,
        sshConfig.username,
        sshConfig.password,
        sshConfig.command,
        monitor.timeout_in_second || 30
      );

      const responseTime = Date.now() - startTime;

      console.log('📤 SSH Command Output:', output.substring(0, 500));

      // Parse metrics from output
      const metrics = this.parseMetrics(output);
      console.log('📊 Parsed Metrics:', metrics);

      // Check patterns
      const patternResult = this.checkPatterns(
        output,
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
          metadata: {
            output: output.substring(0, 1000),
            metrics,
            patternMatch: {
              positive: patternResult.positiveMatch,
              negative: !patternResult.negativeMatch
            }
          },
          timestamp: new Date()
        };
      }

      // Determine status based on parsed value or response time
      const primaryValue = metrics.cpu || metrics.memory || metrics.disk || responseTime;
      
      const status = determineStatus(primaryValue, {
        lowWarning: monitor.low_value_threshold_warning,
        highWarning: monitor.high_value_threshold_warning,
        lowAlarm: monitor.low_value_threshold_alarm,
        highAlarm: monitor.high_value_threshold_alarm
      });

      return {
        success: true,
        value: primaryValue,
        status,
        message: `SSH check successful - ${this.formatMetrics(metrics)}`,
        responseTime,
        metadata: {
          output: output.substring(0, 1000),
          metrics,
          host: sshConfig.host,
          patternMatch: {
            positive: patternResult.positiveMatch,
            negative: !patternResult.negativeMatch
          }
        },
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ SSH Check Failed:', error.message);
      return createErrorResult(error, Date.now() - startTime);
    }
  }

  validate(monitor: Monitor): boolean | string {
    const ssh = (monitor as any).ssh_config;
    
    if (!ssh) {
      return 'SSH configuration is required';
    }

    if (!ssh.host) {
      return 'SSH host is required';
    }

    if (!ssh.username) {
      return 'SSH username is required';
    }

    if (!ssh.password && !ssh.private_key) {
      return 'SSH password or private key is required';
    }

    if (!ssh.command) {
      return 'SSH command or script path is required';
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
  }

  /**
   * Parse SSH configuration from monitor
   */
  private parseSshConfig(monitor: Monitor): {
    valid: boolean;
    error?: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    command: string;
  } {
    const ssh = (monitor as any).ssh_config;

    if (!ssh) {
      return { valid: false, error: 'SSH config missing', host: '', port: 22, username: '', command: '' };
    }

    return {
      valid: true,
      host: ssh.host || monitor.monitor_instance,
      port: ssh.port || 22,
      username: ssh.username,
      password: ssh.password,
      privateKey: ssh.private_key,
      command: ssh.command
    };
  }

  /**
   * Execute command via SSH
   */
  private executeCommand(
    host: string,
    port: number,
    username: string,
    password: string,
    command: string,
    timeoutSeconds: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';
      let errorOutput = '';
      let timeoutHandle: NodeJS.Timeout;

      // Set timeout
      timeoutHandle = setTimeout(() => {
        conn.end();
        reject(new Error(`SSH command timeout after ${timeoutSeconds}s`));
      }, timeoutSeconds * 1000);

      conn.on('ready', () => {
        console.log('✅ SSH Connection established');

        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timeoutHandle);
            conn.end();
            reject(err);
            return;
          }

          stream.on('close', (code: number, signal: any) => {
            clearTimeout(timeoutHandle);
            conn.end();
            
            if (code !== 0) {
              reject(new Error(`Command exited with code ${code}: ${errorOutput}`));
            } else {
              resolve(output);
            }
          });

          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });

      // Connect
      conn.connect({
        host,
        port,
        username,
        password,
        readyTimeout: timeoutSeconds * 1000
      });
    });
  }

  /**
   * Parse metrics from command output
   * Looks for patterns like:
   * - CPU: 90%
   * - Memory: 85%
   * - Disk: 75%
   * - CPU 90% or cpu=90
   */
  private parseMetrics(output: string): {
    cpu?: number;
    memory?: number;
    disk?: number;
    [key: string]: number | undefined;
  } {
    const metrics: any = {};

    // Pattern: CPU: 90% or CPU 90% or cpu=90 or CPU=90%
    const cpuMatch = output.match(/cpu[:\s=]+(\d+\.?\d*)%?/i);
    if (cpuMatch) {
      metrics.cpu = parseFloat(cpuMatch[1]);
    }

    // Pattern: Memory: 85% or Memory 85% or memory=85 or mem=85%
    const memMatch = output.match(/mem(?:ory)?[:\s=]+(\d+\.?\d*)%?/i);
    if (memMatch) {
      metrics.memory = parseFloat(memMatch[1]);
    }

    // Pattern: Disk: 75% or Disk 75% or disk=75
    const diskMatch = output.match(/disk[:\s=]+(\d+\.?\d*)%?/i);
    if (diskMatch) {
      metrics.disk = parseFloat(diskMatch[1]);
    }

    return metrics;
  }

  /**
   * Format metrics for display
   */
  private formatMetrics(metrics: any): string {
    const parts = [];
    if (metrics.cpu !== undefined) parts.push(`CPU: ${metrics.cpu}%`);
    if (metrics.memory !== undefined) parts.push(`Memory: ${metrics.memory}%`);
    if (metrics.disk !== undefined) parts.push(`Disk: ${metrics.disk}%`);
    return parts.length > 0 ? parts.join(', ') : 'Metrics parsed';
  }

  /**
   * Check positive and negative patterns
   */
  private checkPatterns(
    output: string,
    positivePattern?: string,
    negativePattern?: string
  ): {
    valid: boolean;
    message: string;
    positiveMatch: boolean;
    negativeMatch: boolean;
  } {
    console.log('🔍 Positive Pattern:', positivePattern || 'None');
    console.log('🔍 Negative Pattern:', negativePattern || 'None');

    let positiveMatch = true;
    let negativeMatch = false;

    if (positivePattern) {
      const regex = new RegExp(positivePattern, 'i');
      positiveMatch = regex.test(output);
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
      negativeMatch = regex.test(output);
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