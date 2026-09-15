# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 插件, 服务端, 前端]

说明：项目已从飞书多维表格导入 9 张同步数据表（学员登记表、课程总表、课程排期表、考勤记录表、配方明细表、工艺流程表、设备工具表、FAQ 知识库、内容素材库），本方案全部复用既有表结构，仅新增 2 张本地业务表并对学员表扩展 1 个字段，不重命名、不删除、不修改任何同步字段。

## 页面路由与导航

### 页面路由
| 路由 | 页面 | 说明 |
|------|------|------|
| / | 工作台 | 默认首页，经营总览与待办入口 |
| /content-center | 招生内容中心 | 内容创作、审核、发布日历与素材库 |
| /consultation | 智能咨询 | FAQ 智能问答与知识库维护 |
| /courses | 课程列表 | 课程卡片浏览与筛选 |
| /courses/:id | 课程详情 | 单课程教学资料中心，由课程列表卡片跳转 |
| /students | 学员管理 | 学员台账、报名登记、缴费跟踪 |
| /schedules | 课程排期 | 排期管理、报名进度与考勤执行 |

### 导航设计
- 导航机制：页面路由
- 全局左侧边栏导航贯穿所有页面，菜单项按当前用户角色过滤展示；无权限路由直接访问时展示无权限提示页
- 导航项：
  - 工作台
  - 招生内容中心
  - 智能咨询
  - 课程列表
  - 学员管理
  - 课程排期

### 角色权限设计
复用平台内置权限服务（角色与成员在运行时通过平台权限能力配置，代码侧使用 CanRole/useCan 做点位控制，不新建角色表/成员表）：

| 角色 | 可见导航与页面 |
|------|----------------|
| 校长/管理员 | 全部 6 个导航与所有页面 |
| 招生老师 | 招生内容中心、智能咨询、课程列表、学员管理 |
| 授课老师 | 课程列表、课程详情（含配方/工艺/设备）、课程排期、学员管理（只读列表） |
| 学员 | 智能咨询、课程排期（仅与自己相关）、课程列表；课程详情页内配方明细与工艺流程区块不可见 |

数据点位补充：配方明细、工艺流程相关查询接口仅允许校长/管理员、招生老师（只读）、授课老师访问；学员角色请求时返回无权限。

## 数据模型

### 数据库设计

#### 既有同步表（复用，不改动结构）
| 表名 | 用途 | 本次消费要点 |
|------|------|--------------|
| course_general_table（课程总表） | 课程基础信息 | 列表/详情、筛选字段、在售课程统计 |
| formula_detail_table（配方明细表） | 课程配方 | 课程详情配方表格，经 course_related 关联课程 |
| process_flow_table（工艺流程表） | 制作流程 | 课程详情流程步骤，按 step_no 排序 |
| equipment_tool_table（设备工具表） | 设备清单 | 课程详情设备列表 |
| course_schedule_table（课程排期表） | 开班排期 | 排期列表、报名进度、冲突检测、考勤关联 |
| attendance_record_table（考勤记录表） | 考勤记录 | 考勤抽屉读写、学员详情考勤记录 |
| student_registration_table（学员登记表） | 学员台账 | 学员列表/详情、报名登记、缴费跟踪（扩展字段见下） |
| faq_knowledge_base（FAQ 知识库） | 常见问题 | 智能问答匹配、知识库维护、命中次数累计 |
| content_material_library（内容素材库） | 营销素材 | 素材库浏览筛选、AI 创作素材输入 |

#### 学员登记表扩展（student_registration_table）
用途：支撑报名成功后飞书提醒学管师。
新增字段：
- manager_profile: user_profile（学管师人员，新增学员时通过人员选择器选择；原有文本字段 learning_manager 保留用于展示，不做修改）

