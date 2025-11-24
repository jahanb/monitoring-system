// lib/monitoring/checkers/PingChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Ping Checker
 * - Pings a host/IP address
 * - Measures response time (latency)
 * - Detects packet loss
 * - Works on Linux, macOS, and Windows
 */
export class PingChecker implements IChecker {
  readonly type = 'ping';

  async check(monitor: Monitor): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const pingConfig = this.parsePingConfig(monitor);
      
      if (!pingConfig.valid) {
        return {
          success: false,
          value: null,
          status: 'error',
          message: pingConfig.error || 'Invalid ping configuration',
          timestamp: new Date()
        };
      }

      console.log(`🏓 Pinging ${pingConfig.host}...`);

      const result = await this.executePing(
        pingConfig.host, 
        pingConfig.count, 
        pingConfig.timeout
      );

      const responseTime = Date.now() - startTime;

      if (!result.success) {
        return {
          success: false,
          value: null,
          status: 'alarm',
          message: result.error || 'Ping failed - host unreachable',
          responseTime,
          metadata: {
            host: pingConfig.host,
            packetsSent: pingConfig.count,
            packetsReceived: 0,
            packetLoss: 100
          },
          timestamp: new Date()
        };
      }

      // Check packet loss threshold
      if (result.packetLoss > 50) {
        return {
          success: false,
          value: result.avgTime,
          status: 'alarm',
          message: `High packet loss: ${result.packetLoss}% (${result.packetsReceived}/${result.packetsSent} packets received)`,
          responseTime: result.avgTime,
          metadata: {
            host: pingConfig.host,
            packetsSent: result.packetsSent,
            packetsReceived: result.packetsReceived,
            packetLoss: result.packetLoss,
            minTime: result.minTime,
            maxTime: result.maxTime,
            avgTime: result.avgTime
          },
          timestamp: new Date()
        };
      }

      // Determine status based on average latency
      const status = determineStatus(result.avgTime, {
        lowWarning: monitor.low_value_threshold_warning,
        highWarning: monitor.high_value_threshold_warning,
        lowAlarm: monitor.low_value_threshold_alarm,
        highAlarm: monitor.high_value_threshold_alarm
      });

