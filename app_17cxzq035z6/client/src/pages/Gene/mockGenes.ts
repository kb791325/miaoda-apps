export interface HookGene {
  id: string;
  type: '悬念型' | '反转型' | '痛点型' | '福利型' | '共鸣型' | '对比型';
  content: string;
  example: string;
  effectScore: number;
  sourceVideo: string;
  useCount: number;
  isFavorite: boolean;
  category: string;
}

export interface CopyGene {
  id: string;
  template: string;
  keywords: string[];
  category: '开头型' | '转折型' | '结尾型' | '金句型';
  effectScore: number;
  useCount: number;
  isFavorite: boolean;
}

export interface EmotionGene {
  id: string;
  name: string;
  curve: number[];
  category: string;
  effectScore: number;
  useCount: number;
  isFavorite: boolean;
  applicableTracks: string[];
}

export interface EditingGene {
  id: string;
  name: string;
  avgShotDuration: string;
  cutFrequency: string;
  transitionPreference: string;
  scenario: string;
  effectScore: number;
  useCount: number;
  isFavorite: boolean;
}

export interface TagGene {
  id: string;
  name: string;
  useCount: number;
  heatScore: number;
  category: string;
  isFavorite: boolean;
}

export interface BgmGene {
  id: string;
  name: string;
  style: string;
  duration: string;
  emotion: '激昂' | '温馨' | '紧张' | '治愈' | '欢快' | '伤感';
  useCount: number;
  isFavorite: boolean;
}

const hooks: HookGene[] = [
  {
    id: 'hook-1', type: '悬念型', category: '知识',
    content: '99%的人都不知道的XX真相，最后一个惊呆了',
    example: '99%的人都不知道的睡眠真相，最后一个惊呆了',
    effectScore: 92, sourceVideo: '抖音爆款视频#2847', useCount: 1286, isFavorite: true,
  },
  {
    id: 'hook-2', type: '反转型', category: '搞笑',
    content: '我以为XX，结果万万没想到...',
    example: '我以为是青铜，结果万万没想到是王者',
    effectScore: 88, sourceVideo: '搞笑达人#1024', useCount: 892, isFavorite: false,
  },
  {
    id: 'hook-3', type: '痛点型', category: '职场',
    content: '为什么你越努力越穷？核心原因只有一个',
    example: '为什么你加班越多越穷？核心原因只有一个',
    effectScore: 95, sourceVideo: '职场博主#5631', useCount: 2103, isFavorite: true,
  },
  {
    id: 'hook-4', type: '福利型', category: '美妆',
    content: '3个免费变美小技巧，第2个今天就能用',
    example: '3个免费变美小技巧，第2个今天就能用',
    effectScore: 85, sourceVideo: '美妆测评#3321', useCount: 1567, isFavorite: false,
  },
  {
    id: 'hook-5', type: '共鸣型', category: '情感',
    content: '成年人的崩溃，从来都不是一瞬间的事',
    example: '成年人的崩溃，从来都不是一瞬间的事',
    effectScore: 90, sourceVideo: '情感博主#7788', useCount: 3421, isFavorite: true,
  },
  {
    id: 'hook-6', type: '对比型', category: '科技',
    content: '同样是XX，为什么别人的效果比你好10倍？',
    example: '同样是用AI，为什么别人效率比你高10倍？',
    effectScore: 87, sourceVideo: '科技UP主#9901', useCount: 756, isFavorite: false,
  },
  {
    id: 'hook-7', type: '悬念型', category: '美食',
    content: '这家店我吃了5年，今天才发现老板的秘密',
    example: '这家店我吃了5年，今天才发现老板的秘密',
    effectScore: 83, sourceVideo: '美食探店#4456', useCount: 1023, isFavorite: false,
  },
  {
    id: 'hook-8', type: '痛点型', category: '教育',
    content: '孩子成绩差不是笨，是方法错了',
    example: '孩子成绩差不是笨，是学习方法错了',
    effectScore: 91, sourceVideo: '教育专家#2233', useCount: 1876, isFavorite: true,
  },
  {
    id: 'hook-9', type: '反转型', category: '穿搭',
    content: '100块穿出1000块的感觉，秘诀全在这',
    example: '100块穿出1000块的感觉，秘诀全在这5件单品',
    effectScore: 86, sourceVideo: '穿搭博主#6677', useCount: 2341, isFavorite: false,
  },
  {
    id: 'hook-10', type: '共鸣型', category: '游戏',
    content: '每个老玩家心中，都有一个回不去的夏天',
    example: '每个老玩家心中，都有一个回不去的夏天',
    effectScore: 89, sourceVideo: '游戏解说#1122', useCount: 567, isFavorite: true,
  },
  {
    id: 'hook-11', type: '福利型', category: '知识',
    content: '免费领！50个高效学习工具，第3个绝了',
    example: '免费领！50个高效学习工具，第3个绝了',
    effectScore: 82, sourceVideo: '知识分享#8899', useCount: 1432, isFavorite: false,
  },
  {
    id: 'hook-12', type: '对比型', category: '美食',
    content: '同样是蛋炒饭，为什么饭店的更好吃？',
    example: '同样是蛋炒饭，为什么饭店做的更好吃？差这3步',
    effectScore: 84, sourceVideo: '美食教程#5566', useCount: 2890, isFavorite: false,
  },
];

