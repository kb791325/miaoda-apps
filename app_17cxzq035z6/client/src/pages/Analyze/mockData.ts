import type {
  VideoRecord,
  EightDimScores,
  EmotionPoint,
  RetentionNode,
  AnalyzeDetail,
  CommentAnalysis,
  RemakeSop,
} from '@shared/api.interface';

// 6 张占位封面图
const COVER_URLS = [
  '/spark/app/app_17cxzq035z6/runtime/api/v1/storage/object/bucket_aadkr7ojz24gq_static/static%2Faadkr7pblmuls_ve_miaoda',
  '/spark/app/app_17cxzq035z6/runtime/api/v1/storage/object/bucket_aadkr7ojz24gq_static/static%2Faadkr7ptu7osu_ve_miaoda',
  '/spark/app/app_17cxzq035z6/runtime/api/v1/storage/object/bucket_aadkr7ojz24gq_static/static%2Faadkr7mtn2chw_ve_miaoda',
  '/spark/app/app_17cxzq035z6/runtime/api/v1/storage/object/bucket_aadkr7ojz24gq_static/static%2Faadkr7pvfqyes_ve_miaoda',
  '/spark/app/app_17cxzq035z6/runtime/api/v1/storage/object/bucket_aadkr7ojz24gq_static/static%2Faadkr7pfk2ies_ve_miaoda',
  '/spark/app/app_17cxzq035z6/runtime/api/v1/storage/object/bucket_aadkr7ojz24gq_static/static%2Faadkr7nitc4hw_ve_miaoda',
];

const TITLES = [
  '3个让你流量翻倍的爆款开头技巧，第2个90%的人都不知道',
  '我用这个方法30天涨粉10万，今天把公式免费分享给你',
  '全网最详细的美食探店教程，看完你也能拍出高级感',
  '新手健身必看！这份训练计划让你少走2年弯路',
  '月薪3千到3万，我只做对了这一件事',
  '别再瞎拍了！掌握这5个镜头语言，视频质感直接拉满',
];

const AUTHORS = [
  '老王说运营',
  '健身大明白',
  '美食家小周',
  '科技探索者',
  '美妆师Lily',
  '职场教练张老师',
];

function buildEightDim(seed: number): EightDimScores {
  const base = 60 + (seed % 30);
  return {
    hook: Math.min(98, base + 12),
    retention: Math.min(95, base + 8),
    emotion: Math.min(92, base + 5),
    editing: Math.min(90, base + 3),
    visual: Math.min(88, base),
    copywriting: Math.min(93, base + 6),
    engagement: Math.min(85, base - 2),
    completion: Math.min(80, base - 5),
  };
}

function buildEmotionCurve(seed: number): EmotionPoint[] {
  const points: EmotionPoint[] = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 100;
    // 多峰情绪曲线
    const v =
      50 +
      25 * Math.sin((t / 100) * Math.PI * 2 + seed) +
      15 * Math.sin((t / 100) * Math.PI * 4 + seed * 1.3) +
      (i === 0 ? 20 : 0);
    points.push({ time: Math.round(t * 10) / 10, value: Math.max(10, Math.min(95, Math.round(v))) });
  }
  return points;
}

function buildRetentionNodes(seed: number): RetentionNode[] {
  return [
    { time: 3, description: '黄金3秒钩子：抛出反常识观点，抓住注意力' },
    { time: 8, description: '第一个信息转折点：给出具体数据支撑' },
    { time: 15, description: '视觉高潮点：展示核心成果/对比画面' },
    { time: 25, description: '情绪高点：讲述真实案例引发共鸣' },
    { time: 35, description: '干货输出密集区：3步方法论依次展开' },
    { time: 45, description: '互动引导点：提问+评论区引导' },
    { time: 55, description: '二次钩子：预告最后惊喜留人' },
    { time: 90, description: '收尾升华+行动号召，完整闭环' },
  ].slice(0, 4 + (seed % 4));
}

function buildAnalyzeDetail(seed: number): AnalyzeDetail {
  return {
    hookAnalysis:
      '视频开头采用反常识+数字冲击的双重钩子策略，前3秒直接抛出"3个技巧+90%人不知道"的组合，瞬间激发观众好奇心。画面配合快节奏剪辑和字幕强调，有效降低划走率。',
    emotionCurve: buildEmotionCurve(seed),
    retentionNodes: buildRetentionNodes(seed),
    copyStructure:
      '采用"痛点切入→数据佐证→方法论拆解→案例验证→行动号召"的经典爆款文案结构。开头用痛点引发共鸣，中间用3步法清晰输出干货，结尾用金句升华主题并引导互动。',
    replicableElements: [
      '反常识开头',
      '数字冲击标题',
      '3步方法论结构',
      '真实案例佐证',
      '快节奏剪辑',
      '字幕关键词高亮',
      '结尾金句升华',
      '评论区引导',
    ],
    editingRhythm: '平均镜头时长1.2秒，全片切镜数约65个，转场以硬切为主（占70%），辅以缩放转场（20%）和模糊转场（10%）。',
    visualStyle:
      '整体采用高饱和暖色调，画面构图以中心对称为主，配合动态字幕和emoji点缀，视觉节奏明快。关键信息点使用放大+高亮的双重强调手法。',
  };
}

