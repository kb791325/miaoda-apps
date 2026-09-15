import { Controller, Get, Query } from '@nestjs/common';
import { GlobalSearchService } from './global-search.service';
import type { GlobalSearchResponse } from '@shared/api.interface';

@Controller('api/global-search')
export class GlobalSearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  @Get()
  async search(@Query('keyword') keyword?: string): Promise<GlobalSearchResponse> {
    return this.globalSearchService.search(keyword ?? '');
  }
}
