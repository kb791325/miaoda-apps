# AI视频创作工坊 - 需求拆解文档

## 产品概述

- **产品类型**: AI短视频全流程创作平台（中后台管理系统）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 短视频创作者、内容运营团队、AI视频生产人员
- **核心价值**: 打通「爆款拆解 → AI脚本 → 视频生成 → 成品管理」的短视频全流程创作链路，以飞书多维表格为数据底座实现协作化管理
- **界面语言**: zh-CN
- **主题偏好**: user_specified（用户已提供「蓝图 corporate-blueprint」企业蓝图报告风格，必须严格消费）
- **导航模式**: 路径导航
- **导航布局**: Sidebar（内部工作台/管理系统，多模块CRUD）

> **风格声明**: 用户已提供 `corporate-blueprint`（蓝图）风格附件，本需求所有视觉输出必须严格遵循该风格规范。核心识别特征包括：白色零圆角卡片 + 顶部 3px `#0033A0` 深蓝强调色边线、深蓝渐变 Header 叠加斜切几何装饰块、极端字号对比（9px 全大写标签 vs 3xl-5xl 主标题）、极细 0.5px 分隔线、单一蓝色相五级渐变图表配色、编号 Section（01. 02. 03...）串联内容。

---

## 页面结构总览

> **说明**：此表为页面生成的唯一数据源，包含所有页面（一级+二级）

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 工作台首页 | `DashboardPage.tsx` | `/` | 一级 | 导航 |
| 爆款素材库 | `MaterialLibraryPage.tsx` | `/materials` | 一级 | 导航 |
| 爆款素材详情 | `MaterialDetailPage.tsx` | `/materials/:id` | 二级 | 爆款素材库 → 列表项点击 |
| 分镜脚本库 | `ScriptLibraryPage.tsx` | `/scripts` | 一级 | 导航 |
| 分镜脚本详情 | `ScriptDetailPage.tsx` | `/scripts/:id` | 二级 | 分镜脚本库 → 列表项点击 |
| 生成任务表 | `TaskBoardPage.tsx` | `/tasks` | 一级 | 导航 |
| 任务详情/监控 | `TaskDetailPage.tsx` | `/tasks/:id` | 二级 | 生成任务表 → 列表项点击 |
| 视频成品库 | `VideoLibraryPage.tsx` | `/videos` | 一级 | 导航 |
| 视频成品详情 | `VideoDetailPage.tsx` | `/videos/:id` | 二级 | 视频成品库 → 列表项点击 |
| 提示词模板库 | `PromptTemplatePage.tsx` | `/prompts` | 一级 | 导航 |

> **页面类型说明**：
> - **一级页面**：出现在导航中，用户可直接访问
> - **二级页面**：不在导航中，从一级页面跳转进入

---

## 页面布局建议

### 工作台首页 (`DashboardPage.tsx`)
- **布局模式**: 上下分区 + 卡片网格 —— 顶部深蓝渐变 Header（风格签名）+ 下方编号 Section 串联的统计卡片与快捷操作区
- **视觉重心**: 状态与数据 —— 用户来此快速感知创作资产总量与待办
- **结果承载区**: KPI 指标卡片行（4 张统计卡）+ 快捷操作按钮组 + 最近动态/待处理任务列表；初始态为实时数据（来自飞书多维表格）

### 爆款素材库 (`MaterialLibraryPage.tsx`)
- **布局模式**: 主从布局 —— 左侧筛选面板（FilterAside，页面级）+ 右侧素材表格/卡片列表
- **视觉重心**: 列表 —— 大量抖音视频拆解数据的管理与检索
- **结果承载区**: 数据表格（DataTable 风格）展示素材字段，支持行点击进详情；初始态为加载骨架或空状态

