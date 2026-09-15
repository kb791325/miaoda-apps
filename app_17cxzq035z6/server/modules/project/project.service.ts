import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, sql, count } from 'drizzle-orm';
import {
  shiPinJiLu as videos,
  jiaoBenXiangMu as scriptProjects,
  shiPinZhiZuo as videoProductions,
  baoKuanJiYin as viralGenes,
} from '@server/database/schema';
import type { ListResponse } from '@shared/api.interface';

export interface ProjectItem {
  id: string;
  type: 'video' | 'script' | 'production' | 'gene';
  title: string;
  coverUrl: string;
  gradeOrScore: string | number;
  status: string;
  createdAt: string;
  category?: string;
}

type ProjectType = 'all' | 'video' | 'script' | 'production' | 'gene';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async listProjects(
    type: ProjectType,
    page: number,
    pageSize: number,
  ): Promise<ListResponse<ProjectItem>> {
    const allItems: ProjectItem[] = [];

    if (type === 'all' || type === 'video') {
      const videoItems = await this.fetchVideoProjects();
      allItems.push(...videoItems);
    }

    if (type === 'all' || type === 'script') {
      const scriptItems = await this.fetchScriptProjects();
      allItems.push(...scriptItems);
    }

    if (type === 'all' || type === 'production') {
      const productionItems = await this.fetchProductionProjects();
      allItems.push(...productionItems);
    }

    if (type === 'all' || type === 'gene') {
      const geneItems = await this.fetchGeneProjects();
      allItems.push(...geneItems);
    }

    // Sort by createdAt desc
    allItems.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = allItems.length;
    const start = (page - 1) * pageSize;
    const items = allItems.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  private async fetchVideoProjects(): Promise<ProjectItem[]> {
    const rows = await this.db
      .select({
        id: videos.id,
        title: videos.title,
        coverUrl: videos.coverUrl,
        grade: videos.grade,
        overallScore: videos.overallScore,
        analyzeStatus: videos.analyzeStatus,
        category: videos.category,
        createdAt: videos.createdAt,
      })
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(500);

    return rows.map((row) => ({
      id: row.id,
      type: 'video' as const,
      title: row.title || '未命名视频',
      coverUrl: row.coverUrl || '',
      gradeOrScore: row.grade || (row.overallScore ?? ''),
      status: row.analyzeStatus || 'pending',
      createdAt: row.createdAt ? row.createdAt.toISOString() : '',
      category: row.category || undefined,
    }));
  }

  private async fetchScriptProjects(): Promise<ProjectItem[]> {
    const rows = await this.db
      .select({
        id: scriptProjects.id,
        topic: scriptProjects.topic,
        category: scriptProjects.category,
        targetDuration: scriptProjects.targetDuration,
        createdAt: scriptProjects.createdAt,
      })
      .from(scriptProjects)
      .orderBy(desc(scriptProjects.createdAt))
      .limit(500);

    return rows.map((row) => ({
      id: row.id,
      type: 'script' as const,
      title: row.topic || '未命名脚本',
      coverUrl: '',
      gradeOrScore: `${row.targetDuration || 0}s`,
      status: 'draft',
      createdAt: row.createdAt ? row.createdAt.toISOString() : '',
      category: row.category || undefined,
    }));
  }

  private async fetchProductionProjects(): Promise<ProjectItem[]> {
    const rows = await this.db
      .select({
        id: videoProductions.id,
        status: videoProductions.status,
        finalVideoUrl: videoProductions.finalVideoUrl,
        createdAt: videoProductions.createdAt,
      })
      .from(videoProductions)
      .orderBy(desc(videoProductions.createdAt))
      .limit(500);

    return rows.map((row) => ({
      id: row.id,
      type: 'production' as const,
      title: `视频制作-${row.id.slice(0, 8)}`,
      coverUrl: '',
      gradeOrScore: '',
      status: row.status || 'pending',
      createdAt: row.createdAt ? row.createdAt.toISOString() : '',
    }));
  }

  private async fetchGeneProjects(): Promise<ProjectItem[]> {
    const rows = await this.db
      .select({
        id: viralGenes.id,
        geneType: viralGenes.geneType,
        content: viralGenes.content,
        effectScore: viralGenes.effectScore,
        isFavorite: viralGenes.isFavorite,
        createdAt: viralGenes.createdAt,
      })
      .from(viralGenes)
      .orderBy(desc(viralGenes.createdAt))
      .limit(500);

    return rows.map((row) => ({
      id: row.id,
      type: 'gene' as const,
      title: row.content.slice(0, 40) || '爆款基因',
      coverUrl: '',
      gradeOrScore: row.effectScore || 0,
      status: row.isFavorite ? 'favorite' : 'normal',
      createdAt: row.createdAt ? row.createdAt.toISOString() : '',
      category: row.geneType || undefined,
    }));
  }

  async toggleFavorite(id: string, type: ProjectType): Promise<{ success: boolean }> {
    if (type === 'gene') {
      const existing = await this.db
        .select({ id: viralGenes.id, isFavorite: viralGenes.isFavorite })
        .from(viralGenes)
        .where(eq(viralGenes.id, id));
      if (existing.length === 0) {
        throw new NotFoundException('基因不存在');
      }
      await this.db
        .update(viralGenes)
        .set({ isFavorite: !existing[0].isFavorite })
        .where(eq(viralGenes.id, id));
      return { success: true };
    }

    // For videos/script/productions, favorite is not stored as a column
    // Return success as placeholder
    this.logger.log(`toggle favorite for ${type}: ${id}`);
    return { success: true };
  }

  async deleteProject(id: string, type: ProjectType): Promise<{ success: boolean }> {
    let result: { id: string }[] = [];

    switch (type) {
      case 'video':
        result = await this.db
          .delete(videos)
          .where(eq(videos.id, id))
          .returning({ id: videos.id });
        break;
      case 'script':
        result = await this.db
          .delete(scriptProjects)
          .where(eq(scriptProjects.id, id))
          .returning({ id: scriptProjects.id });
        break;
      case 'production':
        result = await this.db
          .delete(videoProductions)
          .where(eq(videoProductions.id, id))
          .returning({ id: videoProductions.id });
        break;
      case 'gene':
        result = await this.db
          .delete(viralGenes)
          .where(eq(viralGenes.id, id))
          .returning({ id: viralGenes.id });
        break;
      default:
        throw new NotFoundException('未知项目类型');
    }

    if (result.length === 0) {
      throw new NotFoundException('项目不存在');
    }
    return { success: true };
  }

  async copyProject(id: string, type: ProjectType): Promise<{ id: string }> {
    switch (type) {
      case 'gene': {
        const existing = await this.db
          .select()
          .from(viralGenes)
          .where(eq(viralGenes.id, id));
        if (existing.length === 0) {
          throw new NotFoundException('基因不存在');
        }
        const row = existing[0];
        const copied = await this.db
          .insert(viralGenes)
          .values({
            geneType: row.geneType,
            content: row.content + ' (副本)',
            effectScore: row.effectScore || 0,
            sourceVideoId: row.sourceVideoId,
            isFavorite: false,
            useCount: 0,
          })
          .returning({ id: viralGenes.id });
        return { id: copied[0].id };
      }
      case 'script': {
        const existing = await this.db
          .select()
          .from(scriptProjects)
          .where(eq(scriptProjects.id, id));
        if (existing.length === 0) {
          throw new NotFoundException('脚本项目不存在');
        }
        const row = existing[0];
        const copied = await this.db
          .insert(scriptProjects)
          .values({
            topic: row.topic ? row.topic + ' (副本)' : '未命名脚本',
            category: row.category,
            targetDuration: row.targetDuration,
            referenceVideoIds: row.referenceVideoIds || [],
            viralSummary: row.viralSummary,
            topicEval: row.topicEval,
            outline: row.outline,
            fullCopy: row.fullCopy,
            storyboard: row.storyboard,
          })
          .returning({ id: scriptProjects.id });
        return { id: copied[0].id };
      }
      default:
        throw new NotFoundException('该类型暂不支持复制');
    }
  }
}
