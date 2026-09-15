import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, and, count, inArray } from 'drizzle-orm';
import { jiaoBenXiangMu as scriptProjects, shiPinJiLu as videos } from '@server/database/schema';
import type {
  ScriptProject,
  TopicEval,
  ScriptOutline,
  Storyboard,
  StoryboardShot,
  ListResponse,
  VideoRecord,
} from '@shared/api.interface';

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async generateScript(
    topic: string,
    category: string,
    targetDuration: number,
    referenceVideoIds: string[],
  ): Promise<ScriptProject> {
    // 参考视频分析
    let viralSummary = '';
    if (referenceVideoIds.length > 0) {
      viralSummary = await this.generateViralSummaryFromRefs(referenceVideoIds, topic);
    }

    const topicEval = this.generateTopicEval(topic, category, targetDuration);
    const outline = this.generateOutline(topic, targetDuration, topicEval);
    const fullCopy = this.generateFullCopy(topic, outline, targetDuration);
    const storyboard = this.generateStoryboard(topic, fullCopy, targetDuration);

    const inserted = await this.db.insert(scriptProjects).values({
      topic,
      category: category || undefined,
      targetDuration,
      referenceVideoIds: referenceVideoIds.length > 0 ? referenceVideoIds : [],
      viralSummary: viralSummary || undefined,
      topicEval: topicEval as unknown as Record<string, unknown>,
      outline: outline as unknown as Record<string, unknown>,
      fullCopy,
      storyboard: storyboard as unknown as Record<string, unknown>,
    }).returning();

    return this.mapScriptProject(inserted[0]);
  }

  async getProject(id: string): Promise<ScriptProject | null> {
    const rows = await this.db.select().from(scriptProjects).where(eq(scriptProjects.id, id));
    if (rows.length === 0) return null;
    return this.mapScriptProject(rows[0]);
  }

  async updateProject(id: string, patch: Partial<ScriptProject>): Promise<ScriptProject | null> {
    const existing = await this.db.select().from(scriptProjects).where(eq(scriptProjects.id, id));
    if (existing.length === 0) return null;

    const updateData: Record<string, unknown> = {};
    if (patch.topic !== undefined) updateData.topic = patch.topic;
    if (patch.category !== undefined) updateData.category = patch.category;
    if (patch.targetDuration !== undefined) updateData.targetDuration = patch.targetDuration;
    if (patch.referenceVideoIds !== undefined) updateData.referenceVideoIds = patch.referenceVideoIds;
    if (patch.viralSummary !== undefined) updateData.viralSummary = patch.viralSummary;
    if (patch.topicEval !== undefined) updateData.topicEval = patch.topicEval as unknown as Record<string, unknown>;
    if (patch.outline !== undefined) updateData.outline = patch.outline as unknown as Record<string, unknown>;
    if (patch.fullCopy !== undefined) updateData.fullCopy = patch.fullCopy;
    if (patch.storyboard !== undefined) updateData.storyboard = patch.storyboard as unknown as Record<string, unknown>;

    if (Object.keys(updateData).length === 0) {
      throw new Error('未提供可更新字段');
    }

    updateData.updatedAt = new Date();

    const updated = await this.db.update(scriptProjects)
      .set(updateData)
      .where(eq(scriptProjects.id, id))
      .returning();

    return this.mapScriptProject(updated[0]);
  }

  async listProjects(
    page: number,
    pageSize: number,
    category?: string,
  ): Promise<ListResponse<ScriptProject>> {
    const conditions = [];
    if (category) conditions.push(eq(scriptProjects.category, category));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ value: count() })
      .from(scriptProjects)
      .where(whereClause);
    const total = Number(totalResult[0]?.value || 0);

    const offset = (page - 1) * pageSize;
    const rows = whereClause
      ? await this.db.select().from(scriptProjects).where(whereClause).orderBy(desc(scriptProjects.createdAt)).limit(pageSize).offset(offset)
      : await this.db.select().from(scriptProjects).orderBy(desc(scriptProjects.createdAt)).limit(pageSize).offset(offset);

    const items: ScriptProject[] = rows.map((r) => this.mapScriptProject(r));

    return { items, total, page, pageSize };
  }

  // ========== Private helpers ==========

  private async generateViralSummaryFromRefs(
    referenceVideoIds: string[],
    topic: string,
  ): Promise<string> {
    let refVideos: VideoRecord[] = [];
    if (referenceVideoIds.length > 0) {
      const rawRows = await this.db.select().from(videos).where(inArray(videos.id, referenceVideoIds));
      refVideos = rawRows.map((r) => this.mapVideoRecordLight(r));
    }

    if (refVideos.length === 0) {
      return `【AI生成】暂无参考视频数据分析，基于"${topic}"主题生成通用爆款规律总结。`;
    }

    const avgScore = refVideos.reduce((sum: number, v: VideoRecord) => sum + (v.overallScore || 0), 0) / refVideos.length;
    const commonTags = this.findCommonTags(refVideos);

    return `【AI生成】基于${refVideos.length}个参考视频的爆款规律总结：
- 参考视频平均综合评分：${Math.round(avgScore)}分
- 高频话题标签：${commonTags.join('、') || '无显著共性标签'}
- 核心爆款要素：强钩子开头+情绪共鸣+结构化干货+明确CTA
- 选题方向建议：围绕"${topic}"切入，结合${refVideos.length > 0 ? refVideos[0].hashtags?.[0] || '热门' : '热门'}话题
- 时长建议：30-60秒，信息密度适中
- 开头策略：数字悬念/反常识/亲身经历三选一`;
  }

  private findCommonTags(videos_: VideoRecord[]): string[] {
    const countMap = new Map<string, number>();
    for (const v of videos_) {
      const tags = v.hashtags || [];
      for (const tag of tags) {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      }
    }
    return Array.from(countMap.entries())
      .filter(([, c]) => c >= Math.ceil(videos_.length / 2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private generateTopicEval(topic: string, category: string, duration: number): TopicEval {
    // 启发式评估：根据话题长度、关键词热度、时长合理性等
    const baseScore = 60;
    const lengthBonus = topic.length >= 4 && topic.length <= 12 ? 10 : topic.length < 4 ? -5 : 0;
    const hotKeywords = ['AI', '赚钱', '副业', '秘密', '技巧', '教程', '攻略', '方法', '如何', '怎么'];
    const keywordBonus = hotKeywords.some((k: string) => topic.includes(k)) ? 15 : 0;
    const durationBonus = duration >= 20 && duration <= 60 ? 8 : duration > 120 ? -10 : 0;

    const feasibilityScore = Math.min(95, Math.max(30, baseScore + lengthBonus + keywordBonus + durationBonus));

    const audienceMap: Record<string, string> = {
      knowledge: '18-35岁知识学习者，职场人士为主',
      lifestyle: '20-40岁生活方式爱好者，女性偏多',
      tech: '18-40岁科技数码爱好者，男性为主',
      food: '全年龄段美食爱好者',
      fitness: '20-35岁健身人群，关注身材管理',
      education: '学生家长及终身学习者',
    };

    const audience = audienceMap[category] || '20-35岁短视频用户，对新鲜事物好奇，追求实用价值和情绪价值';

    const hookDirections = [
      `【AI生成】用数字冲击开头："3个${topic}技巧，第2个99%的人不知道"`,
      `【AI生成】用反常识切入："你以为的${topic}其实都是错的？"`,
      `【AI生成】用亲身经历开场："我靠${topic}实现了翻倍增长，方法其实很简单"`,
      `【AI生成】用痛点共鸣："是不是每次${topic}都觉得很难？今天教你一招"`,
      `【AI生成】用结果展示："学会${topic}之后，我的生活发生了这些变化"`,
    ];

    return { feasibilityScore, audience, hookDirections };
  }

  private generateOutline(topic: string, duration: number, topicEval: TopicEval): ScriptOutline {
    const hook = `【AI生成】前3秒钩子：${topicEval.hookDirections[0]?.replace('【AI生成】', '') || '用悬念或数字抓住注意力'}，配合人物特写或大字标题，3秒内抛出核心冲突或意外结果。`;

    const bodyPoints = Math.max(3, Math.min(5, Math.floor(duration / 10)));
    const bodyParts: string[] = [];
    for (let i = 1; i <= bodyPoints; i++) {
      bodyParts.push(`第${i}点：围绕"${topic}"的核心观点${i}，配案例/数据/操作演示，约${Math.round(duration / (bodyPoints + 2))}秒`);
    }

    const body = `【AI生成】主体内容（约${duration - 8}秒）：
${bodyParts.join('\n')}
节奏：每5-8秒一个信息点，配合画面切换和字幕变化，保持观众注意力。`;

    const cta = `【AI生成】结尾CTA（约3秒）：总结核心观点，引导点赞+收藏+关注三连，可设置互动问题引导评论，如"你觉得${topic}最难的是什么？评论区聊聊"。`;

    const emotionPlan = `【AI生成】情绪曲线规划：
- 0-3秒：好奇/惊讶（钩子阶段，情绪快速拉升）
- 3-${Math.round(duration * 0.3)}秒：期待/投入（展开阶段，情绪维持高位）
- ${Math.round(duration * 0.3)}-${Math.round(duration * 0.7)}秒：干货密集（认知满足，情绪平稳波动）
- ${Math.round(duration * 0.7)}-${duration - 3}秒：高潮/反转（价值升华，情绪再次攀升）
- 最后3秒：行动号召（获得感+期待感，情绪收尾上扬）`;

    return { hook, body, cta, emotionPlan };
  }

  private generateFullCopy(topic: string, outline: ScriptOutline, duration: number): string {
    const wordCount = Math.round(duration * 4); // 约每秒4个字
    const points = Math.max(3, Math.min(5, Math.floor(duration / 10)));

    const pointTemplates = [
      `首先第一点，${topic}最核心的就是要找对方法。很多人一开始就走错了方向，越努力越偏离。正确的做法是先搞清楚底层逻辑，再对症下药。`,
      `然后是第二点，细节决定成败。在${topic}这件事上，很多人忽略的小细节，恰恰是拉开差距的关键。你只要把这个细节做到位，效果立马不一样。`,
      `第三点也非常重要，就是持续优化。${topic}不是一蹴而就的，需要不断试错、不断调整。记住，每一次失败都是在为成功铺路。`,
      `还有第四点，就是要善用工具。好的工具能让${topic}事半功倍，把复杂的事情变简单。今天分享的这个工具亲测有效，建议大家收藏起来。`,
      `最后第五点，也是最重要的一点——行动。知道了不去做等于零，${topic}最忌讳的就是想太多做太少。从今天开始，迈出第一步吧！`,
    ];

    const selectedPoints = pointTemplates.slice(0, points).join('\n\n');

    return `【AI生成】${topic} 完整文案（约${wordCount}字，${duration}秒）

【开场·钩子】
你知道吗？${topic}这件事，99%的人都做错了！
今天我要揭秘一个很少有人说的真相，看完这条视频，你对${topic}的认知会彻底改变。

【主体·干货】
${selectedPoints}

【结尾·CTA】
以上就是关于${topic}的全部干货，觉得有用的话，
👉 点赞 让更多人看到
⭐ 收藏 以后慢慢看
🔔 关注 不迷路

你觉得${topic}最难的是什么？评论区告诉我，下期专门解答！

（情绪标注：开场好奇→中段投入→结尾激励，整体节奏明快，信息密度高）`;
  }

  private generateStoryboard(topic: string, fullCopy: string, duration: number): Storyboard {
    const shotCount = Math.max(5, Math.min(10, Math.round(duration / 6)));
    const avgDuration = duration / shotCount;

    const scenes = [
      { scene: '人物特写+大字标题', camera: '近景/正面', sound: '鼓点音效起' },
      { scene: '问题场景描述', camera: '中景/侧45度', sound: 'BGM渐入' },
      { scene: '第一点讲解+图文配合', camera: '中景+插入素材', sound: '讲解+BGM' },
      { scene: '第二点讲解+案例展示', camera: '近景+特写切换', sound: '讲解+BGM' },
      { scene: '第三点讲解+操作演示', camera: '特写/俯拍', sound: '讲解+音效' },
      { scene: '重点内容总结回顾', camera: '中景+文字动画', sound: 'BGM转场' },
      { scene: '金句/价值升华', camera: '慢镜头+逆光', sound: 'BGM高潮' },
      { scene: '结尾CTA+关注引导', camera: '近景/正面微笑', sound: '尾音收束' },
    ];

    const shots: StoryboardShot[] = [];
    const usedScenes = scenes.slice(0, shotCount);

    for (let i = 0; i < shotCount; i++) {
      const shotDuration = Math.round(avgDuration * (0.8 + Math.random() * 0.4));
      const s = usedScenes[i] || usedScenes[usedScenes.length - 1];

      let line = '';
      if (i === 0) {
        line = `你知道吗？${topic}这件事，99%的人都做错了！`;
      } else if (i === shotCount - 1) {
        line = '点赞收藏关注，下期更精彩！';
      } else {
        line = `${topic}的第${i}个关键点，一定要记住...`;
      }

      shots.push({
        id: i + 1,
        duration: shotDuration,
        scene: `【AI生成】${s.scene}`,
        line,
        camera: s.camera,
        sound: `【AI生成】${s.sound}`,
        subtitle: line.slice(0, 20),
        prompt: `${topic}主题，${s.scene}，短视频风格，竖屏9:16，深色科技风，高清画质，无文字无字母无符号`,
      });
    }

    // 调整总时长接近目标
    const totalDuration = shots.reduce((sum: number, s: StoryboardShot) => sum + s.duration, 0);
    if (totalDuration > 0 && Math.abs(totalDuration - duration) > 2) {
      const ratio = duration / totalDuration;
      for (const shot of shots) {
        shot.duration = Math.max(2, Math.round(shot.duration * ratio));
      }
    }

    return { shots };
  }

  private mapVideoRecordLight(row: Record<string, unknown>): VideoRecord {
    return {
      id: row.id as string,
      awemeId: row.awemeId as string,
      title: (row.title as string) || '',
      authorUid: (row.authorUid as string) || '',
      authorNickname: (row.authorNickname as string) || '',
      authorAvatar: '',
      followerCount: 0,
      coverUrl: '',
      videoUrl: '',
      duration: (row.duration as number) || 0,
      diggCount: (row.diggCount as number) || 0,
      commentCount: (row.commentCount as number) || 0,
      shareCount: (row.shareCount as number) || 0,
      collectCount: (row.collectCount as number) || 0,
      playCount: (row.playCount as number) || 0,
      hashtags: (row.hashtags as string[]) || [],
      overallScore: row.overallScore as number | undefined,
      grade: (row.grade as string) || undefined,
      eightDimScores: row.eightDimScores as unknown as undefined,
      analyzeStatus: (row.analyzeStatus as 'pending' | 'analyzing' | 'done' | 'failed') || 'pending',
      createdAt: '',
    };
  }

  private mapScriptProject(row: Record<string, unknown>): ScriptProject {
    const topicEvalVal = row.topicEval as TopicEval | undefined;
    const outlineVal = row.outline as ScriptOutline | undefined;
    const storyboardVal = row.storyboard as Storyboard | undefined;
    const createdAtVal = row.createdAt as Date | undefined;
    const updatedAtVal = row.updatedAt as Date | undefined;
    const refIds = row.referenceVideoIds as string[] | undefined;

    return {
      id: row.id as string,
      topic: (row.topic as string) || undefined,
      category: (row.category as string) || undefined,
      targetDuration: (row.targetDuration as number) || 0,
      referenceVideoIds: refIds || [],
      viralSummary: (row.viralSummary as string) || undefined,
      topicEval: topicEvalVal && Object.keys(topicEvalVal).length > 0 ? topicEvalVal : undefined,
      outline: outlineVal && Object.keys(outlineVal).length > 0 ? outlineVal : undefined,
      fullCopy: (row.fullCopy as string) || undefined,
      storyboard: storyboardVal && Object.keys(storyboardVal).length > 0 ? storyboardVal : undefined,
      createdAt: createdAtVal ? createdAtVal.toISOString() : new Date().toISOString(),
      updatedAt: updatedAtVal ? updatedAtVal.toISOString() : new Date().toISOString(),
    };
  }
}
