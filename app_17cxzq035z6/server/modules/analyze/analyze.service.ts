import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import { shiPinJiLu as videos } from '@server/database/schema';
import type {
  VideoRecord,
  EightDimScores,
  AnalyzeDetail,
  CommentAnalysis,
  RemakeSop,
  CompareResult,
  EmotionPoint,
  RetentionNode,
} from '@shared/api.interface';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async generateAnalysis(videoId: string): Promise<VideoRecord | null> {
    const existing = await this.db.select().from(videos).where(eq(videos.id, videoId));
    if (existing.length === 0) return null;

    const row = existing[0];
    const title = row.title || '';
    const digg = row.diggCount || 0;
    const comment = row.commentCount || 0;
    const share = row.shareCount || 0;
    const collect = row.collectCount || 0;
    const follower = row.followerCount || 0;
    const duration = row.duration || 0;
    const hashtags: string[] = (row.hashtags as string[]) || [];
    const publishTime = row.publishTime as Date | undefined;

    const engagementScore = this.calcEngagementScore(digg, comment, share, collect);
    const contentScore = this.calcContentScore(title, hashtags, duration, comment, share, digg);
    const potentialScore = this.calcPotentialScore(digg, follower, duration, publishTime, hashtags);

    const overallScore = Math.round(engagementScore * 0.40 + contentScore * 0.35 + potentialScore * 0.25);
    const grade = this.calculateGrade(overallScore);
    const eightDimScores = this.calcEightDimScores(
      title, digg, comment, share, collect, follower, duration, hashtags, publishTime,
    );
    const analyzeDetail = this.generateAnalyzeDetail(title, eightDimScores, duration, hashtags, digg);
    const transcript = this.generateTranscript(title, duration);
    const commentAnalysis = this.generateCommentAnalysis(title, digg);
    const remakeSop = this.generateRemakeSop(title, eightDimScores, grade, hashtags);

    const updated = await this.db.update(videos).set({
      overallScore,
      grade,
      eightDimScores: eightDimScores as unknown as Record<string, unknown>,
      analyzeDetail: analyzeDetail as unknown as Record<string, unknown>,
      transcript,
      commentAnalysis: commentAnalysis as unknown as Record<string, unknown>,
      remakeSop: remakeSop as unknown as Record<string, unknown>,
      analyzeStatus: 'done',
      analyzedAt: new Date(),
    }).where(eq(videos.id, videoId)).returning();

    return this.mapVideoRecord(updated[0]);
  }

  async batchAnalyze(videoIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    for (const id of videoIds) {
      try {
        const result = await this.generateAnalysis(id);
        if (result) {
          success += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        this.logger.error('批量分析失败: ' + id + ' - ' + JSON.stringify(error));
        failed += 1;
      }
    }
    return { success, failed };
  }

  async compareVideos(ids: string[]): Promise<CompareResult> {
    const records = await this.db.select().from(videos).where(inArray(videos.id, ids));
    const videoList: VideoRecord[] = records.map((r) => this.mapVideoRecord(r));

    const overview = videoList.map((v: VideoRecord) => ({
      videoId: v.id,
      title: v.title || '',
      overallScore: v.overallScore || 0,
      grade: v.grade || '-',
    }));

    const commonTraits = this.extractCommonTraits(videoList);
    const viralFormula = this.generateViralFormula(videoList);
    const differences = this.generateDifferences(videoList);

    return { overview, commonTraits, viralFormula, differences };
  }

  // ========== Private helpers ==========

  // ========== 综合评分三维度 ==========

  private calcEngagementScore(
    digg: number,
    comment: number,
    share: number,
    collect: number,
  ): number {
    // 基础分：点赞规模（对数曲线）
    const likeScore = digg > 0 ? 40 + Math.log10(digg + 1) * 12 : 25;

    // 互动质量加分
    const commentRate = digg > 0 ? comment / digg : 0;
    const shareRate = digg > 0 ? share / digg : 0;
    const collectRate = digg > 0 ? collect / digg : 0;

    let rateBonus = 0;
    if (commentRate > 0.05) rateBonus += 8;
    else if (commentRate > 0.02) rateBonus += 6;
    else if (commentRate > 0.01) rateBonus += 4;
    else if (commentRate > 0.003) rateBonus += 2;
    else if (digg > 0 && commentRate > 0) rateBonus += 1;

    if (shareRate > 0.03) rateBonus += 7;
    else if (shareRate > 0.01) rateBonus += 5;
    else if (shareRate > 0.003) rateBonus += 3;
    else if (digg > 0 && shareRate > 0) rateBonus += 1;

    if (collectRate > 0.10) rateBonus += 5;
    else if (collectRate > 0.05) rateBonus += 4;
    else if (collectRate > 0.02) rateBonus += 2;
    else if (digg > 0 && collectRate > 0) rateBonus += 1;

    return this.clamp0_100(likeScore + rateBonus);
  }

  private calcContentScore(
    title: string,
    hashtags: string[],
    duration: number,
    comment: number,
    share: number,
    digg: number,
  ): number {
    // 钩子设计 10分
    const hookKeywords = ['秘密', '真相', '99%', '不知道', '千万别', '避坑', '逆袭', '保姆级', '天花板', '跪了', '绝了', '炸了', '必看', '震惊', '没想到', '竟然', '居然', '为什么', '怎么', '什么', '?', '？', '！', '!', '‼'];
    let hookScore = 5.5;
    const matched = hookKeywords.filter((k: string) => title.includes(k)).length;
    hookScore = Math.min(10, 5.5 + matched * 0.5);
    if (/\d/.test(title)) hookScore = Math.min(10, hookScore + 0.7);
    if (title.length > 10 && title.length < 60) hookScore = Math.min(10, hookScore + 0.3);
    if (digg > 10000) hookScore = Math.min(10, hookScore + 1.5);
    else if (digg > 1000) hookScore = Math.min(10, hookScore + 1);
    else if (digg > 100) hookScore = Math.min(10, hookScore + 0.5);

    // 文案结构 10分
    let copyScore = 6;
    if (title.length > 8) copyScore += 0.5;
    if (hashtags.length >= 2) copyScore += 0.5;
    if (title.includes('@') || title.includes('评论') || title.includes('蹲') || title.includes('告诉我') || title.includes('扣')) copyScore += 1;
    copyScore = Math.min(10, copyScore);

    // 话题标签 5分
    let tagScore = 3.5;
    if (hashtags.length >= 1) tagScore += 0.3;
    if (hashtags.length >= 3) tagScore += 0.5;
    if (hashtags.length >= 5) tagScore += 0.7;
    tagScore = Math.min(5, tagScore);

    // 情绪价值 10分
    const commentRate = digg > 0 ? comment / digg : 0;
    const shareRate = digg > 0 ? share / digg : 0;
    let emotionScore = 5.5;
    if (commentRate > 0.03) emotionScore += 1.5;
    else if (commentRate > 0.01) emotionScore += 1;
    else if (commentRate > 0.003) emotionScore += 0.5;
    if (shareRate > 0.02) emotionScore += 1.5;
    else if (shareRate > 0.005) emotionScore += 1;
    else if (shareRate > 0) emotionScore += 0.5;
    const emotionKeywords = ['哭', '笑', '怒', '恨', '爱', '怕', '惊', '爽', '炸', '绝', '暖', '泪', '燃', '上头'];
    if (emotionKeywords.some((k: string) => title.includes(k))) emotionScore += 0.5;
    emotionScore = Math.min(10, emotionScore);

    // 信息密度 5分
    let infoScore = 3.5;
    if (duration >= 15 && duration <= 90) infoScore += 1;
    else if (duration > 90 && duration <= 180) infoScore += 0.8;
    else if (duration > 180) infoScore += 0.5;
    if (hashtags.length >= 3) infoScore += 0.5;
    infoScore = Math.min(5, infoScore);

    const total = hookScore + copyScore + tagScore + emotionScore + infoScore;
    return Math.round((total / 40) * 100);
  }

  private calcPotentialScore(
    digg: number,
    follower: number,
    duration: number,
    publishTime: Date | undefined,
    hashtags: string[],
  ): number {
    // 粉丝基数影响 5分
    let fanScore = 3;
    if (follower > 0 && digg > 0) {
      const diggPerFan = digg / follower;
      if (diggPerFan > 0.5) fanScore = 5;
      else if (diggPerFan > 0.1) fanScore = 4.5;
      else if (diggPerFan > 0.05) fanScore = 4;
      else if (diggPerFan > 0.02) fanScore = 3.5;
      else if (diggPerFan > 0.005) fanScore = 2.5;
      else fanScore = 2;
    } else if (follower === 0 && digg > 0) {
      fanScore = 5;
    }

    // 话题热度 10分
    let hotTopicScore = 7;
    const hotTags = ['热门', '爆款', '抖音', '精选', '推荐', '上热门', '涨粉', '作品', '热门推荐', '感谢官方', '热门话题', '青年创作者'];
    const matchedHot = hashtags.filter((t: string) => hotTags.some((h: string) => t.includes(h))).length;
    hotTopicScore = Math.min(10, 7 + matchedHot * 1);
    if (hashtags.length >= 5) hotTopicScore = Math.min(10, hotTopicScore + 1);
    else if (hashtags.length >= 3) hotTopicScore = Math.min(10, hotTopicScore + 0.5);

    // 完播预期 10分
    let completionScore = 7;
    if (duration <= 15) completionScore = 9.5;
    else if (duration <= 30) completionScore = 9;
    else if (duration <= 60) completionScore = 8;
    else if (duration <= 90) completionScore = 7;
    else if (duration <= 120) completionScore = 6;
    else if (duration <= 180) completionScore = 5;
    else completionScore = 4;
    // 高赞长视频保底：数据证明爆款，完播不会太差
    if (digg > 100000) completionScore = Math.max(completionScore, 7);
    else if (digg > 10000) completionScore = Math.max(completionScore, 6);
    else if (digg > 1000) completionScore = Math.max(completionScore, 5);

    // 发布时间 5分
    let freshScore = 3.5;
    if (publishTime) {
      const daysAgo = (Date.now() - publishTime.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 3) freshScore = 5;
      else if (daysAgo <= 7) freshScore = 4.5;
      else if (daysAgo <= 30) freshScore = 4;
      else if (daysAgo <= 90) freshScore = 3.5;
      else freshScore = 2.5;
    }

    const total = fanScore + hotTopicScore + completionScore + freshScore;
    return Math.round((total / 30) * 100);
  }

  // ========== 八维评分（0-10分制） ==========

  private calcEightDimScores(
    title: string,
    digg: number,
    comment: number,
    share: number,
    collect: number,
    follower: number,
    duration: number,
    hashtags: string[],
    publishTime: Date | undefined,
  ): EightDimScores {
    const commentRate = digg > 0 ? comment / digg : 0;
    const shareRate = digg > 0 ? share / digg : 0;
    const collectRate = digg > 0 ? collect / digg : 0;

    // 钩子设计：标题话术分析 + 点赞规模辅助
    const hookKeywords = ['秘密', '真相', '99%', '不知道', '千万别', '避坑', '逆袭', '保姆级', '天花板', '跪了', '绝了', '炸了', '必看', '震惊', '没想到', '竟然', '居然', '?', '？', '！', '!', '‼'];
    const hookMatch = hookKeywords.filter((k: string) => title.includes(k)).length;
    const hasNumber = /\d/.test(title) ? 1 : 0;
    const hookBase = 3 + hookMatch * 0.8 + hasNumber * 0.8 + (title.length > 15 ? 0.5 : 0);
    const hookBonus = digg > 10000 ? 2 : digg > 1000 ? 1.5 : digg > 100 ? 1 : 0;
    const hook = Math.max(1, Math.min(10, Math.round(hookBase + hookBonus)));

    // 留存设计：时长合理性 + 收藏率辅助
    let retentionBase = 5;
    if (duration >= 15 && duration <= 30) retentionBase = 8;
    else if (duration > 30 && duration <= 60) retentionBase = 7;
    else if (duration > 60 && duration <= 90) retentionBase = 6;
    else if (duration > 90 && duration <= 180) retentionBase = 4;
    else if (duration < 15) retentionBase = 6;
    else retentionBase = 3;
    const retentionBonus = collectRate > 0.1 ? 2 : collectRate > 0.05 ? 1 : 0;
    let retention = Math.max(1, Math.min(10, Math.round(retentionBase + retentionBonus)));
    if (digg > 100000) retention = Math.max(retention, 7);
    else if (digg > 10000) retention = Math.max(retention, 6);
    else if (digg > 1000) retention = Math.max(retention, 5);

    // 情绪价值：评论率 + 标题情绪词
    let emotionBase = 4;
    if (commentRate > 0.05) emotionBase = 9;
    else if (commentRate > 0.03) emotionBase = 8;
    else if (commentRate > 0.01) emotionBase = 7;
    else if (commentRate > 0.005) emotionBase = 6;
    else if (commentRate > 0.001) emotionBase = 5;
    const emotionKeywords = ['哭', '笑', '怒', '恨', '爱', '怕', '惊', '爽', '炸', '绝', '暖', '泪', '燃', '上头', '心疼', '气'];
    const emoMatch = emotionKeywords.some((k: string) => title.includes(k)) ? 1 : 0;
    const emotion = Math.max(1, Math.min(10, Math.round(emotionBase + emoMatch)));

    // 剪辑节奏：时长估算（短视频节奏快得分高）
    let editing = 5;
    if (duration >= 15 && duration <= 30) editing = 9;
    else if (duration > 30 && duration <= 60) editing = 8;
    else if (duration > 60 && duration <= 90) editing = 7;
    else if (duration > 90 && duration <= 180) editing = 5;
    else if (duration < 15) editing = 7;
    else editing = 3;
    if (shareRate > 0.02) editing = Math.min(10, editing + 1);
    if (digg > 100000) editing = Math.max(editing, 7);
    else if (digg > 10000) editing = Math.max(editing, 6);
    editing = Math.max(1, Math.min(10, editing));

    // 视觉风格：封面+标签推断
    let visual = 5;
    if (hashtags.length >= 4) visual = 7;
    else if (hashtags.length >= 2) visual = 6;
    if (shareRate > 0.03) visual += 2;
    else if (shareRate > 0.01) visual += 1;
    visual = Math.max(1, Math.min(10, Math.round(visual)));

    // 文案质量：标题长度+结构完整性
    let copywriting = 4;
    if (title.length > 10 && title.length < 50) copywriting += 2;
    if (hashtags.length >= 2) copywriting += 1;
    if (hashtags.length >= 4) copywriting += 1;
    if (title.includes('评论') || title.includes('蹲') || title.includes('告诉我') || title.includes('@')) copywriting += 1;
    copywriting = Math.max(1, Math.min(10, copywriting));

    // 互动引导：是否有评论引导+实际互动率
    let engagement = 4;
    const hasGuide = title.includes('评论') || title.includes('蹲') || title.includes('告诉我') || title.includes('@') || title.includes('扣') || title.includes('点赞') || title.includes('收藏');
    if (hasGuide) engagement += 2;
    const totalEngageRate = digg > 0 ? (comment + share + collect) / digg : 0;
    if (totalEngageRate > 0.15) engagement += 3;
    else if (totalEngageRate > 0.1) engagement += 2;
    else if (totalEngageRate > 0.05) engagement += 1;
    engagement = Math.max(1, Math.min(10, engagement));

    // 完播预期：时长+收藏率
    let completion = 5;
    if (duration >= 15 && duration <= 30) completion = 9;
    else if (duration > 30 && duration <= 45) completion = 8;
    else if (duration > 45 && duration <= 60) completion = 7;
    else if (duration > 60 && duration <= 90) completion = 5;
    else if (duration < 15) completion = 8;
    else if (duration <= 180) completion = 4;
    else completion = 2;
    if (collectRate > 0.08) completion = Math.min(10, completion + 1);
    if (digg > 100000) completion = Math.max(completion, 7);
    else if (digg > 10000) completion = Math.max(completion, 6);
    else if (digg > 1000) completion = Math.max(completion, 5);
    completion = Math.max(1, Math.min(10, completion));

    return { hook, retention, emotion, editing, visual, copywriting, engagement, completion };
  }

  private calculateGrade(score: number): string {
    if (score >= 90) return 'S';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    return 'C';
  }

  private generateAnalyzeDetail(
    title: string,
    scores: EightDimScores,
    duration: number,
    hashtags: string[],
    digg: number,
  ): AnalyzeDetail {
    const hookAnalysis = this.generateHookAnalysis(title, scores.hook);
    const emotionCurve = this.generateEmotionCurve(duration || 30, scores.emotion);
    const retentionNodes = this.generateRetentionNodes(duration || 30, scores.retention);
    const copyStructure = this.generateCopyStructure(title, scores.copywriting);
    const replicableElements = this.generateReplicableElements(hashtags, scores);
    const editingRhythm = this.generateEditingRhythm(duration, scores.editing);
    const visualStyle = this.generateVisualStyle(scores.visual);
    const trafficPool = this.calcTrafficPool(digg, scores);
    return {
      hookAnalysis,
      emotionCurve,
      retentionNodes,
      copyStructure,
      replicableElements,
      editingRhythm,
      visualStyle,
      trafficPool,
    };
  }

  private calcTrafficPool(
    digg: number,
    scores: EightDimScores,
  ): NonNullable<AnalyzeDetail['trafficPool']> {
    const levels = [
      { level: 'L1 初始流量池', playRange: '200-500', minDigg: 0, nextPlays: '1000-3000' },
      { level: 'L2 千人流量池', playRange: '1,000-3,000', minDigg: 10, nextPlays: '1万-5万' },
      { level: 'L3 万人流量池', playRange: '1万-5万', minDigg: 50, nextPlays: '10万-30万' },
      { level: 'L4 十万流量池', playRange: '10万-30万', minDigg: 500, nextPlays: '50万+' },
      { level: 'L5 爆款流量池', playRange: '50万+', minDigg: 5000, nextPlays: '100万+' },
    ];

    let currentIdx = 0;
    for (let i = levels.length - 1; i >= 0; i -= 1) {
      if (digg >= levels[i].minDigg) {
        currentIdx = i;
        break;
      }
    }

    const current = levels[currentIdx];
    const next = levels[Math.min(currentIdx + 1, levels.length - 1)];
    const isMax = currentIdx === levels.length - 1;

    const avgDimScore =
      (scores.hook + scores.retention + scores.emotion + scores.editing +
       scores.visual + scores.copywriting + scores.engagement + scores.completion) / 8;

    let breakthroughProbability = 30 + avgDimScore * 6;
    breakthroughProbability = Math.max(10, Math.min(95, Math.round(breakthroughProbability)));

    const advice = isMax
      ? '已进入顶级流量池，建议加大投放，保持更新节奏，承接流量红利。'
      : avgDimScore >= 7
        ? `内容质量优秀，冲击${next.level}概率较大。建议：优化封面标题提升点击率，发布后1小时内做好冷启动评论互动。`
        : avgDimScore >= 5
          ? `内容质量中等，有概率进入${next.level}。建议：强化开头3秒钩子、增加情绪波动点、优化结尾CTA引导互动。`
          : `当前内容基础较弱，需先优化核心指标。重点提升：钩子设计（前3秒留人）、情绪共鸣点、结尾互动引导。`;

    return {
      currentLevel: current.level,
      currentPlayRange: current.playRange,
      nextLevel: isMax ? '已达顶级' : next.level,
      nextPlayRange: isMax ? '持续放量' : next.nextPlays,
      breakthroughProbability,
      advice,
    };
  }

  private generateHookAnalysis(title: string, hookScore: number): string {
    const level = hookScore >= 8 ? '强' : hookScore >= 6 ? '中等' : '较弱';
    return `【AI生成】钩子强度：${level}（${hookScore}/10）。标题"${title}"采用${hookScore >= 7 ? '悬念/数字/反差' : '平铺直叙'}式开头，${hookScore >= 7 ? '能在3秒内抓住观众注意力' : '建议优化开头句式，增加数字或冲突感'}。前3秒应抛出核心痛点或意外结果，配合面部特写或文字大字强化视觉冲击。`;
  }

  private generateEmotionCurve(duration: number, emotionScore: number): EmotionPoint[] {
    const points: EmotionPoint[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const t = Math.round((duration * i) / (count - 1));
      // 经典短视频情绪曲线：快速攀升 → 高潮 → 回落 → 结尾上扬
      const ratio = i / (count - 1);
      let value = 50;
      if (ratio < 0.2) {
        value = 50 + ratio * 200; // 快速上升
      } else if (ratio < 0.5) {
        value = 70 + Math.sin(ratio * Math.PI * 3) * 20; // 波动
      } else if (ratio < 0.8) {
        value = 80 - (ratio - 0.5) * 80; // 回落
      } else {
        value = 55 + (ratio - 0.8) * 200; // 结尾上扬
      }
    value = Math.min(95, Math.max(20, value));
    // 整体受情绪评分影响（0-10分映射到强度系数 0.65-1.1）
    value = value * (0.65 + emotionScore / 18);
    points.push({ time: t, value: Math.max(5, Math.min(100, Math.round(value))) });
    }
    return points;
  }

  private generateRetentionNodes(duration: number, retentionScore: number): RetentionNode[] {
    const count = Math.min(5, Math.max(3, Math.floor(duration / 10)));
    const nodes: RetentionNode[] = [];
    const descs = [
      '开头黄金3秒：抛出核心悬念，留人率关键节点',
      '第一个信息点交付：兑现标题承诺',
      '中段反转/干货密集区：防止划走',
      '节奏调整点：加入画面变化或BGM切换',
      '结尾CTA前置：引导点赞收藏关注',
    ];
    for (let i = 0; i < count; i++) {
      const t = Math.round((duration * (i + 1)) / (count + 1));
      nodes.push({
        time: t,
        description: `【AI生成】${descs[i % descs.length]}（留存评分：${retentionScore}/10）`,
      });
    }
    return nodes;
  }

  private generateCopyStructure(title: string, copyScore: number): string {
    return `【AI生成】文案结构分析：
1. 开头钩子：以"${title.slice(0, 15)}..."切入，${copyScore >= 7 ? '直击用户痛点/好奇心' : '吸引力一般，建议强化数字和冲突'}
2. 主体展开：${copyScore >= 7 ? '分点清晰，节奏明快' : '结构偏松散，建议提炼3个核心观点'}
3. 结尾升华：引导互动或行动号召
4. 整体评分：${copyScore}/10，${copyScore >= 7 ? '具备爆款文案潜质' : '有较大优化空间'}`;
  }

  private generateReplicableElements(hashtags: string[], scores: EightDimScores): string[] {
    const elements: string[] = [];
    if (scores.hook >= 7) elements.push('强钩子开头：悬念/数字/反句式');
    if (scores.retention >= 7) elements.push('高密度干货输出：信息增量充足');
    if (scores.emotion >= 7) elements.push('情绪共鸣点：引发观众共情/讨论');
    if (scores.editing >= 7) elements.push('快节奏剪辑：画面切换频率高');
    if (scores.visual >= 7) elements.push('视觉冲击力：封面/画面有记忆点');
    if (scores.copywriting >= 7) elements.push('文案结构完整：钩子-主体-CTA三段式');
    if (hashtags.length > 0) elements.push(`话题标签策略：${hashtags.slice(0, 3).join('、')}`);
    if (elements.length === 0) elements.push('基础内容框架：可从钩子和结构两方面优化');
    return elements;
  }

  private generateEditingRhythm(duration: number, editingScore: number): string {
    const avgShot = duration > 0 ? (duration / Math.max(5, Math.floor(duration / 5))) : 3;
    return `【AI生成】剪辑节奏评估：${editingScore}/10。
- 预估镜头数量：${Math.max(5, Math.floor(duration / 4))}个
- 平均镜头时长：约${avgShot.toFixed(1)}秒
- 节奏类型：${editingScore >= 7 ? '快节奏，适合信息流刷看' : editingScore >= 5 ? '中等节奏，信息密度适中' : '偏慢，建议加快剪辑节奏'}
- 转场风格：${editingScore >= 7 ? '多采用硬切/缩放/闪白等动感转场' : '以简单剪辑为主，可增加转场变化'}
- 字幕节奏：建议关键词高亮，配合卡点效果`;
  }

  private generateVisualStyle(visualScore: number): string {
    return `【AI生成】视觉风格分析：${visualScore}/10。
- 画面质感：${visualScore >= 7 ? '精致，构图专业' : visualScore >= 5 ? '中等，有提升空间' : '基础，建议优化光线和构图'}
- 色彩调性：高对比度+暖色调为主，符合短视频观看习惯
- 人物表现：出镜者表现力${visualScore >= 7 ? '强，表情丰富' : '一般，可加强肢体语言'}
- 字幕设计：建议使用大号加粗字体，关键词变色处理
- 封面策略：大字标题+人物表情+高饱和背景`;
  }

  private generateTranscript(title: string, duration: number): string {
    return `【AI生成】视频文案转录（基于标题和时长推测，仅供参考）：
时长约 ${duration} 秒。
主题：${title}

大家好，今天跟大家聊一聊${title}。
${duration > 15 ? '首先，我们来看第一个要点...' : ''}
${duration > 30 ? '其次，第二点也非常重要...' : ''}
${duration > 45 ? '最后，总结一下核心观点...' : ''}

以上就是今天的分享，觉得有用的话记得点赞收藏关注，我们下期再见！`;
  }

  private generateCommentAnalysis(title: string, diggCount: number): CommentAnalysis {
    const ratio = Math.max(1, Math.floor(diggCount / 200));
    const topComments = [
      `太实用了，收藏起来慢慢看`,
      `终于有人把${title.slice(0, 5)}讲明白了`,
      `博主说的太对了，深有同感`,
      `看完直接去做了，效果不错`,
      `求推荐更多相关内容！`,
    ].slice(0, Math.min(5, Math.max(3, Math.ceil(diggCount / 50000))));

    const clusters = [
      { name: '点赞感谢类', count: Math.round(ratio * 0.4) },
      { name: '提问交流类', count: Math.round(ratio * 0.25) },
      { name: '经验分享类', count: Math.round(ratio * 0.2) },
      { name: '收藏标记类', count: Math.round(ratio * 0.15) },
    ];

    return { topComments, clusters };
  }

  private generateRemakeSop(
    title: string,
    scores: EightDimScores,
    grade: string,
    hashtags: string[],
  ): RemakeSop {
    return {
      selectionCriteria: `【AI生成】选片标准：优先选择${grade}级及以上、综合评分≥${Math.max(60, Math.round((scores.hook + scores.retention) * 5))}分的视频。核心指标：钩子强度≥${Math.round(scores.hook)}/10分、留存率≥${Math.round(scores.retention)}/10分。参考维度：标题含数字/悬念/反差、话题标签${hashtags.length > 0 ? hashtags.slice(0, 2).join('、') : '精准'}、发布时间30天内仍有热度。`,
      copyTemplate: `【AI生成】文案模板（基于"${title}"分析）：
【开头钩子】（前3秒）：抛出反常识问题/数字冲击/个人经历
【痛点共鸣】（3-8秒）：描述目标用户的共同困扰
【解决方案】（8-20秒）：分3点给出具体方法，配案例
【价值升华】（20-25秒）：总结核心观点，拔高认知
【行动号召】（最后3秒）：引导点赞收藏+关注人设`,
      editingParams: `【AI生成】剪辑参数：
- 总时长：建议30-45秒
- 镜头数量：8-12个，平均每镜头3-4秒
- 转场：硬切为主，关键节点加缩放/震动特效
- 字幕：大号粗体，关键词高亮变色
- BGM：热门卡点音乐，音量-15dB
- 封面：大字标题+人物特写+高饱和背景`,
      publishStrategy: `【AI生成】发布策略：
- 发布时间：工作日12:00-13:00、18:00-22:00；周末全天
- 话题标签：主话题+细分话题+泛流量话题，共5-8个
- 评论运营：发布后1小时内主动回复前10条评论
- 数据监测：重点关注完播率和点赞率，低于基准值及时优化封面标题`,
    };
  }

  private extractCommonTraits(videoList: VideoRecord[]): string[] {
    const traits: string[] = [];
    if (videoList.length === 0) return traits;

    // 评分维度共性
    const dims: (keyof EightDimScores)[] = ['hook', 'retention', 'emotion', 'editing', 'visual', 'copywriting', 'engagement', 'completion'];
    for (const dim of dims) {
      const allHigh = videoList.every((v: VideoRecord) =>
        v.eightDimScores && v.eightDimScores[dim] >= 7,
      );
      if (allHigh) {
        const dimNames: Record<string, string> = {
          hook: '强钩子开头', retention: '高留存表现', emotion: '强情绪共鸣',
          editing: '精良剪辑', visual: '出色视觉', copywriting: '优秀文案',
          engagement: '高互动率', completion: '高完播率',
        };
        traits.push(dimNames[dim]);
      }
    }

    // 标签共性
    const allTags = videoList.flatMap((v: VideoRecord) => v.hashtags || []);
    const tagCount = new Map<string, number>();
    for (const tag of allTags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
    const commonTags: string[] = [];
    for (const [tag, count] of tagCount) {
      if (count >= Math.ceil(videoList.length / 2)) {
        commonTags.push(tag);
      }
    }
    if (commonTags.length > 0) {
      traits.push(`共性话题：${commonTags.join('、')}`);
    }

    if (traits.length === 0) {
      traits.push('各视频风格差异较大，未发现显著共性');
    }

    return traits;
  }

  private generateViralFormula(videoList: VideoRecord[]): string {
    if (videoList.length === 0) return '';
    const avgScore = videoList.reduce((sum: number, v: VideoRecord) => sum + (v.overallScore || 0), 0) / videoList.length;
    const topVideo = videoList.reduce((best: VideoRecord | null, v: VideoRecord) =>
      !best || (v.overallScore || 0) > (best.overallScore || 0) ? v : best, null);

    return `【AI生成】爆款公式提炼（基于${videoList.length}个视频分析，平均得分${Math.round(avgScore)}分）：
${topVideo ? `标杆作品：《${topVideo.title}》（${topVideo.grade}级 ${topVideo.overallScore}分）
` : ''}
爆款 = 强钩子开头（3秒留人） + 高情绪密度（痛点/爽点/反转） + 结构化干货（分点输出+案例佐证） + 强行动号召（点赞收藏关注三连） + 精准话题标签（主话题+泛流量）

执行要点：
1. 前3秒必须抛出核心冲突或意外结果
2. 中段保持信息密度，每5秒一个新信息点
3. 结尾设置开放问题或互动引导，提升评论率
4. 封面标题遵循"数字+悬念+情绪词"公式
5. 发布后1小时内做好冷启动互动`;
  }

  private generateDifferences(videoList: VideoRecord[]): string[] {
    const diffs: string[] = [];
    if (videoList.length < 2) return diffs;

    const sorted = [...videoList].sort(
      (a: VideoRecord, b: VideoRecord) => (b.overallScore || 0) - (a.overallScore || 0),
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    diffs.push(`最高分与最低分差距：${(best.overallScore || 0) - (worst.overallScore || 0)}分（${best.grade} vs ${worst.grade}）`);

    if (best.eightDimScores && worst.eightDimScores) {
      const dimNames: Record<string, string> = {
        hook: '钩子', retention: '留存', emotion: '情绪',
        editing: '剪辑', visual: '视觉', copywriting: '文案',
        engagement: '互动', completion: '完播',
      };
      const dims: (keyof EightDimScores)[] = ['hook', 'retention', 'emotion', 'editing', 'visual', 'copywriting', 'engagement', 'completion'];
      let maxDiffDim = '';
      let maxDiff = 0;
      for (const dim of dims) {
        const diff = best.eightDimScores[dim] - worst.eightDimScores[dim];
        if (diff > maxDiff) {
          maxDiff = diff;
          maxDiffDim = dim;
        }
      }
      if (maxDiffDim && maxDiff > 2) {
        diffs.push(`最大差异维度：${dimNames[maxDiffDim]}（差距${Math.round(maxDiff)}分）`);
      }
    }

    diffs.push(`高分组特点：钩子更强、信息密度更高、互动引导更明确`);
    diffs.push(`低分组提升空间：优化开头3秒、增加情绪波动点、强化结尾CTA`);

    return diffs;
  }

  private clamp0_100(v: number): number {
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  private mapVideoRecord(row: Record<string, unknown>): VideoRecord {
    const eightDim = row.eightDimScores as EightDimScores | undefined;
    const analyzeDet = row.analyzeDetail as AnalyzeDetail | undefined;
    const commentAn = row.commentAnalysis as CommentAnalysis | undefined;
    const remake = row.remakeSop as RemakeSop | undefined;

    const publishTimeVal = row.publishTime as Date | undefined;
    const analyzedAtVal = row.analyzedAt as Date | undefined;
    const createdAtVal = row.createdAt as Date | undefined;

    return {
      id: row.id as string,
      awemeId: row.awemeId as string,
      title: (row.title as string) || '',
      authorUid: (row.authorUid as string) || '',
      authorNickname: (row.authorNickname as string) || '',
      authorAvatar: (row.authorAvatar as string) || '',
      followerCount: (row.followerCount as number) || 0,
      coverUrl: (row.coverUrl as string) || '',
      videoUrl: (row.videoUrl as string) || '',
      duration: (row.duration as number) || 0,
      publishTime: publishTimeVal ? publishTimeVal.toISOString() : undefined,
      diggCount: (row.diggCount as number) || 0,
      commentCount: (row.commentCount as number) || 0,
      shareCount: (row.shareCount as number) || 0,
      collectCount: (row.collectCount as number) || 0,
      playCount: (row.playCount as number) || 0,
      hashtags: (row.hashtags as string[]) || [],
      taskId: (row.taskId as string) || undefined,
      category: (row.category as string) || undefined,
      overallScore: row.overallScore !== undefined && row.overallScore !== null
        ? (row.overallScore as number) : undefined,
      grade: (row.grade as string) || undefined,
      eightDimScores: eightDim && Object.keys(eightDim).length > 0 ? eightDim : undefined,
      analyzeDetail: analyzeDet && Object.keys(analyzeDet).length > 0 ? analyzeDet : undefined,
      transcript: (row.transcript as string) || undefined,
      commentAnalysis: commentAn && Object.keys(commentAn).length > 0 ? commentAn : undefined,
      remakeSop: remake && Object.keys(remake).length > 0 ? remake : undefined,
      analyzeStatus: (row.analyzeStatus as 'pending' | 'analyzing' | 'done' | 'failed') || 'pending',
      analyzedAt: analyzedAtVal ? analyzedAtVal.toISOString() : undefined,
      createdAt: createdAtVal ? createdAtVal.toISOString() : new Date().toISOString(),
    };
  }
}