const copies: CopyGene[] = [
  {
    id: 'copy-1',
    template: '你知道吗？XX其实一直都在XX，只是你没发现。',
    keywords: ['你知道吗', '其实', '没发现'],
    category: '开头型',
    effectScore: 88, useCount: 2341, isFavorite: true,
  },
  {
    id: 'copy-2',
    template: '我敢打赌，90%的人都不知道XX的真相。',
    keywords: ['我敢打赌', '90%', '真相'],
    category: '开头型',
    effectScore: 92, useCount: 3456, isFavorite: true,
  },
  {
    id: 'copy-3',
    template: '本以为XX，没想到XX，结果XX。',
    keywords: ['本以为', '没想到', '结果'],
    category: '转折型',
    effectScore: 90, useCount: 1876, isFavorite: false,
  },
  {
    id: 'copy-4',
    template: '别急，先点赞收藏，后面全是干货。',
    keywords: ['别急', '点赞收藏', '干货'],
    category: '转折型',
    effectScore: 85, useCount: 4521, isFavorite: true,
  },
  {
    id: 'copy-5',
    template: '看到最后，你会回来感谢我的。',
    keywords: ['看到最后', '感谢'],
    category: '结尾型',
    effectScore: 87, useCount: 5234, isFavorite: false,
  },
  {
    id: 'copy-6',
    template: '关注我，每天一个XX小技巧。',
    keywords: ['关注我', '每天', '小技巧'],
    category: '结尾型',
    effectScore: 83, useCount: 6789, isFavorite: true,
  },
  {
    id: 'copy-7',
    template: '真正的强者，不是XX，而是XX。',
    keywords: ['真正的强者', '不是', '而是'],
    category: '金句型',
    effectScore: 94, useCount: 1234, isFavorite: true,
  },
  {
    id: 'copy-8',
    template: '你越在意什么，什么就越折磨你。',
    keywords: ['越在意', '越折磨'],
    category: '金句型',
    effectScore: 91, useCount: 2345, isFavorite: false,
  },
  {
    id: 'copy-9',
    template: '今天这条视频，可能会改变你对XX的认知。',
    keywords: ['改变认知', '可能会'],
    category: '开头型',
    effectScore: 89, useCount: 987, isFavorite: false,
  },
  {
    id: 'copy-10',
    template: '话不多说，直接上干货。',
    keywords: ['话不多说', '上干货'],
    category: '转折型',
    effectScore: 80, useCount: 3456, isFavorite: false,
  },
  {
    id: 'copy-11',
    template: '点赞过万，下期更新完整版。',
    keywords: ['点赞过万', '下期更新'],
    category: '结尾型',
    effectScore: 82, useCount: 2134, isFavorite: false,
  },
  {
    id: 'copy-12',
    template: '时间会证明一切，你只需要默默努力。',
    keywords: ['时间', '证明', '默默努力'],
    category: '金句型',
    effectScore: 88, useCount: 1567, isFavorite: true,
  },
];

