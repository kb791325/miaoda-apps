// EXPORTS: IPromptTemplate, PromptInput, MOCK_PROMPTS, PROMPT_TYPE_OPTIONS
export interface IPromptTemplate {
  id: string;
  templateName: string;
  type: string;
  applicableModel: string;
  promptContent: string;
  variableDescription: string;
  usageCount: number;
  avgEffectScore: number;
  createdAt: string;
  updatedAt: string;
}

export type PromptInput = Omit<IPromptTemplate, 'id' | 'createdAt' | 'updatedAt'>;

export const PROMPT_TYPE_OPTIONS = ['脚本生成', '画面生成', '视频生成', '爆款分析', '字幕优化', '配音文案'];
export const PROMPT_MODEL_OPTIONS = ['DeepSeek', 'Qwen', '豆包', 'GPT', 'FLUX', 'Wan', '可灵', 'Seedream'];

export const MOCK_PROMPTS: IPromptTemplate[] = [
  {
    id: 'p1',
    templateName: '爆款视频五维拆解提示词',
    type: '素材拆解',
    applicableModel: '豆包 / GPT',
    promptContent: '你是抖音爆款内容分析专家。请对 {{视频链接}} 与 {{视频文案}} 进行拆解：输出五维评分（完播力/互动潜力/内容质量/平台适配/传播潜力）、综合评分、评分等级、钩子分析、画面描述、BGM建议与标签。',
    variableDescription: '{{视频链接}}：抖音分享链接；{{视频文案}}：视频口播或字幕全文',
    usageCount: 128,
    avgEffectScore: 92,
    createdAt: '2026-08-18 10:00',
    updatedAt: '2026-08-26 09:00',
  },
  {
    id: 'p2',
    templateName: '分镜脚本生成提示词',
    type: '脚本生成',
    applicableModel: '豆包 / DeepSeek',
    promptContent: '你是资深短视频编导。根据主题 {{主题}}、内容类型 {{内容类型}}、时长 {{时长}}，输出分镜脚本：每个分镜包含序号、画面描述、镜头语言、台词文案、时长秒、BGM建议、转场效果。要求节奏紧凑、开头3秒有钩子。',
    variableDescription: '{{主题}}：视频核心主题；{{内容类型}}：如知识科普/剧情演绎；{{时长}}：如30秒',
    usageCount: 96,
    avgEffectScore: 88,
    createdAt: '2026-08-19 14:30',
    updatedAt: '2026-08-25 16:20',
  },
  {
    id: 'p3',
    templateName: '视频生成参数推荐提示词',
    type: '视频参数',
    applicableModel: 'GPT',
    promptContent: '根据脚本内容 {{脚本内容}}，推荐视频生成模型、图像生成模型、TTS音色与分辨率，并说明选择理由。输出为结构化列表。',
    variableDescription: '{{脚本内容}}：完整分镜脚本文本',
    usageCount: 54,
    avgEffectScore: 81,
    createdAt: '2026-08-20 09:15',
    updatedAt: '2026-08-24 11:00',
  },
  {
    id: 'p4',
    templateName: '口播文案润色提示词',
    type: '文案润色',
    applicableModel: 'DeepSeek',
    promptContent: '请将以下口播文案改写为口语化、有节奏感的短视频文案，保留核心信息，控制字数在 {{字数上限}} 以内：{{原始文案}}',
    variableDescription: '{{原始文案}}：待润色文案；{{字数上限}}：如200字',
    usageCount: 77,
    avgEffectScore: 85,
    createdAt: '2026-08-21 16:40',
    updatedAt: '2026-08-25 10:30',
  },
  {
    id: 'p5',
    templateName: '标题党优化提示词',
    type: '文案润色',
    applicableModel: '豆包',
    promptContent: '为视频 {{视频主题}} 生成10个高点击率标题，要求包含数字或悬念结构，并标注每个标题的预期点击率等级。',
    variableDescription: '{{视频主题}}：视频内容一句话概述',
    usageCount: 23,
    avgEffectScore: 62,
    createdAt: '2026-08-22 11:05',
    updatedAt: '2026-08-23 09:45',
  },
];