#### 招生内容表（marketing_content）【新建】
用途：存储 AI 创作的招生内容及审核、发布、效果数据（内容素材库为同步的原始素材，创作产出为独立业务数据，语义不重叠）。
核心字段：
- title: varchar（内容标题）
- course_id: uuid（关联课程，引用课程总表 id）
- content_type: varchar ['enrollment_copy', 'video_script', 'moments', 'poster_copy']（招生文案/短视频脚本/朋友圈/海报文案）
- body: text（内容正文）
- status: varchar ['pending_review', 'available', 'used', 'rejected']（待审核/可用/已使用/已驳回）
- schedule_date: date（计划发布日期）
- reject_reason: text（驳回原因）
- publish_platform: varchar（发布平台）
- like_count: bigint（点赞数）
- conversion_count: bigint（咨询转化数）
关联关系：与课程总表是多对一的关系

#### FAQ 未命中问题表（faq_miss）【新建】
用途：记录智能问答未匹配的问题，支撑待补充列表与一键转新 FAQ。
核心字段：
- question: text（未匹配问题原文）
- status: varchar ['pending', 'converted']（待处理/已转 FAQ）
关联关系：转换后写入 FAQ 知识库，本身不与其它表建立字段关联

## 插件设计

| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| 招生内容生成 | ai-text-generate | 基于课程信息与素材摘要生成招生文案/脚本/朋友圈/海报文案 | 前端 capabilityClient | 招生内容中心 | 拼装好的提示词文本（课程名称/简介/学费/卖点素材+内容类型要求） | stream\<string\> |
| 学员报名通知 | send-feishu-message | 新学员报名成功后提醒学管师跟进 | 服务端（与报名落库同一事务链路） | 学员管理 | 接收人 user_id（学员记录 manager_profile）、通知文本 | {success} |
| 满员预警 | send-feishu-message | 排期剩余名额为 0 时预警授课讲师 | 服务端（排期保存链路内检查触发） | 课程排期 | 接收人 user_id（排期讲师）、预警文本 | {success} |
| 开课提醒 | send-feishu-message | 开课前一天向讲师与报名学员发送提醒 | 服务端（定时任务触发） | 课程排期 | 接收人 user_id、提醒文本 | {success} |

说明：
- 报名学员为本地学员记录、无飞书用户身份，开课提醒仅发送给排期讲师（user_profile 有效）；学员侧开课信息通过排期列表可见，发送前对无效接收人做跳过处理并记录日志
- 学管师提醒接收人取自学员记录新增的 manager_profile 字段；字段为空时跳过发送并返回提示信息，不阻断报名保存

### 自动化任务
- 开课提醒定时任务：cron 每日 09:00 触发（遵循平台触发器规范），扫描次日开课且状态为招生中/已开课的排期，向讲师发送飞书开课提醒

## 业务模型

### API 设计

#### 工作台相关
**页面路径**: /
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| KPI 指标与待办计数 | API | GET /api/dashboard/overview |
| 招生趋势图 | API | GET /api/dashboard/enrollment-trend |
| 渠道分布图 | API | GET /api/dashboard/channel-distribution |
| 角色化欢迎语 | 平台能力 | 内置用户系统获取当前用户姓名与角色 |

**所需 API**:
```typescript
// 经营总览：KPI 与待办计数 [领域模型: DashboardModel] [对应页面功能: KPI 指标卡区、待办快捷入口]
GET /api/dashboard/overview
Response: {
  studentCount: number;
  totalPayment: number;
  onSaleCourseCount: number;
  avgEnrollRate: number;
  todo: { pendingReviewCount: number; nearFullScheduleCount: number; unpaidStudentCount: number };
}

// 招生趋势：按报名日期统计新增学员与缴费金额 [领域模型: DashboardModel] [对应页面功能: 图表区]
GET /api/dashboard/enrollment-trend
Response: { items: Array<{ date: string; newStudentCount: number; paymentAmount: number }> }

// 渠道分布：按来源渠道统计学员数 [领域模型: DashboardModel] [对应页面功能: 图表区]
GET /api/dashboard/channel-distribution
Response: { items: Array<{ channel: string; studentCount: number }> }
```

