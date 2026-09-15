// 飞书多维表格字段映射层：业务模型(TS) ⇄ 真实表字段(中文列名 + 枚举值)
// 读写格式依据 feishu-bitable 插件规范：
//  - Text 读 {text}/string、写 string；Number 读写 number
//  - SingleSelect 读 string|string[]、写必须命中枚举；MultiSelect 读 string[]、写 string[]
//  - DateTime 读写毫秒时间戳；Attachment 写 URL[]、读复杂对象数组；Link 读记录 ID 数组
import type { IMaterial, MaterialInput } from '@/data/materials';
import type { IShot, IScript, ScriptInput } from '@/data/scripts';
import type { ITask, TaskInput } from '@/data/tasks';
import type { IVideo, VideoInput } from '@/data/videos';
import type { IPromptTemplate, PromptInput } from '@/data/prompts';

export interface BitableRawRecord {
  id: string;
  record: Record<string, unknown>;
}

/** link 字段解析上下文：标题 → 目标表记录 ID */
export interface LinkContext {
  scriptIdByTitle: (title: string) => string | undefined;
  videoIdByTitle: (title: string) => string | undefined;
}

// ---------- 读值归一化 ----------

export function hasText(value: unknown): boolean {
  return asText(value).trim().length > 0;
}

export function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
    return String((value as { text?: unknown }).text ?? '');
  }
  return '';
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(asText(value));
  return Number.isFinite(n) ? n : 0;
}

export function asSelect(value: unknown): string {
  if (Array.isArray(value)) return asText(value[0]);
  return asText(value);
}

export function asMulti(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => asText(v)).filter(Boolean);
  const single = asText(value);
  return single ? [single] : [];
}

export function formatDateTime(value: unknown): string {
  if (value == null || value === '') return '';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function linkIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

export function attachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') return String((v as { url?: unknown }).url ?? '');
      return '';
    })
    .filter(Boolean);
}

export function attachmentNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') return String((v as { name?: unknown }).name ?? '');
      return '';
    })
    .filter(Boolean);
}

// ---------- 写值归一化 ----------

function parseDateToMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}

function selectValue(
  value: string | undefined,
  options: string[],
  synonyms: Record<string, string> = {},
  fallback?: string,
): string | undefined {
  if (!value) return fallback;
  if (options.includes(value)) return value;
  const mapped = synonyms[value];
  if (mapped && options.includes(mapped)) return mapped;
  const fuzzy = options.find((o) => value.includes(o) || o.includes(value));
  if (fuzzy) return fuzzy;
  // 严格：单选/多选字段写入必须命中枚举，未命中时退回 fallback
  return fallback;
}

