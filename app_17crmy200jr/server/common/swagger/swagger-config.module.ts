import { Global, Module } from '@nestjs/common';
import { SwaggerConfigService } from './swagger-config.service';
import { SwaggerDocsController } from './swagger-docs.controller';

@Global()
@Module({
  controllers: [SwaggerDocsController],
  providers: [SwaggerConfigService],
  exports: [SwaggerConfigService],
})
export class SwaggerConfigModule {}