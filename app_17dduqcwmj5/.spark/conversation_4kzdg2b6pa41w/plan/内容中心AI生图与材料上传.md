## 目标与成功标准

- AI 创作弹窗：生成文案后可一键「AI 生成宣传图」（基于标题/正文/已上传材料），并支持上传宣传图与附件材料，随内容一起保存
- 详情面板：展示「宣传图」区（AI 生成图 + 上传宣传图混合展示）与「相关材料」附件区；面板内也可补充上传、可再次 AI 生图，操作即时持久化
- 成功标准：创建内容时带图带附件保存后，详情面板可见全部图片与附件；详情内补充上传/生图后刷新仍在

## 关键实现文件

- DDL：`marketing_content` 表新增 `poster_images jsonb`（string[] 存图片 url）、`attachments jsonb`（`{name,url}[]`）
- `shared/content.ts` — 新增 `AttachmentItem`；`CreateMarketingContentRequest`/`MarketingContentListItem` 加两字段；新增 `UpdateMarketingContentMediaRequest`
- `server/modules/content/content.service.ts` / `content.controller.ts` — create 写入新字段、`toListItem` 映射；新增 `PATCH marketing-contents/:id/media`
- `client/src/services/ai-poster.ts` — 新建：AI 生图插件调用封装
- `client/src/pages/content-center/ContentMediaPanel.tsx` — 新建：宣传图网格 + 附件列表 + 上传/生图/删除交互（AiCreateDialog 与详情面板共用）
- `client/src/pages/content-center/AiCreateDialog.tsx` — 挂载 ContentMediaPanel，保存时带两字段（handleSave:165-173）
- `client/src/pages/content-center/ContentDetailSheet.tsx` — 挂载 ContentMediaPanel（持久化模式）
- `client/src/pages/content-center/content.api.ts` — 新增 `saveMarketingContentMedia`

## 实现方案

**数据模型**：加载 lark-apps-db skill，`+db-execute` 执行 `ALTER TABLE marketing_content ADD COLUMN poster_images jsonb, ADD COLUMN attachments jsonb;` → codegen 重生成 schema.ts → 重读 schema.ts 再写业务代码。

**后端**：create 接收可选 `posterImages?: string[]`、`attachments?: AttachmentItem[]` 原样入库；`toListItem`/详情透出；新增 `PATCH :id/media` 仅更新提供的字段（PATCH 契约），校验生效行数否则 NotFoundException。

**AI 生图**：用 `plugin_instance` 创建 AI 智能生图实例（requirementsSummary：根据餐饮培训招生文案生成暖调美食摄影风宣传图）；`get_plugin_ai_json` 读 readme/schema 后写 `ai-poster.ts`：prompt = 标题 + 正文前 300 字 + 内容类型标签；若实例 inputSchema 支持参考图字段则带上已上传宣传图 url，不支持则纯文本生图；返回图片 url（按 outputSchema 解析）。

**上传**：复用 `client/src/components/business-ui/api/files/service.ts:12` 的 `uploadFile`（返回 url）；宣传图 accept `image/*`，附件不限；上传中显示 loading，失败 toast。

**ContentMediaPanel** props：`posterImages: string[]`、`attachments: AttachmentItem[]`、`onChange(posterImages, attachments)`（弹窗受控模式）、`persist?: (patch) => Promise<void>`（详情持久化模式，内部调 saveMarketingContentMedia）、`contentHint?: string`（生图 prompt 素材）。渲染：宣传图区用 `@client/src/components/ui/image` 的 Image 网格（含删除角标）、附件区文件名列表（a 标签新窗口打开 + 删除）；操作行：AI 生成宣传图（生图 loading）、上传宣传图、上传附件。

**AiCreateDialog**：表单区下方挂受控模式 panel；handleSave 将 posterImages/attachments 传入 createMarketingContent。

**ContentDetailSheet**：详情加载后挂持久化模式 panel；上传/AI 生图/删除均经 persist 回调即时 PATCH，成功后更新本地 detail。

## 具体步骤

1. DDL 加列 → codegen → 重读 schema.ts
2. shared/content.ts 类型扩展
3. service/controller：create 写入、toListItem 映射、PATCH :id/media
4. plugin_instance 创建生图实例 → get_plugin_ai_json 读 schema → 写 ai-poster.ts
5. content.api.ts 加 saveMarketingContentMedia
6. 新建 ContentMediaPanel.tsx（≤300 行）
7. AiCreateDialog 挂受控 panel 并在保存时带字段
8. ContentDetailSheet 挂持久化 panel
9. 自测：POST 带图片/附件创建 → GET 详情字段齐全；PATCH media 追加/清空生效；随机 id PATCH 404；读日志确认无错后提交

## 影响范围与风险

- 仅 marketing_content 增列与内容中心相关组件，不影响课程/学员等模块
- 生图插件 inputSchema 以 get_plugin_ai_json 为准；不支持参考图时降级为纯文本生图（已定降级策略，无阻塞）
- 存量记录两字段为 null，前端按空数组兜底渲染
- AiCreateDialog 现有约 300 行，挂载 panel 为组合式引用，不超行数上限

## 验收标准

- AI 创作弹窗：点「AI 生成宣传图」出图并加入宣传图区；可上传多张宣传图与多个附件；保存后列表/详情可见
- 详情面板：宣传图区 Image 网格展示全部图；附件区可点击打开；面板内上传/生图/删除即时保存，重开面板数据仍在
- 接口：POST 带新字段 200 且 GET 回读一致；PATCH media 只改提供字段；不存在 id 404