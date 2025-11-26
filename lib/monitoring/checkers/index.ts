// lib/monitoring/checkers/index.ts

import { CheckerRegistry } from '../types';
import { UrlChecker } from './UrlChecker';
import { ApiPostChecker } from './ApiPostChecker';
import { SshChecker } from './SshChecker';
import { AwsChecker } from './AwsChecker';
import { PingChecker } from './PingChecker';
import { LogChecker } from './LogChecker';
export function initializeCheckers(): void {
  console.log('🔧 Initializing monitoring checkers...');

  CheckerRegistry.register(new UrlChecker());
  CheckerRegistry.register(new ApiPostChecker());
  CheckerRegistry.register(new SshChecker());
  CheckerRegistry.register(new AwsChecker());
  CheckerRegistry.register(new PingChecker());
  CheckerRegistry.register(new LogChecker());
  const registeredTypes = CheckerRegistry.getRegisteredTypes();
  console.log(`✅ Registered ${registeredTypes.length} checker(s): ${registeredTypes.join(', ')}`);
}

export { UrlChecker, ApiPostChecker, SshChecker, AwsChecker, PingChecker, LogChecker };
export { CheckerRegistry };