import { Controller, Post, Get, Param, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import type { VideoRecord, CompareResult } from '@shared/api.interface';

@Controller('api/analyze')
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post('batch')
  async batchAnalyze(
    @Body() body: { videoIds: string[] },
  ): Promise<{ success: number; failed: number }> {
    if (!body?.videoIds || !Array.isArray(body.videoIds)) {
      throw new BadRequestException('videoIds 必须为数组');
    }
    const result = await this.analyzeService.batchAnalyze(body.videoIds);
    return result;
  }

  @Post(':videoId')
  async analyzeVideo(@Param('videoId') videoId: string): Promise<{ item: VideoRecord }> {
    const item = await this.analyzeService.generateAnalysis(videoId);
    if (!item) throw new NotFoundException('视频不存在');
    return { item };
  }

  @Get('compare')
  async compareVideos(@Query('ids') ids: string): Promise<CompareResult> {
    if (!ids) throw new BadRequestException('ids 参数不能为空');
    const idList = ids.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (idList.length < 2) throw new BadRequestException('至少需要 2 个视频进行对比');
    return this.analyzeService.compareVideos(idList);
  }
}
