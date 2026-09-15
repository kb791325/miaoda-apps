import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityLogService } from './security-log.service';
import { CredentialManagerService } from './credential-manager.service';

@Module({
  controllers: [SecurityController],
  providers: [SecurityLogService, CredentialManagerService],
  exports: [CredentialManagerService],
})
export class SecurityModule {}