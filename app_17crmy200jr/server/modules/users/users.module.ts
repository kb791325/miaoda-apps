import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { UsersService, FEISHU_APP_ID, FEISHU_APP_SECRET } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [HttpModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: FEISHU_APP_ID,
      useValue: process.env.FEISHU_APP_ID || '',
    },
    {
      provide: FEISHU_APP_SECRET,
      useValue: process.env.FEISHU_APP_SECRET || '',
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
