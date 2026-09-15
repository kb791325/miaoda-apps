// 全局数据层：读写飞书多维表格（feishu-bitable 插件实例）
// - 首次 useWorkshop() 触发异步加载全量数据（空表自动用 mock 种子初始化），业务数据不依赖本地缓存
// - 新增/编辑/删除均为「先写多维表格，成功后再更新本地状态」——写入失败时 UI 保持不变、由调用方捕获错误提示
import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { logger, scopedStorage } from '@lark-apaas/client-toolkit-lite';

import { IMaterial, MaterialInput, MOCK_MATERIALS } from '@/data/materials';
import { IPromptTemplate, PromptInput, MOCK_PROMPTS } from '@/data/prompts';
import { IScript, ScriptInput, MOCK_SCRIPTS } from '@/data/scripts';
import { ITask, TaskInput, MOCK_TASKS } from '@/data/tasks';
import { IVideo, VideoInput, MOCK_VIDEOS } from '@/data/videos';
import { addRecords, deleteRecords, fetchAllRecords, updateRecord, type BitableKey } from '@/lib/bitable';
import * as map from '@/lib/bitable-mapping';

export interface IActivity {
  id: string;
  type: 'material' | 'script' | 'task' | 'video' | 'prompt';
  message: string;
  operator: string;
  time: string;
}

export interface WorkshopState {
  materials: IMaterial[];
  scripts: IScript[];
  tasks: ITask[];
  videos: IVideo[];
  prompts: IPromptTemplate[];
  activities: IActivity[];
}

const KEYS = {
  quickActions: '__app_video_workshop_quick_actions',
  taskFilter: '__app_video_workshop_task_status',
};

const OPERATOR = '张浩然';

function nowStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function genId(prefix: string): string {
  return `act_${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

let state: WorkshopState = {
  materials: [],
  scripts: [],
  tasks: [],
  videos: [],
  prompts: [],
  activities: [],
};

const listeners = new Set<() => void>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

// link 字段解析索引：标题 → 记录 ID
const scriptIdByTitle = new Map<string, string>();
const videoIdByTitle = new Map<string, string>();

const linkContext: map.LinkContext = {
  scriptIdByTitle: (title) => scriptIdByTitle.get(title),
  videoIdByTitle: (title) => videoIdByTitle.get(title),
};

function setState(updater: (s: WorkshopState) => WorkshopState) {
  state = updater(state);
  listeners.forEach((l) => l());
}

export function subscribeWorkshop(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWorkshopState(): WorkshopState {
  return state;
}

export function useWorkshop(): WorkshopState {
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribeWorkshop, getWorkshopState);
}

function persistError(action: string, error: unknown) {
  logger.error(`[bitable] ${action} failed`, String(error));
}

/** 把多维表格写入异常转成带具体信息的用户可读文案（供页面 toast 使用） */
export function persistErrorText(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : String(error ?? '').trim();
  return raw ? `${fallback}：${raw}` : `${fallback}，请稍后重试`;
}

function pushActivity(type: IActivity['type'], message: string): IActivity[] {
  return [{ id: genId('a'), type, message, operator: OPERATOR, time: nowStr().slice(5) }, ...state.activities].slice(0, 20);
}

/* ---------- 初始加载（含空表种子） ---------- */

async function safeFetch(key: BitableKey) {
  try {
    return await fetchAllRecords(key);
  } catch (error) {
    logger.error(`[bitable] fetch ${key} failed`, String(error));
    return [];
  }
}

async function seedIfEmpty(
  key: BitableKey,
  records: map.BitableRawRecord[],
  isValid: (record: Record<string, unknown>) => boolean,
  buildSeeds: () => Record<string, unknown>[],
): Promise<void> {
  if (records.some((r) => isValid(r.record))) return;
  try {
    const seeds = buildSeeds();
    const ids = await addRecords(key, seeds);
    ids.forEach((id, index) => {
      records.push({ id, record: seeds[index] ?? {} });
    });
  } catch (error) {
    persistError(`${key} seed`, error);
  }
}

async function loadAll(): Promise<void> {
  const [materialRecords, scriptRecords, taskRecords, videoRecords, promptRecords] = await Promise.all([
    safeFetch('materials'),
    safeFetch('scripts'),
    safeFetch('tasks'),
    safeFetch('videos'),
    safeFetch('prompts'),
  ]);

  // 空表用 mock 数据做种子，保证六大模块开箱可用
  await seedIfEmpty('scripts', scriptRecords, (r) => map.hasText(r['脚本标题']), () =>
    MOCK_SCRIPTS.map((s) => map.scriptToRecord({ scriptTitle: s.scriptTitle, contentType: s.contentType, duration: s.duration, theme: s.theme, shots: s.shots })),
  );

  const scripts = scriptRecords
    .filter((r) => map.hasText(r.record['脚本标题']))
    .map((r) => map.recordToScript(r));
  scripts.forEach((s) => scriptIdByTitle.set(s.scriptTitle, s.id));
  const scriptTitleById = new Map(scripts.map((s) => [s.id, s.scriptTitle]));

  // 视频种子 + 标题索引（先于任务种子，任务种子写入成品视频 link 时需要反查 ID）
  await seedIfEmpty('videos', videoRecords, (r) => map.hasText(r['视频标题']), () =>
    MOCK_VIDEOS.map((v) => map.videoToRecord({ videoTitle: v.videoTitle, linkedScript: v.linkedScript, linkedTask: v.linkedTask, videoFile: v.videoFile, coverImage: v.coverImage, duration: v.duration, resolution: v.resolution, generationModel: v.generationModel, generationTime: v.generationTime, playCount: v.playCount, likeCount: v.likeCount, publishStatus: v.publishStatus, publishPlatform: v.publishPlatform, tags: v.tags })),
  );
  const videosFirstPass = videoRecords
    .filter((r) => map.hasText(r.record['视频标题']))
    .map((r) => map.recordToVideo(r, undefined));
  videosFirstPass.forEach((v) => videoIdByTitle.set(v.videoTitle, v.id));
  const videoTitleById = new Map(videosFirstPass.map((v) => [v.id, v.videoTitle]));

  // 任务种子（脚本 / 视频索引均已就绪）
  await seedIfEmpty('tasks', taskRecords, (r) => map.hasText(r['任务名称']), () =>
    MOCK_TASKS.map((t) =>
      map.taskToRecord(
        {
          taskName: t.taskName,
          status: t.status,
          currentStage: t.currentStage,
          progressPercent: t.progressPercent,
          linkedScript: t.linkedScript,
          videoModel: t.videoModel,
          imageModel: t.imageModel,
          ttsVoice: t.ttsVoice,
          resolution: t.resolution,
          referenceImage: t.referenceImage,
          segmentVideos: t.segmentVideos,
          finalVideo: t.finalVideo,
          estimatedFinishTime: t.estimatedFinishTime,
          actualFinishTime: t.actualFinishTime,
          errorLog: t.errorLog,
          notes: t.notes,
        },
        linkContext,
      ),
    ),
  );
  await seedIfEmpty('materials', materialRecords, (r) => map.hasText(r['视频标题']), () => MOCK_MATERIALS.map((m) => map.materialToRecord(m)));

  // 任务（关联脚本 / 成品视频 link → 标题）
  const tasks = taskRecords
    .filter((r) => map.hasText(r.record['任务名称']))
    .map((r) => map.recordToTask(r, scriptTitleById, videoTitleById));

  // 视频 ← 任务反查（成品视频 link 所在任务），补齐关联脚本 / 关联任务 / 生成模型
  const taskByVideoId = new Map<string, ITask>();
  for (const record of taskRecords) {
    const task = tasks.find((t) => t.id === record.id);
    if (!task) continue;
    for (const videoId of map.linkIds(record.record['成品视频'])) {
      taskByVideoId.set(videoId, task);
    }
  }
  const videos = videosFirstPass.map((v) => {
    const linked = taskByVideoId.get(v.id);
    return linked ? { ...v, linkedTask: linked.taskName, linkedScript: linked.linkedScript, generationModel: linked.videoModel } : v;
  });

  const materials = materialRecords
    .filter((r) => map.hasText(r.record['视频标题']))
    .map((r) => map.recordToMaterial(r));
  const prompts = promptRecords
    .filter((r) => map.hasText(r.record['模板名称']))
    .map((r) => map.recordToPrompt(r));

  setState(() => ({
    materials,
    scripts,
    tasks,
    videos,
    prompts,
    activities: deriveActivities({ materials, scripts, tasks, videos, prompts }),
  }));
}

function deriveActivities(data: Omit<WorkshopState, 'activities'>): IActivity[] {
  const items: { type: IActivity['type']; message: string; time: string }[] = [];
  for (const v of data.videos) {
    items.push({
      type: 'video',
      message: `${v.publishStatus === 'published' ? '新发布' : '新增'}视频「${v.videoTitle}」`,
      time: v.updatedAt || v.createdAt,
    });
  }
  for (const t of data.tasks) {
    const suffix = t.status === 'completed' ? '已完成' : t.status === 'failed' ? '生成失败' : `进行中 · ${t.currentStage}`;
    items.push({ type: 'task', message: `任务「${t.taskName}」${suffix}`, time: t.updatedAt || t.createdAt });
  }
  for (const m of data.materials) {
    items.push({ type: 'material', message: `新增拆解素材「${m.videoTitle}」`, time: m.updatedAt || m.createdAt });
  }
  for (const s of data.scripts) {
    items.push({ type: 'script', message: `AI生成脚本「${s.scriptTitle}」`, time: s.updatedAt || s.createdAt });
  }
  for (const p of data.prompts) {
    items.push({ type: 'prompt', message: `新增模板「${p.templateName}」`, time: p.updatedAt || p.createdAt });
  }
  return items
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .slice(0, 8)
    .map((item, index) => ({ ...item, id: `seed_${index}`, operator: OPERATOR, time: item.time.slice(5) }));
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = loadAll()
      .then(() => {
        loaded = true;
      })
      .catch((error) => {
        logger.error('[bitable] workshop data load failed', String(error));
        toast.error('多维表格数据加载失败，请刷新重试');
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  await loadPromise;
}

/** 供详情页等非 hook 场景等待数据就绪 */
export async function ready(): Promise<void> {
  await ensureLoaded();
}

/* ---------- 爆款素材：先写入多维表格，成功后才更新本地状态 ---------- */

export async function addMaterial(input: MaterialInput): Promise<IMaterial> {
  const ids = await addRecords('materials', [map.materialToRecord(input)]);
  const serverId = ids[0];
  if (!serverId) throw new Error('多维表格未返回新记录 ID');
  const now = nowStr();
  const material: IMaterial = { ...input, id: serverId, createdAt: now, updatedAt: now };
  setState((s) => ({ ...s, materials: [material, ...s.materials], activities: pushActivity('material', `新增拆解素材「${input.videoTitle}」`) }));
  return material;
}

export async function updateMaterial(id: string, patch: Partial<IMaterial>): Promise<void> {
  await updateRecord('materials', id, map.materialPatchToRecord(patch));
  setState((s) => ({
    ...s,
    materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: nowStr() } : m)),
    activities: pushActivity('material', `更新素材「${patch.videoTitle ?? ''}」`),
  }));
}

/* ---------- 分镜脚本 ---------- */

export async function addScript(input: ScriptInput): Promise<IScript> {
  const ids = await addRecords('scripts', [map.scriptToRecord(input)]);
  const serverId = ids[0];
  if (!serverId) throw new Error('多维表格未返回新记录 ID');
  const now = nowStr();
  const script: IScript = { ...input, id: serverId, createdAt: now, updatedAt: now };
  scriptIdByTitle.set(input.scriptTitle, serverId);
  setState((s) => ({ ...s, scripts: [script, ...s.scripts], activities: pushActivity('script', `新增脚本「${input.scriptTitle}」`) }));
  return script;
}

export async function updateScript(id: string, patch: Partial<IScript>): Promise<void> {
  await updateRecord('scripts', id, map.scriptPatchToRecord(patch));
  setState((s) => ({
    ...s,
    scripts: s.scripts.map((sc) => (sc.id === id ? { ...sc, ...patch, updatedAt: nowStr() } : sc)),
    activities: pushActivity('script', `更新脚本「${patch.scriptTitle ?? ''}」`),
  }));
}

/* ---------- 生成任务 ---------- */

export async function addTask(input: TaskInput): Promise<ITask> {
  const ids = await addRecords('tasks', [map.taskToRecord(input, linkContext)]);
  const serverId = ids[0];
  if (!serverId) throw new Error('多维表格未返回新记录 ID');
  const now = nowStr();
  const task: ITask = { ...input, id: serverId, createdAt: now, updatedAt: now };
  setState((s) => ({ ...s, tasks: [task, ...s.tasks], activities: pushActivity('task', `创建任务「${input.taskName}」`) }));
  return task;
}

export async function updateTask(id: string, patch: Partial<ITask>): Promise<void> {
  await updateRecord('tasks', id, map.taskPatchToRecord(patch, linkContext));
  setState((s) => {
    const target = s.tasks.find((t) => t.id === id);
    return {
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowStr() } : t)),
      activities: pushActivity('task', `任务「${target?.taskName ?? ''}」状态更新为 ${patch.status ?? target?.status ?? ''}`),
    };
  });
}

export async function deleteTasks(ids: string[]): Promise<void> {
  if (ids.length > 0) {
    await deleteRecords('tasks', ids);
  }
  setState((s) => ({ ...s, tasks: s.tasks.filter((t) => !ids.includes(t.id)) }));
}

/* ---------- 视频成品 ---------- */

export async function addVideo(input: VideoInput): Promise<IVideo> {
  const ids = await addRecords('videos', [map.videoToRecord(input)]);
  const serverId = ids[0];
  if (!serverId) throw new Error('多维表格未返回新记录 ID');
  const now = nowStr();
  const video: IVideo = { ...input, id: serverId, createdAt: now, updatedAt: now };
  videoIdByTitle.set(input.videoTitle, serverId);
  setState((s) => ({ ...s, videos: [video, ...s.videos], activities: pushActivity('video', `新增成品视频「${input.videoTitle}」`) }));
  return video;
}

export async function updateVideo(id: string, patch: Partial<IVideo>): Promise<void> {
  await updateRecord('videos', id, map.videoPatchToRecord(patch));
  setState((s) => ({
    ...s,
    videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: nowStr() } : v)),
    activities: pushActivity('video', `更新视频「${patch.videoTitle ?? ''}」发布状态`),
  }));
}

/* ---------- 提示词模板 ---------- */

export async function addPrompt(input: PromptInput): Promise<IPromptTemplate> {
  const ids = await addRecords('prompts', [map.promptToRecord(input)]);
  const serverId = ids[0];
  if (!serverId) throw new Error('多维表格未返回新记录 ID');
  const now = nowStr();
  const prompt: IPromptTemplate = { ...input, id: serverId, createdAt: now, updatedAt: now };
  setState((s) => ({ ...s, prompts: [prompt, ...s.prompts], activities: pushActivity('prompt', `新增模板「${input.templateName}」`) }));
  return prompt;
}

export async function updatePrompt(id: string, patch: Partial<IPromptTemplate>): Promise<void> {
  await updateRecord('prompts', id, map.promptPatchToRecord(patch));
  setState((s) => ({
    ...s,
    prompts: s.prompts.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowStr() } : p)),
  }));
}

/* ---------- 快捷操作历史 / 任务筛选缓存（本地 UI 偏好，非业务数据） ---------- */

export function getQuickActions(): string[] {
  try {
    const raw = scopedStorage.getItem(KEYS.quickActions);
    if (raw) return JSON.parse(raw) as string[];
  } catch (error) {
    logger.warn('quick actions read failed', String(error));
  }
  return [];
}

export function recordQuickAction(label: string): void {
  try {
    const next = [label, ...getQuickActions().filter((l) => l !== label)].slice(0, 4);
    scopedStorage.setItem(KEYS.quickActions, JSON.stringify(next));
  } catch (error) {
    logger.warn('quick actions write failed', String(error));
  }
}

export function loadTaskFilter(): string {
  return scopedStorage.getItem(KEYS.taskFilter) ?? 'all';
}

export function saveTaskFilter(value: string): void {
  scopedStorage.setItem(KEYS.taskFilter, value);
}
