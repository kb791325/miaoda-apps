import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AutoService } from './auto.service';
import type { PipelineStatus } from '@shared/api.interface';

interface StartPipelineBody {
  keyword: string;
  track?: string;
  duration?: number;
}

@Controller('api/auto/pipeline')
export class AutoController {
  constructor(private readonly autoService: AutoService) {}

  @NeedLogin()
  @Post()
  async startPipeline(
    @Req() req: Request,
    @Body() body: StartPipelineBody,
  ): Promise<{ taskId: string }> {
    const { keyword, track, duration } = body;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      throw new BadRequestException('关键词不能为空');
    }

    return this.autoService.startPipeline(keyword, { track, duration });
  }

  @NeedLogin()
  @Get(':taskId')
  getPipelineStatus(@Param('taskId') taskId: string): PipelineStatus {
    const status = this.autoService.getPipelineStatus(taskId);
    if (!status) {
      throw new NotFoundException('任务不存在');
    }
    return status;
  }
}
