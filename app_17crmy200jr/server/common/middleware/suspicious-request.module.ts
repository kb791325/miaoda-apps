import { Global, Module } from '@nestjs/common';
import { SuspiciousRequestStore } from './suspicious-request.store';

@Global()
@Module({
  providers: [SuspiciousRequestStore],
  exports: [SuspiciousRequestStore],
})
export class SuspiciousRequestModule {}