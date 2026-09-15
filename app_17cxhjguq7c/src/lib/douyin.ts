// EXPORTS: fetchDouyinVideoInfo, extractDouyinUrl, extractDouyinKeywords, DouyinVideoInfo
import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';

import type {
  DouyinVideoParsingProxyBackupEndpointOneOutput,
  DouyinVideoParsingProxyFallbackCrawlerOneOutput,
  DouyinVideoParsingProxyOneOutput,
} from '@shared/plugin-types';

export interface DouyinVideoInfo {
  videoTitle: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  /** 收藏数（用于内部校验，不强制展示） */
  collects?: number;
  /** 数据可信度：high=官方页面statistics / mid=第三方API校准后 / low=字段疑似不对应 */
  confidence: 'high' | 'mid' | 'low';
  /** 调试信息：各链路状态与原始数据 */
  debug?: {
    /** 成功的端点名称 */
    successfulEndpoint: string;
    /** 各端点尝试结果 */
    endpointResults: Array<{
      label: string;
      status: 'success' | 'failed';
      errorType?: string;
      errorDetail?: string;
      durationMs?: number;
    }>;
    /** 原始 JSON 响应（成功端点） */
    rawJson?: string;
    /** 字段路径映射：每个最终值来自哪个 JSON 路径 */
    fieldPaths: {
      videoTitle?: string;
      author?: string;
      likes?: string;
      comments?: string;
      shares?: string;
      collects?: string;
    };
    /** 所有数值字段（带完整路径和值），用于调试面板展示与智能推断 */
    allNumericFields?: Array<{ path: string; value: number; key: string }>;
    /** 校准说明 */
    calibrationReason?: string;
    /** 链接提取元信息：清洗后的URL、使用的解析方式、原始输入前100字符 */
    urlExtraction?: {
      cleanUrl: string;
      method: 'standard-short' | 'standard-long' | 'standard-ies' | 'kouling-token' | 'kouling-fallback' | 'none';
      rawInputPreview: string;
    };
    /** 数据来源：douyin_page=抖音页面直爬(高可信) / third_party_api=第三方解析API(中可信) / ai_estimate=AI估算(低可信) */
    source?: 'douyin_page' | 'third_party_api' | 'ai_estimate';
  };
}

/**
 * 解析失败错误类型，用于给用户更精确的错误提示
 */
export type ParseErrorType =
  | 'network_timeout'       // 请求超时
  | 'redirect_failed'       // 短链重定向失败
  | 'api_error'             // 第三方 API 异常（5xx / 限流 / 空响应）
  | 'api_empty_data'        // API 返回了 200 但无有效数据
  | 'parse_json_failed'     // 响应内容解析不出 JSON
  | 'unknown';              // 其他未知错误

export class DouyinParseError extends Error {
  readonly type: ParseErrorType;
  readonly detail?: string;
  constructor(type: ParseErrorType, detail?: string) {
    super(`[${type}] ${detail || ''}`);
    this.type = type;
    this.detail = detail;
    this.name = 'DouyinParseError';
  }
}

/** 链接提取方式枚举 */
export type UrlExtractionMethod =
  | 'standard-short'
  | 'standard-long'
  | 'standard-ies'
  | 'kouling-token'
  | 'kouling-fallback'
  | 'none';

/**
 * 从用户粘贴的分享文本中正则提取纯抖音链接（结构化版本）。
 * 返回清洗后的 URL + 使用的解析方式，用于调试面板展示与问题排查。
 *
 * 支持格式（按优先级从高到低）：
 *   - 标准短链: https://v.douyin.com/xxxxx/  （短码含字母/数字/下划线/连字符）
 *   - 长链: https://www.douyin.com/video/123456  （带 videoId）
 *   - 分享链: https://www.iesdouyin.com/share/video/xxx
 *   - 抖音口令: 包含 "xx:/ xxx" 形式的短码，自动拼接为标准短链
 *
 * 🔴 关键修复：短链正则字符集包含 `_`，因为抖音短码如 `wncQ_9zYen4` 包含下划线。
 */
