import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AssetReservationsService } from './asset-reservations.service';
import type {
  AssetReservationItem,
  CreateReservationRequest,
  ReservationDetail,
  ReservationStats,
} from '@shared/api.interface';

@Controller('api/asset-reservations')
@NeedLogin()
export class AssetReservationsController {
  constructor(private readonly service: AssetReservationsService) {}

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateReservationRequest,
  ): Promise<AssetReservationItem> {
    const { userId, userName } = (
      req as unknown as { userContext: { userId: string; userName: string } }
    ).userContext;
    const department: string | undefined = (
      req as unknown as {
        userContext: { department?: string };
      }
    ).userContext?.department;
    return this.service.create(body, userId, userName, department);
  }

  @Get()
  async findAll(
    @Query() query: Record<string, string>,
  ): Promise<{
    items: AssetReservationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.service.findAll({
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize
        ? Math.min(100, parseInt(query.pageSize, 10))
        : undefined,
      status: query.status,
      keyword: query.keyword,
      expectedBorrowDateFrom: query.expectedBorrowDateFrom,
      expectedBorrowDateTo: query.expectedBorrowDateTo,
    });
  }

  @Get('my/list')
  async getMyReservations(
    @Req() req: Request,
    @Query() query: Record<string, string>,
  ): Promise<{
    items: AssetReservationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.service.getMyReservations(userId, {
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize
        ? Math.min(100, parseInt(query.pageSize, 10))
        : undefined,
      status: query.status,
      keyword: query.keyword,
      expectedBorrowDateFrom: query.expectedBorrowDateFrom,
      expectedBorrowDateTo: query.expectedBorrowDateTo,
    });
  }

  @Get('pending/list')
  async getPendingApprovals(
    @Query() query: Record<string, string>,
  ): Promise<{
    items: AssetReservationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.service.getPendingApprovals({
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize
        ? Math.min(100, parseInt(query.pageSize, 10))
        : undefined,
      keyword: query.keyword,
      expectedBorrowDateFrom: query.expectedBorrowDateFrom,
      expectedBorrowDateTo: query.expectedBorrowDateTo,
    });
  }

  @Get('stats/overview')
  async getStats(): Promise<ReservationStats> {
    return this.service.getStats();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ReservationDetail> {
    return this.service.findById(id);
  }

  @Put(':id/approve')
  async approve(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { remark?: string },
  ): Promise<AssetReservationItem> {
    const { userId, userName } = (
      req as unknown as {
        userContext: { userId: string; userName: string };
      }
    ).userContext;
    return this.service.approve(id, userId, userName, body.remark);
  }

  @Put(':id/reject')
  async reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<AssetReservationItem> {
    const { userId, userName } = (
      req as unknown as {
        userContext: { userId: string; userName: string };
      }
    ).userContext;
    return this.service.reject(id, userId, userName, body.reason);
  }

  @Put(':id/borrow')
  async borrow(@Param('id') id: string): Promise<AssetReservationItem> {
    return this.service.borrow(id);
  }

  @Put(':id/return')
  async returnAsset(
    @Param('id') id: string,
    @Body() body: { remark?: string },
  ): Promise<AssetReservationItem> {
    return this.service.returnAsset(id, body.remark);
  }

  @Put(':id/cancel')
  async cancel(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<AssetReservationItem> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.service.cancel(id, userId);
  }
}