## 目标与成功标准

1. 列表页的状态流转、新建、编辑、删除操作真实写入多维表格并刷新界面
2. 全局 toast 提示（成功/失败）在任意页面都可见
3. 搜索、筛选、分页、CSV 导出等所有现有功能保持正常

## 关键实现文件

| 文件 | 改动 |
|---|---|
| `src/lib/mt-client.ts` | 新增 `deleteRecordsFromBitable`；修复 `saveRecordToBitable`/`updateRecordInBitable` 的 action 名与入参对齐官方协议 |
| `src/lib/data-service.ts` | 新增 `deleteModuleRecord`；`useModuleData` hook 新增 `remove` 方法；写操作成功后强制 `reload` 拉取最新数据 |
| `src/components/generic/GenericListPage.tsx` | 从 `useModuleData` 解构 `remove`，新增删除确认弹窗与批量删除逻辑 |
| `src/index.tsx` | 挂载 `<Toaster />` 组件 |
| `src/config/modules.ts` | 为各模块配置新增 `rowActions` 中的删除 action（如尚未配置） |

## 实现方案

### 1. 核实 feishu-bitable 写 action 协议并修正 mt-client.ts

根据官方插件 catalog，feishu-bitable 的 action 名为：
- `searchRecords` — 查（已有，正确）
- `batchAddRecords` — 增（已有，正确）
- `batchUpdateRecords` — 改（已有，正确）
- `deleteRecords` — 删（缺失，需新增）

入参结构（`tableId` 必填）：
- `batchAddRecords`: `{ tableId, records: [{ fields: { "列名": 值 } }] }`
- `batchUpdateRecords`: `{ tableId, records: [{ record_id: "xxx", fields: { "列名": 值 } }] }`
- `deleteRecords`: `{ tableId, records: [{ record_id: "xxx" }] }`

当前 `mt-client.ts` 的 `saveRecordToBitable` 和 `updateRecordInBitable` 已使用正确的 action 名和 `record_id`/`fields` 结构。但需：

- **新增 `deleteRecordsFromBitable(moduleKey, recordIds)` 函数**：调用 `deleteRecords` action，传入 `{ tableId, records: recordIds.map(id => ({ record_id: id })) }`
- **修复 `capabilityClient.load` 的类型转换**：移除 `as unknown as` 强制类型断言，改用正确的 SDK 类型调用方式
- **确保字段值写入格式正确**：文本→字符串、单选→字符串、多选→`string[]`、日期→毫秒时间戳、数字→数字

### 2. data-service.ts 新增删除能力 + 写后刷新

- 新增 `deleteModuleRecord(moduleKey, recordId)`：调 `deleteRecordsFromBitable` → 成功后从缓存移除 → 返回
- 新增 `deleteModuleRecords(moduleKey, recordIds)`：批量删除
- `useModuleData` hook 新增 `remove(recordId)` 和 `removeMany(recordIds)` 方法
- **关键修复**：`create` 和 `update` 方法中，写操作成功后**必须调用 `loadModuleRecords(moduleKey, true)` 强制从多维表格重新拉取**，而非仅操作本地缓存。这保证界面与多维表格实时一致。

### 3. 挂载全局 Toaster

在 `src/index.tsx` 中：
- 从 `@/components/ui/sonner` import `Toaster`
- 在 `<App />` 之后（`ErrorBoundary` 内部）添加 `<Toaster />`

### 4. GenericListPage 删除功能

- 从 `useModuleData` 解构 `remove`
- 新增删除确认弹窗（AlertDialog），与现有行操作确认弹窗共用模式
- 操作列新增「删除」按钮（红色文字，带确认）
- 删除成功后 toast 提示 + 列表自动刷新

### 5. 编译与发布

`npm run build` 通过后 `run_commit` 发布。

## 具体步骤

1. **修改 `src/lib/mt-client.ts`**：新增 `deleteRecordsFromBitable` 函数，清理 `capabilityClient` 类型断言
2. **修改 `src/lib/data-service.ts`**：新增 `deleteModuleRecord`，`useModuleData` 新增 `remove`，写操作后强制 reload
3. **修改 `src/index.tsx`**：挂载 `<Toaster />`
4. **修改 `src/components/generic/GenericListPage.tsx`**：新增删除按钮与确认弹窗
5. **编译验证**：`npm run build` 通过
6. **发布**：`run_commit`

## 影响范围与风险

- **不影响**：搜索、筛选、分页、CSV 导出、详情页、工作台 KPI 统计
- **低风险**：Toaster 挂载仅新增一个全局组件，不影响现有 UI
- **需注意**：写操作改为强制 reload 后，网络请求会增加一次（写+查），但这是保证数据一致性的必要代价

## 验收标准

1. 列表页点击「新建」→ 填写表单 → 提交 → toast 提示成功 → 列表自动刷新显示新记录
2. 列表页点击「编辑」→ 修改 → 提交 → toast 提示成功 → 列表自动刷新
3. 列表页行操作（如「标记完成」）→ 确认 → toast 提示成功 → 行状态更新
4. 列表页点击「删除」→ 确认 → toast 提示成功 → 记录从列表消失
5. 以上所有操作在多维表格中真实生效（再次进入页面数据一致）
6. 所有 toast 提示（成功/失败/信息）在页面右上角可见
7. 编译无错误，lint 通过