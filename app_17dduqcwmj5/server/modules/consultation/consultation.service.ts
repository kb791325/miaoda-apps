import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CapabilityService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { faqKnowledgeBase, faqMiss } from '@server/database/schema';
import { toIsoOrNull } from '@server/src/common/utils/date';
import type {
  ConvertFaqMissResponse,
  CreateFaqResponse,
  FaqListItem,
  FaqListResponse,
  FaqMatchResponse,
  FaqMissListItem,
  FaqMissListResponse,
  UpdateFaqResponse,
} from '@shared/consultation';
import type {
  FaqIntentRecognitionOneInput,
  FaqIntentRecognitionOneOutput,
  KnowledgeBaseAnswerGenerationOneInput,
} from '@shared/plugin-types';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';

export interface FaqListQuery {
  category?: string;
  status?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  similarQuestion?: string;
}

export interface UpdateFaqInput {
  question?: string;
  answer?: string;
  category?: string;
  keywords?: string[];
  similarQuestion?: string;
  status?: string;
}

export interface FaqMissListQuery {
  status?: string;
  page: number;
  pageSize: number;
}

export interface ConvertFaqMissInput {
  answer: string;
  category: string;
  keywords?: string[];
}

const FAQ_STATUS_ENABLED = '启用';
const FAQ_STATUS_DISABLED = '停用';
const FAQ_MISS_STATUS_PENDING = 'pending';
const FAQ_MISS_STATUS_CONVERTED = 'converted';
const FALLBACK_MESSAGE =
  '抱歉，暂未找到匹配的答案。您可以联系招生老师进行人工咨询，我们会尽快补充该问题的标准答案。';

type FaqRow = typeof faqKnowledgeBase.$inferSelect;
type FaqMissRow = typeof faqMiss.$inferSelect;
type AnyRecord = Record<string, unknown>;

const INTENT_PLUGIN_ID = 'faq_intent_recognition_1';
const ANSWER_PLUGIN_ID = 'knowledge_base_answer_generation_1';
const INTENT_ACTION_KEY = 'textToJson';
const ANSWER_ACTION_KEY = 'searchSummary';
const PLUGIN_TIMEOUT_MS: number = 15_000;
const PLUGIN_TIMEOUT_SENTINEL: unique symbol = Symbol('pluginTimeout');

/** 返回在 PLUGIN_TIMEOUT_MS 后 resolve 为哨兵值的 Promise，用于与插件调用竞速 */
function pluginTimeoutPromise(): Promise<typeof PLUGIN_TIMEOUT_SENTINEL> {
  return new Promise<typeof PLUGIN_TIMEOUT_SENTINEL>(
    (resolve: (value: typeof PLUGIN_TIMEOUT_SENTINEL) => void) => {
      setTimeout(() => resolve(PLUGIN_TIMEOUT_SENTINEL), PLUGIN_TIMEOUT_MS);
    },
  );
}

function isIntentOutput(
  value: unknown,
): value is FaqIntentRecognitionOneOutput {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as AnyRecord).matchedNo === 'number';
}

function isAsyncIterable(value: unknown): value is AsyncIterable<AnyRecord> {
  if (!value || typeof value !== 'object') return false;
  const iterator: unknown = (
    value as { [Symbol.asyncIterator]?: unknown }
  )[Symbol.asyncIterator];
  return typeof iterator === 'function';
}

function normalizeStream(resultOrStream: unknown): AsyncIterable<AnyRecord> {
  if (isAsyncIterable(resultOrStream)) return resultOrStream;
  if (
    resultOrStream &&
    typeof resultOrStream === 'object' &&
    'output' in (resultOrStream as AnyRecord) &&
    isAsyncIterable((resultOrStream as AnyRecord).output)
  ) {
    return (resultOrStream as AnyRecord).output as AsyncIterable<AnyRecord>;
  }
  throw new Error('Invalid callStream result: no AsyncIterable stream');
}

