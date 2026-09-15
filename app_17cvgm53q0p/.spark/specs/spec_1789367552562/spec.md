# 需求分析

## 用户故事
1. 对待跟进客户一键发送跟进提醒
  - 1.1 待跟进列表中每条客户行出现「提醒跟进」操作，点击打开提醒弹窗，展示负责销售、下次跟进日期与按模板生成的提醒内容
  - 1.2 确认发送后负责销售收到飞书卡片提醒消息，页面提示发送成功，该行展示已提醒时间
  - 1.3 提醒内容在弹窗内可二次修改后再发送
  - 1.4 客户无负责销售或销售未关联飞书账号时阻断发送并提示原因
2. 自定义提醒消息模板
  - 2.1 待跟进视图提供「提醒设置」入口，可编辑提醒消息模板并保存
  - 2.2 模板支持客户名称、负责销售、下次跟进日期、销售阶段占位符，设置时提供渲染预览
  - 2.3 保存后新打开的提醒弹窗按新模板生成默认内容

## 页面列表
### 客户管理页（待跟进提醒扩展，/customers）
1. 待跟进视图行操作栏新增「提醒跟进」按钮，无负责销售时禁用并提示
2. 提醒弹窗展示销售与跟进信息，消息内容可编辑，发送后有成功/失败反馈
3. 提醒成功的客户行展示「已提醒」状态与最近提醒时间
4. 视图顶部「提醒设置」按钮打开模板编辑弹窗，含占位符说明、实时预览与保存
5. 弹窗与列表具备加载态、空态与错误提示，遵循现有适老化与表格视觉规范

# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 插件, 服务端, 前端]

## 数据模型
### 数据库设计
#### 跟进提醒记录表（follow_up_reminder）
用途：记录每次跟进提醒的接收人、内容与发送结果，支撑行内「已提醒」状态与失败补偿。
核心字段：
- customer_id: varchar（客户 ID，与前端 Customer.id 一致）
- customer_name: varchar（客户名称快照）
- owner_id: varchar 可空（负责销售 app_user ID）
- owner_name: varchar（销售姓名快照）
- receiver_id: varchar 可空（实际接收的飞书/miaoda 用户 ID）
- message: text（实际发送的提醒内容）
- status: varchar ['sent', 'failed']（发送结果）
- error_message: varchar 可空（失败原因）
关联关系：owner_id 逻辑关联 app_user，不建外键

#### 提醒设置表（reminder_setting）
用途：存储全局提醒消息模板，单行配置。
核心字段：
- template: text（消息模板，含占位符）
关联关系：无

## 插件设计
| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| follow_up_reminder_notify_1 | send-feishu-message | 向负责销售发送跟进提醒卡片 | 服务端 CapabilityService（需动态解析接收人并落提醒日志） | 客户管理页 | receiverIds: string[]（miaoda 用户 ID 数组）; title: string; content: string（markdown 正文） | {success} |

说明：接收人为动态值（按客户负责销售的 `app_user.feishuUserId` 解析），经 input 传入，禁止硬编码；formValue 中 title 为对象结构（内层键名 title）、receiverUserList 直接透传 `"{{input.receiverIds}}"`。

## 业务模型
### API 设计
#### 客户管理页（待跟进提醒） 相关
**页面路径**: /customers
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 提醒弹窗默认内容生成 | 前端 | shared/reminder.ts 占位符渲染（模板来自设置接口） |
| 发送跟进提醒 | API + 插件 | POST /api/reminders → 服务端调 follow_up_reminder_notify_1 并写 follow_up_reminder |
| 行内已提醒状态 | API | GET /api/reminders/latest |
| 模板读取/保存 | API | GET/PUT /api/reminder-settings |
| 接收人飞书身份解析 | 平台能力 | 自建账号体系 app_user.feishuUserId |
| 操作权限控制 | 平台能力 | 复用 AppAuthGuard + customer:manage（发送/设置）/ customer:view（查询） |

**所需 API**:
```typescript
// 读取提醒模板，无配置行时返回默认模板 [领域模型: ReminderSettingModel] [对应页面功能: 4]
GET /api/reminder-settings
Response: { template: string }

// 保存提醒模板（upsert 单行），守卫 customer:manage [领域模型: ReminderSettingModel] [对应页面功能: 4]
PUT /api/reminder-settings
Body: { template: string }
Response: { template: string }

// 发送跟进提醒：渲染/使用消息、解析销售飞书身份、调插件发送、写提醒日志；守卫 customer:manage [领域模型: FollowUpReminderModel] [对应页面功能: 1,2,3]
POST /api/reminders
Body: { customerId: string; customerName: string; message: string }
Response: { id: string; sentAt: string; receiverName: string }
// 400：无负责销售 / 销售未关联飞书；502：插件发送失败（仍写 failed 日志）

// 批量查询客户最近一次成功提醒，守卫 customer:view [领域模型: FollowUpReminderModel] [对应页面功能: 3]
GET /api/reminders/latest?customerIds=id1,id2
Response: { items: Array<{ customerId: string; sentAt: string; ownerName: string }> }
```

### 共享契约（shared/reminder.ts）
- 占位符约定：`{customerName}` `{salesName}` `{nextFollowDate}` `{salesStage}`
- `DEFAULT_REMINDER_TEMPLATE` 默认模板常量
- `renderReminderMessage(template, ctx)` 渲染函数，前后端共用
- 上述 API 的请求/响应类型