### 分镜脚本库 (`ScriptLibraryPage.tsx`)
- **布局模式**: 主从布局 —— 左侧筛选（内容类型/时长/主题）+ 右侧脚本列表
- **视觉重心**: 列表 + 内容预览 —— 脚本含分镜明细，需快速浏览画面描述与台词
- **结果承载区**: 脚本卡片列表（含分镜缩略信息）+ 点击展开分镜详情 Drawer；初始态为列表骨架

### 生成任务表 (`TaskBoardPage.tsx`)
- **布局模式**: 控制台布局 —— 顶部状态筛选 Tab + 下方任务卡片/表格混合视图
- **视觉重心**: 状态与进度 —— 任务生命周期跟踪是核心诉求
- **结果承载区**: 任务卡片网格（含进度条、状态徽章、当前阶段）+ 错误日志预览；初始态为按状态分组的任务列表

### 视频成品库 (`VideoLibraryPage.tsx`)
- **布局模式**: 主从布局 —— 左侧筛选（发布状态/平台/标签）+ 右侧视频卡片网格
- **视觉重心**: 预览与发布状态 —— 视频封面 + 播放数据 + 发布动作
- **结果承载区**: 视频卡片（封面图 + 时长 + 播放量/点赞数 + 发布状态徽章）+ 行内发布操作；初始态为网格骨架

### 提示词模板库 (`PromptTemplatePage.tsx`)
- **布局模式**: 单栏列表 —— 模板卡片纵向排列，含使用数据与评分
- **视觉重心**: 内容复用 —— 提示词内容的快速查阅与复制
- **结果承载区**: 模板卡片列表（含提示词预览、变量说明、使用次数、评分）；初始态为列表骨架

---

## 插件规划

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| 飞书多维表格数据读写 | `feishu-bitable` | 作为全平台数据底座，读写 6 张业务表（爆款素材、分镜脚本、生成任务、视频成品、提示词模板、统计视图） | unary | 全部页面 |
| AI 视频拆解分析 | `ai-text-to-json` | 输入抖音视频链接或文案，自动提取并结构化输出五维评分、钩子分析、画面描述、BGM 等拆解字段 | unary | 爆款素材库 |
| AI 分镜脚本生成 | `ai-text-generate` | 根据主题/内容类型/参考素材，流式生成含分镜序号、画面描述、镜头语言、台词文案的完整脚本 | stream | 分镜脚本库 |
| AI 视频生成任务调度 | `ai-text-generate` | 根据脚本内容生成视频生成参数（模型选择、TTS 音色、分辨率建议），并创建生成任务记录 | unary | 生成任务表 |
| 提示词效果评估 | `ai-categorization` | 对提示词模板的历史生成效果进行自动评分与分类，输出平均效果评分 | unary | 提示词模板库 |

---

## 导航配置

- **导航布局**: Sidebar（左侧固定，内部工作台范式）
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标(建议) |
|---------|------|-----------|
| 工作台 | `/` | LayoutDashboard |
| 爆款素材 | `/materials` | Clapperboard |
| 分镜脚本 | `/scripts` | FileText |
| 生成任务 | `/tasks` | Cpu |
| 视频成品 | `/videos` | PlayCircle |
| 提示词模板 | `/prompts` | Sparkles |

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 全部业务表数据读写 | real-plugin | capabilityClient 调 feishu-bitable 实例，连接飞书多维表格作为数据底座，读写 6 张业务表 | 初始 5 条 source='mock' 示例数据（含完整字段） |
| AI 视频拆解（五维评分/钩子分析） | real-plugin | capabilityClient 调 ai-text-to-json 实例，传入用户提交的抖音链接或视频文案，结构化输出拆解字段 | 无（插件能力不可 mock） |
| AI 分镜脚本生成 | real-plugin | capabilityClient.callStream 调 ai-text-generate 实例，传入主题/内容类型/参考素材，流式输出分镜脚本 JSON | 无（插件能力不可 mock） |
| AI 视频生成参数建议 | real-plugin | capabilityClient 调 ai-text-generate 实例，传入脚本内容，输出视频生成配置建议 | 失败提示（toast "AI 调度暂不可用"） |
| 提示词效果自动评估 | real-plugin | capabilityClient 调 ai-categorization 实例，传入提示词历史生成记录，输出效果评分与分类 | 失败提示（toast "评估暂不可用"） |
| 任务状态本地缓存 | local-persist | localStorage key=`__app_video_workshop_task_status`，缓存任务列表筛选状态与排序偏好 | 无 |
| 快捷操作历史记录 | local-persist | localStorage key=`__app_video_workshop_quick_actions`，记录用户最近使用的快捷操作 | 无 |

