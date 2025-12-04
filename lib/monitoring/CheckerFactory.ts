import { CheckerRegistry } from './types';
import { UrlChecker } from './checkers/UrlChecker';
import { ApiPostChecker } from './checkers/ApiPostChecker';
import { SshChecker } from './checkers/SshChecker';
import { AwsChecker } from './checkers/AwsChecker';
import { PingChecker } from './checkers/PingChecker';
import { LogChecker } from './checkers/LogChecker';
import { GoogleCloudChecker } from './checkers/GoogleCloudChecker';
import { AzureChecker } from './checkers/AzureChecker';
import { DockerChecker } from './checkers/DockerChecker';
import { CertificateChecker } from './checkers/CertificateChecker';

export function initializeCheckers(): void {
  console.log('🔧 Initializing monitoring checkers...');

  CheckerRegistry.register(new UrlChecker());
  CheckerRegistry.register(new ApiPostChecker());
  CheckerRegistry.register(new SshChecker());
  CheckerRegistry.register(new AwsChecker());
  CheckerRegistry.register(new PingChecker());
  CheckerRegistry.register(new LogChecker());
  CheckerRegistry.register(new GoogleCloudChecker());
  CheckerRegistry.register(new AzureChecker());
  CheckerRegistry.register(new DockerChecker());
  // CheckerRegistry.register(new CertificateChecker());

  const registeredTypes = CheckerRegistry.getTypes();
  // console.log(`✅ Registered ${registeredTypes.length} checker(s): ${registeredTypes.join(', ')}`);
}

export { UrlChecker, ApiPostChecker, SshChecker, AwsChecker, PingChecker, LogChecker, GoogleCloudChecker, AzureChecker, DockerChecker, CertificateChecker };
export { CheckerRegistry };