#### 招生内容中心相关
**页面路径**: /content-center
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 内容列表/筛选/搜索 | API | GET /api/marketing-contents |
| 保存创作内容 | API | POST /api/marketing-contents |
| 审核通过/驳回 | API | PATCH /api/marketing-contents/:id/audit |
| 标记已使用 | API | PATCH /api/marketing-contents/:id/use |
| 录入效果 | API | PATCH /api/marketing-contents/:id/effect |
| 发布日历 | API | GET /api/marketing-contents/calendar |
| 素材库浏览筛选 | API | GET /api/materials |
| AI 生成内容 | 插件 | ai-text-generate（前端直调，课程信息与素材摘要经上述 API 获取后拼入提示词） |

**所需 API**:
```typescript
// 内容分页列表 [领域模型: MarketingContentModel] [对应页面功能: 内容列表与审核操作]
GET /api/marketing-contents?status=pending_review&keyword=&page=1&pageSize=20
Response: {
  items: Array<{
    id: string; title: string; courseId: string; courseName: string;
    contentType: string; body: string; status: string; scheduleDate: string | null;
    rejectReason: string | null; publishPlatform: string | null;
    likeCount: number | null; conversionCount: number | null; createdAt: string;
  }>;
  total: number;
}

// 保存创作内容（状态初始为待审核） [领域模型: MarketingContentModel] [对应页面功能: 创作弹窗保存]
POST /api/marketing-contents
Body: { title: string; courseId: string; contentType: string; body: string; scheduleDate?: string }
Response: { id: string }

// 审核（通过转可用，驳回必填原因转已驳回） [领域模型: MarketingContentModel] [对应页面功能: 审核操作]
PATCH /api/marketing-contents/:id/audit
Body: { action: 'approve' | 'reject'; rejectReason?: string }
Response: { status: string }

// 标记已使用 [领域模型: MarketingContentModel] [对应页面功能: 审核操作]
PATCH /api/marketing-contents/:id/use
Response: { status: string }

// 录入发布效果 [领域模型: MarketingContentModel] [对应页面功能: 录入效果弹窗]
PATCH /api/marketing-contents/:id/effect
Body: { publishPlatform: string; likeCount: number; conversionCount: number }
Response: { id: string }

// 发布日历：按月返回每日内容条目 [领域模型: MarketingContentModel] [对应页面功能: 发布日历视图]
GET /api/marketing-contents/calendar?month=2026-09
Response: { items: Array<{ date: string; contents: Array<{ id: string; title: string; status: string; contentType: string }> }> }

// 素材库分页列表 [领域模型: MaterialModel] [对应页面功能: 素材库标签页]
GET /api/materials?materialType=&platform=&tag=&keyword=&page=1&pageSize=20
Response: {
  items: Array<{ id: string; title: string; materialType: string; coreContent: string; applicablePlatform: string[]; tag: string[]; status: string }>;
  total: number;
}
```

#### 智能咨询相关
**页面路径**: /consultation
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 问题匹配与命中计数 | API | POST /api/faqs/match |
| FAQ 列表/筛选/搜索 | API | GET /api/faqs |
| 新增/编辑/停用 FAQ | API | POST / PATCH /api/faqs |
| 未命中问题列表与转 FAQ | API | GET /api/faq-misses、POST /api/faq-misses/:id/convert |