> **插件规划 ↔ 数据来源声明一致性**: 插件规划中的 5 个插件实例，均已在数据来源声明中对应声明为 `real-plugin` 类型，mock 兜底列严格遵循"无"或"失败提示"规则，未填入任何可执行 mock 值。

---

## 功能列表

### 工作台首页 (`DashboardPage.tsx`)
- **页面目标**: 快速感知创作资产全景，一键发起核心创作动作
- **功能点**:
  - **统计卡片展示**: 4 张 KPI 卡（爆款素材数、脚本数、生成任务数、成品视频数），数据来自 feishu-bitable 聚合查询
  - **快捷操作按钮**: 「拆解视频」「生成脚本」「创建任务」「上传成品」4 个快捷入口，点击跳转对应页面或唤起创建 Dialog
  - **最近动态列表**: 展示最近 5 条数据变更（新拆解素材、新完成任务、新发布视频），带时间戳与操作人
  - **待处理任务提醒**: 状态为「进行中」或「失败」的任务数量徽章，点击跳转生成任务表并自动筛选

### 爆款素材库 (`MaterialLibraryPage.tsx`)
- **页面目标**: 管理抖音爆款视频拆解数据，支持 AI 辅助拆解录入
- **功能点**:
  - **新建拆解素材**:
    - 触发: 顶部「新建拆解」Button
    - 交互: 弹出 Dialog，含输入框（抖音链接）、AI 拆解开关
    - 提交: 若开启 AI 拆解，调 ai-text-to-json 实例解析链接/文案，自动填充五维评分、钩子分析等字段；手动模式则表单逐项填写
    - 反馈: toast.success('素材拆解已保存') + 关闭 Dialog + 列表刷新
    - 数据契约: `IMaterial` 必须含 `videoTitle`, `douyinLink`, `author`, `likes`, `comments`, `shares`, `completionRate`, `fiveDimensions`（完播力/互动潜力/内容质量/平台适配/传播潜力）, `compositeScore`, `ratingLevel`, `contentType`, `disassemblyStatus`, `videoScript`, `sceneDescription`, `hookAnalysis`, `bgm`, `tags`
  - **筛选与搜索**: 左侧 FilterAside 支持按内容类型、评分等级、拆解状态、标签多选筛选；顶部搜索框支持视频标题/作者模糊搜索
  - **编辑拆解素材**:
    - 触发: Table 行「操作」列 Dropdown → 「编辑」
    - 交互: 弹出 Dialog 预填充当前数据，表单可修改全部字段
    - 提交: 更新 feishu-bitable 对应记录
    - 反馈: toast.success('素材已更新') + 列表行数据更新
  - **查看素材详情**: 点击行 → 跳转 `/materials/:id` 详情页，展示完整字段与 AI 拆解原始数据

### 爆款素材详情 (`MaterialDetailPage.tsx`)
- **页面目标**: 单条素材的完整信息展示与深度分析
- **功能点**:
  - **完整字段展示**: 按信息分组（基础信息/互动数据/五维评分/拆解内容）展示全部字段
  - **五维评分可视化**: 雷达图展示完播力、互动潜力、内容质量、平台适配、传播潜力五维得分（图表配色严格遵循蓝图风格单色蓝五级渐变）
  - **关联脚本快捷创建**: 「基于此素材生成脚本」Button，跳转分镜脚本库并预填充主题