export function extractDouyinUrlDetail(raw: string): { cleanUrl: string; method: UrlExtractionMethod } {
  if (!raw || typeof raw !== 'string') return { cleanUrl: '', method: 'none' };

  // —— 第一优先级：标准 URL（短链 / 长链 / 分享链）——
  const standardPatterns: Array<{ re: RegExp; method: UrlExtractionMethod }> = [
    // 标准短链：短码允许字母/数字/下划线/连字符（抖音短码含下划线是常见情况）
    { re: /https?:\/\/v\.douyin\.com\/[A-Za-z0-9_\-]+\/?/i, method: 'standard-short' },
    { re: /https?:\/\/www\.douyin\.com\/video\/\d+[^\s"'<>]*/i, method: 'standard-long' },
    { re: /https?:\/\/www\.iesdouyin\.com\/share\/video\/\d+[^\s"'<>]*/i, method: 'standard-ies' },
  ];
  for (const { re, method } of standardPatterns) {
    const match = raw.match(re);
    if (match) return { cleanUrl: match[0], method };
  }

  // —— 第二优先级：抖音口令短码格式 ——
  // 形如 "6.71 xfo:/ 01/25 L@J.ic :2pm ..." 或 "6.71 xSY:/ xxx"
  // 提取 "字母组合:/" 后的短码部分，拼接为标准短链 https://v.douyin.com/{短码}/
  const tokenPatterns = [
    // 经典格式: xfo:/ xxxxxxx（字母+数字+下划线短码）
    /([A-Za-z]{2,6}):\/\s*([A-Za-z0-9_\-]{4,})/,
    // 新格式: 01/25 L@J.ic :2pm 这类 —— 匹配 "字母:/" 后跟任意非空白非中文字符串
    /([A-Za-z]{2,6}):\/\s*([^\s\u4e00-\u9fa5]{4,})/,
    // 抖音 App 新口令格式: "xxxxx【抖音】...短码:xxxxx" —— 从 "短码:" 后提取
    /短码[:：]\s*([A-Za-z0-9_\-/.@]{4,})/,
  ];

  for (const re of tokenPatterns) {
    const m = raw.match(re);
    if (m) {
      // 取最后一个捕获组作为短码（兼容不同模式的捕获组数量）
      const shortCode = m[m.length - 1].trim();
      // 过滤掉明显不是短码的内容（纯数字、纯符号等）
      if (shortCode.length >= 4 && /[A-Za-z]/.test(shortCode)) {
        return { cleanUrl: `https://v.douyin.com/${shortCode}/`, method: 'kouling-token' };
      }
    }
  }

  // 兜底：从整段文本中尝试找 6-12 位的字母数字组合（含一个大写+小写特征的抖音短码）
  // 这种短码通常出现在口令中间，周围有中文或空格
  const fallbackMatch = raw.match(/\b([A-Za-z][A-Za-z0-9_]{5,11})\b/);
  if (fallbackMatch) {
    const candidate = fallbackMatch[1];
    // 抖音短码特征：同时有大写和小写字母（或混合字母数字）
    if (/[a-z]/.test(candidate) && /[A-Z]/.test(candidate)) {
      return { cleanUrl: `https://v.douyin.com/${candidate}/`, method: 'kouling-fallback' };
    }
  }

  return { cleanUrl: '', method: 'none' };
}

/**
 * 从用户粘贴的分享文本中正则提取纯抖音链接（简化版本，向后兼容）。
 * 返回第一个匹配到的干净 URL；未匹配返回空字符串。
 */
export function extractDouyinUrl(raw: string): string {
  return extractDouyinUrlDetail(raw).cleanUrl;
}

/**
 * 从抖音分享口令/文本中提取对 AI 拆解有帮助的关键词：
 *   - 标题/描述部分（去除数字、emoji、特殊符号后的主体文字）
 *   - 话题标签（# 开头的关键词）
 * 返回结构化的关键词文本，可作为 video_content 喂给 AI 提升拆解质量。
 */
export function extractDouyinKeywords(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const text = raw.trim();
  // 提取话题标签
  const tags: string[] = [];
  const tagRegex = /#\s*([^#\s\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(text)) !== null) {
    const tag = m[1].trim();
    if (tag && tag.length <= 20) tags.push(tag);
  }
  // 提取描述性文本：去掉 URL、口令短码、数字、emoji，保留中文/英文单词
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[A-Za-z]{2,6}:\/\s*[A-Za-z0-9]+/g, '')
    .replace(/\d+(?:\.\d+)?\s*[\u4e00-\u9fa5]{0,2}(?:[，。、！？；：])?/g, ' ')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[!@#$%^&*()+=<>?\[\]{}|\\/~`_—\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts: string[] = [];
  if (cleaned.length > 2) parts.push(`视频描述：${cleaned}`);
  if (tags.length > 0) parts.push(`话题标签：${tags.join('、')}`);
  return parts.join('\n');
}

// 解析代理端点列表：按优先级依次尝试
// 解析策略：抖音官方页面直爬优先（数据结构最准确，statistics.digg_count 是官方真实点赞字段），第三方 API 作为备用
//   1. 兜底爬虫（直接爬抖音分享页 HTML → RENDER_DATA → aweme_detail.statistics）
//   2. 主端点（api.douyin.wtf JSON API，快但字段可能混乱）
//   3. 备用端点（douyin.wtf JSON API —— 同服务商不同子域，作为 DNS/CDN 级容错）
//
// 字段映射说明：
//   - 抖音官方 API 真实字段：digg_count(点赞) / comment_count(评论) / share_count(分享) / collect_count(收藏)
//   - 第三方解析 API 可能返回：like_count / total_share_count / forward_count 等变体
//   - 点赞候选按优先级排列，且会做合理性校验（点赞数通常 > 收藏数 > 分享数 > 评论数）
interface ParserConfig {
  pluginId: string;
  label: string;
  source: 'douyin_page' | 'third_party_api';
  inputKey: string;
  fieldMap: {
    videoTitle: string[];
    author: string[];
    likes: string[];
    comments: string[];
    shares: string[];
    collects: string[];
  };
}

const PARSERS: ParserConfig[] = [
  {
    pluginId: 'douyin_video_parsing_proxy_fallback_crawler_1',
    label: '抖音页面直爬(首选)',
    source: 'douyin_page',
    inputKey: 'douyin_share_url',
    fieldMap: {
      videoTitle: ['desc', 'video_title', 'title', 'videoTitle', 'name'],
      author: ['author.nickname', 'author_info.nickname', 'author_nickname', 'author', 'authorName', 'nickname', 'nick'],
      likes: [
        'statistics.digg_count', 'stats.digg_count',
        'aweme_statistics.digg_count', 'item_info.statistics.digg_count',
        'digg_count', 'diggCount', 'digg',
        'statistics.like_count', 'stats.like_count',
        'like_count', 'likeCount', 'likes', 'total_like_count',
        'aweme_statistics.like_count', 'item_info.like_count',
      ],
      comments: [
        'statistics.comment_count', 'stats.comment_count',
        'aweme_statistics.comment_count', 'item_info.statistics.comment_count',
        'comment_count', 'commentCount', 'comments', 'total_comment_count',
      ],
      shares: [
        'statistics.share_count', 'stats.share_count',
        'aweme_statistics.share_count', 'item_info.statistics.share_count',
        'share_count', 'shareCount', 'shares', 'total_share_count', 'forward_count',
      ],
      collects: [
        'statistics.collect_count', 'stats.collect_count',
        'aweme_statistics.collect_count', 'item_info.statistics.collect_count',
        'collect_count', 'collectCount', 'collects', 'favorite_count', 'favoriting_count',
        'total_collect_count',
      ],
    },
  },
  {
    pluginId: 'douyin_video_parsing_proxy_1',
    label: '备用解析-api.douyin.wtf',
    source: 'third_party_api',
    inputKey: 'douyin_video_url',
    fieldMap: {
      videoTitle: ['video_title', 'title', 'videoTitle', 'name', 'desc'],
      author: ['author_nickname', 'author', 'authorName', 'nickname', 'nick', 'author_info.nickname', 'author.nickname'],
      likes: [
        'digg_count', 'diggCount', 'digg',
        'like_count', 'likeCount', 'likes', 'total_like_count',
        'statistics.digg_count', 'statistics.like_count', 'stats.digg_count',
        'aweme_statistics.digg_count', 'item_info.digg_count',
        'data.digg_count', 'data.statistics.digg_count', 'data.like_count',
        'data.statistics.like_count', 'data.aweme_statistics.digg_count',
        'item.statistics.digg_count', 'item.digg_count', 'aweme.digg_count',
        'aweme_info.statistics.digg_count', 'aweme_info.digg_count',
        'result.digg_count', 'result.statistics.digg_count',
      ],
      comments: [
        'comment_count', 'commentCount', 'comments', 'total_comment_count',
        'statistics.comment_count', 'stats.comment_count',
        'aweme_statistics.comment_count', 'item_info.comment_count',
        'data.comment_count', 'data.statistics.comment_count',
        'data.aweme_statistics.comment_count', 'item.statistics.comment_count',
        'aweme.comment_count', 'aweme_info.statistics.comment_count',
        'result.comment_count', 'result.statistics.comment_count',
      ],
      shares: [
        'share_count', 'shareCount', 'shares', 'total_share_count', 'forward_count',
        'statistics.share_count', 'stats.share_count',
        'aweme_statistics.share_count', 'item_info.share_count',
        'data.share_count', 'data.statistics.share_count',
        'data.aweme_statistics.share_count', 'item.statistics.share_count',
        'aweme.share_count', 'aweme_info.statistics.share_count',
        'result.share_count', 'result.statistics.share_count',
      ],
      collects: [
        'collect_count', 'collectCount', 'collects', 'favorite_count', 'favoriting_count',
        'total_collect_count',
        'statistics.collect_count', 'stats.collect_count',
        'aweme_statistics.collect_count', 'item_info.collect_count',
        'data.collect_count', 'data.statistics.collect_count',
        'data.aweme_statistics.collect_count', 'item.statistics.collect_count',
        'aweme.collect_count', 'aweme_info.statistics.collect_count',
        'result.collect_count', 'result.statistics.collect_count',
      ],
    },
  },
  {
    pluginId: 'douyin_video_parsing_proxy_backup_endpoint_1',
    label: '备用解析-douyin.wtf',
    source: 'third_party_api',
    inputKey: 'douyin_video_url',
    fieldMap: {
      videoTitle: ['title', 'video_title', 'videoTitle', 'name', 'desc'],
      author: ['author_nickname', 'author', 'authorName', 'nickname', 'nick', 'author_info.nickname', 'author.nickname'],
      likes: [
        'digg_count', 'diggCount', 'digg',
        'like_count', 'likeCount', 'likes', 'total_like_count',
        'statistics.digg_count', 'statistics.like_count', 'stats.digg_count',
        'aweme_statistics.digg_count', 'item_info.digg_count',
      ],
      comments: [
        'comment_count', 'commentCount', 'comments', 'total_comment_count',
        'statistics.comment_count', 'stats.comment_count',
        'aweme_statistics.comment_count', 'item_info.comment_count',
      ],
      shares: [
        'share_count', 'shareCount', 'shares', 'total_share_count', 'forward_count',
        'statistics.share_count', 'stats.share_count',
        'aweme_statistics.share_count', 'item_info.share_count',
      ],
      collects: [
        'collect_count', 'collectCount', 'collects', 'favorite_count', 'favoriting_count',
        'total_collect_count',
        'statistics.collect_count', 'stats.collect_count',
        'aweme_statistics.collect_count', 'item_info.collect_count',
      ],
    },
  },
];

// 每个端点最大重试次数（不含首次请求）+ 重试间隔(ms)
const MAX_RETRIES_PER_ENDPOINT = 2;
const RETRY_INTERVAL_MS = 2000;

function pickNumber(...values: unknown[]): number {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return 0;
}

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
  }
  return '';
}

/**
 * 从任意 JSON 对象中按路径取字段值（支持 "a.b.c" 点路径）
 */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * 深度递归查找对象中指定 key 的值
 * 用于在复杂嵌套的 RENDER_DATA 中定位 aweme_detail / aweme 等关键对象
 */
function deepFindByKey(obj: unknown, targetKey: string, depth = 0): unknown {
  if (depth > 12) return null;
  if (!obj || typeof obj !== 'object') return null;

  const o = obj as Record<string, unknown>;
  if (targetKey in o) return o[targetKey];

  for (const key of Object.keys(o)) {
    const val = o[key];
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        for (const item of val) {
          const found = deepFindByKey(item, targetKey, depth + 1);
          if (found !== null) return found;
        }
      } else {
        const found = deepFindByKey(val, targetKey, depth + 1);
        if (found !== null) return found;
      }
    }
  }
  return null;
}