function multiSelectValue(values: string[] | undefined, options: string[]): string[] | undefined {
  if (!values) return undefined;
  const valid = values.filter((v) => options.includes(v));
  return valid.length > 0 ? valid : [];
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

// ---------- 爆款素材库 (tbl5rbhdR3NtNHRe) ----------

const MATERIAL_CONTENT_OPTIONS = ['搞笑', '知识', '剧情', '美食', '美妆', '科技', '情感', '旅行', '音乐', '游戏', '其他'];
const MATERIAL_CONTENT_SYNONYMS: Record<string, string> = {
  知识科普: '知识',
  剧情演绎: '剧情',
  好物种草: '其他',
  生活vlog: '其他',
  美食探店: '美食',
  搞笑段子: '搞笑',
};
const MATERIAL_TAG_OPTIONS = ['搞笑', '感动', '震惊', '治愈', '燃', '悬疑', '愤怒', '温馨', '焦虑', '期待'];
const MATERIAL_STATUS_TO_LABEL: Record<IMaterial['disassemblyStatus'], string> = {
  pending: '待下载',
  processing: '拆解中',
  completed: '已完成',
  failed: '失败',
};
const MATERIAL_STATUS_FROM_LABEL: Record<string, IMaterial['disassemblyStatus']> = {
  待下载: 'pending',
  拆解中: 'processing',
  已完成: 'completed',
  失败: 'failed',
};
const MATERIAL_RATING_TO_LABEL: Record<IMaterial['ratingLevel'], string> = {
  S: 'S级爆款',
  A: 'A级优质',
  B: 'B级一般',
  C: 'C级不推荐',
};
const MATERIAL_RATING_FROM_LABEL: Record<string, IMaterial['ratingLevel']> = {
  'S级爆款': 'S',
  'A级优质': 'A',
  'B级一般': 'B',
  'C级不推荐': 'C',
};

export function recordToMaterial({ id, record }: BitableRawRecord): IMaterial {
  const fiveDimensions = {
    completionPower: asNumber(record['完播力评分']),
    interactionPotential: asNumber(record['互动潜力评分']),
    contentQuality: asNumber(record['内容质量评分']),
    platformFit: asNumber(record['平台适配评分']),
    spreadPotential: asNumber(record['传播潜力评分']),
  };
  const time = formatDateTime(record['拆解时间']);
  return {
    id,
    videoTitle: asText(record['视频标题']),
    douyinLink: asText(record['抖音链接']),
    author: asText(record['作者']),
    likes: asNumber(record['点赞数']),
    comments: asNumber(record['评论数']),
    shares: asNumber(record['分享数']),
    completionRate: fiveDimensions.completionPower,
    fiveDimensions,
    compositeScore: asNumber(record['综合评分']),
    ratingLevel: MATERIAL_RATING_FROM_LABEL[asSelect(record['评分等级'])] ?? 'B',
    contentType: asSelect(record['内容类型']) || '其他',
    disassemblyStatus: MATERIAL_STATUS_FROM_LABEL[asSelect(record['拆解状态'])] ?? 'pending',
    videoScript: asText(record['口播文案']),
    sceneDescription: asText(record['画面提示词']),
    hookAnalysis: asText(record['复刻蓝图']),
    bgm: '',
    tags: asMulti(record['情绪标签']),
    createdAt: time,
    updatedAt: time,
  };
}

export function materialToRecord(input: MaterialInput): Record<string, unknown> {
  const contentType = selectValue(input.contentType, MATERIAL_CONTENT_OPTIONS, MATERIAL_CONTENT_SYNONYMS, '其他');
  const status = MATERIAL_STATUS_TO_LABEL[input.disassemblyStatus];
  const rating = MATERIAL_RATING_TO_LABEL[input.ratingLevel];
  const record: Record<string, unknown> = {
    视频标题: input.videoTitle,
    抖音链接: input.douyinLink,
    作者: input.author,
    点赞数: input.likes,
    评论数: input.comments,
    分享数: input.shares,
    完播力评分: input.fiveDimensions.completionPower,
    互动潜力评分: input.fiveDimensions.interactionPotential,
    内容质量评分: input.fiveDimensions.contentQuality,
    平台适配评分: input.fiveDimensions.platformFit,
    传播潜力评分: input.fiveDimensions.spreadPotential,
    综合评分: input.compositeScore,
    口播文案: input.videoScript,
    画面提示词: input.sceneDescription,
    复刻蓝图: input.hookAnalysis,
    拆解时间: Date.now(),
  };
  if (contentType) record['内容类型'] = contentType;
  if (status) record['拆解状态'] = status;
  if (rating) record['评分等级'] = rating;
  const tags = multiSelectValue(input.tags, MATERIAL_TAG_OPTIONS);
  if (tags && tags.length > 0) record['情绪标签'] = tags;
  return record;
}

export function materialPatchToRecord(patch: Partial<IMaterial>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const map: Array<[keyof IMaterial, string]> = [
    ['videoTitle', '视频标题'],
    ['douyinLink', '抖音链接'],
    ['author', '作者'],
    ['likes', '点赞数'],
    ['comments', '评论数'],
    ['shares', '分享数'],
    ['compositeScore', '综合评分'],
    ['videoScript', '口播文案'],
    ['sceneDescription', '画面提示词'],
    ['hookAnalysis', '复刻蓝图'],
  ];
  for (const [field, column] of map) {
    if (field in patch) record[column] = patch[field];
  }
  if (patch.fiveDimensions) {
    const dims = patch.fiveDimensions as Partial<IMaterial['fiveDimensions']>;
    const dimMap: Array<[keyof IMaterial['fiveDimensions'], string]> = [
      ['completionPower', '完播力评分'],
      ['interactionPotential', '互动潜力评分'],
      ['contentQuality', '内容质量评分'],
      ['platformFit', '平台适配评分'],
      ['spreadPotential', '传播潜力评分'],
    ];
    for (const [field, column] of dimMap) {
      if (field in dims) record[column] = dims[field];
    }
  }
  if (patch.ratingLevel) {
    const rating = MATERIAL_RATING_TO_LABEL[patch.ratingLevel];
    if (rating) record['评分等级'] = rating;
  }
  if (patch.disassemblyStatus) {
    const status = MATERIAL_STATUS_TO_LABEL[patch.disassemblyStatus];
    if (status) record['拆解状态'] = status;
  }
  if ('contentType' in patch) {
    const contentType = selectValue(patch.contentType, MATERIAL_CONTENT_OPTIONS, MATERIAL_CONTENT_SYNONYMS, '其他');
    if (contentType) record['内容类型'] = contentType;
  }
  if ('tags' in patch) {
    const tags = multiSelectValue(patch.tags, MATERIAL_TAG_OPTIONS);
    if (tags) record['情绪标签'] = tags;
  }
  return record;
}

// ---------- 分镜脚本库 (tbljD0Q556F2aEkY) ----------

function parseShots(value: unknown): IShot[] {
  const text = asText(value);
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as IShot[]) : [];
  } catch {
    return [];
  }
}