      return {
        success: true,
        value: result.avgTime,
        status,
        message: `Ping successful - ${result.avgTime.toFixed(2)}ms avg, ${result.packetLoss}% loss`,
        responseTime: result.avgTime,
        metadata: {
          host: pingConfig.host,
          packetsSent: result.packetsSent,
          packetsReceived: result.packetsReceived,
          packetLoss: result.packetLoss,
          minTime: result.minTime,
          maxTime: result.maxTime,
          avgTime: result.avgTime
        },
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Ping Check Failed:', error.message);
      return createErrorResult(error, Date.now() - startTime);
    }
  }

  validate(monitor: Monitor): boolean | string {
    const ping = (monitor as any).ping_config;
    
    if (!ping?.host && !monitor.monitor_instance) {
      return 'Host/IP address is required for ping monitoring';
    }
    
    const host = ping?.host || monitor.monitor_instance;
    
    // Basic validation for IP address or hostname
    if (!this.isValidHostOrIP(host)) {
      return 'Invalid host or IP address format';
    }
    
    return true;
  }

  private parsePingConfig(monitor: Monitor) {
    const ping = (monitor as any).ping_config;
    const host = ping?.host || monitor.monitor_instance;

    if (!host) {
      return { valid: false, error: 'Host is required', host: '', count: 4, timeout: 5 };
    }

    return {
      valid: true,
      host: host.trim(),
      count: ping?.count || 4,
      timeout: ping?.timeout || 5
    };
  }

  private async executePing(host: string, count: number, timeout: number): Promise<{
    success: boolean;
    packetsSent: number;
    packetsReceived: number;
    packetLoss: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
    error?: string;
  }> {
    const platform = process.platform;
    let command: string;

    // Build platform-specific ping command
    if (platform === 'win32') {
      // Windows: ping -n <count> -w <timeout_ms> <host>
      command = `ping -n ${count} -w ${timeout * 1000} ${host}`;
    } else {
      // Linux/macOS: ping -c <count> -W <timeout_sec> <host>
      command = `ping -c ${count} -W ${timeout} ${host}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: (timeout + 2) * 1000 * count // Extra buffer
      });

      if (stderr) {
        console.warn('Ping stderr:', stderr);
      }

      // Parse the output based on platform
      if (platform === 'win32') {
        return this.parseWindowsPing(stdout, count);
      } else {
        return this.parseUnixPing(stdout, count);
      }

    } catch (error: any) {
      // Ping command failed (host unreachable, timeout, etc.)
      return {
        success: false,
        packetsSent: count,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: 0,
        maxTime: 0,
        avgTime: 0,
        error: error.message || 'Ping execution failed'
      };
    }
  }

  private parseWindowsPing(output: string, expectedCount: number) {
    // Example Windows output:
    // Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)
    // Minimum = 1ms, Maximum = 3ms, Average = 2ms

    const packetsMatch = output.match(/Sent = (\d+), Received = (\d+), Lost = (\d+)/);
    const timesMatch = output.match(/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/);

    if (!packetsMatch) {
      return {
        success: false,
        packetsSent: expectedCount,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: 0,
        maxTime: 0,
        avgTime: 0,
        error: 'Failed to parse ping output'
      };
    }

    const sent = parseInt(packetsMatch[1]);
    const received = parseInt(packetsMatch[2]);
    const lost = parseInt(packetsMatch[3]);
    const packetLoss = (lost / sent) * 100;

    let minTime = 0, maxTime = 0, avgTime = 0;
    
    if (timesMatch && received > 0) {
      minTime = parseInt(timesMatch[1]);
      maxTime = parseInt(timesMatch[2]);
      avgTime = parseInt(timesMatch[3]);
    }

    return {
      success: received > 0,
      packetsSent: sent,
      packetsReceived: received,
      packetLoss,
      minTime,
      maxTime,
      avgTime
    };
  }

  private parseUnixPing(output: string, expectedCount: number) {
    // Example Linux/macOS output:
    // 4 packets transmitted, 4 received, 0% packet loss, time 3003ms
    // rtt min/avg/max/mdev = 0.123/0.456/0.789/0.234 ms

    const packetsMatch = output.match(/(\d+) packets transmitted, (\d+) received/);
    const lossMatch = output.match(/(\d+\.?\d*)% packet loss/);
    const rttMatch = output.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/);
    
    // Alternative format: round-trip min/avg/max = ...
    const rttAltMatch = output.match(/round-trip min\/avg\/max = ([\d.]+)\/([\d.]+)\/([\d.]+) ms/);

    if (!packetsMatch) {
      return {
        success: false,
        packetsSent: expectedCount,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: 0,
        maxTime: 0,
        avgTime: 0,
        error: 'Failed to parse ping output'
      };
    }

    const sent = parseInt(packetsMatch[1]);
    const received = parseInt(packetsMatch[2]);
    const packetLoss = lossMatch ? parseFloat(lossMatch[1]) : ((sent - received) / sent) * 100;

    let minTime = 0, maxTime = 0, avgTime = 0;

    if (rttMatch && received > 0) {
      minTime = parseFloat(rttMatch[1]);
      avgTime = parseFloat(rttMatch[2]);
      maxTime = parseFloat(rttMatch[3]);
    } else if (rttAltMatch && received > 0) {
      minTime = parseFloat(rttAltMatch[1]);
      avgTime = parseFloat(rttAltMatch[2]);
      maxTime = parseFloat(rttAltMatch[3]);
    }

    return {
      success: received > 0,
      packetsSent: sent,
      packetsReceived: received,
      packetLoss,
      minTime,
      maxTime,
      avgTime
    };
  }

  private isValidHostOrIP(host: string): boolean {
    if (!host || host.trim().length === 0) return false;

    // Check for valid IPv4 address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(host)) {
      // Validate each octet is 0-255
      const octets = host.split('.');
      return octets.every(octet => {
        const num = parseInt(octet);
        return num >= 0 && num <= 255;
      });
    }

    // Check for valid IPv6 address (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (ipv6Regex.test(host)) {
      return true;
    }

    // Check for valid hostname/domain
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(host);
  }
}