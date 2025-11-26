import { Monitor } from '@/lib/models/Monitor';

export interface CheckResult {
  success: boolean;
  value: number | null;
  status: 'ok' | 'warning' | 'alarm' | 'error';
  message: string;
  responseTime?: number;
  statusCode?: number;
  timestamp: Date;
  metadata?: any;
}

/**
 * Interface that all checkers must implement
 */
export interface IChecker {
  readonly type: string;
  check(monitor: Monitor): Promise<CheckResult>;
  validate(monitor: Monitor): boolean | string;
}

/**
 * Helper function to create error results
 */
export function createErrorResult(error: any, responseTime?: number): CheckResult {
  return {
    success: false,
    value: null,
    status: 'error',
    message: error.message || 'Unknown error',
    responseTime,
    timestamp: new Date()
  };
}

/**
 * Helper function to determine status based on thresholds
 */
export function determineStatus(
  value: number,
  thresholds: {
    lowWarning?: number;
    highWarning?: number;
    lowAlarm?: number;
    highAlarm?: number;
  }
): 'ok' | 'warning' | 'alarm' {
  // Check alarm thresholds first
  if (thresholds.highAlarm !== undefined && value >= thresholds.highAlarm) {
    return 'alarm';
  }
  if (thresholds.lowAlarm !== undefined && value <= thresholds.lowAlarm) {
    return 'alarm';
  }

  // Check warning thresholds
  if (thresholds.highWarning !== undefined && value >= thresholds.highWarning) {
    return 'warning';
  }
  if (thresholds.lowWarning !== undefined && value <= thresholds.lowWarning) {
    return 'warning';
  }

  return 'ok';
}

/**
 * Centralized registry for all monitor checkers
 */
export class CheckerRegistry {
  static getTypes() {
    throw new Error('Method not implemented.');
  }
  private static checkers: Map<string, IChecker> = new Map();

  /**
   * Register a checker
   */
  static register(checker: IChecker): void {
    this.checkers.set(checker.type, checker);
    this.checkers.set(checker.type, checker);
    // logger.info(`Registered checker: ${checker.type}`);
  }

  /**
   * Get a checker by type
   */
  static getChecker(type: string): IChecker | undefined {
    return this.checkers.get(type);
  }

  /**
   * Get all registered checker types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.checkers.keys());
  }

  /**
   * Check if a type is registered
   */
  static isRegistered(type: string): boolean {
    return this.checkers.has(type);
  }

  /**
   * Get count of registered checkers
   */
  static getCount(): number {
    return this.checkers.size;
  }

  /**
   * Clear all registered checkers (for testing)
   */
  static clear(): void {
    this.checkers.clear();
  }
}

// Note: Checkers should be registered in the MonitoringExecutor constructor
// or in the API route before first use