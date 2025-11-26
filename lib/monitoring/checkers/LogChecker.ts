// lib/monitoring/checkers/LogChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Client } from 'ssh2';
import * as readline from 'readline';

/**
 * LogChecker
 * Analyzes log files for error patterns and provides AI-powered solutions
 * 
 * Supports:
 * - Local log files
 * - Remote log files via SSH
 * - Multiple error patterns with regex
 * - Pattern matching with severity levels
 * - AI-powered solution suggestions
 */
export class LogChecker implements IChecker {
  readonly type = 'log';

  // Common error patterns with solutions
  private readonly commonPatterns = [
    {
      pattern: /out of memory|oom|memory leak|heap space/i,
      severity: 'critical',
      category: 'Memory',
      solution: 'Increase heap size, check for memory leaks, restart application, enable memory profiling'
    },
    {
      pattern: /connection refused|econnrefused|cannot connect/i,
      severity: 'high',
      category: 'Connection',
      solution: 'Check if service is running, verify firewall rules, check network connectivity, verify port is open'
    },
    {
      pattern: /timeout|timed out/i,
      severity: 'high',
      category: 'Timeout',
      solution: 'Increase timeout values, check network latency, optimize slow queries, check for deadlocks'
    },
    {
      pattern: /disk full|no space left|quota exceeded/i,
      severity: 'critical',
      category: 'Disk Space',
      solution: 'Clean up old logs, increase disk space, implement log rotation, move data to external storage'
    },
    {
      pattern: /permission denied|access denied|forbidden/i,
      severity: 'medium',
      category: 'Permissions',
      solution: 'Check file permissions (chmod), verify user has access, check SELinux/AppArmor policies'
    },
    {
      pattern: /database|sql error|query failed/i,
      severity: 'high',
      category: 'Database',
      solution: 'Check database connection, verify credentials, check database logs, optimize queries, check for locks'
    },
    {
      pattern: /404|not found|file not found/i,
      severity: 'medium',
      category: 'Not Found',
      solution: 'Verify file path exists, check deployment, restore missing files, update configuration'
    },
    {
      pattern: /500|internal server error|server error/i,
      severity: 'high',
      category: 'Server Error',
      solution: 'Check application logs, verify configuration, restart service, check for code errors'
    },
    {
      pattern: /certificate|ssl|tls error/i,
      severity: 'high',
      category: 'Certificate',
      solution: 'Renew SSL certificate, update certificate chain, check certificate expiry, verify domain'
    },
    {
      pattern: /deadlock|race condition/i,
      severity: 'high',
      category: 'Concurrency',
      solution: 'Review locking strategy, optimize transaction scope, check for circular dependencies'
    },
    {
      pattern: /exception|error|fatal|panic|crash/i,
      severity: 'medium',
      category: 'General Error',
      solution: 'Check application logs for stack trace, review recent code changes, check dependencies'
    }
  ];

  async check(monitor: Monitor): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const logConfig = this.parseLogConfig(monitor);

      if (!logConfig.valid) {
        return {
          success: false,
          value: null,
          status: 'error',
          message: logConfig.error || 'Invalid log configuration',
          timestamp: new Date()
        };
      }

      console.log(`📄 Checking log file: ${logConfig.logPath}`);

      // Read log file (local or remote)
      const logContent = logConfig.isRemote
        ? await this.readRemoteLog(logConfig)
        : await this.readLocalLog(logConfig.logPath, logConfig.tailLines);

      // Analyze log content
      const analysis = this.analyzeLogs(
        logContent,
        logConfig.patterns,
        logConfig.tailLines
      );

      const responseTime = Date.now() - startTime;

      // Determine status based on findings
      let status: 'ok' | 'warning' | 'alarm' = 'ok';
      if (analysis.criticalCount > 0) {
        status = 'alarm';
      } else if (analysis.errorCount > 0) {
        status = 'warning';
      }

      const message = analysis.matches.length > 0
        ? `Found ${analysis.matches.length} issue(s) in log file`
        : 'No issues found in log file';

