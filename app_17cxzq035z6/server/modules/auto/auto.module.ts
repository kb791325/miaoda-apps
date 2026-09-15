import { Module } from '@nestjs/common';
import { DouyinModule } from '@server/modules/douyin/douyin.module';
import { AnalyzeModule } from '@server/modules/analyze/analyze.module';
import { ScriptModule } from '@server/modules/script/script.module';
import { AutoController } from './auto.controller';
import { AutoService } from './auto.service';

@Module({
  imports: [DouyinModule, AnalyzeModule, ScriptModule],
  controllers: [AutoController],
  providers: [AutoService],
})
export class AutoModule {}