export function recordToScript({ id, record }: BitableRawRecord): IScript {
  const time = formatDateTime(record['创建时间']);
  return {
    id,
    scriptTitle: asText(record['脚本标题']),
    contentType: asSelect(record['内容类型']) || '其他',
    duration: asNumber(record['目标时长(秒)']),
    theme: asText(record['主题关键词']),
    shots: parseShots(record['分镜详情']),
    createdAt: time,
    updatedAt: time,
  };
}

export function scriptToRecord(input: ScriptInput): Record<string, unknown> {
  const contentType = selectValue(input.contentType, MATERIAL_CONTENT_OPTIONS, MATERIAL_CONTENT_SYNONYMS, '其他');
  const record: Record<string, unknown> = {
    脚本标题: input.scriptTitle,
    主题关键词: input.theme,
    '目标时长(秒)': input.duration,
    分镜数量: input.shots.length,
    分镜详情: JSON.stringify(input.shots),
    状态: '草稿',
    创建时间: Date.now(),
  };
  if (contentType) record['内容类型'] = contentType;
  return record;
}

export function scriptPatchToRecord(patch: Partial<IScript>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if ('scriptTitle' in patch) record['脚本标题'] = patch.scriptTitle;
  if ('theme' in patch) record['主题关键词'] = patch.theme;
  if ('duration' in patch) record['目标时长(秒)'] = patch.duration;
  if ('contentType' in patch) {
    const contentType = selectValue(patch.contentType, MATERIAL_CONTENT_OPTIONS, MATERIAL_CONTENT_SYNONYMS, '其他');
    if (contentType) record['内容类型'] = contentType;
  }
  if (patch.shots) {
    record['分镜详情'] = JSON.stringify(patch.shots);
    record['分镜数量'] = patch.shots.length;
  }
  return record;
}

// ---------- 生成任务表 (tblUq2H10IZgQZKr) ----------

export const TASK_STAGE_OPTIONS = ['待生成', '生成参考图', '图生视频', '配音中', '字幕中', '合成中', '已完成', '失败'];
const STAGE_TO_STATUS: Record<string, ITask['status']> = {
  待生成: 'pending',
  生成参考图: 'running',
  图生视频: 'running',
  配音中: 'running',
  字幕中: 'running',
  合成中: 'running',
  已完成: 'completed',
  失败: 'failed',
};
const STATUS_TO_STAGE: Partial<Record<ITask['status'], string>> = {
  pending: '待生成',
  running: '生成参考图',
  completed: '已完成',
  failed: '失败',
  cancelled: '待生成',
};
const TASK_STAGE_SYNONYMS: Record<string, string> = {
  待开始: '待生成',
  已取消: '待生成',
  重新排队: '待生成',
  生成分镜画面: '生成参考图',
  图像生成: '生成参考图',
  TTS配音: '配音中',
  成品合成完成: '已完成',
};
const TASK_VIDEO_MODELS = ['Wan2.1本地', '可灵API', 'Seedance', 'Sora', 'Luma', 'Stable Video Diffusion'];
const TASK_IMAGE_MODELS = ['FLUX', 'Seedream', 'Midjourney', 'Stable Diffusion'];
const TASK_TTS_VOICES = ['温柔女声', '活力女声', '沉稳男声', '青年男声', '磁性旁白', '可爱童声'];
const TASK_RESOLUTIONS = ['480P', '720P', '1080P'];
const TASK_VIDEO_MODEL_SYNONYMS: Record<string, string> = {
  'Vidu 2.0': 'Seedance',
  '可灵2.1': '可灵API',
  '可灵2.0': '可灵API',
  即梦视频: '可灵API',
};
const TASK_IMAGE_MODEL_SYNONYMS: Record<string, string> = {
  '即梦3.0': 'Seedream',
  'Seedream 3.0': 'Seedream',
  'Stable Diffusion XL': 'Stable Diffusion',
};
const TASK_TTS_SYNONYMS: Record<string, string> = {
  温暖女声: '温柔女声',
  活力男声: '青年男声',
  知性女声: '活力女声',
};
const TASK_RESOLUTION_SYNONYMS: Record<string, string> = {
  '1080x1920 竖屏': '1080P',
  '1920x1080 横屏': '1080P',
};

