## 目标与成功标准

修复 `ExpensesPage.tsx` 中 `fetchList` 的互斥锁缺陷：`isFetchingRef` 在请求飞行中静默丢弃后续请求，导致 reload 后偶发白屏（空数据/死页）和搜索/刷新按钮无响应。替换为 `AbortController` + 请求 ID 模式，确保最后一次调用始终生效。

## 关键实现文件

- `client/src/pages/Expenses/ExpensesPage.tsx:46-47` — `loading` 初始值改为 `true`（顺带修复首次渲染闪现"暂无数据"）
- `client/src/pages/Expenses/ExpensesPage.tsx:69-92` — `fetchList` 函数：移除 `isFetchingRef` 哨兵，新增 `requestIdRef` 和 `abortControllerRef`
- `client/src/pages/Expenses/ExpensesPage.tsx:161-171` — `handleSearch` 和 `handleRefresh`：无需改动逻辑，移除哨兵后自动生效

## 实现方案

将 `fetchList` 从"互斥锁"模式改为"请求 ID + AbortController"模式：

1. 新增 `requestIdRef`（自增计数器）和 `abortControllerRef`（当前请求的 AbortController）
2. 每次 `fetchList` 调用递增 `requestIdRef`，保存快照；abort 上一个未完成的请求
3. 请求完成后，仅当 `requestIdRef.current === requestId` 时才更新 state（丢弃过期响应）
4. 移除 `isFetchingRef` 哨兵及所有 `if (isFetchingRef.current) return` 守卫
5. `loading` 初始值改为 `true`

## 具体步骤

1. 读取 `ExpensesPage.tsx` 确认当前代码
2. 修改 `ExpensesPage.tsx`：
   - 第 46-47 行：`loading` 初始值 `false` → `true`
   - 删除 `isFetchingRef` 声明
   - 新增 `requestIdRef` 和 `abortControllerRef` 声明
   - 重写 `fetchList` 函数体：递增 ID → abort 旧请求 → 发起新请求 → 请求完成后按 ID 匹配更新 state
   - 移除 `fetchList` 内和 `handleSearch`/`handleRefresh` 中的 `isFetchingRef` 守卫
3. 验证：API 调用 → 确认页面正常渲染

## 影响范围与风险

- 仅影响 `ExpensesPage.tsx` 一个文件，不涉及子组件、API 层、服务端
- 风险：`AbortController` 的 abort 可能触发 catch 分支，需区分 `AbortError`（静默忽略）和真实错误（正常处理）

## 验收标准

- 页面首次加载时显示"加载中..."而非"暂无数据"
- 快速切换筛选条件/分页后，表格数据与最后一次请求一致
- 点击搜索/刷新按钮后数据立即更新
- 无白屏、无死页