**所需 API**:
```typescript
// 智能问答匹配：命中返回标准答案并使命中次数加 1，未命中写入待补充并返回转人工话术 [领域模型: FaqModel] [对应页面功能: 智能问答区]
POST /api/faqs/match
Body: { question: string }
Response: { matched: boolean; faqId: string | null; answer: string | null; fallbackMessage: string | null }

// FAQ 分页列表（默认命中次数降序） [领域模型: FaqModel] [对应页面功能: FAQ 知识库列表]
GET /api/faqs?category=&status=&keyword=&page=1&pageSize=20
Response: {
  items: Array<{ id: string; question: string; answer: string; category: string; keywords: string[]; similarQuestion: string; status: string; hitCount: number; updateTime: string | null }>;
  total: number;
}

// 新增 FAQ [领域模型: FaqModel] [对应页面功能: 新增常见问题弹窗]
POST /api/faqs
Body: { question: string; answer: string; category: string; keywords: string[]; similarQuestion?: string }
Response: { id: string }

// 编辑或停用 FAQ [领域模型: FaqModel] [对应页面功能: 列表行编辑/停用]
PATCH /api/faqs/:id
Body: { question?: string; answer?: string; category?: string; keywords?: string[]; similarQuestion?: string; status?: string }
Response: { id: string }

// 未命中问题列表 [领域模型: FaqMissModel] [对应页面功能: 待补充列表]
GET /api/faq-misses?status=pending&page=1&pageSize=20
Response: { items: Array<{ id: string; question: string; status: string; createdAt: string }>; total: number }

// 未命中问题一键转新 FAQ [领域模型: FaqMissModel] [对应页面功能: 待补充列表]
POST /api/faq-misses/:id/convert
Body: { answer: string; category: string; keywords?: string[] }
Response: { faqId: string }
```

#### 课程列表 / 课程详情相关
**页面路径**: /courses、/courses/:id
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 课程卡片列表 | API | GET /api/courses |
| 课程基本信息 | API | GET /api/courses/:id |
| 配方明细 | API | GET /api/courses/:id/formulas（角色点位控制） |
| 工艺流程 | API | GET /api/courses/:id/process-flows（角色点位控制） |
| 设备工具 | API | GET /api/courses/:id/equipments |
| 关联排期 | API | GET /api/courses/:id/schedules |

**所需 API**:
```typescript
// 课程分页列表 [领域模型: CourseModel] [对应页面功能: 筛选搜索栏、课程卡片列表]
GET /api/courses?category=&difficulty=&status=&keyword=&page=1&pageSize=20
Response: {
  items: Array<{ id: string; courseName: string; courseCategory: string; difficultyLevel: string; studyDuration: string; tuitionFee: number; productImage: string[]; status: string }>;
  total: number;
}

// 课程基本信息 [领域模型: CourseModel] [对应页面功能: 课程基本信息区]
GET /api/courses/:id
Response: { id: string; courseName: string; courseCategory: string; difficultyLevel: string; studyDuration: string; tuitionFee: number; courseIntro: string; productImage: string[]; status: string }

// 配方明细（支持食材名称搜索） [领域模型: FormulaModel] [对应页面功能: 配方明细表格]
GET /api/courses/:id/formulas?keyword=
Response: { items: Array<{ id: string; ingredientName: string; quantity: number; unit: string; ingredientCategory: string; remark: string | null }> }

// 工艺流程（按步骤序号升序） [领域模型: ProcessFlowModel] [对应页面功能: 制作流程区]
GET /api/courses/:id/process-flows
Response: { items: Array<{ id: string; stepNo: number; stepName: string; operationDesc: string; keyControlPoint: string | null; estimatedDuration: string | null; operationVideo: string[] }> }

// 设备工具清单 [领域模型: EquipmentModel] [对应页面功能: 设备工具区]
GET /api/courses/:id/equipments
Response: { items: Array<{ id: string; equipmentToolName: string; specification: string | null; quantity: number; remark: string | null }> }

// 关联课程排期 [领域模型: ScheduleModel] [对应页面功能: 排期区跳转课程排期页]
GET /api/courses/:id/schedules
Response: { items: Array<{ id: string; scheduleName: string; classDate: string; startTime: string; endTime: string; status: string }> }
```

#### 学员管理相关
**页面路径**: /students
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 学员列表/筛选/搜索 | API | GET /api/students |
| 学员详情 | API | GET /api/students/:id |
| 新增学员（报名登记） | API | POST /api/students |
| 录入缴费 | API | PATCH /api/students/:id/payment |
| 报名成功提醒学管师 | 插件 | send-feishu-message（服务端，随报名保存链路发送） |
| 学管师人员选择 | 平台能力 | 内置人员选择器组件 |

