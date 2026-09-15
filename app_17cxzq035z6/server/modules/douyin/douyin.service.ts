import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, inArray, and, SQL, like, or, sql } from 'drizzle-orm';
import { ABogusService } from './a-bogus.service';
import {
  shiPinJiLu as videos,
  souSuoRenWu as searchTasks,
  reSouCi as hotWords,
} from '@server/database/schema';
import type {
  VideoRecord,
  HotSearchItem,
  SuggestItem,
  CrawlProgress,
  CrawlSearchResult,
} from '@shared/api.interface';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SEED_AWEME_IDS = [
  '7630833938022702180',
  '7667649118184934691',
  '7674095689856552201',
  '7637515908484200575',
  '7667599244278140223',
  '7675185239945153835',
  '7667108518831764962',
  '7669079776803800241',
  '7674086771784764722',
  '7676087952297403057',
  '7655697736649526574',
  '7649791951092469026',
  '7648605236541623552',
  '7655970222364462362',
  '7664542078352755994',
  // 防晒霜品类
  '7674942006511110633',
  '7614859921817395429',
  '7613365299908150949',
  '7637453176865639714',
  '7634458836090775921',
  '7636707210194492539',
  '7626705547580127579',
  '7614880261386159781',
  // 美食教程品类
  '7642742027167473906',
  '7669301303008365860',
  '7665148906334495606',
  '7666034489513107825',
  '7667164817116344421',
  '7631130260524340857',
  '7669642792972903926',
  '7673508393792900390',
  '7676749010434332159',
  '7654099357918039338',
  // AI工具品类
  '7631485699853798671',
  '7667164242277306789',
  '7668699178356329764',
  '7667148029778332153',
  '7646706269679668515',
  // 健身减脂品类
  '7603316539516833064',
  '7168300417187679501',
  '7618889165190729012',
  '7668092939524869489',
  '7228894551790882108',
  '7673780507625446067',
  '7661193283388902656',
  '6911799928201219336',
  '7672276258981467758',
];

