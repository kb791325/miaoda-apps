import { Controller, Post, Get, Put, Param, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProduceService } from './produce.service';
import type { VideoProduction, ListResponse } from '@shared/api.interface';

@Controller('api/video')
export class ProduceController {
  constructor(private readonly produceService: ProduceService) {}

  @Post('produce')
  async createProduction(
    @Body() body: { scriptId: string },
  ): Promise<{ item: VideoProduction }> {
    if (!body?.scriptId) throw new BadRequestException('scriptId 不能为空');
    const item = await this.produceService.createProduction(body.scriptId);
    return { item };
  }

  @Get('list')
  async listProductions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ): Promise<ListResponse<VideoProduction>> {
    return this.produceService.listProductions(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      status,
    );
  }

  @Get(':id')
  async getProduction(@Param('id') id: string): Promise<{ item: VideoProduction }> {
    const item = await this.produceService.getProduction(id);
    if (!item) throw new NotFoundException('制作项目不存在');
    return { item };
  }

  @Put(':id')
  async updateProduction(
    @Param('id') id: string,
    @Body() body: Partial<VideoProduction>,
  ): Promise<{ item: VideoProduction }> {
    const item = await this.produceService.updateProduction(id, body);
    if (!item) throw new NotFoundException('制作项目不存在');
    return { item };
  }
}