**所需 API**:
```typescript
// 学员分页列表 [领域模型: StudentModel] [对应页面功能: 筛选搜索栏与学员列表]
GET /api/students?paymentStatus=&channel=&progress=&keyword=&page=1&pageSize=20
Response: {
  items: Array<{ id: string; studentName: string; contactPhone: string; sourceChannel: string; enrollmentDate: string; paymentStatus: string; paymentAmount: number; studyProgress: string; learningManager: string | null }>;
  total: number;
}

// 新增学员：落库后服务端发送飞书消息提醒学管师 [领域模型: StudentModel] [对应页面功能: 在线报名表单弹窗]
POST /api/students
Body: { studentName: string; contactPhone: string; wechatId?: string; sourceChannel: string; courseIds: string[]; enrollmentDate: string; paymentStatus: string; paymentAmount?: number; managerProfile?: string }
Response: { id: string; notified: boolean }

// 学员详情：基本信息、报名课程、考勤记录 [领域模型: StudentModel] [对应页面功能: 学员详情抽屉]
GET /api/students/:id
Response: {
  student: { id: string; studentName: string; contactPhone: string; wechatId: string | null; learningManager: string | null; enrollmentDate: string; paymentStatus: string; paymentAmount: number; studyProgress: string; graduationDate: string | null; remark: string | null };
  courses: Array<{ id: string; courseName: string }>;
  attendanceRecords: Array<{ scheduleName: string; classDate: string; attendanceStatus: string; remark: string | null }>;
}

// 录入缴费 [领域模型: StudentModel] [对应页面功能: 录入缴费操作]
PATCH /api/students/:id/payment
Body: { paymentAmount: number; paymentStatus: string }
Response: { id: string }
```

#### 课程排期相关
**页面路径**: /schedules
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 排期列表/筛选 | API | GET /api/schedules |
| 新增排期（冲突检测） | API | POST /api/schedules |
| 场次考勤查询与统计 | API | GET /api/schedules/:id/attendances |
| 批量保存考勤 | API | PUT /api/schedules/:id/attendances |
| 满员预警讲师 | 插件 | send-feishu-message（服务端，保存链路内剩余名额为 0 时触发） |
| 开课前一天提醒 | 插件 + 自动化 | send-feishu-message，每日 09:00 cron 触发 |
| 课程/讲师/教室/学员选择 | 平台能力 | 课程取自课程总表，讲师用内置人员选择器，学员取自学员表 |

**所需 API**:
```typescript
// 排期分页列表（含报名进度与剩余名额） [领域模型: ScheduleModel] [对应页面功能: 筛选栏与排期列表]
GET /api/schedules?courseId=&status=&dateFrom=&dateTo=&page=1&pageSize=20
Response: {
  items: Array<{ id: string; scheduleName: string; courseName: string; classDate: string; startTime: string; endTime: string; lecturerName: string; classroom: string; enrollmentCapacity: number; registeredCount: number; remainingQuota: number; status: string }>;
  total: number;
}

// 新增排期：服务端检测同讲师/同教室同日同时段冲突，冲突时返回 409 阻止提交；保存后剩余名额为 0 则飞书预警讲师 [领域模型: ScheduleModel] [对应页面功能: 新增排期表单]
POST /api/schedules
Body: { scheduleName: string; courseId: string; lecturer: string; classroom: string; classDate: string; startTime: string; endTime: string; enrollmentCapacity: number; studentIds: string[] }
Response: { id: string; remainingQuota: number }

// 场次考勤与统计 [领域模型: AttendanceModel] [对应页面功能: 考勤抽屉]
GET /api/schedules/:id/attendances
Response: {
  items: Array<{ id: string; studentId: string; studentName: string; attendanceStatus: string | null; remark: string | null }>;
  stats: { presentCount: number; absentCount: number; attendanceRate: number };
}

// 批量保存考勤标记 [领域模型: AttendanceModel] [对应页面功能: 考勤抽屉保存]
PUT /api/schedules/:id/attendances
Body: { records: Array<{ studentId: string; attendanceStatus: string; remark?: string }> }
Response: { stats: { presentCount: number; absentCount: number; attendanceRate: number } }
```
