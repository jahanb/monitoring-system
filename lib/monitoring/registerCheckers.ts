// lib/monitoring/registerCheckers.ts

import { CheckerRegistry } from './types';
import { UrlChecker } from './checkers/UrlChecker';
import { ApiPostChecker } from './checkers/ApiPostChecker';
import { SshChecker } from './checkers/SshChecker';
import { AwsChecker } from './checkers/AwsChecker';
import { PingChecker } from './checkers/PingChecker';

export function registerAllCheckers() {
  console.log('🔧 Registering all checkers...');
  
  CheckerRegistry.register(new UrlChecker());
  CheckerRegistry.register(new ApiPostChecker());
  CheckerRegistry.register(new SshChecker());
  CheckerRegistry.register(new AwsChecker());
  CheckerRegistry.register(new PingChecker());
  
  console.log(`✅ Registered ${CheckerRegistry.getRegisteredTypes().length} checkers`);
  console.log(`📋 Available: ${CheckerRegistry.getRegisteredTypes().join(', ')}`);
}