## 目标与成功标准
- 修复视频提成管理页「重新计算」按钮点击后的 `ruleList.find is not a function` 报错
- 修复 AutoCalcBlock（新建提成弹窗里「自动计算」）同一根因
- 不改变现有计算口径、UI 布局、其他按钮逻辑；不改动后端、公共组件、store、其他模块

## 关键实现文件
- `client/src/pages/Video/VideoCommissionPage.tsx`：唯一改动文件
  - 第 205-243 行 `handleRecalc` 函数
  - 第 315-376 行 `AutoCalcBlock` 组件内 `handleAutoCalc`

## 实现方案

### 1. 新增本地数组归一化工具（本文件内，不扩散）
在 VideoCommissionPage.tsx 顶部加一个纯函数 `asRuleList(v: unknown): any[]`：
- `Array.isArray(v)` → 直接返回
- 是对象且有 `list` / `records` / `data` 为数组 → 取对应数组（优先级 list > records > data）
- 其他所有情况（null/undefined/空对象/字符串等）→ 返回 `[]`
- 不放到 utils/，不扩散到其他文件

### 2. 修复 handleRecalc（第 205 行）
- `const ruleList = asRuleList(rulesRes?.data)` 替换原强转
- 匹配不到 activeRule 时：保留原提成金额，toast 改为「未匹配到对应提成规则，请到【提成规则】中检查配置」（按需求四.4，不再用 `toast.warning('暂无启用的提成规则')`）
- 新增 `rulesLoading` 状态（boolean），请求规则期间 `重新计算` 按钮所在行操作禁用或按钮 loading（使用现有 `calcLoading` 扩展语义或加 `rulesLoading` 二选一）——最终用 `rulesLoading` 单独状态，避免与计算中混淆
- 加一个防抖/锁：`withOpLock` 已存在于 handleRecalc 外层（第 206 行），本身已防重复点击；无需再加额外锁，但需要确认 withOpLock 语义——直接复用现有 withOpLock 即可

### 3. 修复 AutoCalcBlock handleAutoCalc（第 317 行）
- 同样用 `asRuleList(rulesRes?.data)` 替换
- 匹配不到时 toast 保持「暂无启用的提成规则」（此处在新建弹窗里，用户还没保存，上下文不同，按现成语义保留）
- 这是同根因副作用修复，属于「本页面内 ruleList 声明/赋值处」允许范围

### 4. 「重新计算」按钮行禁用态
- 加 `rulesLoading` state（页面级）
- 在 handleRecalc 进入后、规则请求前设为 true，规则返回后设为 false
- 行操作中「重新计算」按钮：当 rulesLoading 为 true 时显示 loading 且 disabled（通过 rowActions 函数入参/闭包读取 state）

### 5. 计算口径保持不变
- 仍用 `commissionRulesApi.calculate({ biz_type, sales_name, settle_month, rule_id })`
- 仍取返回的 `base_amount / commission / rate`
- 仍调 `videoCommissionsApi.update(id, { performance, commission_rate, commission_amount })`
- 仍 `table.refresh()` 刷新列表
- 金额格式仍用 `formatAmount`

## 具体步骤
1. 在 VideoCommissionPage.tsx 顶部（import 之后组件之前）加 `asRuleList` 工具函数
2. 组件内新增 `const [rulesLoading, setRulesLoading] = useState(false)`
3. 修改 `handleRecalc`：规则请求前后控制 rulesLoading；用 asRuleList 归一化；匹配不到时保留原值 + 新 toast 文案
4. 修改 `AutoCalcBlock` 内 `handleAutoCalc`：用 asRuleList 归一化（同一根因，顺手修）
5. 修改 rowActions 中「重新计算」按钮：`rulesLoading` 时 disabled + 显示 loading 图标
6. tsc + eslint 检查
7. 自测验证（静态走读 + 浏览器控制台检查）

## 影响范围与风险
- 仅影响视频提成管理页「重新计算」和新建弹窗「自动计算」两个按钮行为
- 其他按钮逻辑（新建、提成规则、批量结算、批量发放、导出、结算、发放、编辑、删除）完全不动
- 后端接口、公共组件、其他模块零改动
- 风险低：纯前端适配层修复，计算口径不变

## 验收标准
1. 点击「重新计算」：不再报 `ruleList.find is not a function`，有规则时正确重算并刷新列表，无规则时 toast 提示且保留原金额
2. 快速连点「重新计算」：withOpLock 防重入，无重复请求、无报错
3. 规则接口失败 / 返回空数组 / 返回包装对象 / 返回纯数组 四种情况都不报错、不白屏
4. AutoCalcBlock「自动计算」按钮同样不报错
5. tsc / eslint 通过
6. 本页其他按钮功能不受影响

## 未决事项
无。根因（a 类：接口返回分页包装对象、调用侧强转 any[]）已从代码静态确认。