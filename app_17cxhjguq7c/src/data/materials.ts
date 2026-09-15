// EXPORTS: IMaterial, MaterialInput, MOCK_MATERIALS, CONTENT_TYPES, DISASSEMBLY_STATUS_LABELS, RATING_LEVELS
export interface IMaterial {
  id: string;
  videoTitle: string;
  douyinLink: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  completionRate: number;
  fiveDimensions: {
    completionPower: number;
    interactionPotential: number;
    contentQuality: number;
    platformFit: number;
    spreadPotential: number;
  };
  compositeScore: number;
  ratingLevel: 'S' | 'A' | 'B' | 'C';
  contentType: string;
  disassemblyStatus: 'pending' | 'processing' | 'completed' | 'failed';
  videoScript: string;
  sceneDescription: string;
  hookAnalysis: string;
  bgm: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type MaterialInput = Omit<IMaterial, 'id' | 'createdAt' | 'updatedAt'>;

export const CONTENT_TYPES = ['搞笑', '知识', '剧情', '美食', '美妆', '科技', '情感', '旅行', '音乐', '游戏', '其他'];
export const MATERIAL_TAG_OPTIONS = ['搞笑', '感动', '震惊', '治愈', '燃', '悬疑', '愤怒', '温馨', '焦虑', '期待'];

export const DISASSEMBLY_STATUS_LABELS: Record<IMaterial['disassemblyStatus'], string> = {
  pending: '待拆解',
  processing: '拆解中',
  completed: '已完成',
  failed: '拆解失败',
};

export const RATING_LEVELS: IMaterial['ratingLevel'][] = ['S', 'A', 'B', 'C'];

export const MOCK_MATERIALS: IMaterial[] = [
  {
    id: 'm1',
    videoTitle: '3个万能公式 让开场3秒留住人',
    douyinLink: 'https://v.douyin.com/iRyuSx/',
    author: '运营老王',
    likes: 152000,
    comments: 8900,
    shares: 12400,
    completionRate: 42.5,
    fiveDimensions: { completionPower: 88, interactionPotential: 92, contentQuality: 85, platformFit: 90, spreadPotential: 89 },
    compositeScore: 89,
    ratingLevel: 'S',
    contentType: '知识科普',
    disassemblyStatus: 'completed',
    videoScript: '90%的人开场就输了，因为你没有用这3个公式。第一，反常识结论前置……',
    sceneDescription: '白底大字报开场 + 真人出镜口播，节奏卡点切镜',
    hookAnalysis: '反常识结论前置 + 数字量化承诺，3秒内制造认知缺口',
    bgm: '轻快电子鼓点',
    tags: ['震惊', '期待'],
    createdAt: '2026-08-20 10:12',
    updatedAt: '2026-08-21 09:30',
  },
  {
    id: 'm2',
    videoTitle: '沉浸式开箱 办公室解压好物TOP5',
    douyinLink: 'https://v.douyin.com/iKqtAw/',
    author: '北漂小鹿',
    likes: 98000,
    comments: 5600,
    shares: 4300,
    completionRate: 35.2,
    fiveDimensions: { completionPower: 78, interactionPotential: 85, contentQuality: 80, platformFit: 82, spreadPotential: 76 },
    compositeScore: 80,
    ratingLevel: 'A',
    contentType: '好物种草',
    disassemblyStatus: 'completed',
    videoScript: '今天给打工人安利5个工位解压神器，第3个我回购了三次……',
    sceneDescription: '桌面俯拍开箱 + 手部特写，ASMR 收音',
    hookAnalysis: 'TOP5 倒计时结构 + 悬念留到最后一个，拉动完播',
    bgm: 'Lo-fi 轻爵士',
    tags: ['治愈', '期待'],
    createdAt: '2026-08-21 14:22',
    updatedAt: '2026-08-22 11:05',
  },
  {
    id: 'm3',
    videoTitle: '深夜食堂 第4集 一个人的泡面仪式感',
    douyinLink: 'https://v.douyin.com/iWenRt/',
    author: '阿岚的深夜厨房',
    likes: 310000,
    comments: 22000,
    shares: 41000,
    completionRate: 51.8,
    fiveDimensions: { completionPower: 93, interactionPotential: 90, contentQuality: 94, platformFit: 88, spreadPotential: 95 },
    compositeScore: 92,
    ratingLevel: 'S',
    contentType: '美食探店',
    disassemblyStatus: 'completed',
    videoScript: '加完班的夜晚，给自己煮一碗有仪式感的泡面……',
    sceneDescription: '暖光厨房实景 + 慢镜头食物质感，治愈系调色',
    hookAnalysis: '情绪共鸣开场「加完班的夜晚」，直击都市独居人群',
    bgm: 'City Pop 慢速',
    tags: ['温馨', '治愈'],
    createdAt: '2026-08-22 21:40',
    updatedAt: '2026-08-23 08:15',
  },
  {
    id: 'm4',
    videoTitle: '反转短剧 老板的隐藏身份',
    douyinLink: 'https://v.douyin.com/iZxPmK/',
    author: '爆梗工作室',
    likes: 205000,
    comments: 18000,
    shares: 26000,
    completionRate: 48.6,
    fiveDimensions: { completionPower: 90, interactionPotential: 88, contentQuality: 82, platformFit: 86, spreadPotential: 84 },
    compositeScore: 86,
    ratingLevel: 'A',
    contentType: '剧情演绎',
    disassemblyStatus: 'processing',
    videoScript: '新来的实习生竟敢顶撞老板，下一秒全员惊呆……',
    sceneDescription: '办公室情景剧三机位，快切 + 表情特写',
    hookAnalysis: '强冲突对话开场，10秒内埋下身份反转悬念',
    bgm: '悬疑弦乐转欢快',
    tags: ['悬疑', '震惊'],
    createdAt: '2026-08-24 16:08',
    updatedAt: '2026-08-25 10:44',
  },
  {
    id: 'm5',
    videoTitle: '普通人如何用AI做副业 亲测有效',
    douyinLink: 'https://v.douyin.com/iQwLdE/',
    author: '效率研究所',
    likes: 46000,
    comments: 3100,
    shares: 2800,
    completionRate: 28.4,
    fiveDimensions: { completionPower: 65, interactionPotential: 72, contentQuality: 70, platformFit: 68, spreadPotential: 66 },
    compositeScore: 68,
    ratingLevel: 'B',
    contentType: '知识科普',
    disassemblyStatus: 'pending',
    videoScript: '我用AI接了3个月单子，赚到了第一个一万块……',
    sceneDescription: '绿幕口播 + 屏幕录制演示',
    hookAnalysis: '收益截图开头建立信任，制造副业焦虑与向往',
    bgm: '轻商务钢琴',
    tags: ['燃', '期待'],
    createdAt: '2026-08-26 09:55',
    updatedAt: '2026-08-26 09:55',
  },
];