const emotions: EmotionGene[] = [
  {
    id: 'emo-1', name: '先抑后扬',
    curve: [20, 15, 10, 25, 45, 70, 90, 95],
    category: '情感类', effectScore: 93, useCount: 1289, isFavorite: true,
    applicableTracks: ['情感', '职场', '知识'],
  },
  {
    id: 'emo-2', name: '持续高潮',
    curve: [70, 75, 80, 85, 88, 90, 92, 95],
    category: '爽感类', effectScore: 88, useCount: 876, isFavorite: false,
    applicableTracks: ['游戏', '搞笑', '科技'],
  },
  {
    id: 'emo-3', name: '悬念递进',
    curve: [30, 40, 35, 50, 45, 60, 75, 95],
    category: '悬疑类', effectScore: 91, useCount: 2103, isFavorite: true,
    applicableTracks: ['知识', '科技', '教育'],
  },
  {
    id: 'emo-4', name: '温暖治愈',
    curve: [40, 50, 55, 60, 65, 70, 75, 80],
    category: '治愈类', effectScore: 85, useCount: 3421, isFavorite: false,
    applicableTracks: ['情感', '美食', '穿搭'],
  },
  {
    id: 'emo-5', name: '起承转合',
    curve: [50, 60, 40, 30, 50, 70, 90, 85],
    category: '剧情类', effectScore: 90, useCount: 1567, isFavorite: true,
    applicableTracks: ['搞笑', '情感', '职场'],
  },
  {
    id: 'emo-6', name: '高开低走收',
    curve: [90, 80, 70, 60, 55, 60, 75, 95],
    category: '反转类', effectScore: 87, useCount: 987, isFavorite: false,
    applicableTracks: ['搞笑', '知识', '科技'],
  },
];

const editings: EditingGene[] = [
  {
    id: 'edit-1', name: '快节奏卡点',
    avgShotDuration: '0.5-1.5秒',
    cutFrequency: '极高',
    transitionPreference: '硬切+闪白',
    scenario: '游戏高光、产品展示、变装视频',
    effectScore: 92, useCount: 2341, isFavorite: true,
  },
  {
    id: 'edit-2', name: '慢节奏叙事',
    avgShotDuration: '3-8秒',
    cutFrequency: '低',
    transitionPreference: '淡入淡出+推拉',
    scenario: '故事讲述、美食制作、风景展示',
    effectScore: 85, useCount: 1567, isFavorite: false,
  },
  {
    id: 'edit-3', name: '混合节奏Vlog',
    avgShotDuration: '1-4秒',
    cutFrequency: '中等',
    transitionPreference: '混合+音乐点',
    scenario: '日常Vlog、旅行记录、探店',
    effectScore: 88, useCount: 3421, isFavorite: true,
  },
  {
    id: 'edit-4', name: '蒙太奇式',
    avgShotDuration: '2-3秒',
    cutFrequency: '中高',
    transitionPreference: '匹配剪辑+J-Cut',
    scenario: '教程类、纪录片风格',
    effectScore: 89, useCount: 876, isFavorite: false,
  },
];

