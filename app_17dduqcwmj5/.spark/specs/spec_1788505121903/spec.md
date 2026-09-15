# 需求分析
## 用户故事
1. 应用内新建课程教学资料并回写多维表格
  - 1.1 课程页「设备工具」「工艺流程」「配方详情」区块可通过表单弹窗新建记录，本地保存成功后自动回写多维表格对应数据表
  - 1.2 教学资料支持编辑与删除，编辑后多维表格对应记录同步更新为新值
  - 1.3 回写失败不阻塞本地创建，列表行展示「同步失败」标识且可重试
2. 应用内新建内容素材并回写多维表格
  - 2.1 内容中心素材库可通过弹窗新建、编辑、删除素材，新建成功后回写多维表格内容素材库
  - 2.2 素材列表与营销内容列表展示同步状态标识
3. 各列表同步状态展示与失败重试
  - 3.1 课程教学资料、素材、营销内容、FAQ、未命中问题列表行展示同步状态（已同步/同步失败/未同步）
  - 3.2 同步失败行提供「重新同步」操作，点击后再次回写，成功则标识更新为已同步
  - 3.3 多维表格未配置时展示统一说明而非失败告警
4. 未提交代码收尾与发布就绪
  - 4.1 本轮全部代码变更（含六个回写插件实例配置、通用重试模块、表单弹窗）提交入库，工作区无遗留未提交任务代码
  - 4.2 发布流程不再出现「当前有任务代码未提交」提示，应用可正常发布
  - 4.3 发布后应用内回写与重试功能保持可用

## 页面列表
### 课程管理页（既有页面扩展）
1. 设备工具/工艺流程/配方详情区块提供「新建」入口触发对应表单弹窗，支持编辑与删除
2. 三个教学资料区块列表行展示同步状态标识，失败行提供「重新同步」
3. 弹窗表单必填校验与提交 loading/错误提示，空区块展示空状态引导
### 内容中心页（既有页面扩展）
1. 素材库区块提供「新建素材」弹窗，支持编辑与删除素材
2. 素材列表与营销内容列表行展示同步状态标识，失败行可「重新同步」
3. 新建/编辑提交后列表刷新并给出成功或同步失败提示
### 咨询 FAQ 页（既有页面扩展）
1. FAQ 列表与未命中问题列表行展示同步状态标识
2. 同步失败行提供「重新同步」操作并反馈结果