/**
 * 从 JSON 对象中按多个候选字段名（支持点路径）提取第一个有效值
 * 支持深层嵌套路径（如 statistics.digg_count）
 * 返回 { value, matchedPath }，matchedPath 为实际命中的字段路径
 */
function pickFromObject(
  obj: Record<string, unknown>,
  candidates: string[],
): { value: unknown; matchedPath: string } | null {
  for (const key of candidates) {
    // 先尝试直接取（顶层字段）
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      const v = obj[key];
      if (typeof v === 'string' ? v.trim() !== '' : true) return { value: v, matchedPath: key };
    }
    // 再尝试点路径（嵌套字段）
    const v = getByPath(obj, key);
    if (v !== null && v !== undefined) {
      if (typeof v === 'string' ? v.trim() !== '' : true) return { value: v, matchedPath: key };
    }
  }
  return null;
}

/**
 * 打印 JSON 对象中所有数值字段（用于调试解析结果）
 * 只在开发/排查时调用，返回供 logger 输出的摘要字符串
 */
function dumpNumericFields(obj: unknown, maxDepth = 4, prefix = ''): string {
  if (!obj || typeof obj !== 'object') return '';
  const lines: string[] = [];
  const o = obj as Record<string, unknown>;
  for (const [key, val] of Object.entries(o)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'number') {
      lines.push(`${fullKey}=${val}`);
    } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
      lines.push(`${fullKey}=${val}(字符串数字)`);
    } else if (val && typeof val === 'object' && maxDepth > 0) {
      if (Array.isArray(val)) {
        if (val.length > 0 && typeof val[0] === 'object') {
          lines.push(dumpNumericFields(val[0], maxDepth - 1, `${fullKey}[0]`));
        }
      } else {
        lines.push(dumpNumericFields(val, maxDepth - 1, fullKey));
      }
    }
  }
  return lines.filter(Boolean).join(', ');
}

/**
 * 深度收集 JSON 对象中所有数值字段（带完整路径），用于调试与智能映射
 */
function collectAllNumericFields(
  obj: unknown,
  maxDepth = 10,
  prefix = '',
  result: Array<{ path: string; value: number; key: string }> = [],
): Array<{ path: string; value: number; key: string }> {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return result;
  const o = obj as Record<string, unknown>;
  for (const [key, val] of Object.entries(o)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'number' && Number.isFinite(val)) {
      result.push({ path: fullPath, value: val, key });
    } else if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
      result.push({ path: fullPath, value: Number(val), key });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      collectAllNumericFields(val, maxDepth - 1, fullPath, result);
    } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      collectAllNumericFields(val[0], maxDepth - 1, `${fullPath}[0]`, result);
    }
  }
  return result;
}

/**
 * 互动数据候选分类：根据字段名语义归类到 点赞 / 评论 / 分享 / 收藏
 * 每个类别收集多个候选（按路径），后续按数值大小和合理性择优
 */
interface InteractionCandidates {
  likeCandidates: Array<{ path: string; value: number }>;
  commentCandidates: Array<{ path: string; value: number }>;
  shareCandidates: Array<{ path: string; value: number }>;
  collectCandidates: Array<{ path: string; value: number }>;
}

function classifyInteractionFields(
  allFields: Array<{ path: string; value: number; key: string }>,
): InteractionCandidates {
  const likeCandidates: Array<{ path: string; value: number }> = [];
  const commentCandidates: Array<{ path: string; value: number }> = [];
  const shareCandidates: Array<{ path: string; value: number }> = [];
  const collectCandidates: Array<{ path: string; value: number }> = [];

  // 排除明显不是互动数据的字段（key 精确匹配或前后缀，不干扰 path 中间路径）
  const excludePatterns = [
    'id', 'aweme_id', 'item_id', 'uid', 'user_id',
    'time', 'date', 'timestamp', 'create_time', 'update_time', 'publish_time',
    'play', 'play_count', 'view', 'view_count', 'watch', 'duration',
    'height', 'width', 'size', 'ratio', 'rate', 'version',
    'code', 'status', 'type', 'page', 'count_all', 'follow', 'follower',
  ];

  for (const field of allFields) {
    const keyLower = field.key.toLowerCase();

    // 排除非互动类字段（key 精确匹配或前缀后缀，不在 path 中间做匹配）
    const isExcluded = excludePatterns.some(
      (p) => keyLower === p || keyLower.startsWith(p + '_') || keyLower.endsWith('_' + p),
    );
    const isComment = keyLower.includes('comment');
    const isShare = keyLower.includes('share') || keyLower.includes('forward');
    if (isExcluded && !isComment && !isShare) continue;

    // 收藏类（优先级高，避免被 like 类误归类）
    if (
      keyLower.includes('collect') ||
      keyLower.includes('favorite') ||
      keyLower.includes('favourit') ||
      keyLower === 'favoriting_count'
    ) {
      collectCandidates.push({ path: field.path, value: field.value });
      continue;
    }

    // 评论类
    if (keyLower.includes('comment')) {
      commentCandidates.push({ path: field.path, value: field.value });
      continue;
    }

    // 分享类
    if (keyLower.includes('share') || keyLower.includes('forward')) {
      shareCandidates.push({ path: field.path, value: field.value });
      continue;
    }

    // 点赞类（digg 是抖音官方字段，like 可能被第三方API误用为收藏）
  if (
    keyLower.includes('digg') ||
    keyLower === 'like_count' ||
    keyLower === 'likes' ||
    keyLower === 'likecount' ||
    keyLower === 'total_like_count' ||
    keyLower === 'diggcount' ||
    keyLower.endsWith('_digg_count') ||
    keyLower.endsWith('_like_count') ||
    keyLower === 'like_num' ||
    keyLower === 'digg_num' ||
    keyLower === 'praise_count' ||
    keyLower === 'good_count'
  ) {
    likeCandidates.push({ path: field.path, value: field.value });
    continue;
  }

  // 未知数值字段：如果键名本身不明确但值很大（>1000），也加入 like 候选（校准阶段靠大小推断）
  // 这些是兜底候选，标记为 unclassified，校准阶段作为补充
  // （不直接 push 到 likeCandidates，避免污染语义分类；在校准函数中使用全量数值字段）
  }

  // 按数值降序排列，优先尝试大的值
  likeCandidates.sort((a, b) => b.value - a.value);
  commentCandidates.sort((a, b) => b.value - a.value);
  shareCandidates.sort((a, b) => b.value - a.value);
  collectCandidates.sort((a, b) => b.value - a.value);

  return { likeCandidates, commentCandidates, shareCandidates, collectCandidates };
}