### 分镜脚本库 (`ScriptLibraryPage.tsx`)
- **页面目标**: 管理 AI 生成的短视频分镜脚本，支持流式生成新脚本
- **功能点**:
  - **AI 生成脚本**:
    - 触发: 顶部「AI 生成脚本」Button
    - 交互: 弹出 Dialog，含输入框（主题）、Select（内容类型）、Select（时长范围）、Textarea（参考素材/要求），确认后进入流式生成状态
    - 提交: 调 ai-text-generate 实例 stream 输出，实时渲染分镜列表（分镜序号、画面描述、镜头语言、台词文案、时长秒、BGM建议、转场效果）
    - 反馈: 流式渲染过程中显示生成进度，完成后 toast.success('脚本生成完成') + 可保存/重新生成
    - 数据契约: `IScript` 必须含 `scriptTitle`, `contentType`, `duration`, `theme`, `shots`（数组，每项含 `shotNumber`, `sceneDescription`, `cameraLanguage`, `dialogue`, `durationSec`, `bgmSuggestion`, `transition`, `referenceVideo`）
  - **脚本列表管理**: DataTable 风格展示脚本标题、内容类型、时长、主题、分镜数量，支持排序与分页
  - **编辑脚本**: 行操作 Dropdown → 「编辑」，Dialog 内可修改分镜明细（增删改分镜）
  - **创建生成任务**: 行操作 Dropdown → 「生成视频」，跳转生成任务表并预填充关联脚本

### 分镜脚本详情 (`ScriptDetailPage.tsx`)
- **页面目标**: 单条脚本的完整分镜展示与逐镜预览
- **功能点**:
  - **分镜时间线展示**: 按分镜序号纵向排列，每镜含画面描述、镜头语言、台词文案、时长、BGM建议、转场效果
  - **脚本总时长统计**: 自动汇总各分镜时长秒数
  - **关联任务追踪**: 展示基于该脚本创建的所有生成任务状态与进度

### 生成任务表 (`TaskBoardPage.tsx`)
- **页面目标**: 跟踪 AI 视频生成任务全生命周期，监控进度与异常
- **功能点**:
  - **创建生成任务**:
    - 触发: 顶部「新建任务」Button 或 脚本库「生成视频」操作
    - 交互: Dialog 含 Select（关联脚本）、Select（视频生成模型）、Select（图像生成模型）、Select（TTS音色）、Select（分辨率）、上传参考图
    - 提交: 写入 feishu-bitable 任务表，初始状态「待开始」，AI 调度建议由 ai-text-generate 实例输出（可选）
    - 反馈: toast.success('任务已创建') + 任务列表新增卡片
    - 数据契约: `ITask` 必须含 `taskName`, `taskType`, `status`, `currentStage`, `progressPercent`, `linkedScript`, `videoModel`, `imageModel`, `ttsVoice`, `resolution`, `referenceImage`, `segmentVideos`, `finalVideo`, `estimatedFinishTime`, `actualFinishTime`, `errorLog`, `notes`
  - **任务状态流转**:
    - 触发: 任务卡片/行内「操作」Dropdown（开始/暂停/重试/取消/完成）
    - 交互: 状态变更 Dialog 确认（部分操作需备注）
    - 提交: 更新 feishu-bitable 任务记录状态字段
    - 反馈: toast.success('任务状态已更新') + 卡片状态徽章变色 + 进度条更新
  - **进度监控**: 任务卡片展示进度百分比条、当前阶段文字、预计/实际完成时间；失败任务展示错误日志预览与「查看详情」入口
  - **批量操作**: Table 行 Checkbox + 顶部批量操作 Bar（批量开始/批量取消/批量删除）

### 任务详情/监控 (`TaskDetailPage.tsx`)
- **页面目标**: 单任务的深度监控与分段视频管理
- **功能点**:
  - **任务全信息展示**: 全部字段展示，含关联脚本快捷跳转、模型配置明细
  - **分段视频管理**: 展示分段视频列表，支持预览与重新生成单段
  - **成品视频确认**: 任务完成后，确认成品视频并推送至视频成品库