function normalizeStage(stage: string | undefined): string | undefined {
  if (!stage) return '待生成';
  const value = selectValue(stage, TASK_STAGE_OPTIONS, TASK_STAGE_SYNONYMS);
  return TASK_STAGE_OPTIONS.includes(value) ? value : '待生成';
}

export function stageToStatus(stage: string | undefined): ITask['status'] {
  const normalized = normalizeStage(stage) ?? '待生成';
  return STAGE_TO_STATUS[normalized] ?? 'pending';
}

export function recordToTask(
  { id, record }: BitableRawRecord,
  scriptTitleById: Map<string, string>,
  videoTitleById: Map<string, string>,
): ITask {
  const stage = normalizeStage(asSelect(record['当前阶段'])) ?? '待生成';
  const linkedScript = linkIds(record['关联脚本'])
    .map((rid) => scriptTitleById.get(rid))
    .filter(Boolean)
    .join('、');
  const finalVideo = linkIds(record['成品视频'])
    .map((vid) => videoTitleById.get(vid))
    .filter(Boolean)
    .join('、');
  const time = formatDateTime(record['创建时间']);
  return {
    id,
    taskName: asText(record['任务名称']),
    status: stageToStatus(stage),
    currentStage: stage,
    progressPercent: asNumber(record['进度百分比']),
    linkedScript,
    videoModel: asSelect(record['视频生成模型']),
    imageModel: asSelect(record['图像生成模型']),
    ttsVoice: asSelect(record['TTS音色']),
    resolution: asSelect(record['分辨率']),
    referenceImage: attachmentUrls(record['参考图'])[0] ?? '',
    segmentVideos: attachmentNames(record['分段视频']),
    finalVideo,
    estimatedFinishTime: formatDateTime(record['预计完成时间']),
    actualFinishTime: formatDateTime(record['实际完成时间']),
    errorLog: asText(record['错误日志']),
    notes: asText(record['备注']),
    createdAt: time,
    updatedAt: time,
  };
}

function taskModelFields(input: TaskInput | Partial<ITask>, record: Record<string, unknown>): void {
  if (input.videoModel !== undefined) {
    const value = selectValue(input.videoModel, TASK_VIDEO_MODELS, TASK_VIDEO_MODEL_SYNONYMS, 'Seedance');
    if (value) record['视频生成模型'] = value;
  }
  if (input.imageModel !== undefined) {
    const value = selectValue(input.imageModel, TASK_IMAGE_MODELS, TASK_IMAGE_MODEL_SYNONYMS, 'Seedream');
    if (value) record['图像生成模型'] = value;
  }
  if (input.ttsVoice !== undefined) {
    const value = selectValue(input.ttsVoice, TASK_TTS_VOICES, TASK_TTS_SYNONYMS, '温柔女声');
    if (value) record['TTS音色'] = value;
  }
  if (input.resolution !== undefined) {
    const value = selectValue(input.resolution, TASK_RESOLUTIONS, TASK_RESOLUTION_SYNONYMS, '1080P');
    if (value) record['分辨率'] = value;
  }
}

export function taskToRecord(input: TaskInput, ctx: LinkContext): Record<string, unknown> {
  const stage = normalizeStage(input.currentStage) ?? '待生成';
  const record: Record<string, unknown> = {
    任务名称: input.taskName,
    当前阶段: stage,
    进度百分比: input.progressPercent,
    错误日志: input.errorLog ?? '',
    备注: input.notes ?? '',
    创建时间: Date.now(),
  };
  taskModelFields(input, record);
  const estimated = parseDateToMs(input.estimatedFinishTime);
  if (estimated !== undefined) record['预计完成时间'] = estimated;
  const scriptId = ctx.scriptIdByTitle(input.linkedScript);
  if (scriptId) record['关联脚本'] = [scriptId];
  return record;
}