function readSummaryChunk(chunk: AnyRecord): string {
  const keys: string[] = ['summary', 'content'];
  for (const key of keys) {
    const value: unknown = chunk[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

const HIGH_SIM_THRESHOLD = 0.5;
const RELATED_MIN_RELATIVE_RATIO = 0.4;
const TOP_FAQ_COUNT = 3;
const MIN_RELEVANCE_THRESHOLD = 0.1;

type GenerationMode = 'related' | 'offTopic';

const ANSWER_GUIDANCE: Record<GenerationMode, string> = {
  related:
    '知识库中没有与用户问题完全匹配的条目。请引用下方「知识库参考内容」中最相近的一条，并明确说明这是知识库中最接近的信息，简短补充后，主动引导用户留下联系方式或联系招生老师获取更准确的解答。',
  offTopic:
    '用户的问题与餐饮培训关联性很低。请礼貌说明本咨询专注于餐饮培训相关服务（课程、学费、开班时间、技能学习等），引导用户回到这些正题，不要引用参考内容，也不要编造任何信息。',
};

function toBigrams(text: string): Set<string> {
  const normalized: string = text.replace(/\s+/g, '');
  const grams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i += 1) {
    grams.add(normalized.slice(i, i + 2));
  }
  if (normalized.length === 1) grams.add(normalized);
  return grams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject(CapabilityService)
    private readonly capabilityService: CapabilityService,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private enabledCondition(): SQL | undefined {
    return or(
      isNull(faqKnowledgeBase.appStatus),
      ne(faqKnowledgeBase.appStatus, FAQ_STATUS_DISABLED),
    );
  }

  private containsBoth(input: string, target: string | null): boolean {
    if (!target) return false;
    return input.includes(target) || target.includes(input);
  }

  private toFaqListItem(row: FaqRow): FaqListItem {
    return {
      id: row.id,
      question: row.appQuestion ?? '',
      answer: row.standardAnswer ?? '',
      category: row.appCategory ?? '',
      keywords: row.appKeyword ?? [],
      similarQuestion: row.similarQuestion,
      status: row.appStatus ?? FAQ_STATUS_ENABLED,
      hitCount: row.hitCount ?? 0,
      updateTime: toIsoOrNull(row.updateTime),
      syncStatus: resolveDisplaySyncStatus(
        row.syncStatus,
        row.bitableRecordId,
        row.baseRecordId,
      ),
    };
  }

  async matchFaq(question: string): Promise<FaqMatchResponse> {
    const trimmed: string = question.trim();
    if (!trimmed) {
      throw new BadRequestException('question 不能为空');
    }
    const rows: FaqRow[] = await this.db
      .select()
      .from(faqKnowledgeBase)
      .where(this.enabledCondition());

    if (rows.length === 0) {
      return {
        matched: false,
        faqId: null,
        answer: null,
        matchedQuestion: null,
        relatedFaqs: [],
        fallbackMessage: FALLBACK_MESSAGE,
        answerSource: 'fallback',
      };
    }

    const scored: Array<{ row: FaqRow; score: number }> = rows.map(
      (row: FaqRow) => ({ row, score: this.computeScore(trimmed, row) }),
    );
    scored.sort(
      (
        a: { row: FaqRow; score: number },
        b: { row: FaqRow; score: number },
      ) => b.score - a.score,
    );

    const topScored: Array<{ row: FaqRow; score: number }> = scored.slice(
      0,
      TOP_FAQ_COUNT,
    );
    const topRow: FaqRow | undefined = topScored[0]?.row;
    const topScore: number = topScored[0]?.score ?? 0;
    const relatedScored: Array<{ row: FaqRow; score: number }> =
      topScored.filter(
        (item: { row: FaqRow; score: number }) =>
          item.score >= topScore * RELATED_MIN_RELATIVE_RATIO,
      );
    const relatedFaqs: FaqListItem[] = relatedScored
      .filter((item: { row: FaqRow; score: number }) => item.score > 0)
      .map((item: { row: FaqRow; score: number }) =>
        this.toFaqListItem(item.row),
      );

    const hasStandardAnswer = (row: FaqRow): boolean =>
      (row.standardAnswer ?? '').trim().length > 0;
    const textHit: FaqRow | undefined =
      topRow && topScore >= HIGH_SIM_THRESHOLD && hasStandardAnswer(topRow)
        ? topRow
        : undefined;
    const intentRow: FaqRow | undefined = textHit
      ? undefined
      : await this.recognizeByIntent(trimmed, rows);
    const intentScore: number = intentRow
      ? scored.find(
          (item: { row: FaqRow; score: number }) =>
            item.row.id === intentRow.id,
        )?.score ?? 0
      : 0;
    const directRow: FaqRow | undefined =
      textHit ??
      (intentRow &&
      intentScore >= MIN_RELEVANCE_THRESHOLD &&
      hasStandardAnswer(intentRow)
        ? intentRow
        : undefined);

    if (directRow) {
      await this.db
        .update(faqKnowledgeBase)
        .set({
          hitCount: sql`COALESCE(${faqKnowledgeBase.hitCount}, 0) + 1`,
          updateTime: new Date(),
        })
        .where(eq(faqKnowledgeBase.id, directRow.id));
      if (!relatedFaqs.some((faq: FaqListItem) => faq.id === directRow.id)) {
        relatedFaqs.unshift(this.toFaqListItem(directRow));
      }
      this.logger.log(
        `FAQ 命中，直接返回知识库标准答案（不经过 AI）：id=${directRow.id}, score=${(textHit ? topScore : intentScore).toFixed(2)}, question=${trimmed}`,
      );
      return {
        matched: true,
        faqId: directRow.id,
        answer: (directRow.standardAnswer ?? '').trim(),
        matchedQuestion: directRow.appQuestion ?? '',
        relatedFaqs,
        fallbackMessage: null,
        answerSource: 'direct',
      };
    }

    const isOffTopic: boolean =
      topScore < MIN_RELEVANCE_THRESHOLD && !intentRow;
    const answerMode: GenerationMode = isOffTopic ? 'offTopic' : 'related';
    if (answerMode === 'related') {
      const insertedMisses: Array<{ id: string }> = await this.db
        .insert(faqMiss)
        .values({ question: trimmed, status: FAQ_MISS_STATUS_PENDING })
        .returning({ id: faqMiss.id });
      const missId: string | undefined = insertedMisses[0]?.id;
      if (missId) {
        await this.bitableSyncService.syncRecord('faqMiss', missId);
      }
    }
    const generationRows: FaqRow[] = relatedScored.map(
      (item: { row: FaqRow; score: number }) => item.row,
    );
    if (
      intentRow &&
      !generationRows.some((row: FaqRow) => row.id === intentRow.id)
    ) {
      generationRows.unshift(intentRow);
    }
    const referenceRows: FaqRow[] =
      generationRows.length > 0
        ? generationRows
        : topScored.map(
            (item: { row: FaqRow; score: number }) => item.row,
          );
    const answer: string = await this.generateAnswer(
      trimmed,
      referenceRows,
      answerMode,
    );
    this.logger.log(
      `FAQ 未命中（模式=${answerMode}, topScore=${topScore.toFixed(2)}），基于知识库内容生成引导回复：${trimmed}`,
    );
    return {
      matched: false,
      faqId: null,
      answer,
      matchedQuestion: null,
      relatedFaqs,
      fallbackMessage: null,
      offTopic: isOffTopic,
      answerSource: isOffTopic ? 'offTopic' : 'generated',
    };
  }

  private computeScore(input: string, row: FaqRow): number {
    let score = 0;
    if (this.containsBoth(input, row.appQuestion)) score += 1.5;
    if (this.containsBoth(input, row.similarQuestion)) score += 0.9;
    const keywords: string[] = (row.appKeyword ?? []).filter(
      (kw: string | null): kw is string => !!kw,
    );
    const hitKeywords: number = keywords.filter((kw: string) =>
      input.includes(kw),
    ).length;
    score += Math.min(hitKeywords * 0.5, 1);
    const targetText: string = `${row.appQuestion ?? ''} ${row.similarQuestion ?? ''}`;
    score += jaccardSimilarity(toBigrams(input), toBigrams(targetText));
    return score;
  }

  private buildCandidates(rows: FaqRow[]): string[] {
    return rows.map((row: FaqRow, index: number) => {
      const keywords: string = (row.appKeyword ?? [])
        .filter((kw: string | null): kw is string => !!kw)
        .join('、');
      return `${index + 1}. 问题：${row.appQuestion ?? ''}；相似问：${
        row.similarQuestion ?? ''
      }；关键词：${keywords}`;
    });
  }

  private async recognizeByIntent(
    question: string,
    rows: FaqRow[],
  ): Promise<FaqRow | undefined> {
    if (rows.length === 0) return undefined;
    const input: FaqIntentRecognitionOneInput = {
      question,
      candidates: this.buildCandidates(rows),
    };
    try {
      const callPromise: Promise<unknown> = this.capabilityService
        .load(INTENT_PLUGIN_ID)
        .call(INTENT_ACTION_KEY, input);
      const raw: unknown = await Promise.race([
        callPromise,
        pluginTimeoutPromise(),
      ]);
      if (raw === PLUGIN_TIMEOUT_SENTINEL) {
        throw new Error('FAQ 意图识别插件调用超时');
      }
      if (!isIntentOutput(raw)) {
        this.logger.warn('FAQ 意图识别返回结构异常，降级关键词匹配');
        return undefined;
      }
      const matchedNo: number = raw.matchedNo;
      if (Number.isInteger(matchedNo) && matchedNo >= 1 && matchedNo <= rows.length) {
        this.logger.log(
          `FAQ 意图识别命中：matchedNo=${matchedNo}, intent=${raw.intent}`,
        );
        return rows[matchedNo - 1];
      }
      this.logger.log(`FAQ 意图识别未命中：intent=${raw.intent}`);
      return undefined;
    } catch (error) {
      this.logger.warn(
        `FAQ 意图识别插件异常，降级关键词匹配：${JSON.stringify({
          pluginInstanceId: INTENT_PLUGIN_ID,
          actionKey: INTENT_ACTION_KEY,
          outputMode: 'unary',
          inputKeys: Object.keys(input),
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      );
      return undefined;
    }
  }

  private async generateAnswer(
    question: string,
    topFaqs: FaqRow[],
    mode: GenerationMode,
  ): Promise<string> {
    const fallback: string = FALLBACK_MESSAGE;
    const searchResults: string[] = topFaqs.map(
      (row: FaqRow) =>
        `问题：${row.appQuestion ?? ''}；分类：${row.appCategory ?? ''}；标准答案：${row.standardAnswer ?? ''}`,
    );
    const guidance: string = ANSWER_GUIDANCE[mode];
    const input: KnowledgeBaseAnswerGenerationOneInput = {
      query: `${guidance}\n用户问题：${question}`,
      search_results: searchResults,
    };
    try {
      const streamPromise: Promise<string> = (async (): Promise<string> => {
        const streamResult: unknown = await this.capabilityService
          .load(ANSWER_PLUGIN_ID)
          .callStream(ANSWER_ACTION_KEY, input);
        const stream: AsyncIterable<AnyRecord> = normalizeStream(streamResult);
        let fullText: string = '';
        for await (const chunk of stream) {
          fullText += readSummaryChunk(chunk);
        }
        return fullText.trim();
      })();
      const raceResult: string | typeof PLUGIN_TIMEOUT_SENTINEL =
        await Promise.race([streamPromise, pluginTimeoutPromise()]);
      if (raceResult === PLUGIN_TIMEOUT_SENTINEL) {
        throw new Error('FAQ 答复生成插件调用超时');
      }
      const answer: string = raceResult;
      if (!answer) {
        this.logger.warn('FAQ 答复生成结果为空，降级标准答案');
        return fallback;
      }
      return answer;
    } catch (error) {
      this.logger.warn(
        `FAQ 答复生成插件异常，降级标准答案：${JSON.stringify({
          pluginInstanceId: ANSWER_PLUGIN_ID,
          actionKey: ANSWER_ACTION_KEY,
          outputMode: 'stream',
          inputKeys: Object.keys(input),
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      );
      return fallback;
    }
  }

  async listFaqs(query: FaqListQuery): Promise<FaqListResponse> {
    const conditions: SQL[] = [];
    if (query.category) {
      conditions.push(eq(faqKnowledgeBase.appCategory, query.category));
    }
    if (query.status === FAQ_STATUS_DISABLED) {
      conditions.push(eq(faqKnowledgeBase.appStatus, FAQ_STATUS_DISABLED));
    } else if (query.status === FAQ_STATUS_ENABLED) {
      const enabled: SQL | undefined = this.enabledCondition();
      if (enabled) conditions.push(enabled);
    }
    if (query.keyword) {
      const pattern: string = `%${query.keyword}%`;
      conditions.push(
        sql`(${faqKnowledgeBase.appQuestion} ILIKE ${pattern} OR ${faqKnowledgeBase.appKeyword}::text ILIKE ${pattern})`,
      );
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: FaqRow[] = await this.db
      .select()
      .from(faqKnowledgeBase)
      .where(whereClause)
      .orderBy(
        sql`${faqKnowledgeBase.hitCount} DESC NULLS LAST`,
        sql`${faqKnowledgeBase.updateTime} DESC NULLS LAST`,
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(faqKnowledgeBase)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    this.logger.log(
      `FAQ 列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    return {
      items: rows.map((row: FaqRow) => this.toFaqListItem(row)),
      total,
    };
  }

  async createFaq(input: CreateFaqInput): Promise<CreateFaqResponse> {
    if (!input.question.trim() || !input.answer.trim()) {
      throw new BadRequestException('问题与标准答案不能为空');
    }
    const inserted: Array<{ id: string }> = await this.db
      .insert(faqKnowledgeBase)
      .values({
        appQuestion: input.question.trim(),
        standardAnswer: input.answer,
        appCategory: input.category,
        appKeyword: input.keywords ?? [],
        similarQuestion: input.similarQuestion ?? null,
        appStatus: FAQ_STATUS_ENABLED,
        updateTime: new Date(),
        hitCount: 0,
      })
      .returning({ id: faqKnowledgeBase.id });
    this.logger.log(`新增 FAQ：id=${inserted[0].id}`);
    await this.bitableSyncService.syncRecord('faq', inserted[0].id);
    return { id: inserted[0].id };
  }

  async updateFaq(id: string, input: UpdateFaqInput): Promise<UpdateFaqResponse> {
    const patch: Partial<typeof faqKnowledgeBase.$inferInsert> = {};
    if (input.question !== undefined) patch.appQuestion = input.question;
    if (input.answer !== undefined) patch.standardAnswer = input.answer;
    if (input.category !== undefined) patch.appCategory = input.category;
    if (input.keywords !== undefined) patch.appKeyword = input.keywords;
    if (input.similarQuestion !== undefined) {
      patch.similarQuestion = input.similarQuestion;
    }
    if (input.status !== undefined) patch.appStatus = input.status;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updateTime = new Date();

    const updated: Array<{ id: string }> = await this.db
      .update(faqKnowledgeBase)
      .set(patch)
      .where(eq(faqKnowledgeBase.id, id))
      .returning({ id: faqKnowledgeBase.id });
    if (updated.length === 0) {
      throw new NotFoundException(`FAQ ${id} 不存在`);
    }
    this.logger.log(`更新 FAQ：id=${id}`);
    await this.bitableSyncService.syncRecord('faq', id);
    return { id };
  }

  async listFaqMisses(query: FaqMissListQuery): Promise<FaqMissListResponse> {
    const conditions: SQL[] = [];
    if (query.status) {
      conditions.push(eq(faqMiss.status, query.status));
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: FaqMissRow[] = await this.db
      .select()
      .from(faqMiss)
      .where(whereClause)
      .orderBy(desc(faqMiss.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(faqMiss)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const items: FaqMissListItem[] = rows.map((row: FaqMissRow) => ({
      id: row.id,
      question: row.question,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      syncStatus: row.syncStatus,
    }));

    this.logger.log(
      `未命中问题列表：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    return { items, total };
  }

  async convertFaqMiss(
    id: string,
    input: ConvertFaqMissInput,
  ): Promise<ConvertFaqMissResponse> {
    if (!input.answer.trim() || !input.category.trim()) {
      throw new BadRequestException('标准答案与分类不能为空');
    }
    const result: ConvertFaqMissResponse = await this.db.transaction(async (tx) => {
      const missRows: FaqMissRow[] = await tx
        .select()
        .from(faqMiss)
        .where(eq(faqMiss.id, id));
      const miss: FaqMissRow | undefined = missRows[0];
      if (!miss) {
        throw new NotFoundException(`未命中问题 ${id} 不存在`);
      }
      if (miss.status === FAQ_MISS_STATUS_CONVERTED) {
        throw new ConflictException('该问题已转换为常见问题');
      }

      const inserted: Array<{ id: string }> = await tx
        .insert(faqKnowledgeBase)
        .values({
          appQuestion: miss.question,
          standardAnswer: input.answer,
          appCategory: input.category,
          appKeyword: input.keywords ?? [],
          appStatus: FAQ_STATUS_ENABLED,
          updateTime: new Date(),
          hitCount: 0,
        })
        .returning({ id: faqKnowledgeBase.id });

      const updatedMiss: Array<{ id: string }> = await tx
        .update(faqMiss)
        .set({ status: FAQ_MISS_STATUS_CONVERTED })
        .where(eq(faqMiss.id, id))
        .returning({ id: faqMiss.id });
      if (updatedMiss.length === 0) {
        throw new NotFoundException(`未命中问题 ${id} 不存在`);
      }

      this.logger.log(
        `未命中问题转换完成：missId=${id}, faqId=${inserted[0].id}`,
      );
      return { faqId: inserted[0].id };
    });
    await this.bitableSyncService.syncRecord('faqMiss', id);
    return result;
  }
}
