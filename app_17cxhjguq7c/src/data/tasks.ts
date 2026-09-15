// EXPORTS: ITask, TaskInput, MOCK_TASKS, TASK_STATUS_OPTIONS, TASK_TYPE_OPTIONS, VIDEO_MODEL_OPTIONS, IMAGE_MODEL_OPTIONS, TTS_VOICE_OPTIONS, RESOLUTION_OPTIONS
export interface ITask {
  id: string;
  taskName: string;
  /** 多维表格任务表无此字段，仅历史数据兼容，不再持久化 */
  taskType?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStage: string;
  progressPercent: number;
  linkedScript: string;
  videoModel: string;
  imageModel: string;
  ttsVoice: string;
  resolution: string;
  referenceImage?: string;
  segmentVideos: string[];
  finalVideo?: string;
  estimatedFinishTime?: string;
  actualFinishTime?: string;
  errorLog?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>;

export const TASK_STATUS_OPTIONS: { value: ITask['status']; label: string }[] = [
  { value: 'pending', label: '待开始' },
  { value: 'running', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
];

export const VIDEO_MODEL_OPTIONS = ['Wan2.1本地', '可灵API', 'Seedance', 'Sora', 'Luma', 'Stable Video Diffusion'];
export const IMAGE_MODEL_OPTIONS = ['FLUX', 'Seedream', 'Midjourney', 'Stable Diffusion'];
export const TTS_VOICE_OPTIONS = ['温柔女声', '活力女声', '沉稳男声', '青年男声', '磁性旁白', '可爱童声'];
export const RESOLUTION_OPTIONS = ['480P', '720P', '1080P'];

export const MOCK_TASKS: ITask[] = [
  {
    id: 't1',
    taskName: 'AI教程视频生成01',
    taskType: '脚本转视频',
    status: 'running',
    currentStage: '生成分镜画面',
    progressPercent: 45,
    linkedScript: 'AI做视频保姆级教程',
    videoModel: 'Vidu 2.0',
    imageModel: '即梦3.0',
    ttsVoice: '活力男声',
    resolution: '1080x1920 竖屏',
    referenceImage: '',
    segmentVideos: ['分段01_开场.mp4', '分段02_口播.mp4'],
    finalVideo: '',
    estimatedFinishTime: '2026-08-27 18:00',
    actualFinishTime: '',
    errorLog: '',
    notes: '优先保证画面风格统一',
    createdAt: '2026-08-26 14:10',
    updatedAt: '2026-08-27 09:30',
  },
  {
    id: 't2',
    taskName: '深夜食堂视频生成02',
    taskType: '脚本转视频',
    status: 'pending',
    currentStage: '待开始',
    progressPercent: 0,
    linkedScript: '深夜食堂治愈企划',
    videoModel: '可灵2.1',
    imageModel: 'Seedream 3.0',
    ttsVoice: '知性女声',
    resolution: '1080x1920 竖屏',
    referenceImage: '',
    segmentVideos: [],
    finalVideo: '',
    estimatedFinishTime: '2026-08-28 12:00',
    actualFinishTime: '',
    errorLog: '',
    notes: '',
    createdAt: '2026-08-27 08:40',
    updatedAt: '2026-08-27 08:40',
  },
  {
    id: 't3',
    taskName: 'AI教程视频生成03',
    taskType: '脚本转视频',
    status: 'completed',
    currentStage: '成品合成完成',
    progressPercent: 100,
    linkedScript: 'AI做视频保姆级教程',
    videoModel: 'Vidu 2.0',
    imageModel: '即梦3.0',
    ttsVoice: '活力男声',
    resolution: '1080x1920 竖屏',
    referenceImage: '',
    segmentVideos: ['分段01_开场.mp4', '分段02_口播.mp4', '分段03_演示.mp4'],
    finalVideo: '已推送至视频成品库',
    estimatedFinishTime: '2026-08-25 18:00',
    actualFinishTime: '2026-08-25 16:40',
    errorLog: '',
    notes: '',
    createdAt: '2026-08-25 10:00',
    updatedAt: '2026-08-25 16:40',
  },
  {
    id: 't4',
    taskName: '好物测评视频生成01',
    taskType: '图文成片',
    status: 'failed',
    currentStage: '图像生成',
    progressPercent: 30,
    linkedScript: '办公室解压好物测评',
    videoModel: '即梦视频',
    imageModel: '即梦3.0',
    ttsVoice: '温暖女声',
    resolution: '1080x1920 竖屏',
    referenceImage: '',
    segmentVideos: ['分段01_俯拍.mp4'],
    finalVideo: '',
    estimatedFinishTime: '2026-08-26 20:00',
    actualFinishTime: '',
    errorLog: '分段2图像生成超时（模型返回429），已自动重试2次仍失败',
    notes: '',
    createdAt: '2026-08-26 11:20',
    updatedAt: '2026-08-26 19:50',
  },
  {
    id: 't5',
    taskName: '文案课程视频生成01',
    taskType: '模板套用',
    status: 'paused',
    currentStage: 'TTS配音',
    progressPercent: 70,
    linkedScript: '爆款文案黄金3秒法则',
    videoModel: '可灵2.1',
    imageModel: 'Seedream 3.0',
    ttsVoice: '知性女声',
    resolution: '1920x1080 横屏',
    referenceImage: '',
    segmentVideos: ['分段01_大字报.mp4', '分段02_口播.mp4'],
    finalVideo: '',
    estimatedFinishTime: '2026-08-27 20:00',
    actualFinishTime: '',
    errorLog: '',
    notes: '等待客户确认配音音色后继续',
    createdAt: '2026-08-26 16:05',
    updatedAt: '2026-08-27 10:12',
  },
];