### 视频成品库 (`VideoLibraryPage.tsx`)
- **页面目标**: 管理已生成视频，跟踪播放数据与发布状态
- **功能点**:
  - **视频卡片网格**: 封面图 + 视频标题 + 时长 + 分辨率 + 生成模型 + 生成时间，卡片布局（非表格，更适配视频预览）
  - **发布状态管理**:
    - 触发: 视频卡片「操作」Dropdown → 「发布」/「撤回」/「归档」
    - 交互: Dialog 含 Select（发布平台：抖音/快手/视频号/B站）、发布确认
    - 提交: 更新 feishu-bitable 视频记录发布状态与平台字段
    - 反馈: toast.success('发布状态已更新') + 卡片状态徽章更新
  - **播放数据展示**: 播放量、点赞数（支持手动录入或 API 同步）
  - **筛选与搜索**: 按发布状态、发布平台、标签、生成时间范围筛选

### 视频成品详情 (`VideoDetailPage.tsx`)
- **页面目标**: 单视频的完整信息展示与发布历史
- **功能点**:
  - **视频播放器**: 嵌入视频文件播放
  - **关联溯源**: 展示关联脚本、关联任务的快捷跳转链接
  - **发布记录**: 各平台的发布状态与时间线

### 提示词模板库 (`PromptTemplatePage.tsx`)
- **页面目标**: 管理 AI 提示词模板，追踪使用效果与评分
- **功能点**:
  - **新建模板**:
    - 触发: 顶部「新建模板」Button
    - 交互: Dialog 含输入框（模板名称）、Select（类型）、Select（适用模型）、Textarea（提示词内容）、Textarea（变量说明）
    - 提交: 写入 feishu-bitable 模板表
    - 反馈: toast.success('模板已保存') + 列表刷新
    - 数据契约: `IPromptTemplate` 必须含 `templateName`, `type`, `applicableModel`, `promptContent`, `variableDescription`, `usageCount`, `avgEffectScore`
  - **模板效果评估**:
    - 触发: 行操作 Dropdown → 「评估效果」或 定时批量评估
    - 交互: 调 ai-categorization 实例，传入模板历史使用记录与生成结果
    - 提交: 更新模板平均效果评分字段
    - 反馈: toast.success('评估完成') + 评分数据更新
  - **使用统计**: 展示使用次数、平均效果评分排序，高评分模板置顶推荐
  - **快速复制**: 行内「复制」Button，复制提示词内容到剪贴板

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_video_workshop_materials` | 爆款素材列表，类型为 `IMaterial[]` | 工作台首页、爆款素材库、爆款素材详情 |
| `__global_video_workshop_scripts` | 分镜脚本列表，类型为 `IScript[]` | 工作台首页、分镜脚本库、分镜脚本详情、生成任务表 |
| `__global_video_workshop_tasks` | 生成任务列表，类型为 `ITask[]` | 工作台首页、生成任务表、任务详情、视频成品库 |
| `__global_video_workshop_videos` | 视频成品列表，类型为 `IVideo[]` | 工作台首页、视频成品库、视频成品详情 |
| `__global_video_workshop_prompts` | 提示词模板列表，类型为 `IPromptTemplate[]` | 工作台首页、提示词模板库 |
| `__global_video_workshop_filters` | 各页面筛选状态缓存，类型为 `Record<page, FilterState>` | 全部列表页 |
| `__global_video_workshop_currentUser` | 当前用户信息（从飞书上下文获取），类型为 `IUser` | 全部页面（操作人记录） |

```ts
interface IMaterial {
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

interface IScript {
  id: string;
  scriptTitle: string;
  contentType: string;
  duration: number;
  theme: string;
  shots: IShot[];
  createdAt: string;
  updatedAt: string;
}

interface IShot {
  shotNumber: number;
  sceneDescription: string;
  cameraLanguage: string;
  dialogue: string;
  durationSec: number;
  bgmSuggestion: string;
  transition: string;
  referenceVideo?: string;
}

interface ITask {
  id: string;
  taskName: string;
  taskType: string;
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

interface IVideo {
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

interface IPromptTemplate {
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

interface IUser {
  userId: string;
  userName: string;
  avatar?: string;
  department?: string;
}
```

---

## 风格约束清单（蓝图 corporate-blueprint）

以下约束必须传递给 design-agent 与 code-agent，确保视觉一致性：

| 约束项 | 要求 | 违反后果 |
|-------|------|---------|
| 卡片顶边线 | 所有白底卡片必须使用 `border-t-[3px] border-t-[#0033A0]`，仅顶边，其余三边无边框 | 风格核心签名丢失 |
| 卡片圆角 | 所有卡片/Tooltip/图表容器必须使用 `rounded-none`，禁止任何默认圆角类 | 精密感被破坏 |
| 图表配色 | 仅使用 `#0033A0` → `#0066FF` → `#4D94FF` → `#99C2FF` → `#CCE0FF` 单色蓝五级渐变，禁止红绿橙等语义色进入图表填充 | 风格一致性崩坏 |
| 字体 | 全局首行必须写入 `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');` | 字体栈错误 |
| Section 标题 | 统一格式 `01. SECTION NAME`，`text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]` | 层级体系混乱 |
| 分隔线 | 统一 `0.5px solid #E2E8F0`（thin-border），禁止粗边框 | 精密感过重 |
| Header | 深蓝渐变 `linear-gradient(to bottom right, #001D4A, #0033A0, #004B93)` + 斜切几何装饰块 `bg-white/5 skew-x-[-20deg]` | 企业感开场缺失 |
| 状态徽章 | 允许 `success/danger/warning` 语义色，但仅限徽章/标签文字与底色，不进入图表 | 语义与风格冲突 |
| 阴影 | 统一 `shadow-md` 轻阴影，无重阴影 | 层次过重 |
| 滚动条 | 宽 6px，轨道 `#f1f1f1`，滑块 `#0033A0`，圆角 3px | 细节不一致 |

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Exact Reference —— 用户提供了完整的「蓝图」企业报告风格系统，含硬规则、组件规格与视觉签名，必须原样执行
- **核心情绪 / 应用类型**: AI 视频创作全流程工作台（appType=1 中后台工具），情绪为精密、专业、可信赖的创作流水线感
- **独特记忆点**: 白色零圆角卡片顶部 3px 深蓝边线 + 极端字号对比的编号 Section 标题体系，将企业评审报告的权威感注入 AI 创作工具

## 2. Art Direction

- **方向名**: 蓝图创作工坊
- **Design Style**: Swiss Minimalist 瑞士极简 + Corporate Blueprint 企业蓝图 —— AI 视频创作需要清晰的信息层级和流水线般的秩序感，蓝图风格的精密分隔与极端字号对比恰好服务「素材→脚本→生成→成品」的流程可视化
- **DNA 参数**: 零圆角（`rounded-none`）/ 轻阴影 `shadow-md` / 标准间距 `gap-8 p-6` / Inter 单一无衬线 / 3px 顶边线 + 0.5px 极细分隔线
- **应用类型**: Workflow 工具 —— 侧边导航 + 主内容区 max-w-7xl，六库一屏按编号 Section 串联

## 3. Color System

**色彩关系**: 蓝图深蓝主色 + 同色五级渐变图表序列 + 浅灰工作背景 + 纯白卡片面 + 极细分隔线体系

**配色设计理由**: 深蓝 `#0033A0` 承载企业级可信赖感与 AI 精密气质，收敛为单一色相避免创作工具的视觉噪音；浅灰底 `#F4F7F9` 降低长时间工作的眼部负荷；success/danger/warning 仅用于状态徽章，不进入图表填充，保持视觉纪律

**主色推导**: 蓝图风格的 `#0033A0` 直接继承为 primary，契合「AI 视频创作工坊」的技术权威定位；header 渐变从 `#001D4A` 深海军蓝过渡到 `#004B93`，中间色复用 accent，形成深邃的开场层次

**使用比例**: 60% 中性（bg、card、border）/ 30% 辅助（muted、textMuted、accent 浅底）/ 10% primary（CTA、卡片顶边线、图表主色、当前导航）

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 25% 97%) | 浅灰工作背景，降低视觉疲劳 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片面，零圆角，顶部 3px 深蓝边线 |
| text | `--foreground` | `text-foreground` | hsl(0 0% 10%) | 深墨标题正文，高对比可读 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(215 16% 62%) | slate-400 辅助信息、标签、坐标轴 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(225 100% 31%) | 蓝图深蓝，CTA、卡片顶边线、图表主色 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 深蓝底上的白字 |
| accent | `--accent` | `bg-accent` | hsl(210 25% 97%) | hover/focus 浅底、选中态、Skeleton |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(225 100% 31%) | accent 底上的深蓝字 |
| border | `--border` | `border-border` | hsl(214 32% 91%) | 0.5px 极细分隔线，精密感 |

**语义色提示**:
- **成功**: bg `hsl(152 82% 96%)` / border `hsl(152 82% 90%)` / text `hsl(160 84% 39%)` —— 拆解完成、任务成功、发布上线，饱和度与 primary 对齐
- **警告**: bg `hsl(48 100% 96%)` / border `hsl(48 100% 90%)` / text `hsl(38 92% 50%)` —— 生成中、待审核、进度延迟
- **错误**: bg `hsl(0 86% 97%)` / border `hsl(0 86% 92%)` / text `hsl(0 84% 60%)` —— 生成失败、错误日志、高风险素材
- **图表五级蓝阶**: `#0033A0` → `#0066FF` → `#4D94FF` → `#99C2FF` → `#CCE0FF`（深→浅），HARD RULE：任何图表填充色仅限此五级，禁止引入 success/danger/warning 色相

## 4. 字体与节奏

- **font-display**: Inter 800/700 —— 极端字号对比的核心载体，全大写加粗标签的权威感
- **font-body**: Inter 400/500 —— 单一字体族覆盖全部层级，无需 CJK 兜底，系统 sans-serif 后备
- **字号**: 页面标题 `text-4xl md:text-5xl font-extrabold`；Section 编号标签 `text-[11px] font-black uppercase tracking-[0.15em]`；KPI 数值 `text-xl font-bold`；KPI 标签 `text-[9px] font-black uppercase tracking-tight`；表格数据 `text-xs font-bold` / `text-[11px] font-medium`；正文描述 `text-[11px] font-medium leading-relaxed`
- **圆角**: 零圆角（`rounded-none`）—— 企业精密感核心规则；例外：状态标签 `rounded-sm`、风险徽章 `rounded-[4px]`、时间线节点 `rounded-full`、柱体顶部 `rounded-t-[2px]`

## 5. 全局布局契约

- **Reference Layout Use**: Exact Reference —— 蓝图风格的单页纵向滚动骨架适配为多页面工作台：Gradient Header 降级为页面顶部横幅或当前页标题区，编号 Section 体系映射为六库页面的页面标题规范
- **Page / Section Order**: 工作台首页 → 01. 爆款素材库 → 02. 分镜脚本库 → 03. 生成任务表 → 04. 视频成品库 → 05. 提示词模板库
- **Standard Content Zone**: `max-w-7xl mx-auto px-8`，内容区与导航框架同宽对齐
- **Shell / Frame Alignment**: 侧边导航固定宽 + 主内容区独立滚动，内容容器与导航逻辑分离，仅顶部标题区可选全宽渐变
- **Padding & Rhythm**: 页面 `py-8 md:py-12`，Section 间 `space-y-8`，卡片内 `p-6`，网格 `gap-8`
- **Full-bleed Zones**: 工作台首页顶部统计区可用深蓝渐变全宽背景，内部统计卡片仍受 `max-w-7xl` 约束；其余页面标题区保持内容区宽度
- **Local Narrowing**: 表单详情页（新建任务、编辑脚本）在统一容器内收窄至 `max-w-3xl` 或 `max-w-2xl`
- **Overflow Strategy**: 爆款素材库、分镜脚本库等宽表格使用 `overflow-x-auto`；生成任务表的时间线横向滚动
- **Flexibility Boundary**: 移动端 `px-4`、卡片 `p-4`、KPI 网格 `grid-cols-2` 可微调；全局 `max-w-7xl`、零圆角、3px 顶边线、主色 `#0033A0` 不可变

## 6. 视觉与动效

- **装饰**: 斜切几何块（Header 区域 `skew-x-[-20deg]`）、极细分隔线体系、色条标记
- **阴影/边界**: 轻阴影 `shadow-md` 仅用于卡片浮起感，层次主要由 3px 顶边线 + 0.5px 分隔线建立
- **动效**: 克制 —— 表格行 `hover:bg-slate-50 transition-colors`；时间线节点 `group-hover:border-primary transition-colors`；无弹性动效、无入场动画

## 7. 组件原则

- **按钮**: Primary 深蓝底白字用于主行动（新建任务、开始生成）；Secondary 白底深蓝边框用于次要操作；Ghost 用于工具栏图标按钮，hover 用 accent 浅底
- **卡片**: 所有卡片型组件（统计卡、素材卡、脚本卡、任务卡、成品卡、模板卡）必须复用 `report-card` 规格：白底、零圆角、`border-t-[3px] border-t-[#0033A0]`、`shadow-md`
- **表格**: 表头 `text-[9px] font-black uppercase text-muted`；主列（视频标题、脚本标题、任务名称）`text-xs font-bold text-primary`；数值列右对齐等宽字体；行 hover `bg-slate-50`
- **状态标签**: 拆解状态/任务状态/发布状态使用语义色徽章，`rounded-sm`，`text-[10px] font-bold`
- **进度条**: 生成任务进度使用蓝色阶填充，禁止绿/黄/红，语义通过旁边百分比文字和状态徽章表达
- **加载与空状态**: 延续蓝图风格，Skeleton 用 `bg-accent`（浅灰底），零圆角卡片占位

## 8. Image Direction

- **Image Role**: 视频封面图、参考视频缩略图、素材预览图 —— 属于内容资产而非装饰图，界面本身不依赖图片建立视觉记忆点
- **Image Art Direction**: 无强制图片需求。视频封面以真实视频帧或 AI 生成画面为主，界面优先通过排版、色彩纪律和 3px 顶边线体系建立识别度
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免为工作台页面生成通用科技感插图或商务素材图库图；视频创作工具的内容图片应来自真实业务数据（视频帧、生成结果）

## 9. Anti-patterns

- **Split personality**: 六库页面之间切换圆角、阴影或主色；全站共享同一套蓝图视觉系统，任何新增卡片必须带 3px 顶边线
- **Phantom tokens**: 编造 `chart-1` 到 `chart-5` 以外的图表色变量；图表仅限五级蓝阶
- **Default SaaS drift**: 回到默认蓝按钮、圆角卡片、紫色渐变；用蓝图风格的零圆角 + 顶边线 + 极端字号对比塑造界面
- **Invisible interaction**: 表格行 hover 做了，focus-visible 丢失；每个可交互元素必须有键盘可见状态
- **Mono-hue tyranny**: 主色铺满所有按钮、tab、icon、边框；按 60-30-10 收敛 primary 到 CTA 与品牌锚点
- **Status color drift**: 任务失败图表用红色填充、进度条用绿色填充；语义色仅限徽章/文字，图表本体永远蓝色阶