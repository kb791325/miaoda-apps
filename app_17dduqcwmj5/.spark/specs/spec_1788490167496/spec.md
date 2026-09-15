# 需求分析
## 用户故事
1. 编辑学员基本信息，在学员详情中修改并保存
  - 1.1 用户能够从学员详情抽屉的「基本信息」区打开编辑弹窗，弹窗自动回填该学员当前信息
  - 1.2 用户能够修改姓名、联系电话、微信号、来源渠道、报名日期、学习进度、结业日期、备注并保存
  - 1.3 保存成功后给出成功提示，详情抽屉与学员列表同步展示修改后的内容
  - 1.4 姓名或联系电话为空时禁止提交并在表单项下方提示错误

## 页面列表
### 学员管理页（既有页面扩展）
1. 详情抽屉「基本信息」区标题行新增「编辑」按钮，触发编辑学员弹窗
2. 编辑弹窗回填姓名、电话、微信号、渠道、报名日期、学习进度、结业日期、备注
3. 弹窗对姓名与联系电话做必填校验，失败时表单项下方显示错误文案
4. 提交成功后关闭弹窗并提示成功，详情与列表数据同步刷新；失败时提示错误且数据不变

# 技术方案
## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [服务端, 前端]（数据库复用既有 student_registration_table，无结构变更）
## 页面路由与导航
### 导航设计
- 导航机制：页面路由
- 导航项：沿用现有左侧导航，不新增页面与导航项；编辑能力以弹窗形式挂载在学员管理页
## 数据模型
### 数据库设计
复用既有学员表 student_registration_table，本轮不新增表、不新增字段。
可编辑字段：studentName（姓名）、contactPhone（联系电话）、wechatId（微信号）、sourceChannel（来源渠道）、enrollmentDate（报名日期）、studyProgress（学习进度）、graduationDate（结业日期）、remark（备注）。
缴费状态与缴费金额仍走既有「录入缴费」入口，不在本次编辑范围内；报名课程维持现状不可编辑。
## 业务模型
### API 设计
#### 学员管理页 相关
**页面路径**: /students
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 编辑入口与编辑弹窗 | 前端 | 详情抽屉基本信息区「编辑」按钮 + 新增 StudentEditDialog 弹窗组件 |
| 弹窗回填当前信息 | API | 复用既有 GET /api/students/:id 详情接口 |
| 提交学员信息修改 | API | 新增 PATCH /api/students/:id |
| 编辑操作权限控制 | 平台能力 | CanRole 角色控制，与新增学员保持一致 |

**所需 API**:
```typescript
// 编辑学员基本信息 [领域模型: StudentModel] [对应页面功能: 编辑弹窗提交]
PATCH /api/students/:id
Request: {
  studentName: string;
  contactPhone: string;
  wechatId?: string;
  sourceChannel: string;
  enrollmentDate: string;
  studyProgress?: string;
  graduationDate?: string;
  remark?: string;
}
Response: { id: string }
```
服务端校验：姓名、联系电话、来源渠道、报名日期必填，缴费字段不在本接口修改；角色权限与创建学员接口一致。