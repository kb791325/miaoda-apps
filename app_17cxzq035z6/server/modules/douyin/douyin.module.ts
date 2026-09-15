import { Module } from '@nestjs/common';
import { DouyinController } from './douyin.controller';
import { DouyinService } from './douyin.service';
import { ABogusService } from './a-bogus.service';

@Module({
  controllers: [DouyinController],
  providers: [DouyinService, ABogusService],
  exports: [DouyinService, ABogusService],
})
export class DouyinModule {}
