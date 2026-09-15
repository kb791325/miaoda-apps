## 目标与成功标准

- AI 创作弹窗和内容详情面板整体放大，宣传图缩略图更清晰
- 交互顺序调整：先展示「相关材料」上传区（可选），再是「宣传图」生成区，引导用户先传材料再生图
- 用户可不传材料直接生图（走文生图），传了材料自动作为参考图（走图生图）

## 关键实现文件

- `client/src/pages/content-center/AiCreateDialog.tsx` — 弹窗宽度放大、调换媒体区顺序
- `client/src/pages/content-center/ContentMediaPanel.tsx` — 调区块顺序、放大图片网格、优化文案引导
- `client/src/pages/content-center/ContentDetailSheet.tsx` — 详情面板宽度放大、调区块顺序

## 实现方案

**尺寸放大**
- AiCreateDialog：`sm:max-w-2xl` → `sm:max-w-4xl`
- ContentDetailSheet：`sm:max-w-lg` → `sm:max-w-3xl`
- 宣传图网格：`grid-cols-3` → `grid-cols-4`（弹窗里空间够），图片更大更清晰
- 正文 Textarea：`rows={10}` → `rows={12}`，增加编辑区高度

**交互顺序调整**
- ContentMediaPanel 内区块顺序调换：先「相关材料」后「宣传图」
- 宣传图区的说明文案改为：「可先上传相关材料作为风格参考，或直接生成宣传图」
- AI 生图按钮文案改为「基于材料生成宣传图」（有参考图时）/「AI 生成宣传图」（无参考图时）
- 生成逻辑保持现状：`ai-poster.ts` 已自动根据是否有 referenceFiles 切换图生图/文生图

**细节优化**
- 材料上传按钮主色（outline → 默认变体），更突出
- 宣传图 hover 时轻微放大，更有互动感
- 删除按钮尺寸保持一致

## 具体步骤

1. ContentMediaPanel：调换两区块顺序、放大图片网格到 4 列、调整按钮文案与样式
2. AiCreateDialog：弹窗宽度 2xl → 4xl，Textarea 10 行 → 12 行
3. ContentDetailSheet：Sheet 宽度 lg → 3xl
4. 自测：弹窗内先传材料再生图、不传材料直接生图、详情内操作，均正常

## 影响范围与风险

- 仅前端样式与交互顺序调整，不影响后端数据与接口
- 弹窗变宽后需确认在小屏（<768px）下仍能正常展示（移动端默认 100% 宽度，不受 max-w 影响）

## 验收标准

- 弹窗比之前明显更宽（4xl vs 2xl），正文输入区更高
- 宣传图展示为 4 列网格，单图尺寸更大更清晰
- 「相关材料」区在「宣传图」区上方，先传材料再生图的流程符合直觉
- 不传材料点生图：正常走文生图，出图成功
- 传了材料点生图：走图生图，生成风格与参考图匹配
- 详情面板宽度也放大至 3xl，布局与弹窗一致