export function taskPatchToRecord(patch: Partial<ITask>, ctx: LinkContext): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if ('taskName' in patch) record['任务名称'] = patch.taskName;
  if ('currentStage' in patch) {
    const stage = normalizeStage(patch.currentStage);
    if (stage) record['当前阶段'] = stage;
  } else if ('status' in patch && patch.status) {
    const stage = STATUS_TO_STAGE[patch.status];
    if (stage) record['当前阶段'] = stage;
  }
  if ('progressPercent' in patch) record['进度百分比'] = patch.progressPercent;
  if ('errorLog' in patch) record['错误日志'] = patch.errorLog ?? '';
  if ('notes' in patch) record['备注'] = patch.notes ?? '';
  taskModelFields(patch, record);
  if ('estimatedFinishTime' in patch) {
    const estimated = parseDateToMs(patch.estimatedFinishTime);
    if (estimated !== undefined) record['预计完成时间'] = estimated;
  }
  if ('actualFinishTime' in patch) {
    const actual = parseDateToMs(patch.actualFinishTime);
    if (actual !== undefined) record['实际完成时间'] = actual;
  }
  if ('linkedScript' in patch && patch.linkedScript) {
    const scriptId = ctx.scriptIdByTitle(patch.linkedScript);
    if (scriptId) record['关联脚本'] = [scriptId];
  }
  if ('finalVideo' in patch && patch.finalVideo) {
    const videoId = ctx.videoIdByTitle(patch.finalVideo);
    if (videoId) record['成品视频'] = [videoId];
  }
  if ('referenceImage' in patch && patch.referenceImage && isHttpUrl(patch.referenceImage)) {
    record['参考图'] = [patch.referenceImage];
  }
  if ('segmentVideos' in patch && patch.segmentVideos) {
    const urls = patch.segmentVideos.filter(isHttpUrl);
    if (urls.length > 0) record['分段视频'] = urls;
  }
  return record;
}

// ---------- 视频成品库 (tblFb5d6x19VuBpm) ----------

const VIDEO_RESOLUTIONS = ['480P', '720P', '1080P'];
const VIDEO_TAG_OPTIONS = ['搞笑', '知识', '剧情', '美食', '美妆', '科技', '情感', '旅行', '音乐', '游戏'];
const VIDEO_PUBLISH_READ: Record<string, { status: IVideo['publishStatus']; platform: string }> = {
  未发布: { status: 'draft', platform: '' },
  已发布抖音: { status: 'published', platform: '抖音' },
  已发布视频号: { status: 'published', platform: '视频号' },
  已发布B站: { status: 'published', platform: 'B站' },
  多平台发布: { status: 'published', platform: '多平台' },
};
const VIDEO_PUBLISH_PLATFORMS = ['抖音', '视频号', 'B站'];

function publishLabel(status: IVideo['publishStatus'] | undefined, platform: string | undefined): string | undefined {
  if (!status) return undefined;
  if (status !== 'published') return '未发布';
  if (platform && VIDEO_PUBLISH_PLATFORMS.includes(platform)) return `已发布${platform}`;
  return '多平台发布';
}

/** recordToVideo 需要任务索引来反查关联任务/脚本/生成模型 */
export function recordToVideo(
  { id, record }: BitableRawRecord,
  linkedTask: { taskName: string; linkedScript: string; videoModel: string } | undefined,
): IVideo {
  const publish = VIDEO_PUBLISH_READ[asSelect(record['发布状态'])] ?? { status: 'draft' as const, platform: '' };
  const time = formatDateTime(record['创建时间']);
  return {
    id,
    videoTitle: asText(record['视频标题']),
    linkedScript: linkedTask?.linkedScript ?? '',
    linkedTask: linkedTask?.taskName ?? '',
    videoFile: attachmentUrls(record['成品文件'])[0] ?? '',
    coverImage: attachmentUrls(record['封面'])[0] ?? '',
    duration: asNumber(record['时长(秒)']),
    resolution: asSelect(record['分辨率']) || '1080P',
    generationModel: linkedTask?.videoModel ?? '',
    generationTime: time,
    playCount: asNumber(record['播放量']),
    likeCount: asNumber(record['点赞数']),
    publishStatus: publish.status,
    publishPlatform: publish.platform,
    tags: asMulti(record['标签']),
    createdAt: time,
    updatedAt: time,
  };
}