      return {
        success: status !== 'alarm',
        value: analysis.errorCount + analysis.criticalCount,
        status,
        message,
        responseTime,
        metadata: {
          logPath: logConfig.logPath,
          linesAnalyzed: analysis.linesAnalyzed,
          errorCount: analysis.errorCount,
          warningCount: analysis.warningCount,
          criticalCount: analysis.criticalCount,
          matches: analysis.matches,
          solutions: analysis.solutions,
          recentErrors: analysis.recentErrors
        },
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Log Check Failed:', error.message);
      return createErrorResult(error, Date.now() - startTime);
    }
  }

  validate(monitor: Monitor): boolean | string {
    const log = (monitor as any).log_config;

    if (!log) return 'Log configuration is required';

    // Check if it's remote or local
    if (log.is_remote) {
      if (!log.ssh_host) return 'SSH host is required for remote logs';
      if (!log.ssh_username) return 'SSH username is required';
      if (!log.ssh_password && !log.ssh_private_key) {
        return 'SSH password or private key is required';
      }
    }

    if (!log.log_path) return 'Log file path is required';

    return true;
  }

  private parseLogConfig(monitor: Monitor) {
    const log = (monitor as any).log_config;

    if (!log) {
      return {
        valid: false,
        error: 'Log config missing',
        logPath: '',
        patterns: [],
        tailLines: 100,
        isRemote: false
      };
    }

    // Merge custom patterns with common patterns
    const customPatterns = log.error_patterns || [];
    const allPatterns = [...this.commonPatterns, ...customPatterns];

    return {
      valid: true,
      logPath: log.log_path,
      patterns: allPatterns,
      tailLines: log.tail_lines || 100,
      isRemote: log.is_remote || false,
      sshHost: log.ssh_host,
      sshPort: log.ssh_port || 22,
      sshUsername: log.ssh_username,
      sshPassword: log.ssh_password,
      sshPrivateKey: log.ssh_private_key
    };
  }

  /**
   * Read local log file with proper streaming for large files
   */
  private async readLocalLog(logPath: string, tailLines: number = 1000): Promise<string> {
    try {
      // Check if file exists and get stats
      const stats = await fs.stat(logPath);

      // For small files (< 5MB), read directly
      if (stats.size < 5 * 1024 * 1024) {
        const content = await fs.readFile(logPath, 'utf-8');
        const lines = content.split('\n');
        return lines.slice(-tailLines).join('\n');
      }

      // For large files, use streaming approach
      console.log(`📊 Large file detected (${(stats.size / 1024 / 1024).toFixed(2)}MB), using streaming...`);
      return await this.tailLocalFileStream(logPath, tailLines);

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Log file not found: ${logPath}`);
      }
      throw new Error(`Failed to read log file: ${error.message}`);
    }
  }

  /**
   * Stream-based tail for large files (memory efficient)
   */
  private async tailLocalFileStream(logPath: string, lines: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const buffer: string[] = [];
      const fileStream = fsSync.createReadStream(logPath, { encoding: 'utf-8' });

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        buffer.push(line);
        // Keep only last N lines in memory
        if (buffer.length > lines) {
          buffer.shift();
        }
      });

      rl.on('close', () => {
        resolve(buffer.join('\n'));
      });

      rl.on('error', (err) => {
        reject(new Error(`Stream reading failed: ${err.message}`));
      });
    });
  }

  /**
   * Read remote log file via SSH
   */
  private async readRemoteLog(config: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let logContent = '';

      conn.on('ready', () => {
        const tailCommand = `tail -n ${config.tailLines} ${config.logPath}`;

        conn.exec(tailCommand, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          stream.on('close', () => {
            conn.end();
            resolve(logContent);
          });

          stream.on('data', (data: Buffer) => {
            logContent += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            console.error('SSH Error:', data.toString());
          });
        });
      });

      conn.on('error', (err) => {
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      conn.connect({
        host: config.sshHost,
        port: config.sshPort,
        username: config.sshUsername,
        password: config.sshPassword,
        privateKey: config.sshPrivateKey
      });
    });
  }

  /**
   * Analyze log content for error patterns
   */
  private analyzeLogs(content: string, patterns: any[], maxLines: number) {
    const lines = content.split('\n').slice(-maxLines);
    const matches: any[] = [];
    const solutions: string[] = [];
    const recentErrors: string[] = [];

    let errorCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      for (const patternConfig of patterns) {
        const pattern = patternConfig.pattern instanceof RegExp
          ? patternConfig.pattern
          : new RegExp(patternConfig.pattern, 'i');

        if (pattern.test(line)) {
          const match = {
            line: line.trim(),
            category: patternConfig.category || 'Unknown',
            severity: patternConfig.severity || 'medium',
            pattern: patternConfig.pattern.toString(),
            timestamp: this.extractTimestamp(line)
          };

          matches.push(match);

          // Count by severity
          switch (patternConfig.severity) {
            case 'critical':
              criticalCount++;
              break;
            case 'high':
              errorCount++;
              break;
            case 'medium':
            case 'low':
              warningCount++;
              break;
          }

          // Add solution if available
          if (patternConfig.solution && !solutions.includes(patternConfig.solution)) {
            solutions.push(patternConfig.solution);
          }

          // Keep recent errors for context
          if (recentErrors.length < 10) {
            recentErrors.push(line.trim());
          }

          break; // Only match first pattern per line
        }
      }
    }

    return {
      linesAnalyzed: lines.length,
      errorCount,
      warningCount,
      criticalCount,
      matches,
      solutions,
      recentErrors
    };
  }

  /**
   * Extract timestamp from log line
   */
  private extractTimestamp(line: string): string | null {
    // Common timestamp patterns
    const patterns = [
      /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/,  // ISO format
      /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,   // DD/MM/YYYY HH:MM:SS
      /(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/        // Jan 1 12:00:00
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}