/**
 * 智能校准互动数据（基于数值大小 + 字段名语义的混合策略）。
 *
 * 抖音互动数据的经验规律（绝大多数视频）：
 *   点赞数 > 收藏数 > 分享数 > 评论数
 *   （评论数通常是四者中最小的，且与其他三个有数量级差距）
 *
 * 校准策略：
 *   1. 先从全量数值字段中筛选「互动类」候选（排除播放量/id/时间等明显非互动字段）
 *   2. 按数值大小排序，最大的判为点赞，最小的判为评论（基于量纲差异）
 *   3. 中间两个用字段名语义区分分享 vs 收藏
 *   4. 如果字段名语义已经能准确匹配且数值合理，就不强行重排
 *
 * 返回校准后的 { likes, comments, shares, collects }
 */
function calibrateInteractionData(
  rawLikes: number,
  rawComments: number,
  rawShares: number,
  rawCollects: number,
  candidates: InteractionCandidates,
  allNumericFields: Array<{ path: string; value: number; key: string }>,
): { likes: number; comments: number; shares: number; collects: number; changed: boolean; reason: string } {
  let likes = rawLikes;
  let comments = rawComments;
  let shares = rawShares;
  let collects = rawCollects;
  let changed = false;
  const reasons: string[] = [];

  // ---- 第一步：从全量数值字段中筛选互动类候选 ----
  // 规则：排除 id/时间/播放量/宽高/版本等明显非互动字段
  const interactionNumbers = allNumericFields.filter((f) => {
    const k = f.key.toLowerCase();
    const excludePrefixes = [
      'id', 'aweme_id', 'item_id', 'uid', 'user_id', 'author_id',
      'time', 'date', 'timestamp', 'create_time', 'update_time', 'publish_time',
      'play', 'play_count', 'view', 'view_count', 'watch', 'duration',
      'height', 'width', 'size', 'ratio', 'rate', 'version',
      'code', 'status', 'type', 'page', 'follow', 'follower', 'following',
      'total', 'count_all', 'aweme_count', 'video_count',
      'position', 'offset', 'limit', 'page_count', 'total_count',
      'schema_type', 'user_count', 'music_id', 'challenge_id',
    ];
    // 如果 key 精确匹配或前后缀匹配某个排除项，且不是 comment/share/collect/digg/like 等互动字段
    const isExcluded = excludePrefixes.some(
      (p) => k === p || k.startsWith(p + '_') || k.endsWith('_' + p),
    );
    const isInteraction = ['comment', 'share', 'collect', 'digg', 'like', 'forward', 'favorite', 'favourit', 'praise', 'good'].some(
      (w) => k.includes(w),
    );
    // 值必须 > 0 且是合理范围（排除毫秒级时间戳等）
    if (f.value <= 0) return false;
    if (f.value > 1_000_000_000) return false; // 10亿以上大概率是时间戳或id
    if (isExcluded && !isInteraction) return false;
    return true;
  });

  // 按数值降序排列
  interactionNumbers.sort((a, b) => b.value - a.value);

  // ---- 第二步：基于数值大小的智能推断 ----
  // 取 top 4-6 个作为互动数据候选
  const topCandidates = interactionNumbers.slice(0, 6);

  if (topCandidates.length >= 3) {
    // 推断点赞 = 候选中的最大值
    const likeCandidate = topCandidates[0];
    // 推断评论 = 候选中的最小值（且通常与其他三个有数量级差异）
    const commentCandidate = topCandidates[topCandidates.length - 1];

    // 校验：点赞应该远大于评论（至少 3 倍以上），否则可能不是互动数据
    const ratio = commentCandidate.value > 0 ? likeCandidate.value / commentCandidate.value : 0;

    if (ratio >= 3 || commentCandidate.value < 10000) {
      // 推断中间值 = 分享和收藏
      // 用字段名语义区分：含 share/forward 的判分享，含 collect/favorite 的判收藏
      const middleCandidates = topCandidates.slice(1, -1); // 去掉最大和最小

      let shareCandidate = middleCandidates.find((c) =>
        c.key.toLowerCase().includes('share') || c.key.toLowerCase().includes('forward'),
      );
      let collectCandidate = middleCandidates.find((c) =>
        c.key.toLowerCase().includes('collect') ||
        c.key.toLowerCase().includes('favorite') ||
        c.key.toLowerCase().includes('favourit'),
      );

      // 如果只有一个中间候选，且没法区分分享/收藏，根据量级猜测
      if (!shareCandidate && !collectCandidate && middleCandidates.length === 1) {
        // 只有一个中间值，暂判为分享（最常见），收藏=0 后续再补
        shareCandidate = middleCandidates[0];
      }

      // 如果有两个中间候选但语义不明确，按大小：大的=收藏，小的=分享（抖音通常收藏>分享）
      if (!shareCandidate && !collectCandidate && middleCandidates.length >= 2) {
        collectCandidate = middleCandidates[0]; // 较大的
        shareCandidate = middleCandidates[1]; // 较小的
        reasons.push(`中间两值语义不明，按大小推断：大值 ${collectCandidate.path}=${collectCandidate.value} 判收藏，小值 ${shareCandidate.path}=${shareCandidate.value} 判分享`);
      }

      // ---- 应用推断结果（仅在原结果不合理时替换） ----

      // 点赞校准：如果推断的点赞值 > 原始点赞值，且有明确语义支持或差距很大，替换
      if (likeCandidate.value > likes && likeCandidate.value > 0) {
        const keyLower = likeCandidate.key.toLowerCase();
        const hasLikeSemantics =
          keyLower.includes('digg') ||
          keyLower.includes('like') ||
          keyLower.includes('praise') ||
          keyLower.includes('good');

        if (hasLikeSemantics) {
          reasons.push(`点赞校准：候选最大值 ${likeCandidate.path}=${likeCandidate.value}（点赞语义字段），替换原${likes}`);
          likes = likeCandidate.value;
          changed = true;
        } else if (likeCandidate.value > likes * 1.5) {
          // 即使语义不明确，如果值比当前点赞大 50% 以上，也替换（第三方API字段名可能很乱）
          reasons.push(`点赞校准：候选最大值 ${likeCandidate.path}=${likeCandidate.value}（语义不明确但量级最大），替换原${likes}`);
          likes = likeCandidate.value;
          changed = true;
        }
      }

      // 评论校准：如果原评论=0 或与推断值差异大，替换
      if (comments === 0 && commentCandidate.value > 0) {
        reasons.push(`评论校准：候选最小值 ${commentCandidate.path}=${commentCandidate.value}，替换原${comments}`);
        comments = commentCandidate.value;
        changed = true;
      }

      // 分享校准
      if (shareCandidate) {
        // 原分享为 0 或 明显不合理（分享 > 点赞）时替换
        if (shares === 0 || (shareCandidate.value < likes && shareCandidate.value > comments && shareCandidate.value !== shares)) {
          // 只在新值更合理时替换：分享 < 点赞 且 分享 > 评论
          if (shareCandidate.value < likes && shareCandidate.value > comments) {
            reasons.push(`分享校准：${shareCandidate.path}=${shareCandidate.value}，替换原${shares}`);
            shares = shareCandidate.value;
            changed = true;
          } else if (shares === 0 && shareCandidate.value > 0) {
            reasons.push(`分享校准：原值为0，填充 ${shareCandidate.path}=${shareCandidate.value}`);
            shares = shareCandidate.value;
            changed = true;
          }
        }
      }

      // 收藏校准
      if (collectCandidate) {
        if (collects === 0 && collectCandidate.value > 0) {
          reasons.push(`收藏校准：原值为0，填充 ${collectCandidate.path}=${collectCandidate.value}`);
          collects = collectCandidate.value;
          changed = true;
        } else if (collectCandidate.value > 0 && collectCandidate.value !== collects && collectCandidate.value < likes && collectCandidate.value > comments) {
          // 如果新的收藏值更合理（在点赞和评论之间），替换
          reasons.push(`收藏校准：${collectCandidate.path}=${collectCandidate.value}，替换原${collects}`);
          collects = collectCandidate.value;
          changed = true;
        }
      }
    }
  }

  // ---- 第三步：字段名语义的精确匹配（补充零值字段） ----
  // 如果分享/收藏还是 0，从语义候选中取
  if (shares === 0 && candidates.shareCandidates.length > 0) {
    const bestShare = candidates.shareCandidates.find((c) => c.value < likes && c.value > comments) || candidates.shareCandidates[0];
    if (bestShare.value > 0) {
      reasons.push(`分享兜底：从分享语义候选取 ${bestShare.path}=${bestShare.value}`);
      shares = bestShare.value;
      changed = true;
    }
  }

  if (collects === 0 && candidates.collectCandidates.length > 0) {
    const bestCollect = candidates.collectCandidates.find((c) => c.value < likes) || candidates.collectCandidates[0];
    if (bestCollect.value > 0) {
      reasons.push(`收藏兜底：从收藏语义候选取 ${bestCollect.path}=${bestCollect.value}`);
      collects = bestCollect.value;
      changed = true;
    }
  }

  // ---- 第四步：最终合理性校验 ----
  // 如果点赞仍然 <= 收藏 或 点赞 <= 分享，数据可信度低
  const reasonable = likes > shares && likes > collects && shares >= 0 && comments >= 0;
  if (!reasonable) {
    reasons.push(`⚠️ 校准后数据仍可能不合理（赞=${likes}/享=${shares}/藏=${collects}/评=${comments}），请手动核对`);
  }

  if (!changed) {
    reasons.push('数据基本合理，无需校准');
  }

  return { likes, comments, shares, collects, changed, reason: reasons.join('；') };
}

