import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [BitableModule, AuthModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
