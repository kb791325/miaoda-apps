import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DouyinService } from '@server/modules/douyin/douyin.service';
import { AnalyzeService } from '@server/modules/analyze/analyze.service';
import { ScriptService } from '@server/modules/script/script.service';
import type {
  PipelineStage,
  PipelineStatus,
  VideoRecord,
  CrawlSearchResult,
  CompareResult,
  ScriptProject,
} from '@shared/api.interface';

@Injectable()
export class AutoService implements OnModuleInit {
  private readonly logger = new Logger(AutoService.name);
  private readonly tasks = new Map<string, PipelineStatus>();

  constructor(
    private readonly douyinService: DouyinService,
    private readonly analyzeService: AnalyzeService,
    private readonly scriptService: ScriptService,
  ) {}

  onModuleInit(): void {
    this.logger.log('AutoService 已初始化');
  }

  async startPipeline(
    keyword: string,
    options: { track?: string; duration?: number } = {},
  ): Promise<{ taskId: string }> {
    const taskId = randomUUID();
    const now = new Date().toISOString();

    const status: PipelineStatus = {
      taskId,
      keyword: keyword.trim(),
      stage: 'crawling',
      progress: 0,
      currentStep: '正在启动爆款流水线...',
      videoCount: 0,
      results: {},
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(taskId, status);

    // 异步执行，不等待
    void this.runPipeline(taskId, keyword.trim(), options);

    return { taskId };
  }

  getPipelineStatus(taskId: string): PipelineStatus | null {
    return this.tasks.get(taskId) ?? null;
  }

  private updateStatus(taskId: string, patch: Partial<PipelineStatus>): void {
    const current = this.tasks.get(taskId);
    if (!current) return;
    this.tasks.set(taskId, {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  private async runPipeline(
    taskId: string,
    keyword: string,
    options: { track?: string; duration?: number },
  ): Promise<void> {
    try {
      // ========== Stage 1: crawling (0-20%) ==========
      this.updateStatus(taskId, {
        stage: 'crawling',
        progress: 2,
        currentStep: `开始搜索关键词"${keyword}"相关视频...`,
      });

      const crawlResult: CrawlSearchResult = await this.douyinService.crawlSearch(
        keyword,
        { count: 30, maxDepth: 2 },
      );

      const top10Videos: VideoRecord[] = [...crawlResult.videos]
        .sort((a: VideoRecord, b: VideoRecord) => b.diggCount - a.diggCount)
        .slice(0, 10);

      this.updateStatus(taskId, {
        progress: 20,
        videoCount: crawlResult.matched,
        currentStep: `已爬取${crawlResult.crawled}个视频，匹配${crawlResult.matched}个`,
        results: {
          ...this.tasks.get(taskId)?.results,
          videos: top10Videos,
        },
      });

      // ========== Stage 2: filtering (20-30%) ==========
      this.updateStatus(taskId, {
        stage: 'filtering',
        progress: 25,
        currentStep: '正在按点赞数筛选Top10高赞视频...',
      });

      const top10Ids: string[] = top10Videos.map((v: VideoRecord) => v.id);

      this.updateStatus(taskId, {
        progress: 30,
        currentStep: '已筛选出Top10高赞视频',
      });

      // ========== Stage 3: analyzing (30-50%) ==========
      this.updateStatus(taskId, {
        stage: 'analyzing',
        progress: 32,
        currentStep: '开始批量AI拆解分析...',
      });

      const analyzeResult = await this.analyzeService.batchAnalyze(top10Ids);

      this.updateStatus(taskId, {
        progress: 50,
        currentStep: `批量拆解完成：成功${analyzeResult.success}个，失败${analyzeResult.failed}个`,
      });

      // ========== Stage 4: comparing (50-60%) ==========
      this.updateStatus(taskId, {
        stage: 'comparing',
        progress: 52,
        currentStep: '正在批量对比，提炼爆款规律...',
      });

      const compareResult: CompareResult = await this.analyzeService.compareVideos(top10Ids);

      this.updateStatus(taskId, {
        progress: 60,
        currentStep: '爆款规律提炼完成',
        results: {
          ...this.tasks.get(taskId)?.results,
          compareResult,
        },
      });

      // ========== Stage 5: scripting (60-80%) ==========
      this.updateStatus(taskId, {
        stage: 'scripting',
        progress: 62,
        currentStep: 'AI正在生成爆款脚本...',
      });

      const script: ScriptProject = await this.scriptService.generateScript(
        keyword,
        options.track || 'lifestyle',
        options.duration || 30,
        top10Ids,
      );

      this.updateStatus(taskId, {
        progress: 80,
        scriptId: script.id,
        currentStep: '脚本生成完成',
        results: {
          ...this.tasks.get(taskId)?.results,
          script,
        },
      });

      // ========== Stage 6: storyboard (80-100%) ==========
      this.updateStatus(taskId, {
        stage: 'storyboard',
        progress: 85,
        currentStep: '正在生成分镜表...',
      });

      // 分镜表已在 generateScript 中一并生成
      this.updateStatus(taskId, {
        stage: 'done',
        progress: 100,
        currentStep: '分镜表已生成，流水线全部完成！',
      });

      this.logger.log(`流水线完成 taskId=${taskId} keyword=${keyword}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`流水线失败 taskId=${taskId}: ${errorMessage}`);
      this.updateStatus(taskId, {
        stage: 'failed',
        error: errorMessage,
        currentStep: '流水线执行失败',
      });
    }
  }
}
