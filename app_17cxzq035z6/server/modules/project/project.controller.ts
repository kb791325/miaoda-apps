import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import type { ListResponse } from '@shared/api.interface';

interface ProjectItemDto {
  id: string;
  type: string;
  title: string;
  coverUrl: string;
  gradeOrScore: string | number;
  status: string;
  createdAt: string;
  category?: string;
}

@Controller('api/project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('list')
  async listProjects(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ListResponse<ProjectItemDto>> {
    const result = await this.projectService.listProjects(
      (type as 'all' | 'video' | 'script' | 'production' | 'gene') || 'all',
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
    return result;
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Param('id') id: string,
    @Body() body: { type: string },
  ): Promise<{ success: boolean }> {
    return this.projectService.toggleFavorite(
      id,
      body.type as 'video' | 'script' | 'production' | 'gene',
    );
  }

  @Delete(':id')
  async deleteProject(
    @Param('id') id: string,
    @Query('type') type?: string,
  ): Promise<{ success: boolean }> {
    return this.projectService.deleteProject(
      id,
      (type as 'video' | 'script' | 'production' | 'gene') || 'all',
    );
  }

  @Post(':id/copy')
  async copyProject(
    @Param('id') id: string,
    @Body() body: { type: string },
  ): Promise<{ id: string }> {
    return this.projectService.copyProject(
      id,
      body.type as 'video' | 'script' | 'production' | 'gene',
    );
  }
}
