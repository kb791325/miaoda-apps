import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ShipmentService } from './shipment.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import {
  getRequestOperator,
  getOperatorContext,
} from '@server/common/utils/operator';
import type {
  ShipmentListParams,
  ShipmentStatus,
  UpdateShipmentInfoRequest,
  UpdateShipmentStatusRequest,
} from '@shared/shipment';

/** 状态流转所需权限：出库归仓库发货员，安装动作归安装人员 */
const STATUS_PERMISSIONS: Record<ShipmentStatus, string> = {
  待出库: 'shipment:manage',
  运输中: 'shipment:outbound',
  在安装: 'shipment:install',
  已完成: 'shipment:install',
};

@Controller('api/shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  /** 配送安装单列表（关键词/状态筛选 + 偏移分页，按角色限定可见状态） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('shipment:view')
  @Get()
  list(@Req() req: Request, @Query() query: Record<string, string>) {
    const params: ShipmentListParams = {};
    if (query.keyword) params.keyword = query.keyword;
    if (query.status) params.status = query.status as ShipmentStatus;
    if (query.page) params.page = parseInt(query.page, 10);
    if (query.pageSize) {
      params.pageSize = Math.min(parseInt(query.pageSize, 10) || 10, 100);
    }
    return this.shipmentService.list(params, getOperatorContext(req));
  }

  /** 配送安装单详情（明细 + 订单快照） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('shipment:view')
  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.shipmentService.getDetail(id, getOperatorContext(req));
  }

  /** 修改配送信息（安装地址/联系人/电话/预约时间/安装人员/货车司机） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('shipment:manage')
  @Patch(':id')
  updateInfo(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentInfoRequest,
  ) {
    return this.shipmentService.updateInfo(id, dto, getRequestOperator(req));
  }

  /** 状态流转：确认出库（扣库存）/ 开始安装 / 确认安装完成 */
  @UseGuards(AppAuthGuard)
  @RequirePermissions(
    'shipment:outbound',
    'shipment:install',
    'shipment:manage',
  )
  @Patch(':id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusRequest,
  ) {
    const operator = getOperatorContext(req);
    const required = STATUS_PERMISSIONS[dto.targetStatus];
    if (!required) {
      throw new ForbiddenException('无效的流转状态');
    }
    if (!operator.permissions.includes(required)) {
      throw new ForbiddenException('无该状态操作的权限，请联系管理员');
    }
    return this.shipmentService.updateStatus(id, dto, operator.userId);
  }

  /** 取消配送安装单（已出库则回补库存） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('shipment:manage')
  @Delete(':id')
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.shipmentService.cancel(id, getRequestOperator(req));
  }
}
