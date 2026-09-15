import type { ProjectItem } from '@client/src/api/project';

export type ProjectTypeExt = 'search' | 'video' | 'script' | 'production';

const categories = [
  '搞笑', '知识', '美食', '美妆', '穿搭', '游戏', '科技', '情感', '教育', '职场',
];

const grades = ['S', 'A', 'B', 'C'];
const statuses = ['进行中', '已完成', '草稿'];

interface TitleSet {
  search: string[];
  video: string[];
  script: string[];
  production: string[];
}

const titleMap: TitleSet = {
  search: [
    '抖音AI工具爆款搜索',
    '夏日穿搭热门视频采集',
    '美食探店高赞视频搜集',
    '职场成长关键词搜索任务',
    '美妆测评爆款挖掘',
    '游戏解说热门视频抓取',
    '科技数码新品评测搜索',
    '情感故事高完播视频搜集',
  ],
  video: [
    '3秒钩子的秘密 · 爆款拆解',
    'AI工具科普视频深度分析',
    '职场新人必看5个技巧拆解',
    '夏日护肤全流程视频拆解',
    '平价美食探店TOP10分析',
    '数码产品开箱对比评测拆解',
    '搞笑段子高完播原因分析',
    '游戏卡点视频节奏拆解',
    '情感文案共鸣点深度分析',
    '知识科普类视频结构拆解',
  ],
  script: [
    'AI产品介绍口播脚本',
    '职场成长系列短视频脚本',
    '美妆测评种草脚本',
    '美食探店Vlog脚本',
    '知识科普长视频脚本',
    '搞笑反转剧情脚本',
    '游戏解说文案脚本',
    '情感共鸣类脚本',
    '穿搭变装脚本',
  ],
  production: [
    '产品宣传视频制作项目',
    '教程类视频制作',
    '品牌故事短片制作',
    '活动回顾视频制作',
    '知识科普动画制作',
    '美食探店剪辑制作',
    '游戏混剪视频制作',
    '人物访谈视频制作',
  ],
};

export function generateMockProjects(
  type: 'all' | ProjectTypeExt,
): ProjectItem[] {
  const allTypes: ProjectTypeExt[] = ['search', 'video', 'script', 'production'];
  const projects: ProjectItem[] = [];
  const typesToUse = type === 'all' ? allTypes : [type];
  let idCounter = 1;

  for (const t of typesToUse) {
    const titles = titleMap[t];
    for (let i = 0; i < titles.length; i += 1) {
      const useGrade = Math.random() > 0.4;
      const scoreOrGrade: string | number = useGrade
        ? grades[Math.floor(Math.random() * grades.length)]
        : Math.floor(Math.random() * 40) + 60;
      const daysAgo = Math.floor(Math.random() * 60);
      projects.push({
        id: `mock-${t}-${idCounter}`,
        type: t as ProjectItem['type'],
        title: titles[i],
        coverUrl: '',
        gradeOrScore: scoreOrGrade,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        category: categories[Math.floor(Math.random() * categories.length)],
        isFavorite: Math.random() > 0.75,
      });
      idCounter += 1;
    }
  }
  return projects;
}
