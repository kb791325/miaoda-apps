// EXPORTS: IVideo, VideoInput, MOCK_VIDEOS, PUBLISH_PLATFORMS, PUBLISH_STATUS_OPTIONS
export interface IVideo {
  id: string;
  videoTitle: string;
  linkedScript: string;
  linkedTask: string;
  videoFile: string;
  coverImage: string;
  duration: number;
  resolution: string;
  generationModel: string;
  generationTime: string;
  playCount: number;
  likeCount: number;
  publishStatus: 'draft' | 'published' | 'withdrawn' | 'archived';
  publishPlatform?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type VideoInput = Omit<IVideo, 'id' | 'createdAt' | 'updatedAt'>;

export const PUBLISH_PLATFORMS = ['抖音', '视频号', 'B站'];

export const PUBLISH_STATUS_OPTIONS: { value: IVideo['publishStatus']; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'withdrawn', label: '已撤回' },
  { value: 'archived', label: '已归档' },
];

const COVERS = {
  aiTutorial: '/spark/app/app_17cxhjguq7c/runtime/api/v1/storage/object/bucket_aadkr6l4xu6cw_static/static%2Faadkr6hguzovs_ve_miaoda',
  officeGoods: '/spark/app/app_17cxhjguq7c/runtime/api/v1/storage/object/bucket_aadkr6l4xu6cw_static/static%2Faadkr6gyvtgas_ve_miaoda',
  nightKitchen: '/spark/app/app_17cxhjguq7c/runtime/api/v1/storage/object/bucket_aadkr6l4xu6cw_static/static%2Faadkr6kwe7aas_ve_miaoda',
  copywriting: '/spark/app/app_17cxhjguq7c/runtime/api/v1/storage/object/bucket_aadkr6l4xu6cw_static/static%2Faadkr6ketviku_ve_miaoda',
  travel: '/spark/app/app_17cxhjguq7c/runtime/api/v1/storage/object/bucket_aadkr6l4xu6cw_static/static%2Faadkr6ge4jypu_ve_miaoda',
};

export const MOCK_VIDEOS: IVideo[] = [
  {
    id: 'v1',
    videoTitle: '3分钟学会用AI做出电影感视频',
    linkedScript: 'AI做视频保姆级教程',
    linkedTask: 'AI教程视频生成03',
    videoFile: '',
    coverImage: COVERS.aiTutorial,
    duration: 58,
    resolution: '1080x1920 竖屏',
    generationModel: 'Vidu 2.0',
    generationTime: '2026-08-25 16:40',
    playCount: 12400,
    likeCount: 2300,
    publishStatus: 'published',
    publishPlatform: '抖音',
    tags: ['知识', '科技'],
    createdAt: '2026-08-25 16:45',
    updatedAt: '2026-08-26 18:20',
  },
  {
    id: 'v2',
    videoTitle: '办公室解压好物TOP5',
    linkedScript: '办公室解压好物测评',
    linkedTask: '好物测评视频生成01',
    videoFile: '',
    coverImage: COVERS.officeGoods,
    duration: 45,
    resolution: '1080x1920 竖屏',
    generationModel: '即梦视频',
    generationTime: '2026-08-23 15:20',
    playCount: 8600,
    likeCount: 1500,
    publishStatus: 'published',
    publishPlatform: '抖音',
    tags: ['搞笑', '剧情'],
    createdAt: '2026-08-23 15:25',
    updatedAt: '2026-08-25 12:00',
  },
  {
    id: 'v3',
    videoTitle: '深夜食堂治愈企划 先导片',
    linkedScript: '深夜食堂治愈企划',
    linkedTask: '深夜食堂视频生成02',
    videoFile: '',
    coverImage: COVERS.nightKitchen,
    duration: 62,
    resolution: '1080x1920 竖屏',
    generationModel: '可灵2.1',
    generationTime: '2026-08-22 20:10',
    playCount: 5300,
    likeCount: 980,
    publishStatus: 'withdrawn',
    publishPlatform: '视频号',
    tags: ['美食', '治愈'],
    createdAt: '2026-08-22 20:15',
    updatedAt: '2026-08-24 09:10',
  },
  {
    id: 'v4',
    videoTitle: '爆款文案黄金3秒法则',
    linkedScript: '爆款文案黄金3秒法则',
    linkedTask: '文案课程视频生成01',
    videoFile: '',
    coverImage: COVERS.copywriting,
    duration: 75,
    resolution: '1920x1080 横屏',
    generationModel: '可灵2.1',
    generationTime: '2026-08-26 17:50',
    playCount: 0,
    likeCount: 0,
    publishStatus: 'draft',
    publishPlatform: '',
    tags: ['知识'],
    createdAt: '2026-08-26 17:55',
    updatedAt: '2026-08-26 17:55',
  },
  {
    id: 'v5',
    videoTitle: '一键生成旅行大片 AI实测',
    linkedScript: 'AI做视频保姆级教程',
    linkedTask: 'AI教程视频生成03',
    videoFile: '',
    coverImage: COVERS.travel,
    duration: 41,
    resolution: '1080x1920 竖屏',
    generationModel: 'Vidu 2.0',
    generationTime: '2026-08-24 11:30',
    playCount: 21000,
    likeCount: 4600,
    publishStatus: 'published',
    publishPlatform: '抖音',
    tags: ['旅行', '科技'],
    createdAt: '2026-08-24 11:35',
    updatedAt: '2026-08-27 08:00',
  },
];