const tags: TagGene[] = [
  { id: 'tag-1', name: '爆款教程', useCount: 12450, heatScore: 98, category: '知识', isFavorite: true },
  { id: 'tag-2', name: '涨知识', useCount: 9876, heatScore: 95, category: '知识', isFavorite: false },
  { id: 'tag-3', name: '每天一个冷知识', useCount: 7654, heatScore: 90, category: '知识', isFavorite: true },
  { id: 'tag-4', name: '职场干货', useCount: 8765, heatScore: 92, category: '职场', isFavorite: false },
  { id: 'tag-5', name: '打工人', useCount: 15678, heatScore: 99, category: '职场', isFavorite: true },
  { id: 'tag-6', name: '搞笑日常', useCount: 23456, heatScore: 100, category: '搞笑', isFavorite: false },
  { id: 'tag-7', name: '看一遍笑一遍', useCount: 18765, heatScore: 97, category: '搞笑', isFavorite: true },
  { id: 'tag-8', name: '解压视频', useCount: 12345, heatScore: 93, category: '搞笑', isFavorite: false },
  { id: 'tag-9', name: '美食教程', useCount: 16543, heatScore: 96, category: '美食', isFavorite: true },
  { id: 'tag-10', name: '在家做美食', useCount: 9876, heatScore: 91, category: '美食', isFavorite: false },
  { id: 'tag-11', name: '美妆分享', useCount: 8765, heatScore: 89, category: '美妆', isFavorite: false },
  { id: 'tag-12', name: '妆容教程', useCount: 7654, heatScore: 87, category: '美妆', isFavorite: true },
  { id: 'tag-13', name: '穿搭分享', useCount: 11234, heatScore: 92, category: '穿搭', isFavorite: false },
  { id: 'tag-14', name: '今日穿搭', useCount: 14567, heatScore: 94, category: '穿搭', isFavorite: true },
  { id: 'tag-15', name: '游戏高光', useCount: 19876, heatScore: 98, category: '游戏', isFavorite: false },
  { id: 'tag-16', name: '整活', useCount: 8765, heatScore: 88, category: '游戏', isFavorite: false },
  { id: 'tag-17', name: '数码科技', useCount: 7654, heatScore: 86, category: '科技', isFavorite: true },
  { id: 'tag-18', name: 'AI工具', useCount: 13456, heatScore: 95, category: '科技', isFavorite: false },
  { id: 'tag-19', name: '情感共鸣', useCount: 21345, heatScore: 97, category: '情感', isFavorite: true },
  { id: 'tag-20', name: '人生感悟', useCount: 15678, heatScore: 93, category: '情感', isFavorite: false },
];

const bgms: BgmGene[] = [
  { id: 'bgm-1', name: 'Epic Rise', style: '史诗管弦', duration: '2:30', emotion: '激昂', useCount: 3456, isFavorite: true },
  { id: 'bgm-2', name: 'Warm Morning', style: '轻音乐钢琴', duration: '3:15', emotion: '温馨', useCount: 2890, isFavorite: false },
  { id: 'bgm-3', name: 'Tense Build', style: '电子悬疑', duration: '1:45', emotion: '紧张', useCount: 1567, isFavorite: true },
  { id: 'bgm-4', name: 'Healing Rain', style: '自然白噪音', duration: '5:00', emotion: '治愈', useCount: 4521, isFavorite: false },
  { id: 'bgm-5', name: 'Happy Bounce', style: '流行电子', duration: '2:10', emotion: '欢快', useCount: 5234, isFavorite: true },
  { id: 'bgm-6', name: 'Sad Piano', style: '钢琴独奏', duration: '3:45', emotion: '伤感', useCount: 1234, isFavorite: false },
  { id: 'bgm-7', name: 'Future Bass', style: '电子Bass', duration: '2:55', emotion: '激昂', useCount: 2345, isFavorite: true },
  { id: 'bgm-8', name: 'Coffee Shop', style: '爵士乐', duration: '4:20', emotion: '温馨', useCount: 3678, isFavorite: false },
  { id: 'bgm-9', name: 'Mystery Hunt', style: '悬疑氛围', duration: '2:20', emotion: '紧张', useCount: 987, isFavorite: false },
  { id: 'bgm-10', name: 'Ocean Breeze', style: '新世纪', duration: '6:00', emotion: '治愈', useCount: 2134, isFavorite: true },
  { id: 'bgm-11', name: 'Sunny Day', style: '民谣吉他', duration: '3:00', emotion: '欢快', useCount: 4567, isFavorite: false },
  { id: 'bgm-12', name: 'Lonely Night', style: '氛围电子', duration: '4:10', emotion: '伤感', useCount: 1876, isFavorite: true },
];

export const mockGeneData = {
  hook: hooks,
  copy: copies,
  emotion: emotions,
  editing: editings,
  tag: tags,
  bgm: bgms,
};

export type GeneCategory = 'hook' | 'copy' | 'emotion' | 'editing' | 'tag' | 'bgm';