/**
 * 从抓取返回的文本中提取 JSON（兼容 markdown 代码块包裹与多余说明文本）
 * 失败时返回 null
 */
function parseJsonText(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 判断错误类型并返回标准化 ParseErrorType
 */
function classifyError(error: unknown, rawText?: string): ParseErrorType {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('timeout') || lower.includes('超时') || lower.includes('timed out')) {
    return 'network_timeout';
  }
  if (lower.includes('redirect') || lower.includes('重定向') || lower.includes('302') || lower.includes('301')) {
    return 'redirect_failed';
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('限流') || lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('server error')) {
    return 'api_error';
  }
  if (rawText && rawText.length < 20 && lower.includes('json')) {
    return 'api_empty_data';
  }
  if (lower.includes('json') || lower.includes('parse') || lower.includes('解析')) {
    return 'parse_json_failed';
  }
  return 'unknown';
}

async function crawlOnce(pluginId: string, label: string, inputKey: string, link: string): Promise<string> {
  logger.info(`[抖音解析] ${label} 开始请求，URL=${link}`);
  const start = Date.now();

  const input = { [inputKey]: link } as Record<string, string>;

  const stream = capabilityClient.load(pluginId).callStream<{ content: string }>('crawlWebPage', input);
  const iterable =
    (stream as { output?: AsyncIterable<{ content: string }> }).output ??
    (stream as AsyncIterable<{ content: string }>);

  let full = '';
  let chunkCount = 0;
  for await (const chunk of iterable) {
    const piece = chunk.content ?? '';
    if (piece) {
      full += piece;
      chunkCount += 1;
    }
  }
  const duration = Date.now() - start;
  logger.info(`[抖音解析] ${label} 响应完成，耗时=${duration}ms，chunk数=${chunkCount}，内容长度=${full.length}`);

  // 记录内容摘要（前 200 字符 + 后 100 字符），便于排查
  if (full.length > 0) {
    const preview = full.length > 300
      ? `${full.slice(0, 200)} ... ${full.slice(-100)}`
      : full;
    logger.info(`[抖音解析] ${label} 响应内容摘要: ${preview}`);
  } else {
    logger.warn(`[抖音解析] ${label} 返回空内容`);
  }

  return full;
}

/**
 * 单端点带重试的解析尝试
 * 返回解析成功的 DouyinVideoInfo；失败抛 DouyinParseError
 */
