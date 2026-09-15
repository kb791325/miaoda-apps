import { Global, Module } from '@nestjs/common';
import { AuthModule } from '@server/modules/auth/auth.module';
import { OpLogController } from './op-log.controller';
import { OpLogService } from './op-log.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [OpLogController],
  providers: [OpLogService],
  exports: [OpLogService],
})
export class OpLogModule {}