function buildCommentAnalysis(seed: number): CommentAnalysis {
  return {
    topComments: [
      '太实用了！已经收藏慢慢看，up主讲得太清楚了',
      '第2个方法我试了，真的有用！感谢分享',
      '终于有人把这个讲明白了，之前看了好多都没懂',
      '收藏夹吃灰系列+1，但是真的干货满满',
      'up主能不能出一期进阶版的？太喜欢你的风格了',
    ],
    clusters: [
      { name: '求教程', count: 234 },
      { name: '感谢分享', count: 189 },
      { name: '已收藏', count: 156 },
      { name: '干货满满', count: 142 },
      { name: '求更新', count: 98 },
      { name: '太有用了', count: 87 },
    ],
  };
}

function buildRemakeSop(seed: number): RemakeSop {
  return {
    selectionCriteria:
      '选片标准：1) 赛道垂直度高，目标受众明确；2) 开头3秒有强钩子；3) 信息密度高，单条视频输出3-5个知识点；4) 有真实案例或数据支撑；5) 结尾有明确互动引导。',
    copyTemplate:
      '文案模板：【开头】反常识提问+数字冲击（3秒）→ 【痛点共鸣】描述目标用户普遍痛点（5秒）→ 【方法拆解】分3步依次展开，每步配案例（40秒）→ 【总结升华】金句总结+价值强化（5秒）→ 【行动号召】引导点赞评论关注（3秒）。',
    editingParams:
      '剪辑参数：1080P/30fps，画面比例9:16，平均镜头时长1-1.5秒，转场以硬切为主，关键信息点加缩放转场。字幕使用黑体加粗，关键词用黄色高亮。背景音乐用轻快电子风，音量-18dB。',
    publishStrategy:
      '发布策略：最佳发布时间为工作日12:00-13:00、18:00-20:00，周末全天均可。发布后1小时内回复前20条评论提升互动率。配合2-3个精准话题标签+1个泛流量话题标签。',
  };
}

export function generateMockVideos(count = 6): VideoRecord[] {
  const videos: VideoRecord[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 7 + 3;
    const overallScore = 72 + ((i * 13) % 25);
    const grades = ['S', 'A', 'A', 'B', 'B', 'C'];
    const statuses: Array<'pending' | 'analyzing' | 'done'> = [
      'done',
      'done',
      'done',
      'analyzing',
      'pending',
      'pending',
    ];
    const diggBase = 10000 + i * 50000 + (i % 3) * 100000;
    videos.push({
      id: `mock_video_${i + 1}`,
      awemeId: `7${1000000000 + i * 123456789}`,
      title: TITLES[i % TITLES.length],
      authorUid: `user_${i + 1}`,
      authorNickname: AUTHORS[i % AUTHORS.length],
      authorAvatar: '',
      followerCount: 50000 + i * 120000,
      coverUrl: COVER_URLS[i % COVER_URLS.length],
      videoUrl: '',
      duration: 30 + i * 15 + (i % 3) * 20,
      publishTime: `2024-0${i + 1}-15T12:00:00Z`,
      diggCount: diggBase,
      commentCount: Math.round(diggBase * 0.05),
      shareCount: Math.round(diggBase * 0.02),
      collectCount: Math.round(diggBase * 0.08),
      playCount: diggBase * 10,
      hashtags: ['爆款技巧', '干货分享', '涨粉秘籍'].slice(0, 2 + (i % 2)),
      category: ['知识', '美食', '健身', '科技', '美妆', '职场'][i],
      overallScore,
      grade: grades[i % grades.length],
      eightDimScores: buildEightDim(seed),
      analyzeDetail: buildAnalyzeDetail(seed),
      transcript:
        '大家好，今天给大家分享3个让你流量翻倍的爆款开头技巧。\n\n第一个技巧：反常识开头。不要说你知道的，要说别人不知道的，越反常识越抓眼球。\n\n第二个技巧：数字冲击。用具体的数字代替模糊的描述，3个方法比几个方法更有说服力。\n\n第三个技巧：痛点共鸣。开头就说出观众心里的痛点，让他觉得你懂他。\n\n学会了吗？点赞收藏，下期讲更多干货。',
      commentAnalysis: buildCommentAnalysis(seed),
      remakeSop: buildRemakeSop(seed),
      analyzeStatus: statuses[i % statuses.length],
      analyzedAt: i < 3 ? `2024-0${i + 1}-20T15:30:00Z` : undefined,
      createdAt: `2024-0${i + 1}-10T10:00:00Z`,
    });
  }
  return videos;
}

export const DIMENSIONS = [
  { key: 'hook' as const, label: '钩子设计', weight: 20 },
  { key: 'retention' as const, label: '留存设计', weight: 20 },
  { key: 'emotion' as const, label: '情绪曲线', weight: 15 },
  { key: 'editing' as const, label: '剪辑节奏', weight: 15 },
  { key: 'visual' as const, label: '视觉风格', weight: 10 },
  { key: 'copywriting' as const, label: '文案质量', weight: 10 },
  { key: 'engagement' as const, label: '互动引导', weight: 5 },
  { key: 'completion' as const, label: '完播预期', weight: 5 },
];

export const TRAFFIC_POOLS = [
  { level: 'L1', name: '初始流量池', threshold: '500', predict: 480, probability: 95 },
  { level: 'L2', name: '千人流量池', threshold: '5,000', predict: 4200, probability: 78 },
  { level: 'L3', name: '万人流量池', threshold: '50,000', predict: 32000, probability: 52 },
  { level: 'L4', name: '十万人流量池', threshold: '500,000', predict: 180000, probability: 28 },
  { level: 'L5', name: '百万爆款池', threshold: '1,000,000+', predict: 650000, probability: 12 },
];
