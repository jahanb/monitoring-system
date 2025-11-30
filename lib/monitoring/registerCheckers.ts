// lib/monitoring/registerCheckers.ts

import { CheckerRegistry } from './types';
import { UrlChecker } from './checkers/UrlChecker';
import { LogChecker } from './checkers/LogChecker';
import { ApiPostChecker } from './checkers/ApiPostChecker';
import { SshChecker } from './checkers/SshChecker';
import { AwsChecker } from './checkers/AwsChecker';
import { PingChecker } from './checkers/PingChecker';
import { GoogleCloudChecker } from './checkers/GoogleCloudChecker';
import { AzureChecker } from './checkers/AzureChecker';
export function registerAllCheckers() {
  console.log('🔧 Registering all checkers...');

  CheckerRegistry.register(new UrlChecker());
  CheckerRegistry.register(new ApiPostChecker());
  CheckerRegistry.register(new SshChecker());
  CheckerRegistry.register(new AwsChecker());
  CheckerRegistry.register(new PingChecker());
  CheckerRegistry.register(new LogChecker());
  CheckerRegistry.register(new GoogleCloudChecker());
  CheckerRegistry.register(new AzureChecker());

  console.log(`✅ Registered ${CheckerRegistry.getRegisteredTypes().length} checkers`);
  console.log(`📋 Available: ${CheckerRegistry.getRegisteredTypes().join(', ')}`);
}