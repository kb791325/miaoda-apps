import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OpLogService } from './op-log.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';

@Controller('api/op-logs')
export class OpLogController {
  constructor(private readonly opLogService: OpLogService) {}

  @UseGuards(AppAuthGuard)
  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType 与 entityId 为必填项');
    }
    const pageNum: number = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const size: number = Math.min(
      Math.max(parseInt(pageSize ?? '20', 10) || 20, 1),
      100,
    );
    return this.opLogService.listByEntity(entityType, entityId, pageNum, size);
  }
}