async function tryEndpoint(
  parser: (typeof PARSERS)[number],
  link: string,
): Promise<DouyinVideoInfo> {
  const { pluginId, label, inputKey, fieldMap } = parser;
  let lastError: DouyinParseError | null = null;
  let lastText = '';

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_ENDPOINT; attempt += 1) {
    const attemptNo = attempt + 1;
    const totalAttempts = MAX_RETRIES_PER_ENDPOINT + 1;

    try {
      logger.info(`[抖音解析] ${label} 第 ${attemptNo}/${totalAttempts} 次尝试`);
      const text = await crawlOnce(pluginId, label, inputKey, link);
      lastText = text;

      if (!text || text.trim().length < 10) {
        throw new DouyinParseError('api_empty_data', `${label} 返回内容为空或过短(${text?.length || 0}字符)`);
      }

      const data = parseJsonText(text);
      if (!data) {
        // 如果内容看起来像 HTML（兜底爬虫场景），再尝试从 <script> 中提取 _ROUTER_DATA / RENDER_DATA 等 JSON
        const scriptMatch = text.match(
          /<script[^>]*id="RENDER_DATA"[^>]*>([\s\S]*?)<\/script>/i,
        );
        let rawJson = scriptMatch ? scriptMatch[1] : '';
        let renderDataFound = !!scriptMatch;
        let decodeMethod = '';
        let decodeError = '';
        let redirectUrl = '';
        let htmlPreview = text.length > 500 ? `${text.slice(0, 300)} ... ${text.slice(-200)}` : text;

        // 检查页面是否包含 验证 / 滑动验证 / _$jsvmprt 等反爬特征
        const hasAntiBot = /_\$jsvmprt|滑动验证|验证码|verify|secur|antibot/i.test(text);
        const isChallengePage = hasAntiBot && !renderDataFound;

        // 尝试从页面中提取重定向 URL（如 window.location.href 或 meta refresh）
        const redirectMatch = text.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
        if (redirectMatch) redirectUrl = redirectMatch[1];
        const metaRefreshMatch = text.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^;]*;\s*url=([^"']+)["']/i);
        if (!redirectUrl && metaRefreshMatch) redirectUrl = metaRefreshMatch[1];

        if (!rawJson) {
          // 尝试匹配 __INITIAL_STATE__ 或 window._ROUTER_DATA
          const altMatch = text.match(
            /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i,
          );
          rawJson = altMatch ? altMatch[1] : '';
          if (rawJson) renderDataFound = true;
        }

        if (!rawJson) {
          // 尝试 __NEXT_DATA__ (SSR 框架)
          const nextMatch = text.match(
            /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
          );
          rawJson = nextMatch ? nextMatch[1] : '';
          if (rawJson) renderDataFound = true;
        }

        if (!rawJson) {
          throw new DouyinParseError(
            'parse_json_failed',
            `${label} 响应中未找到 RENDER_DATA（HTML长度=${text.length}，${isChallengePage ? '疑似反爬挑战页' : '普通页面'}，${redirectUrl ? `重定向URL=${redirectUrl}` : '无重定向'}，页面摘要=${htmlPreview.slice(0, 150)}）`,
          );
        }

        try {
          // RENDER_DATA 可能有多种编码格式，按优先级尝试
          let parsed: Record<string, unknown> | null = null;

          // 尝试 1: encodeURIComponent 编码（最常见）
          try {
            const decoded = decodeURIComponent(rawJson);
            parsed = JSON.parse(decoded) as Record<string, unknown>;
            decodeMethod = 'encodeURIComponent';
            logger.info(`[抖音解析] ${label} RENDER_DATA 使用 encodeURIComponent 解码成功，顶层keys=${Object.keys(parsed || {}).slice(0, 10).join(',')}`);
          } catch (e) {
            decodeError = `encodeURIComponent失败: ${e instanceof Error ? e.message : String(e)}`;
          }

          // 尝试 2: base64 编码（抖音某些版本使用 atob 解码）
          if (!parsed) {
            try {
              const trimmed = rawJson.trim();
              // 检测是否像 base64：仅包含 A-Za-z0-9+/= 且长度较大
              if (/^[A-Za-z0-9+/=]{20,}$/.test(trimmed)) {
                const decoded = atob(trimmed);
                parsed = JSON.parse(decoded) as Record<string, unknown>;
                decodeMethod = 'base64(atob)';
                logger.info(`[抖音解析] ${label} RENDER_DATA 使用 base64(atob) 解码成功`);
              }
            } catch (e) {
              decodeError += `；base64失败: ${e instanceof Error ? e.message : String(e)}`;
            }
          }

          // 尝试 3: 先 encodeURIComponent 再 base64 的双重编码
          if (!parsed) {
            try {
              const trimmed = rawJson.trim();
              if (/^[A-Za-z0-9+/=%]+$/.test(trimmed) && trimmed.length > 20) {
                // 先 unescape + atob (抖音的 double URI 编码变体)
                const b64decoded = atob(decodeURIComponent(trimmed));
                parsed = JSON.parse(b64decoded) as Record<string, unknown>;
                decodeMethod = 'URI+base64双重编码';
                logger.info(`[抖音解析] ${label} RENDER_DATA 使用 URI+base64 双重解码成功`);
              }
            } catch (e) {
              decodeError += `；双重编码失败: ${e instanceof Error ? e.message : String(e)}`;
            }
          }

          // 尝试 4: 直接 JSON.parse（少数场景可能已经是纯文本）
          if (!parsed) {
            try {
              parsed = JSON.parse(rawJson) as Record<string, unknown>;
              decodeMethod = '直接JSON.parse';
              logger.info(`[抖音解析] ${label} RENDER_DATA 直接 JSON.parse 成功`);
            } catch (e) {
              decodeError += `；直析失败: ${e instanceof Error ? e.message : String(e)}`;
            }
          }

          if (!parsed) {
            throw new DouyinParseError(
              'parse_json_failed',
              `${label} RENDER_DATA 解码失败（4种方式均失败）。HTML长度=${text.length}，RENDER_DATA长度=${rawJson.length}，${isChallengePage ? '疑似反爬挑战页' : ''}，解码错误=${decodeError}，原始数据前80字符=${rawJson.slice(0, 80)}`,
            );
          }

          // 尝试深层查找 aweme_detail 对象（抖音页面结构中 statistics 在 aweme_detail 下）
          const awemeDetail = deepFindByKey(parsed, 'aweme_detail');
          const videoDetail = awemeDetail || deepFindByKey(parsed, 'aweme') || deepFindByKey(parsed, 'video') || parsed;
          if (awemeDetail) {
            logger.info(`[抖音解析] ${label} 找到 aweme_detail 对象，其下keys=${Object.keys(awemeDetail).slice(0, 15).join(',')}`);
            // 检查 statistics 对象
            const stats = (awemeDetail as Record<string, unknown>).statistics;
            if (stats && typeof stats === 'object') {
              logger.info(`[抖音解析] ${label} aweme_detail.statistics 字段: ${JSON.stringify(stats)}`);
            }
          }

          const result = extractDataFromPageJson(videoDetail as Record<string, unknown>, fieldMap);
          if (result) {
            // 把顶层 key 信息也带进去
            if (result.debug) {
              result.debug.successfulEndpoint = `${label}(aweme_detail)`;
            }
            return result;
          }

          // 如果 aweme_detail 里没找到，再从全量 parsed 找一次
          if (awemeDetail) {
            const fullResult = extractDataFromPageJson(parsed, fieldMap);
            if (fullResult) {
              if (fullResult.debug) {
                fullResult.debug.successfulEndpoint = `${label}(全量JSON)`;
              }
              return fullResult;
            }
          }

          throw new DouyinParseError(
            'api_empty_data',
            `${label} 页面 JSON 中未提取到视频数据（已尝试 aweme_detail 路径和全量搜索）`,
          );
        } catch (e) {
          if (e instanceof DouyinParseError) throw e;
          throw new DouyinParseError(
            'parse_json_failed',
            `${label} 页面 JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      // 标准 JSON API 响应
      // 第一步：收集所有数值字段并打印（便于排查）
      const allNumericFields = collectAllNumericFields(data);
      logger.info(`[抖音解析] ${label} 原始JSON数值字段（共${allNumericFields.length}个）: ${allNumericFields.map((f) => `${f.path}=${f.value}`).join(', ')}`);

      // 第二步：按字段名语义分类候选
      const candidates = classifyInteractionFields(allNumericFields);
      logger.info(
        `[抖音解析] ${label} 互动候选分类：` +
        `点赞候选[${candidates.likeCandidates.map((c) => `${c.path}=${c.value}`).join('|') || '无'}]；` +
        `评论候选[${candidates.commentCandidates.map((c) => `${c.path}=${c.value}`).join('|') || '无'}]；` +
        `分享候选[${candidates.shareCandidates.map((c) => `${c.path}=${c.value}`).join('|') || '无'}]；` +
        `收藏候选[${candidates.collectCandidates.map((c) => `${c.path}=${c.value}`).join('|') || '无'}]`,
      );

      // 第三步：按 fieldMap 精确匹配，记录命中路径
      const titlePick = pickFromObject(data, fieldMap.videoTitle);
      const authorPick = pickFromObject(data, fieldMap.author);
      const likesPick = pickFromObject(data, fieldMap.likes);
      const commentsPick = pickFromObject(data, fieldMap.comments);
      const sharesPick = pickFromObject(data, fieldMap.shares);
      const collectsPick = pickFromObject(data, fieldMap.collects);

      const videoTitle = pickString(titlePick?.value);
      const author = pickString(authorPick?.value);
      const rawLikes = pickNumber(likesPick?.value);
      const rawComments = pickNumber(commentsPick?.value);
      const rawShares = pickNumber(sharesPick?.value);
      const rawCollects = pickNumber(collectsPick?.value);

      // 第四步：智能校准 —— 基于数值大小 + 字段名语义的混合策略
      const calibrated = calibrateInteractionData(rawLikes, rawComments, rawShares, rawCollects, candidates, allNumericFields);
      const { likes: finalLikes, comments: finalComments, shares: finalShares, collects: finalCollects, reason, changed } = calibrated;
      logger.info(`[抖音解析] ${label} 互动数据校准：原始(赞=${rawLikes}/评=${rawComments}/享=${rawShares}/藏=${rawCollects}) → 校准后(赞=${finalLikes}/评=${finalComments}/享=${finalShares}/藏=${finalCollects})，原因=${reason}`);

      if (!videoTitle && !author && finalLikes === 0 && finalComments === 0 && finalShares === 0) {
        throw new DouyinParseError(
          'api_empty_data',
          `${label} 返回 JSON 但全部字段为空/0，可能是 API 返回了空数据或限流`,
        );
      }

      // 判定数据可信度
      // - 如果点赞来自 statistics.digg_count 且分享来自 statistics.share_count → high
      // - 如果做了校准且校准有效 → mid
      // - 如果分享数为 0 或点赞 < 收藏 → low
      const likesPath = changed ? candidates.likeCandidates[0]?.path : likesPick?.matchedPath;
      const sharesPath = changed ? candidates.shareCandidates[0]?.path : sharesPick?.matchedPath;
      const isOfficialStats = likesPath?.includes('statistics.digg') && sharesPath?.includes('statistics.share');
      let confidence: 'high' | 'mid' | 'low' = 'mid';
      if (isOfficialStats) confidence = 'high';
      else if (finalShares === 0 || (finalCollects > 0 && finalLikes <= finalCollects)) confidence = 'low';
      else if (parser.source === 'third_party_api') {
        // 第三方 API 的数据可信度天然低于官方页面直爬
        // 如果分享为 0 或字段命名不规范，降为 low
        const likePathLower = (likesPath || '').toLowerCase();
        const looksLikeMislabeledCollect = likePathLower.includes('like_count') && !likePathLower.includes('digg');
        if (finalShares === 0 || looksLikeMislabeledCollect) confidence = 'low';
      }
      else if (changed) confidence = 'mid';

      logger.info(
        `[抖音解析] ${label} 解析成功：标题="${videoTitle || '(空)'}"，作者="${author || '(空)'}"，点赞=${finalLikes}，评论=${finalComments}，分享=${finalShares}，收藏=${finalCollects}，可信度=${confidence}`,
      );

      // 截断 rawJson 避免过大（最多 50KB）
      let rawJsonStr = '';
      try {
        rawJsonStr = JSON.stringify(data);
        if (rawJsonStr.length > 50000) rawJsonStr = rawJsonStr.slice(0, 50000) + '...（已截断）';
      } catch {
        rawJsonStr = '[无法序列化]';
      }

      return {
        videoTitle,
        author,
        likes: finalLikes,
        comments: finalComments,
        shares: finalShares,
        collects: finalCollects,
        confidence,
        debug: {
          successfulEndpoint: label,
          endpointResults: [],
          rawJson: rawJsonStr,
          fieldPaths: {
            videoTitle: titlePick?.matchedPath,
            author: authorPick?.matchedPath,
            likes: likesPath,
            comments: commentsPick?.matchedPath,
            shares: sharesPath,
            collects: changed ? candidates.collectCandidates[0]?.path : collectsPick?.matchedPath,
          },
          calibrationReason: reason,
          allNumericFields: allNumericFields.slice(0, 30), // 最多保留 30 个，避免调试面板过大
          source: parser.source,
        },
      };
    } catch (error) {
      const typed =
        error instanceof DouyinParseError
          ? error
          : new DouyinParseError(classifyError(error, lastText), error instanceof Error ? error.message : String(error));

      lastError = typed;
      logger.warn(`[抖音解析] ${label} 第 ${attemptNo}/${totalAttempts} 次失败：类型=${typed.type}，详情=${typed.detail || typed.message}`);

      // 还有重试机会 → 等待后重试
      if (attempt < MAX_RETRIES_PER_ENDPOINT) {
        logger.info(`[抖音解析] ${label} ${RETRY_INTERVAL_MS}ms 后进行第 ${attemptNo + 1} 次重试...`);
        await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      }
    }
  }

  throw lastError || new DouyinParseError('unknown', `${label} 解析失败`);
}

/**
 * 从抖音分享页面的初始化 JSON（如 RENDER_DATA / __INITIAL_STATE__）中
 * 深度遍历提取视频标题、作者、点赞等字段
 */
function extractDataFromPageJson(
  rootObj: Record<string, unknown>,
  fieldMap: { videoTitle: string[]; author: string[]; likes: string[]; comments: string[]; shares: string[]; collects: string[] },
): DouyinVideoInfo | null {
  // 先尝试按已知字段路径直接取
  const titlePick = pickFromObject(rootObj, fieldMap.videoTitle);
  const authorPick = pickFromObject(rootObj, fieldMap.author);
  const likesPick = pickFromObject(rootObj, fieldMap.likes);
  const commentsPick = pickFromObject(rootObj, fieldMap.comments);
  const sharesPick = pickFromObject(rootObj, fieldMap.shares);
  const collectsPick = pickFromObject(rootObj, fieldMap.collects);

  const directTitle = pickString(titlePick?.value);
  const directAuthor = pickString(authorPick?.value);
  const directLikes = pickNumber(likesPick?.value);
  const directComments = pickNumber(commentsPick?.value);
  const directShares = pickNumber(sharesPick?.value);
  const directCollects = pickNumber(collectsPick?.value);

  // 收集全量数值字段，用于智能校准
  const allFields = collectAllNumericFields(rootObj);
  const candidates = classifyInteractionFields(allFields);

  if (directTitle && directAuthor) {
    const calibrated = calibrateInteractionData(directLikes, directComments, directShares, directCollects, candidates, allFields);
    const likesPath = calibrated.changed ? candidates.likeCandidates[0]?.path : likesPick?.matchedPath;
    const sharesPath = calibrated.changed ? candidates.shareCandidates[0]?.path : sharesPick?.matchedPath;
    const isOfficialStats = likesPath?.includes('statistics.digg') && sharesPath?.includes('statistics.share');
    let confidence: 'high' | 'mid' | 'low' = 'mid';
    if (isOfficialStats) confidence = 'high';
    else if (calibrated.shares === 0 || (calibrated.collects > 0 && calibrated.likes <= calibrated.collects)) confidence = 'low';

    let rawJsonStr = '';
    try {
      rawJsonStr = JSON.stringify(rootObj);
      if (rawJsonStr.length > 50000) rawJsonStr = rawJsonStr.slice(0, 50000) + '...（已截断）';
    } catch {
      rawJsonStr = '[无法序列化]';
    }

    return {
      videoTitle: directTitle,
      author: directAuthor,
      likes: calibrated.likes,
      comments: calibrated.comments,
      shares: calibrated.shares,
      collects: calibrated.collects,
      confidence,
      debug: {
        successfulEndpoint: '页面JSON直爬',
        endpointResults: [],
        rawJson: rawJsonStr,
        fieldPaths: {
          videoTitle: titlePick?.matchedPath,
          author: authorPick?.matchedPath,
          likes: likesPath,
          comments: commentsPick?.matchedPath,
          shares: sharesPath,
          collects: calibrated.changed ? candidates.collectCandidates[0]?.path : collectsPick?.matchedPath,
        },
        calibrationReason: calibrated.reason,
      },
    };
  }

  // 深度搜索模式：递归遍历对象，找到包含 desc/nickname/digg_count 的对象
  let found: Record<string, unknown> | null = null;
  function deepSearch(obj: unknown, depth = 0): void {
    if (found || depth > 8) return;
    if (!obj || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;

    // 命中特征：同时有 desc + nickname + digg_count 等典型字段
    const hasDesc = 'desc' in o || 'title' in o || 'videoTitle' in o;
    const hasAuthor = 'nickname' in o || 'author' in o || 'nick' in o;
    const hasStats = 'digg_count' in o || 'like_count' in o || 'comment_count' in o;

    if (hasDesc && hasAuthor && hasStats) {
      found = o;
      return;
    }

    for (const key of Object.keys(o)) {
      const val = o[key];
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          for (const item of val) {
            deepSearch(item, depth + 1);
            if (found) return;
          }
        } else {
          deepSearch(val, depth + 1);
          if (found) return;
        }
      }
    }
  }

  deepSearch(rootObj);
  if (!found) return null;

  const deepTitlePick = pickFromObject(found, fieldMap.videoTitle);
  const deepAuthorPick = pickFromObject(found, fieldMap.author);
  const deepLikesPick = pickFromObject(found, fieldMap.likes);
  const deepCommentsPick = pickFromObject(found, fieldMap.comments);
  const deepSharesPick = pickFromObject(found, fieldMap.shares);
  const deepCollectsPick = pickFromObject(found, fieldMap.collects);

  const videoTitle = pickString(deepTitlePick?.value);
  const author = pickString(deepAuthorPick?.value);
  const foundLikes = pickNumber(deepLikesPick?.value);
  const foundComments = pickNumber(deepCommentsPick?.value);
  const foundShares = pickNumber(deepSharesPick?.value);
  const foundCollects = pickNumber(deepCollectsPick?.value);

  // 智能校准互动数据
  const calibrated = calibrateInteractionData(foundLikes, foundComments, foundShares, foundCollects, candidates, allFields);

  if (!videoTitle && !author) return null;

  const likesPath = calibrated.changed ? candidates.likeCandidates[0]?.path : deepLikesPick?.matchedPath;
  const sharesPath = calibrated.changed ? candidates.shareCandidates[0]?.path : deepSharesPick?.matchedPath;
  const isOfficialStats = likesPath?.includes('statistics.digg') && sharesPath?.includes('statistics.share');
  let confidence: 'high' | 'mid' | 'low' = 'mid';
  if (isOfficialStats) confidence = 'high';
  else if (calibrated.shares === 0 || (calibrated.collects > 0 && calibrated.likes <= calibrated.collects)) confidence = 'low';

  let rawJsonStr = '';
  try {
    rawJsonStr = JSON.stringify(rootObj);
    if (rawJsonStr.length > 50000) rawJsonStr = rawJsonStr.slice(0, 50000) + '...（已截断）';
  } catch {
    rawJsonStr = '[无法序列化]';
  }

  return {
    videoTitle,
    author,
    likes: calibrated.likes,
    comments: calibrated.comments,
    shares: calibrated.shares,
    collects: calibrated.collects,
    confidence,
    debug: {
      successfulEndpoint: '页面JSON深度搜索',
      endpointResults: [],
      rawJson: rawJsonStr,
      fieldPaths: {
        videoTitle: deepTitlePick?.matchedPath,
        author: deepAuthorPick?.matchedPath,
        likes: likesPath,
        comments: deepCommentsPick?.matchedPath,
        shares: sharesPath,
        collects: calibrated.changed ? candidates.collectCandidates[0]?.path : deepCollectsPick?.matchedPath,
      },
      calibrationReason: calibrated.reason,
      allNumericFields: allFields.slice(0, 30),
      source: 'douyin_page',
    },
  };
}

/**
 * 通过平台服务端解析代理（web-crawler 插件实例，多端点容错）获取抖音视频真实数据：
 * 视频标题 / 作者 / 点赞数 / 评论数 / 分享数。
 *
 * 解析链路（每端点最多重试 2 次，间隔 1 秒）：
 *   1. 抖音页面直爬（首选） — 直接爬抖音分享页 HTML → RENDER_DATA → aweme_detail.statistics
 *      （数据最准确，statistics.digg_count/share_count 是抖音官方真实字段）
 *   2. 备用端点 — api.douyin.wtf JSON API（快但字段映射可能混乱）
 *   3. 备用端点 — douyin.wtf JSON API（同服务商不同子域，DNS/CDN 级容错）
 *
 * 返回值包含 confidence 可信度标记和 debug 调试信息（原始JSON/字段路径/各链路状态），
 * 调用方可据此判断是否需要提醒用户手动核对互动数据。
 */
export async function fetchDouyinVideoInfo(shareLink: string): Promise<DouyinVideoInfo> {
  const { cleanUrl, method } = extractDouyinUrlDetail(shareLink);
  if (!cleanUrl) {
    throw new DouyinParseError('unknown', '未识别到有效的抖音链接');
  }

  const rawInputPreview = shareLink.length > 100 ? `${shareLink.slice(0, 100)}…` : shareLink;
  logger.info(`[抖音解析] 开始解析，原始链接="${rawInputPreview}"，清洗后=${cleanUrl}，提取方式=${method}`);

  const errors: DouyinParseError[] = [];
  const endpointResults: Array<{
    label: string;
    status: 'success' | 'failed';
    errorType?: string;
    errorDetail?: string;
    durationMs?: number;
  }> = [];

  for (const parser of PARSERS) {
    const startTime = Date.now();
    try {
      const result = await tryEndpoint(parser, cleanUrl);
      const durationMs = Date.now() - startTime;
      endpointResults.push({
        label: parser.label,
        status: 'success',
        durationMs,
      });
      logger.info(`[抖音解析] 最终成功，使用端点=${parser.label}，耗时=${durationMs}ms`);

      // 把前面所有端点的尝试结果 + 链接提取元信息注入 debug
      if (result.debug) {
        result.debug.endpointResults = endpointResults;
        result.debug.urlExtraction = { cleanUrl, method, rawInputPreview };
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const typed =
        error instanceof DouyinParseError
          ? error
          : new DouyinParseError(classifyError(error), error instanceof Error ? error.message : String(error));
      errors.push(typed);
      endpointResults.push({
        label: parser.label,
        status: 'failed',
        errorType: typed.type,
        errorDetail: typed.detail || typed.message,
        durationMs,
      });
      logger.warn(`[抖音解析] 端点 ${parser.label} 全部重试均失败：${typed.type} - ${typed.detail || typed.message}，耗时=${durationMs}ms`);
    }
  }

  // 全部失败 → 汇总错误，取最"严重"的类型作为主错误
  logger.error(`[抖音解析] 全部 ${PARSERS.length} 个端点均失败: ${errors.map((e) => e.type).join(', ')}`);

  // 优先级：network_timeout > api_error > api_empty_data > redirect_failed > parse_json_failed > unknown
  const priority: ParseErrorType[] = [
    'network_timeout',
    'api_error',
    'api_empty_data',
    'redirect_failed',
    'parse_json_failed',
    'unknown',
  ];
  const mainType = priority.find((t) => errors.some((e) => e.type === t)) || 'unknown';
  const details = errors.map((e) => `[${e.type}] ${e.detail || e.message}`).join('；');

  // 把 endpointResults + urlExtraction 挂到错误对象上，调用方可以读取
  const finalError = new DouyinParseError(mainType, details);
  (finalError as DouyinParseError & { endpointResults: typeof endpointResults }).endpointResults = endpointResults;
  (finalError as DouyinParseError & { urlExtraction: { cleanUrl: string; method: UrlExtractionMethod; rawInputPreview: string } })
    .urlExtraction = { cleanUrl, method, rawInputPreview };

  throw finalError;
}
