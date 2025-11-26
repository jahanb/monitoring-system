// lib/monitoring/CheckerRegistry.ts

import { IChecker } from './types';

/**
 * CheckerRegistry - Centralized registry for all monitor checkers
 * Checkers must be registered before they can be used
 */
export class CheckerRegistry {
  private static checkers: Map<string, IChecker> = new Map();
  private static initialized = false;

  /**
   * Register a checker
   */
  static register(checker: IChecker): void {
    this.checkers.set(checker.type, checker);
    console.log(`✅ Registered checker: ${checker.type}`);
  }

  /**
   * Get a checker by type
   */
  static getChecker(type: string): IChecker | undefined {
    if (!this.initialized) {
      console.warn('⚠️  CheckerRegistry not initialized! Call initializeCheckers() first.');
    }
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
   * Initialize all checkers - MUST be called at startup
   */
  static initializeCheckers(): void {
    if (this.initialized) {
      console.log('✅ Checkers already initialized');
      return;
    }

    console.log('🔧 Initializing checkers...');

    // Import and register all checkers
    try {
      const { UrlChecker } = require('./checkers/UrlChecker');
      this.register(new UrlChecker());
    } catch (error) {
      console.error('❌ Failed to load UrlChecker:', error);
    }
    // Import and register all checkers
    try {
      const { LogChecker } = require('./checkers/LogChecker');
      this.register(new LogChecker());
    } catch (error) {
      console.error('❌ Failed to load LogChecker:', error);
    }

    try {
      const { ApiPostChecker } = require('./checkers/ApiPostChecker');
      this.register(new ApiPostChecker());
    } catch (error) {
      console.error('❌ Failed to load ApiPostChecker:', error);
    }

    try {
      const { SshChecker } = require('./checkers/SshChecker');
      this.register(new SshChecker());
    } catch (error) {
      console.error('❌ Failed to load SshChecker:', error);
    }

    try {
      const { AwsChecker } = require('./checkers/AwsChecker');
      this.register(new AwsChecker());
    } catch (error) {
      console.error('❌ Failed to load AwsChecker:', error);
    }

    try {
      const { PingChecker } = require('./checkers/PingChecker');
      this.register(new PingChecker());
    } catch (error) {
      console.error('❌ Failed to load PingChecker:', error);
    }

    // Add more checkers here as you create them
    // try {
    //   const { CustomChecker } = require('./checkers/CustomChecker');
    //   this.register(new CustomChecker());
    // } catch (error) {
    //   console.error('❌ Failed to load CustomChecker:', error);
    // }

    this.initialized = true;
    console.log(`✅ Initialized ${this.checkers.size} checker(s): ${this.getRegisteredTypes().join(', ')}`);
  }

  /**
   * Clear all registered checkers (for testing)
   */
  static clear(): void {
    this.checkers.clear();
    this.initialized = false;
  }
}

// Auto-initialize checkers when module is loaded
CheckerRegistry.initializeCheckers();