# 技术方案
## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [插件, 服务端, 前端]
- 现状说明：课程、教学资料（设备工具/工艺流程/配方详情）、素材、营销内容、FAQ 等表已是「多维表格 → 本地库」单向同步表，且均已含 bitable_record_id / sync_status 字段（无需数据库变更）；学员/排期/考勤反向回写已上线。本轮补齐其余六张表的反向回写与应用内新建能力，主体代码已在工作区但未提交，需收尾、验证并全部提交以解除发布阻塞；同步表禁止通过插件做删除操作
## 页面路由与导航
### 导航设计
- 导航机制：页面路由
- 导航项：沿用现有左侧导航，不新增页面与导航项；新建入口与同步状态挂载在课程管理页、内容中心页、咨询 FAQ 页既有区块内
## 插件设计
多维表格回写统一在服务端 Service 内调用（结果需落库），经 CapabilityService 按常量动态 load 实例。六个回写实例已创建（server/capabilities/*_writeback_1.json，未提交），需随代码一并提交；执行阶段发现实例缺失或 fields 配置为空时，必须调用 plugin_instance 补建/修复，禁止拿 pluginKey 当 instanceId。

| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| course_sheet_writeback_1 | feishu-bitable | 课程表回写（新增/更新） | 服务端 CapabilityService | 课程管理页 | 记录字段键值对、记录 ID | 记录 ID/更新结果 |
| equipment_tool_table_writeback_1 | feishu-bitable | 设备工具表回写 | 服务端 CapabilityService | 课程管理页 | 记录字段键值对、记录 ID | 记录 ID/更新结果 |
| process_flow_table_writeback_1 | feishu-bitable | 工艺流程表回写 | 服务端 CapabilityService | 课程管理页 | 记录字段键值对、记录 ID | 记录 ID/更新结果 |
| recipe_detail_table_writeback_1 | feishu-bitable | 配方详情表回写 | 服务端 CapabilityService | 课程管理页 | 记录字段键值对、记录 ID | 记录 ID/更新结果 |
| content_material_library_writeback_1 | feishu-bitable | 内容素材库回写 | 服务端 CapabilityService | 内容中心页 | 记录字段键值对、记录 ID | 记录 ID/更新结果 |
| faq_knowledge_base_writeback_1 | feishu-bitable | FAQ 知识库回写 | 服务端 CapabilityService | 咨询 FAQ 页 | 记录字段键值对、记录 ID | 记录 ID/更新结果 |

说明：回写字段按多维表格字段名组织，关联字段写入值必须为字符串数组；多维表格 appToken/tableID 经环境变量或配置读取，禁止硬编码。
## 业务模型
### API 设计
#### 课程管理页 相关
**页面路径**: /courses
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 教学资料新建/编辑/删除 | API | 设备工具、工艺流程、配方详情三组 CRUD，落库后触发回写 |
| 教学资料回写多维表格 | 插件（服务端调用） | 对应 *_writeback_1 实例，按有无 bitable_record_id 走新增/更新 |
| 列表同步状态展示 | API | 既有教学资料列表响应扩展 syncStatus |
| 失败重试 | API + 插件 | 通用重试接口 |

**所需 API**:
```typescript
// 设备工具/工艺流程/配方详情 CRUD（三组同构） [领域模型: CourseModel] [对应页面功能: 教学资料新建/编辑/删除]
POST   /api/courses/equipments        Body: CreateEquipmentRequest
PATCH  /api/courses/equipments/:id    Body: UpdateEquipmentRequest
DELETE /api/courses/equipments/:id
POST   /api/courses/process-flows     Body: CreateProcessFlowRequest
PATCH  /api/courses/process-flows/:id
DELETE /api/courses/process-flows/:id
POST   /api/courses/formulas          Body: CreateFormulaRequest
PATCH  /api/courses/formulas/:id
DELETE /api/courses/formulas/:id
Response: { id: string; syncStatus: 'synced' | 'failed' | 'not_synced' }
```

#### 内容中心页 相关
**页面路径**: /content-center
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 素材新建/编辑/删除 | API | 落库后触发内容素材库回写 |
| 素材/营销内容列表同步状态 | API | 既有列表响应扩展 syncStatus |
| 失败重试 | API + 插件 | 通用重试接口 |

**所需 API**:
```typescript
// 素材 CRUD [领域模型: ContentModel] [对应页面功能: 素材新建/编辑/删除]
POST   /api/content/materials        Body: CreateMaterialRequest
PATCH  /api/content/materials/:id    Body: UpdateMaterialRequest
DELETE /api/content/materials/:id
Response: { id: string; syncStatus: 'synced' | 'failed' | 'not_synced' }
```

#### 咨询 FAQ 页 相关
**页面路径**: /consultation
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| FAQ/未命中列表同步状态 | API | 既有列表响应扩展 syncStatus |
| 失败重试 | API + 插件 | 通用重试接口 |

#### 通用重试（跨页面共用）
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 按记录类型重试回写 | API + 插件 | bitable-retry 模块，按 recordType 路由到对应 mapper 重新回写并更新同步状态 |

**所需 API**:
```typescript
// 通用同步重试 [领域模型: BitableSyncModel] [对应页面功能: 重新同步]
POST /api/bitable-retry/retry
Body: { recordType: BitableRecordType; recordId: string }
Response: { syncStatus: 'synced' | 'failed'; message?: string }
```
