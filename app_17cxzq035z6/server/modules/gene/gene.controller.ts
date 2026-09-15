import { Controller, Get, Post, Put, Query, Param } from '@nestjs/common';
import { GeneService } from './gene.service';
import type { ViralGene, ListResponse } from '@shared/api.interface';

@Controller('api/gene')
export class GeneController {
  constructor(private readonly geneService: GeneService) {}

  @Get('list')
  async listGenes(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
  ): Promise<ListResponse<ViralGene>> {
    return this.geneService.listGenes(
      (type as 'hook' | 'copy' | 'emotion' | 'editing' | 'tag' | 'bgm' | 'all') ||
        'all',
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      (sort as 'effect' | 'useCount' | 'createdAt') || 'effect',
    );
  }

  @Post(':id/favorite')
  async toggleFavorite(@Param('id') id: string): Promise<{
    id: string;
    isFavorite: boolean;
  }> {
    return this.geneService.toggleFavorite(id);
  }

  @Put(':id/use')
  async incrementUse(@Param('id') id: string): Promise<{
    id: string;
    useCount: number;
  }> {
    return this.geneService.incrementUse(id);
  }
}