export function videoToRecord(input: VideoInput): Record<string, unknown> {
  const record: Record<string, unknown> = {
    视频标题: input.videoTitle,
    '时长(秒)': input.duration,
    播放量: input.playCount,
    点赞数: input.likeCount,
    创建时间: Date.now(),
  };
  const resolution = selectValue(input.resolution, VIDEO_RESOLUTIONS, TASK_RESOLUTION_SYNONYMS, '1080P');
  if (resolution) record['分辨率'] = resolution;
  const publish = publishLabel(input.publishStatus, input.publishPlatform);
  if (publish) record['发布状态'] = publish;
  const tags = multiSelectValue(input.tags, VIDEO_TAG_OPTIONS);
  if (tags) record['标签'] = tags;
  if (input.coverImage && isHttpUrl(input.coverImage)) record['封面'] = [input.coverImage];
  return record;
}

export function videoPatchToRecord(patch: Partial<IVideo>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if ('videoTitle' in patch) record['视频标题'] = patch.videoTitle;
  if ('duration' in patch) record['时长(秒)'] = patch.duration;
  if ('playCount' in patch) record['播放量'] = patch.playCount;
  if ('likeCount' in patch) record['点赞数'] = patch.likeCount;
  if ('resolution' in patch) {
    const resolution = selectValue(patch.resolution, VIDEO_RESOLUTIONS, TASK_RESOLUTION_SYNONYMS, '1080P');
    if (resolution) record['分辨率'] = resolution;
  }
  if ('publishStatus' in patch) {
    const publish = publishLabel(patch.publishStatus, patch.publishPlatform ?? '');
    if (publish) record['发布状态'] = publish;
  }
  if ('tags' in patch) {
    const tags = multiSelectValue(patch.tags, VIDEO_TAG_OPTIONS);
    if (tags) record['标签'] = tags;
  }
  return record;
}

// ---------- 提示词模板库 (tblWkhXslcn1JhTk) ----------

const PROMPT_TYPES = ['脚本生成', '画面生成', '视频生成', '爆款分析', '字幕优化', '配音文案'];
const PROMPT_TYPE_SYNONYMS: Record<string, string> = {
  素材拆解: '爆款分析',
  视频参数: '视频生成',
  文案润色: '字幕优化',
};
const PROMPT_MODELS = ['DeepSeek', 'Qwen', '豆包', 'GPT', 'FLUX', 'Wan', '可灵', 'Seedream'];

function promptModels(input: string | undefined): string[] | undefined {
  if (!input) return [];
  return input
    .split(/[/,，、\s]+/)
    .map((m) => m.trim())
    .filter((m) => PROMPT_MODELS.includes(m));
}

export function recordToPrompt({ id, record }: BitableRawRecord): IPromptTemplate {
  const time = formatDateTime(record['创建时间']);
  return {
    id,
    templateName: asText(record['模板名称']),
    type: asSelect(record['类型']) || '脚本生成',
    applicableModel: asMulti(record['适用模型']).join(' / '),
    promptContent: asText(record['提示词内容']),
    variableDescription: asText(record['变量说明']),
    usageCount: asNumber(record['使用次数']),
    avgEffectScore: asNumber(record['平均效果评分']),
    createdAt: time,
    updatedAt: time,
  };
}

export function promptToRecord(input: PromptInput): Record<string, unknown> {
  const record: Record<string, unknown> = {
    模板名称: input.templateName,
    提示词内容: input.promptContent,
    变量说明: input.variableDescription,
    使用次数: input.usageCount,
    平均效果评分: input.avgEffectScore,
    创建时间: Date.now(),
  };
  const type = selectValue(input.type, PROMPT_TYPES, PROMPT_TYPE_SYNONYMS, '脚本生成');
  if (type) record['类型'] = type;
  const models = promptModels(input.applicableModel);
  if (models && models.length > 0) record['适用模型'] = models;
  return record;
}

export function promptPatchToRecord(patch: Partial<IPromptTemplate>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if ('templateName' in patch) record['模板名称'] = patch.templateName;
  if ('promptContent' in patch) record['提示词内容'] = patch.promptContent;
  if ('variableDescription' in patch) record['变量说明'] = patch.variableDescription;
  if ('usageCount' in patch) record['使用次数'] = patch.usageCount;
  if ('avgEffectScore' in patch) record['平均效果评分'] = patch.avgEffectScore;
  if ('type' in patch) {
    const type = selectValue(patch.type, PROMPT_TYPES, PROMPT_TYPE_SYNONYMS, '脚本生成');
    if (type) record['类型'] = type;
  }
  if ('applicableModel' in patch) {
    const models = promptModels(patch.applicableModel);
    if (models && models.length > 0) record['适用模型'] = models;
  }
  return record;
}
