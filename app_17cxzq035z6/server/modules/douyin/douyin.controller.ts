import { Controller, Get, Query, Param, Post, Body } from '@nestjs/common';
import { DouyinService } from './douyin.service';
import type { HotSearchItem, VideoRecord, SuggestItem, CrawlSearchResult } from '@shared/api.interface';

@Controller('api/douyin')
export class DouyinController {
  constructor(private readonly douyinService: DouyinService) {}

  @Get('hot-search')
  async getHotSearch(): Promise<{ items: HotSearchItem[] }> {
    const items = await this.douyinService.getHotSearch();
    return { items };
  }

  @Get('videos')
  async listVideos(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
  ): Promise<{
    items: VideoRecord[];
    total: number;
    page: number;
    pageSize: number;
    sortBy: string;
  }> {
    const result = await this.douyinService.listVideos(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      {},
      (sortBy as 'digg' | 'created_at') || 'digg',
    );
    return {
      items: result.items,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      sortBy: sortBy || 'digg',
    };
  }

  @Get('search')
  async searchVideos(
    @Query('keyword') keyword: string,
    @Query('count') count?: string,
    @Query('sortType') sortType?: string,
  ): Promise<{
    items: VideoRecord[];
    taskId?: string;
    isFallback?: boolean;
    message?: string;
  }> {
    const result = await this.douyinService.searchVideos(
      keyword,
      count ? parseInt(count, 10) : 20,
      sortType || '0',
    );
    return result;
  }

  @Get('video/:id')
  async getVideoDetail(@Param('id') id: string): Promise<{ item: VideoRecord }> {
    const item = await this.douyinService.getVideoDetail(id);
    return { item };
  }

  @Get('related/:id')
  async getRelatedVideos(@Param('id') id: string): Promise<{ items: VideoRecord[] }> {
    const items = await this.douyinService.getRelatedVideos(id);
    return { items };
  }

  @Get('suggest')
  async getSuggest(@Query('keyword') keyword: string): Promise<{ items: SuggestItem[] }> {
    const items = await this.douyinService.getSuggest(keyword);
    return { items };
  }

  @Post('crawl-search')
  async crawlSearch(
    @Body() body: { keyword: string; count?: number; maxDepth?: number },
  ): Promise<CrawlSearchResult> {
    const result = await this.douyinService.crawlSearch(body.keyword, {
      count: body.count ?? 20,
      maxDepth: body.maxDepth ?? 2,
    });
    return result;
  }
}
