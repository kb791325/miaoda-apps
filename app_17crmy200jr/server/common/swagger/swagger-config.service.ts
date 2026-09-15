import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { HttpAdapterHost, ModulesContainer } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

@Injectable()
export class SwaggerConfigService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SwaggerConfigService.name);

  private swaggerDocument: OpenAPIObject | null = null;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  onApplicationBootstrap() {
    const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
    if (!swaggerEnabled) {
      this.logger.log('Swagger 文档已禁用 (SWAGGER_ENABLED=false)');
      return;
    }

    try {
      const config = new DocumentBuilder()
        .setTitle('牧唐行政资产盘点看板 API')
        .setDescription('行政支出管理、固定资产管理、资产盘点系统 API 文档')
        .setVersion('1.0.0')
        .addTag('支出管理', '行政支出记录的增删改查和统计')
        .addTag('固定资产', '固定资产的全生命周期管理')
        .addTag('盘点任务', '资产盘点任务管理')
        .addTag('盘点检查项', '盘点检查项管理')
        .addTag('综合看板', '综合数据看板统计')
        .addTag('盘点看板', '资产盘点看板统计')
        .addTag('预算管理', '部门预算管理')
        .addTag('角色权限', '角色和权限管理')
        .addTag('通知', '系统通知管理')
        .addTag('操作日志', '操作审计日志')
        .addTag('报表', '数据统计报表')
        .addTag('分类管理', '支出分类管理')
        .addTag('健康检查', '系统健康检查')
        .addTag('用户', '用户管理')
        .addTag('飞书同步', '飞书数据同步')
        .build();

      const httpAdapter = this.adapterHost.httpAdapter;

      const mockApp = {
        getHttpAdapter: () => httpAdapter,
        container: {
          getModules: () => this.modulesContainer,
        },
        config: {
          getVersioning: () => undefined,
          getGlobalPrefix: () => '',
        },
      };

      this.swaggerDocument = SwaggerModule.createDocument(
        mockApp as never,
        config,
      );

      this.logger.log(
        `Swagger 文档已生成，包含 ${Object.keys(this.swaggerDocument.paths).length} 个 API 路径`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Swagger 文档生成失败: ${message}`);
    }
  }

  getDocument(): OpenAPIObject | null {
    return this.swaggerDocument;
  }
}