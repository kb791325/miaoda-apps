import { Controller, Post, Get, Put, Param, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ScriptService } from './script.service';
import type { ScriptProject, ListResponse } from '@shared/api.interface';

@Controller('api/script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('generate')
  async generateScript(
    @Body() body: { topic: string; category: string; targetDuration: number; referenceVideoIds?: string[] },
  ): Promise<{ item: ScriptProject }> {
    if (!body?.topic) throw new BadRequestException('topic 不能为空');
    const item = await this.scriptService.generateScript(
      body.topic,
      body.category || '',
      body.targetDuration || 30,
      body.referenceVideoIds || [],
    );
    return { item };
  }

  @Get('list')
  async listProjects(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
  ): Promise<ListResponse<ScriptProject>> {
    return this.scriptService.listProjects(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      category,
    );
  }

  @Get(':id')
  async getProject(@Param('id') id: string): Promise<{ item: ScriptProject }> {
    const item = await this.scriptService.getProject(id);
    if (!item) throw new NotFoundException('脚本项目不存在');
    return { item };
  }

  @Put(':id')
  async updateProject(
    @Param('id') id: string,
    @Body() body: Partial<ScriptProject>,
  ): Promise<{ item: ScriptProject }> {
    const item = await this.scriptService.updateProject(id, body);
    if (!item) throw new NotFoundException('脚本项目不存在');
    return { item };
  }
}
