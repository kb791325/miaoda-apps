# 需求分析

## 用户故事
1. 新增课程
  - 1.1 课程列表页提供「新增课程」按钮，点击打开课程表单，填写名称、类别、难度、时长、学费、状态后可成功提交
  - 1.2 表单支持上传一张课程产品图作为列表封面，支持填写课程简介
  - 1.3 提交成功后有成功提示，列表自动刷新并展示新课程
  - 1.4 课程名称未填或学费为负数等非法输入时给出错误提示并阻止提交
2. 修改课程
  - 2.1 课程卡片与课程详情页均提供编辑入口，打开的表单预填当前课程信息
  - 2.2 修改任意字段保存成功后有提示，列表与详情页同步展示更新后的内容
  - 2.3 课程不存在或保存失败时给出错误提示，不丢失已填写内容

## 页面列表
### 课程列表页（扩展）
1. 标题区右侧新增「新增课程」主按钮，点击打开课程表单弹窗（创建模式）
2. 课程卡片增加编辑图标按钮，点击打开预填当前课程信息的表单弹窗（编辑模式）
3. 表单提交成功后弹出成功提示并刷新列表；失败弹出错误提示
4. 空状态沿用现有列表空态设计，新增成功后空态自然消失
### 课程详情页（扩展）
1. 课程信息卡片区增加「编辑课程」按钮，打开预填信息的表单弹窗
2. 保存成功后刷新详情数据并提示；失败提示错误

# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [服务端, 前端]

## 页面路由与导航
### 页面路由
- 不新增路由，复用现有 `/courses`（课程列表页）与 `/courses/:id`（课程详情页）
- 新增/编辑均以弹窗形式承载，无独立页面
### 导航设计
- 导航机制：页面路由（沿用现有侧边栏导航，不新增导航项）

## 数据模型
不新增表、不修改表结构。课程写入复用已有同步表 `course_general_table`：
- 沿用学员/排期模块既有先例：应用内新增记录直接 insert，`base_record_id` 留空（null），关联查询已按 uuid 回退兼容
- 可写字段限定为现有业务字段：course_name、course_category、difficulty_level、study_duration、tuition_fee、course_intro、product_image、status
- 图片字段 product_image 为 text 数组，存平台文件服务返回的 download_url

## 业务模型
### API 设计
#### 课程列表页 / 课程详情页 相关
**页面路径**: /courses、/courses/:id
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 新增课程 | API | POST /api/courses（course 模块扩展） |
| 修改课程 | API | PATCH /api/courses/:id（course 模块扩展） |
| 列表/详情查询 | API | 复用现有 GET /api/courses、GET /api/courses/:id |
| 课程产品图上传 | 平台能力 | 前端复用现有 uploadFile 文件服务，URL 入库 |
| 写操作角色控制 | 平台能力 | @CanRole + APP_ROLES（principal/recruitment_teacher/teaching_teacher） |

**所需 API**:
```typescript
// 创建课程 [领域模型: CourseModel] [对应页面功能: 列表页新增课程]
POST /api/courses
Body: {
  courseName: string;              // 必填，非空
  courseCategory?: string | null;  // 类别
  difficultyLevel?: string | null; // 难度
  studyDuration?: string | null;   // 学习时长，如「3天」
  tuitionFee?: number | null;      // 学费，>=0
  status?: string | null;          // 招生中/暂停招生
  productImage?: string[];         // 图片 URL 数组，最多 1 张
  courseIntro?: string | null;     // 课程简介
}
Response: { id: string }

// 更新课程 [领域模型: CourseModel] [对应页面功能: 卡片/详情编辑课程]
PATCH /api/courses/:id
Body: 同创建（全部字段可选，至少一项）
Response: { id: string }
```

共享契约扩展（shared/course.ts）：新增 `CourseFormPayload` 类型供前后端共用，表单选项常量（难度、状态）在 shared 或页面常量中统一定义。

服务端实现要点：
- CourseService 增加 createCourse / updateCourse，直接对 course_general_table 做 insert / update，新增记录 baseRecordId 为 null
- tuitionFee 以 numeric 入库，服务端校验非负；courseName 必填校验用 DTO 承担
- Controller 新增 POST 与 PATCH 路由，挂 @CanRole([principal, recruitment_teacher, teaching_teacher])