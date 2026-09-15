# 需求分析
## 用户故事
1. 提醒跟进弹窗内改派负责销售并完成提醒发送
  - 1.1 客户负责销售缺失或信息异常时，提醒弹窗在红字提示旁为有客户管理权限的用户提供「改派负责销售」下拉（数据源为系统用户下拉），无该权限的用户仅见红字提示
  - 1.2 选择新销售并保存后，弹窗顶部负责销售信息更新、阻断解除，提醒内容按新销售姓名重新渲染（不再出现占位横杠）
  - 1.3 解除阻断后点击确认发送可成功发送，列表行出现「已提醒」徽标并高亮，列表负责销售列同步更新
  - 1.4 若新选销售未关联飞书账号或账号不存在，弹窗保持阻断并给出对应提示，可继续改选其他销售
## 页面列表
### 客户页（既有页面增量）
1. 提醒弹窗针对负责销售类阻断新增改派负责销售下拉与保存交互
2. 改派成功后弹窗刷新负责销售信息与提醒内容，发送成功后列表负责销售列同步刷新

# 技术方案
## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [服务端, 前端]
## 业务模型
### API 设计
#### 客户页（提醒弹窗）相关
**页面路径**: /customers
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 获取提醒草稿（含阻断码） | API | GET /api/reminders/draft，扩展返回 blockCode |
| 改派负责销售 | API | PATCH /api/customers/:id/owner（新增，守卫 customer:manage） |
| 系统用户下拉 | API | GET /api/auth/user-options（既有，登录即可） |
| 发送跟进提醒 | API | POST /api/reminders（既有） |
| 飞书消息送达 | 插件 | 复用既有 follow_up_reminder_notify_1，无变更 |

**所需 API**:
```typescript
// 提醒草稿增加阻断码，前端据此决定是否展示改派入口 [领域模型: FollowUpReminder] [对应页面功能: 1、2]
GET /api/reminders/draft?customerId=xxx
Response: {
  ownerId: string;
  ownerName: string;
  nextFollowDate: string;
  salesStage: string;
  blockReason: string;
  blockCode?: 'owner_missing' | 'owner_invalid' | 'owner_not_found' | 'owner_no_feishu';
}

// 改派负责销售：校验目标为合法系统用户后更新客户负责销售并触发既有同步推送 [领域模型: CustomerCrm] [对应页面功能: 1]
PATCH /api/customers/:id/owner
Body: { ownerId: string }
Response: { success: true }
// 校验：ownerId 须为合法 UUID 且存在于系统用户表，否则 400
```
