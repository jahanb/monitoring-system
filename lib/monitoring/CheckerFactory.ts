// lib/monitoring/checkers/index.ts

import { CheckerRegistry } from './types';
import { UrlChecker } from './checkers/UrlChecker';
import { ApiPostChecker } from './checkers/ApiPostChecker';
import { SshChecker } from './checkers/SshChecker';
import { AwsChecker } from './checkers/AwsChecker';
import { PingChecker } from './checkers/PingChecker';

export function initializeCheckers(): void {
  console.log('🔧 Initializing monitoring checkers...');
  
  CheckerRegistry.register(new UrlChecker());
  CheckerRegistry.register(new ApiPostChecker());
  CheckerRegistry.register(new SshChecker());
  CheckerRegistry.register(new AwsChecker());
   CheckerRegistry.register(new PingChecker()); 
  
  const registeredTypes = CheckerRegistry.getTypes();
  console.log(`✅ Registered ${registeredTypes.length} checker(s): ${registeredTypes.join(', ')}`);
}

export { UrlChecker, ApiPostChecker, SshChecker , AwsChecker, PingChecker };
export { CheckerRegistry };