import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AiToolsService } from './ai-tools.service';
import type {
  AnomalyDetectionResponse,
  HealthScoreResponse,
  ReplenishmentResponse,
  SalesPredictionItem,
  TransferSuggestionResponse,
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
} from '@shared/api.interface';

@Controller('api/ai')
@NeedLogin()
export class AiToolsController {
  constructor(private readonly aiToolsService: AiToolsService) {}

  @Get('anomaly-detection')
  async getAnomalyDetection(
    @Query('type') type?: string,
    @Query('warehouse') warehouse?: string,
  ): Promise<AnomalyDetectionResponse> {
    if (type && !['spike', 'drop', 'stagnation'].includes(type)) {
      throw new BadRequestException('type must be spike, drop or stagnation');
    }
    return this.aiToolsService.getAnomalyDetection({ type, warehouse });
  }

  @Get('health-score')
  async getHealthScore(): Promise<HealthScoreResponse> {
    return this.aiToolsService.getHealthScore();
  }

  @Get('replenishment')
  async getReplenishment(
    @Query('warehouse') warehouse?: string,
    @Query('priority') priority?: string,
    @Query('keyword') keyword?: string,
  ): Promise<ReplenishmentResponse> {
    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      throw new BadRequestException('priority must be high, medium or low');
    }
    return this.aiToolsService.getReplenishment({ warehouse, priority, keyword });
  }

  @Get('sales-prediction')
  async getSalesPrediction(
    @Query('productId') productId: string,
    @Query('warehouse') warehouse?: string,
    @Query('period') period?: string,
  ): Promise<SalesPredictionItem> {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }
    const periodNum = period ? parseInt(period, 10) : 7;
    if (period && ![7, 14, 30].includes(periodNum)) {
      throw new BadRequestException('period must be 7, 14 or 30');
    }
    return this.aiToolsService.getSalesPrediction({
      productId,
      warehouse,
      period: periodNum as 7 | 14 | 30,
    });
  }

  @Get('transfer-suggestions')
  async getTransferSuggestions(): Promise<TransferSuggestionResponse> {
    return this.aiToolsService.getTransferSuggestions();
  }

  @Post('natural-language')
  async naturalLanguageQuery(
    @Body() body: NaturalLanguageQueryRequest,
  ): Promise<NaturalLanguageQueryResponse> {
    if (!body.query || typeof body.query !== 'string') {
      throw new BadRequestException('query is required and must be a string');
    }
    return this.aiToolsService.naturalLanguageQuery(body.query);
  }
}
