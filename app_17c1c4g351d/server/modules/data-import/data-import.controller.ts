import { Controller, Get, Post, Delete, Body, Param, BadRequestException, Logger } from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { DataImportService } from './data-import.service';
import { PushBitableService } from './push-bitable.service';
import { ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';
import type { PushEntity, PushBitableRequest } from '@shared/api.interface';

type EntityType = 'products' | 'inventory' | 'customers' | 'after-sale' | 'channels' | 'keywords';

const VALID_ENTITIES: EntityType[] = ['products', 'inventory', 'customers', 'after-sale', 'channels', 'keywords'];

const PUSH_ENTITIES: PushEntity[] = ['after-sale', 'inventory', 'review'];

const CONFIG_ENTITIES: string[] = [...VALID_ENTITIES, 'review'];

@Controller('api/data-import')
export class DataImportController {
  private readonly logger = new Logger(DataImportController.name);

  constructor(
    private readonly dataImportService: DataImportService,
    private readonly pushBitableService: PushBitableService,
  ) {}

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Post()
  async importData(
    @Body() body: { entity: EntityType; data: Array<Record<string, unknown>> },
  ) {
    if (!body.entity || !body.data || !Array.isArray(body.data)) {
      throw new BadRequestException('无效的导入请求');
    }
    this.logger.log(`开始导入: entity=${body.entity}, rows=${body.data.length}`);
    switch (body.entity) {
      case 'products':
        return this.dataImportService.importProducts(body.data);
      case 'inventory':
        return this.dataImportService.importInventory(body.data);
      case 'customers':
        return this.dataImportService.importCustomers(body.data);
      case 'after-sale':
        return this.dataImportService.importAfterSaleOrders(body.data);
      case 'channels':
        return this.dataImportService.importChannels(body.data);
      case 'keywords':
        return this.dataImportService.importKeywords(body.data);
      default:
        throw new BadRequestException(`不支持的导入类型: ${body.entity as string}`);
    }
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Post('sync-bitable')
  async syncFromBitable(@Body() body: { entity: EntityType }) {
    if (!body.entity || !VALID_ENTITIES.includes(body.entity)) {
      throw new BadRequestException('无效的同步类型');
    }
    this.logger.log(`Bitable 同步: entity=${body.entity}`);
    return this.dataImportService.syncFromBitable(body.entity);
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Post('push-bitable')
  async pushToBitable(@Body() body: PushBitableRequest) {
    if (!body.entity || !PUSH_ENTITIES.includes(body.entity)) {
      throw new BadRequestException('无效的推送类型');
    }
    this.logger.log(`Bitable 推送: entity=${body.entity}`);
    return this.pushBitableService.pushToBitable(body.entity);
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Post('external')
  async importExternal(
    @Body() body: { entity: EntityType; data: Array<Record<string, unknown>> },
  ) {
    if (!body.entity || !VALID_ENTITIES.includes(body.entity)) {
      throw new BadRequestException('无效的导入类型');
    }
    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      throw new BadRequestException('data 必须为非空数组');
    }
    if (body.data.length > 500) {
      throw new BadRequestException('单次导入最多 500 条');
    }
    this.logger.log(`外部 API 导入: entity=${body.entity}, rows=${body.data.length}`);
    switch (body.entity) {
      case 'products':
        return this.dataImportService.importProducts(body.data);
      case 'inventory':
        return this.dataImportService.importInventory(body.data);
      case 'customers':
        return this.dataImportService.importCustomers(body.data);
      case 'after-sale':
        return this.dataImportService.importAfterSaleOrders(body.data);
      case 'channels':
        return this.dataImportService.importChannels(body.data);
      case 'keywords':
        return this.dataImportService.importKeywords(body.data);
      default:
        throw new BadRequestException(`不支持的导入类型: ${body.entity as string}`);
    }
  }

  @Get('bitable-config')
  @NeedLogin()
  async listBitableConfigs() {
    return this.dataImportService.listBitableConfigs();
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Post('bitable-config')
  async saveBitableConfig(
    @Body() body: { entity: string; appToken: string; tableId: string; label: string },
  ) {
    if (!body.entity || !CONFIG_ENTITIES.includes(body.entity)) {
      throw new BadRequestException('无效的数据类型');
    }
    if (!body.appToken || !body.tableId) {
      throw new BadRequestException('appToken 和 tableId 为必填项');
    }
    return this.dataImportService.saveBitableConfig({
      entity: body.entity,
      appToken: body.appToken.trim(),
      tableId: body.tableId.trim(),
      label: (body.label || '').trim(),
    });
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Delete('bitable-config/:id')
  async deleteBitableConfig(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('缺少配置 ID');
    }
    await this.dataImportService.deleteBitableConfig(id);
    return { success: true };
  }
}