@Injectable()
export class DouyinService implements OnModuleInit {
  private readonly logger = new Logger(DouyinService.name);
  private ttwidCache: { value: string; expireAt: number } | null = null;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly aBogusService: ABogusService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedAllVideos();
    } catch (error) {
      this.logger.warn('预置种子数据失败: ' + String(error));
    }
  }

  private async seedVideos(): Promise<void> {
    for (const awemeId of SEED_AWEME_IDS) {
      try {
        const detail = await this.fetchVideoDetail(awemeId);
        if (detail) {
          await this.upsertVideo(detail, '', 'seed');
          this.logger.log(`预置视频成功: ${awemeId}`);
        }
      } catch (error) {
        this.logger.warn(`预置视频失败 ${awemeId}: ${String(error)}`);
      }
    }
  }

  private async seedAllVideos(): Promise<void> {
    const countResult = await this.db
      .select({ count: (this.db as any).$count(videos) })
      .from(videos);
    const count = Number(countResult[0]?.count ?? 0);
    const seedTotal = SEED_AWEME_IDS.length;

    if (count >= seedTotal) {
      this.logger.log(
        `视频总数(${count}) >= 种子数(${seedTotal})，跳过种子补全`,
      );
      return;
    }

    this.logger.log(
      `视频总数(${count}) < 种子数(${seedTotal})，开始补全种子数据...`,
    );
    let successCount = 0;
    for (const awemeId of SEED_AWEME_IDS) {
      try {
        const detail = await this.fetchVideoDetail(awemeId);
        if (detail) {
          await this.upsertVideo(detail, '', 'seed');
          successCount += 1;
          this.logger.log(`种子视频 upsert 成功: ${awemeId}`);
        }
      } catch (error) {
        this.logger.warn(`种子视频失败 ${awemeId}: ${String(error)}`);
      }
    }
    this.logger.log(`种子数据补全完成，成功 ${successCount}/${seedTotal}`);
  }

  private async getTtwid(): Promise<string> {
    const now = Date.now();
    if (this.ttwidCache && this.ttwidCache.expireAt > now) {
      return this.ttwidCache.value;
    }
    try {
      const body = JSON.stringify({
        region: 'cn',
        aid: 1768,
        needFid: false,
        service: 'www.douyin.com',
        migrate_info: { ticket: '', source: 'node' },
        cbUrlProtocol: 'https',
        union: true,
      });
      const resp = await fetch(
        'https://ttwid.bytedance.com/ttwid/union/register/',
        {
          method: 'POST',
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/json',
          },
          body,
        },
      );
      const setCookie = resp.headers.get('set-cookie') || '';
      const match = setCookie.match(/ttwid=([^;]+)/);
      if (match && match[1]) {
        const ttwid = match[1];
        this.ttwidCache = { value: ttwid, expireAt: now + 55 * 60 * 1000 };
        return ttwid;
      }
      this.logger.warn('获取ttwid失败：set-cookie中未找到ttwid');
      return '';
    } catch (error) {
      this.logger.error('获取ttwid异常: ' + JSON.stringify(error));
      return '';
    }
  }

  private buildHeaders(ttwid: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': UA,
      Referer: 'https://www.douyin.com/',
    };
    if (ttwid) {
      headers.Cookie = `ttwid=${ttwid}`;
    }
    return headers;
  }

  async getHotSearch(): Promise<HotSearchItem[]> {
    try {
      const ttwid = await this.getTtwid();
      const resp = await fetch(
        'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web',
        {
          headers: this.buildHeaders(ttwid),
        },
      );
      const data: any = await resp.json();
      const list = data?.data?.word_list || [];
      const items: HotSearchItem[] = list
        .map((item: any, index: number) => ({
          word: item.word || item.word_str || '',
          hotValue: item.hot_value || item.hotlist_score || 0,
          position: index + 1,
          sentenceId: item.sentence_id,
          groupId: item.group_id,
          tag: item.event_tag || item.label || '',
        }))
        .filter((item: HotSearchItem) => item.word);

      await this.cacheHotWords(items);
      return items;
    } catch (error) {
      this.logger.error('获取抖音热榜失败: ' + JSON.stringify(error));
      return this.getCachedHotWords();
    }
  }

  private async cacheHotWords(items: HotSearchItem[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      for (const item of items) {
        await this.db
          .insert(hotWords)
          .values({
            paiMing: item.position,
            ci: item.word,
            reDuZhi: item.hotValue,
            biaoQie: item.tag || '',
            sentenceId: item.sentenceId || '',
            groupId: item.groupId || '',
            caiJiShiJian: new Date(now),
          })
          .onConflictDoUpdate({
            target: hotWords.ci,
            set: {
              paiMing: item.position,
              reDuZhi: item.hotValue,
              biaoQie: item.tag || '',
              sentenceId: item.sentenceId || '',
              groupId: item.groupId || '',
              caiJiShiJian: new Date(now),
            },
          });
      }
    } catch (error) {
      this.logger.warn('缓存热榜词失败: ' + String(error));
    }
  }

  private async getCachedHotWords(): Promise<HotSearchItem[]> {
    try {
      const rows = await this.db
        .select()
        .from(hotWords)
        .orderBy(hotWords.paiMing)
        .limit(51);
      return rows.map((row: any) => ({
        word: row.ci,
        hotValue: row.reDuZhi,
        position: row.paiMing,
        sentenceId: row.sentenceId || '',
        groupId: row.groupId || '',
        tag: row.biaoQie || '',
      }));
    } catch {
      return [];
    }
  }

  async searchVideos(
    keyword: string,
    count: number,
    sortType: string,
  ): Promise<{
    items: VideoRecord[];
    taskId?: string;
    isFallback?: boolean;
    message?: string;
  }> {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return { items: [], isFallback: false, message: '' };
    }

    const linkId = this.extractAwemeIdFromUrl(trimmed);
    if (linkId) {
      const task = await this.db
        .insert(searchTasks)
        .values({
          searchMode: 'link',
          keyword: trimmed,
          sortType,
          targetCount: 1,
          status: 'searching',
          resultCount: 0,
        })
        .returning({ id: searchTasks.id });
      const taskId = task[0].id;

      const video = await this.fetchVideoDetail(linkId);
      const items: VideoRecord[] = [];
      if (video) {
        const saved = await this.upsertVideo(video, taskId, 'link');
        items.push(saved);
      }

      await this.db
        .update(searchTasks)
        .set({ resultCount: items.length, status: 'completed' })
        .where(eq(searchTasks.id, taskId));

      return { items, taskId };
    }

    const dbResults = await this.searchVideosFromDb(trimmed, count);

    // 第2层扩展：本地结果 < 5 条时，用匹配度最高的第一条拉取相关视频补充
    let mergedResults: VideoRecord[] = [...dbResults];
    if (dbResults.length > 0 && dbResults.length < 5) {
      try {
        const topAwemeId = dbResults[0].awemeId;
        const related = await this.getRelatedVideos(topAwemeId, count);
        const seen = new Set<string>(dbResults.map((v: VideoRecord) => v.awemeId));
        for (const v of related) {
          if (!seen.has(v.awemeId)) {
            mergedResults.push(v);
            seen.add(v.awemeId);
          }
        }
      } catch (error) {
        this.logger.warn('拉取相关视频补充失败: ' + String(error));
      }
    }

    // 够数直接返回
    if (mergedResults.length >= 3) {
      return { items: mergedResults.slice(0, count), isFallback: false, message: '' };
    }

    // 本地 + 相关视频仍 < 3 条，走热门推荐 fallback
    if (mergedResults.length > 0 && mergedResults.length < 3) {
      const topVideos = await this.getTopVideosByDigg(20);
      const seen = new Set<string>(mergedResults.map((v: VideoRecord) => v.awemeId));
      for (const v of topVideos) {
        if (!seen.has(v.awemeId)) {
          mergedResults.push(v);
          seen.add(v.awemeId);
        }
      }
      return {
        items: mergedResults.slice(0, Math.max(count, 20)),
        isFallback: true,
        message: '未找到完全匹配的视频，为您推荐热门内容',
      };
    }

    const task = await this.db
      .insert(searchTasks)
      .values({
        searchMode: 'keyword',
        keyword: trimmed,
        sortType,
        targetCount: count,
        status: 'searching',
        resultCount: 0,
      })
      .returning({ id: searchTasks.id });
    const taskId = task[0].id;
    const items: VideoRecord[] = [];

    try {
      const videoIds = await this.fetchVideoIdsBySearch(trimmed, count);
      const targetIds = videoIds.slice(0, count);
      for (const awemeId of targetIds) {
        try {
          const video = await this.fetchVideoDetail(awemeId);
          if (video) {
            const saved = await this.upsertVideo(video, taskId, trimmed);
            items.push(saved);
          }
        } catch (e) {
          this.logger.warn('获取视频详情失败: ' + awemeId);
        }
      }
    } catch (error) {
      this.logger.error('搜索视频失败: ' + JSON.stringify(error));
    }

    await this.db
      .update(searchTasks)
      .set({ resultCount: items.length, status: 'completed' })
      .where(eq(searchTasks.id, taskId));

    if (items.length > 0) {
      return { items, taskId, isFallback: false, message: '' };
    }

    const topVideos = await this.getTopVideosByDigg(20);
    return {
      items: topVideos,
      taskId,
      isFallback: true,
      message: '未找到完全匹配的视频，为您推荐热门内容',
    };
  }

  private extractAwemeIdFromUrl(input: string): string | null {
    const trimmed = input.trim();
    const patterns = [
      /\/video\/(\d+)/,
      /\/v\/(\d+)/,
      /\/share\/video\/(\d+)/,
      /douyin\.com\/video\/(\d+)/,
      /^(\d{19})$/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  protected async searchVideosFromDb(
    keyword: string,
    limit: number,
  ): Promise<VideoRecord[]> {
    try {
      const trimmed = keyword.trim();
      if (!trimmed) return [];

      // 按空格拆分为多个关键词，所有词都必须命中（AND 关系）
      const keywords = trimmed.split(/\s+/).filter((k: string) => k.length > 0);

      // 每个关键词构造一组 OR 条件（title / category / hashtags）
      const keywordConditions: SQL[] = keywords.map((kw: string) => {
        const pattern = `%${kw}%`;
        return or(
          like(videos.title, pattern),
          like(videos.category, pattern),
          sql`${videos.hashtags}::text ILIKE ${pattern}`,
        );
      });

      const rows = await this.db
        .select()
        .from(videos)
        .where(and(...keywordConditions))
        .orderBy(desc(videos.diggCount))
        .limit(limit);
      return rows.map((row: any) => this.mapVideoRecord(row));
    } catch (error) {
      this.logger.warn('数据库搜索视频失败: ' + String(error));
      return [];
    }
  }

  private async getTopVideosByDigg(limit: number): Promise<VideoRecord[]> {
    try {
      const rows = await this.db
        .select()
        .from(videos)
        .orderBy(desc(videos.diggCount))
        .limit(limit);
      return rows.map((row: any) => this.mapVideoRecord(row));
    } catch {
      return [];
    }
  }

  private async fetchVideoIdsBySearch(
    keyword: string,
    count: number,
  ): Promise<string[]> {
    try {
      const ttwid = await this.getTtwid();
      const url = `https://www.douyin.com/aweme/v1/web/search/item/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_video_web&sort_type=0&publish_time=0&keyword=${encodeURIComponent(keyword)}&search_source=normal_search&query_correct_type=1&is_filter_search=0&offset=0&count=${count}`;
      const resp = await fetch(url, {
        headers: {
          ...this.buildHeaders(ttwid),
          'Accept': 'application/json',
        },
      });
      const data: any = await resp.json();
      const list = data?.data || [];
      if (list.length === 0) {
        return [];
      }
      return list
        .filter((item: any) => item.aweme_id)
        .map((item: any) => String(item.aweme_id));
    } catch (error) {
      this.logger.warn('搜索视频ID失败: ' + String(error));
      return [];
    }
  }

  private async fetchVideoDetail(
    awemeId: string,
  ): Promise<Partial<VideoRecord> | null> {
    try {
      const ttwid = await this.getTtwid();
      const url = `https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${awemeId}`;
      const resp = await fetch(url, {
        headers: {
          ...this.buildHeaders(ttwid),
          'Accept': 'application/json',
        },
      });
      const data: any = await resp.json();
      const aweme = data?.aweme_detail;
      if (!aweme) return null;
      return this.parseAweme(aweme);
    } catch (error) {
      this.logger.warn('获取视频详情失败: ' + awemeId + ' ' + String(error));
      return null;
    }
  }

  private parseAweme(aweme: any): Partial<VideoRecord> {
    const author = aweme.author || {};
    const video = aweme.video || {};
    const stats = aweme.statistics || {};
    const textExtra = aweme.text_extra || [];
    const hashtags: string[] = textExtra
      .filter((t: any) => t.hashtag_name)
      .map((t: any) => t.hashtag_name);

    const coverUrl =
      video.cover?.url_list?.[0] ||
      video.origin_cover?.url_list?.[0] ||
      video.dynamic_cover?.url_list?.[0] ||
      '';

    let videoUrl = '';
    if (video.play_addr?.url_list?.[0]) {
      videoUrl = video.play_addr.url_list[0];
    } else if (video.bit_rate?.[0]?.play_addr?.url_list?.[0]) {
      videoUrl = video.bit_rate[0].play_addr.url_list[0];
    }

    return {
      awemeId: String(aweme.aweme_id),
      title: aweme.desc || '',
      authorUid: String(author.uid || author.sec_uid || ''),
      authorNickname: author.nickname || '',
      authorAvatar:
        author.avatar_thumb?.url_list?.[0] ||
        author.avatar_medium?.url_list?.[0] ||
        '',
      followerCount: author.follower_count || 0,
      coverUrl,
      videoUrl,
      duration: video.duration ? Math.floor(video.duration / 1000) : 0,
      publishTime: aweme.create_time
        ? new Date(aweme.create_time * 1000).toISOString()
        : undefined,
      diggCount: stats.digg_count || 0,
      commentCount: stats.comment_count || 0,
      shareCount: stats.share_count || 0,
      collectCount: stats.collect_count || 0,
      playCount: stats.play_count || 0,
      hashtags,
    };
  }

  private async upsertVideo(
    videoData: Partial<VideoRecord>,
    taskId: string,
    category: string,
  ): Promise<VideoRecord> {
    const existing = await this.db
      .select()
      .from(videos)
      .where(eq(videos.awemeId, videoData.awemeId as string));

    let result: any;
    if (existing.length > 0) {
      const updateData: any = {};
      if (videoData.title !== undefined) updateData.title = videoData.title;
      if (videoData.authorNickname !== undefined)
        updateData.authorNickname = videoData.authorNickname;
      if (videoData.authorAvatar !== undefined)
        updateData.authorAvatar = videoData.authorAvatar;
      if (videoData.followerCount !== undefined)
        updateData.followerCount = videoData.followerCount;
      if (videoData.coverUrl !== undefined)
        updateData.coverUrl = videoData.coverUrl;
      if (videoData.videoUrl !== undefined)
        updateData.videoUrl = videoData.videoUrl;
      if (videoData.duration !== undefined)
        updateData.duration = videoData.duration;
      if (videoData.publishTime !== undefined)
        updateData.publishTime = new Date(videoData.publishTime);
      if (videoData.diggCount !== undefined)
        updateData.diggCount = videoData.diggCount;
      if (videoData.commentCount !== undefined)
        updateData.commentCount = videoData.commentCount;
      if (videoData.shareCount !== undefined)
        updateData.shareCount = videoData.shareCount;
      if (videoData.collectCount !== undefined)
        updateData.collectCount = videoData.collectCount;
      if (videoData.playCount !== undefined)
        updateData.playCount = videoData.playCount;
      if (videoData.hashtags !== undefined)
        updateData.hashtags = videoData.hashtags;
      if (taskId) updateData.taskId = taskId;
      if (category) updateData.category = category;
      result = await this.db
        .update(videos)
        .set(updateData)
        .where(eq(videos.awemeId, videoData.awemeId as string))
        .returning();
    } else {
      result = await this.db
        .insert(videos)
        .values({
          awemeId: videoData.awemeId as string,
          title: videoData.title || '',
          authorUid: videoData.authorUid || '',
          authorNickname: videoData.authorNickname || '',
          authorAvatar: videoData.authorAvatar || '',
          followerCount: videoData.followerCount || 0,
          coverUrl: videoData.coverUrl || '',
          videoUrl: videoData.videoUrl || '',
          duration: videoData.duration || 0,
          publishTime: videoData.publishTime
            ? new Date(videoData.publishTime)
            : undefined,
          diggCount: videoData.diggCount || 0,
          commentCount: videoData.commentCount || 0,
          shareCount: videoData.shareCount || 0,
          collectCount: videoData.collectCount || 0,
          playCount: videoData.playCount || 0,
          hashtags: videoData.hashtags || [],
          taskId: taskId || undefined,
          category: category || undefined,
        })
        .returning();
    }

    return this.mapVideoRecord(result[0]);
  }

  private mapVideoRecord(row: any): VideoRecord {
    return {
      id: row.id,
      awemeId: row.awemeId,
      title: row.title || '',
      authorUid: row.authorUid || '',
      authorNickname: row.authorNickname || '',
      authorAvatar: row.authorAvatar || '',
      followerCount: row.followerCount || 0,
      coverUrl: row.coverUrl || '',
      videoUrl: row.videoUrl || '',
      duration: row.duration || 0,
      publishTime: row.publishTime
        ? new Date(row.publishTime).toISOString()
        : undefined,
      diggCount: row.diggCount || 0,
      commentCount: row.commentCount || 0,
      shareCount: row.shareCount || 0,
      collectCount: row.collectCount || 0,
      playCount: row.playCount || 0,
      hashtags: row.hashtags || [],
      taskId: row.taskId || undefined,
      category: row.category || undefined,
      overallScore: row.overallScore ?? undefined,
      grade: row.grade || undefined,
      eightDimScores: row.eightDimScores || undefined,
      analyzeDetail: row.analyzeDetail || undefined,
      transcript: row.transcript || undefined,
      commentAnalysis: row.commentAnalysis || undefined,
      remakeSop: row.remakeSop || undefined,
      analyzeStatus: row.analyzeStatus || 'pending',
      analyzedAt: row.analyzedAt
        ? new Date(row.analyzedAt).toISOString()
        : undefined,
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : new Date().toISOString(),
    };
  }

  async getVideoDetail(awemeId: string): Promise<VideoRecord> {
    const existing = await this.db
      .select()
      .from(videos)
      .where(eq(videos.awemeId, awemeId));
    if (existing.length > 0) {
      return this.mapVideoRecord(existing[0]);
    }
    const detail = await this.fetchVideoDetail(awemeId);
    if (!detail) {
      throw new Error('视频不存在或获取失败');
    }
    return this.upsertVideo(detail, '', '');
  }

  async getRelatedVideos(
    awemeId: string,
    count = 20,
  ): Promise<VideoRecord[]> {
    try {
      const ttwid = await this.getTtwid();
      const queryString =
        `device_platform=webapp&aid=6383&channel=channel_pc_web` +
        `&aweme_id=${awemeId}&count=${count}`;
      const aBogus = this.aBogusService.sign(queryString);
      const url =
        `https://www.douyin.com/aweme/v1/web/aweme/related/?${queryString}` +
        (aBogus ? `&a_bogus=${encodeURIComponent(aBogus)}` : '');
      const resp = await fetch(url, {
        headers: {
          ...this.buildHeaders(ttwid),
          Accept: 'application/json',
        },
      });
      const data: any = await resp.json();
      const list = data?.aweme_list || [];
      const results: VideoRecord[] = [];
      for (const aweme of list) {
        const parsed = this.parseAweme(aweme);
        if (parsed.awemeId) {
          const saved = await this.upsertVideo(parsed, '', 'related');
          results.push(saved);
        }
      }
      return results;
    } catch (error) {
      this.logger.warn('获取相关视频失败: ' + String(error));
      return [];
    }
  }

  async getSuggest(keyword: string): Promise<SuggestItem[]> {
    try {
      const ttwid = await this.getTtwid();
      const url = `https://www.douyin.com/aweme/v1/web/search/sug/?device_platform=webapp&aid=6383&channel=channel_pc_web&keyword=${encodeURIComponent(keyword)}`;
      const resp = await fetch(url, {
        headers: this.buildHeaders(ttwid),
      });
      const data: any = await resp.json();
      const list = data?.sug_list || [];
      return list
        .filter((item: any) => item.content && item.content.trim())
        .map((item: any) => ({ keyword: item.content.trim(), type: item.type }));
    } catch (error) {
      this.logger.error('获取搜索建议失败: ' + JSON.stringify(error));
      return [];
    }
  }

  async getVideosByIds(ids: string[]): Promise<VideoRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(videos)
      .where(inArray(videos.id, ids));
    return rows.map((row: any) => this.mapVideoRecord(row));
  }

  /**
   * 图遍历深度爬取搜索：从种子视频出发，通过相关视频接口逐层扩展，
   * 过滤出与关键词匹配的视频，按点赞数排序后返回。
   */
  async crawlSearch(
    keyword: string,
    options: {
      count?: number;
      maxDepth?: number;
      onProgress?: (p: CrawlProgress) => void;
    } = {},
  ): Promise<CrawlSearchResult> {
    const { count = 20, maxDepth = 2, onProgress } = options;
    const trimmed = keyword.trim();

    const progress: CrawlProgress = {
      taskId: '',
      keyword: trimmed,
      status: 'crawling',
      crawledCount: 0,
      matchedCount: 0,
      currentDepth: 0,
      maxDepth,
      message: '开始爬取...',
    };

    const report = (msg: string): void => {
      progress.message = msg;
      if (onProgress) {
        try {
          onProgress({ ...progress });
        } catch {
          /* 忽略进度回调错误 */
        }
      }
    };

    try {
      // ---- 种子层 ----
      const dbResults = await this.searchVideosFromDb(trimmed, 5);
      let seedAwemeIds: string[] = [];

      if (dbResults.length >= 3) {
        seedAwemeIds = dbResults.slice(0, 3).map((v: VideoRecord) => v.awemeId);
        report(`种子层：从本地数据库获取 ${seedAwemeIds.length} 个种子视频`);
      } else {
        // 从 SEED_AWEME_IDS 中随机取 5 个或前 5 个
        const shuffled = [...SEED_AWEME_IDS]
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        seedAwemeIds = shuffled;
        report(`种子层：本地结果不足，使用 ${seedAwemeIds.length} 个预置种子视频`);
      }

      // 已收集的视频详情 Map：awemeId -> VideoRecord
      const collected = new Map<string, VideoRecord>();
      // 待扩展队列
      let currentLayerIds: string[] = [...seedAwemeIds];

      for (let depth = 1; depth <= maxDepth; depth += 1) {
        progress.currentDepth = depth;
        const nextLayerIds: string[] = [];
        let layerCrawled = 0;

        // 每层限制扩展数量，避免过多请求
        const expandIds = depth === 1
          ? currentLayerIds
          : currentLayerIds.slice(0, 10);

        for (const awemeId of expandIds) {
          try {
            const relatedCount = depth === 1 ? 15 : 10;
            const related = await this.getRelatedVideos(
              awemeId,
              relatedCount,
            );
            layerCrawled += related.length;

            for (const v of related) {
              if (!collected.has(v.awemeId)) {
                collected.set(v.awemeId, v);
                nextLayerIds.push(v.awemeId);
              }
            }
          } catch (error) {
            this.logger.warn(
              `深度${depth} 拉取相关视频失败 ${awemeId}: ${String(error)}`,
            );
          }
        }

        progress.crawledCount += layerCrawled;
        report(
          `第 ${depth} 层扩展完成，新增 ${nextLayerIds.length} 个视频，` +
            `累计收集 ${collected.size} 个`,
        );

        if (nextLayerIds.length === 0) break;

        // 下一层按点赞数排序，取点赞最高的进行扩展
        const nextWithDigg = nextLayerIds
          .map((id: string) => collected.get(id))
          .filter((v): v is VideoRecord => !!v)
          .sort(
            (a: VideoRecord, b: VideoRecord) => b.diggCount - a.diggCount,
          )
          .map((v: VideoRecord) => v.awemeId);

        currentLayerIds = nextWithDigg;
      }

      // ---- 关键词匹配过滤 ----
      progress.status = 'crawling';
      report('正在进行关键词匹配过滤...');

      const keywords = trimmed
        .toLowerCase()
        .split(/\s+/)
        .filter((k: string) => k.length > 0);

      const matched: VideoRecord[] = [];
      for (const v of collected.values()) {
        const text = (
          (v.title || '') +
          ' ' +
          (v.hashtags || []).join(' ')
        ).toLowerCase();
        const allMatch = keywords.every((kw: string) => text.includes(kw));
        if (allMatch) {
          matched.push(v);
        }
      }

      matched.sort((a: VideoRecord, b: VideoRecord) => b.diggCount - a.diggCount);
      progress.matchedCount = matched.length;
      report(`匹配完成，共 ${matched.length} 个相关视频`);

      // ---- 保存入库 ----
      if (matched.length > 0) {
        report(`正在保存 ${matched.length} 个视频到数据库...`);
        const saved: VideoRecord[] = [];
        for (const v of matched) {
          try {
            const record = await this.upsertVideo(v, '', trimmed);
            saved.push(record);
          } catch (error) {
            this.logger.warn(
              `保存视频失败 ${v.awemeId}: ${String(error)}`,
            );
          }
        }
        saved.sort(
          (a: VideoRecord, b: VideoRecord) => b.diggCount - a.diggCount,
        );
      }

      const topVideos = matched.slice(0, count);

      progress.status = 'completed';
      report('爬取完成');

      return {
        videos: topVideos,
        total: matched.length,
        crawled: collected.size,
        matched: matched.length,
      };
    } catch (error) {
      progress.status = 'failed';
      progress.message = '爬取失败: ' + String(error);
      this.logger.error('crawlSearch 失败: ' + String(error));
      if (onProgress) {
        try {
          onProgress({ ...progress });
        } catch {
          /* ignore */
        }
      }
      return {
        videos: [],
        total: 0,
        crawled: progress.crawledCount,
        matched: 0,
      };
    }
  }

  async listVideos(
    page: number,
    pageSize: number,
    filters: any = {},
    sortBy: 'digg' | 'created_at' = 'digg',
  ): Promise<{ items: VideoRecord[]; total: number }> {
    const conditions: SQL[] = [];
    if (filters.category) conditions.push(eq(videos.category, filters.category));
    if (filters.grade) conditions.push(eq(videos.grade, filters.grade));
    if (filters.analyzeStatus)
      conditions.push(eq(videos.analyzeStatus, filters.analyzeStatus));

    const orderColumn = sortBy === 'digg' ? videos.diggCount : videos.createdAt;

    const baseQuery = this.db.select().from(videos);
    const filteredQuery =
      conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;

    const all = await filteredQuery.orderBy(desc(orderColumn));
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: items.map((row: any) => this.mapVideoRecord(row)),
      total,
    };
  }
}
