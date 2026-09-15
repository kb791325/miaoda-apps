# 业务架构速览（电商运营后台）

- **首页为角色工作台**（`/`，HomePage）：按 `user.roleCode`（admin/sales/warehouse/installer/finance/inventory）展示快捷卡片（`hasPerm` 过滤）+ 待办列表 + 数据总览区块（`HomeDashboard`，`hasPerm('dashboard:view')` 时才渲染；统计卡片/出入库快捷操作/趋势/状态分布/销量排行/库存预警/销售漏斗，图表组件在 `pages/Dashboard/` 目录复用）。独立 `/dashboard` 路由与导航项已移除，禁止恢复。待办接口 `GET /api/home/todos?role=`（home 模块，登录即可，各角色聚合配送单/跟进/流水计数，财务待办查 bitable 今日已完成订单，查询失败降级不返回该条）
- **适老化全局规范**（用户 40-60 岁，`index.css` + `button.tsx`）：基础字号 16px / 行高 1.8；按钮默认 40px、`size="xl"` 48px 主操作；表格内容 15px 表头 16px + 斑马纹；表单标签全局 16px 加粗、下拉项 40px；Toast 5 秒、成功绿底/失败红底白字；行高亮闪烁用 `row-highlight` class（3 秒）；帮助图标用 `components/HelpTip`；搜索框统一 `w-[300px]`

- **主数据在飞书多维表格**（服务端经 BitableClient 读写）：订单表（实例 `bitable_order_1` 负责关联字段读写、`bitable_order_v2` 仅发货时间可写）、商品表（`bitable_product_1`）、客户表、库存变动表（`bitable_stock_change_1`）
- **应用数据库（Drizzle）**：`shipment` / `shipment_item`（发货单与明细，含型号核对快照）、`customer_crm`（客户 CRM 扩展）、`follow_up`（跟进记录）、`product_profile`（成本价 + 商品图片 image_url 扩展，按 product_id 关联 bitable 商品）、`inventory_flow`（完整库存台账：变动前后库存/关联订单发货单/操作人）
- **库存流水双写**：所有出入库（手工登记/订单/发货）经 `applyStockChange` 同时写 bitable 库存变动表（兼容）+ 应用库 `inventory_flow`（台账）；台账写失败回滚 bitable 库存。业务类型 7 枚举：采购入库/退货入库/销售出库/发货出库/发货退回/其他出库/订单恢复（kind→businessType 内部映射）
- **新增商品（简化，双入口）**：「新增商品」手动表单仅 3 必填字段（商品名称/销售单价/初始库存，无分类、无成本价，成本价创建后于商品列表设置）；「图片识别新增」（`ProductRecognizeDialog`）先上传图片识别并展示结果摘要，确认后进入预填充的新增表单（也可跳过识别手动填写）。SKU 自动生成（`SP+日期8位+4位随机数`，占用时换号重试，占位查重 + 唯一性）；不再设置商品分类（创建时分类字段留空）；预警值默认 10（服务端兼容可选覆盖）；图片上传（点击/拖拽）经前端插件实例 `product_image_info_extraction_1`（ai-image-to-json，`imageToJson`）识别名称/品牌/规格型号/建议单价（出参 `suggested_price`，>0 时回填销售单价）——名称回填表单、品牌/规格型号写 bitable 商品字段、图片经 dataloom 上传后存 `product_profile.image_url`；初始库存>0 记「入库」流水（流水失败回滚删除商品）
- **库存接口**：`GET /api/stock-flows`（台账分页+筛选）、`PATCH /api/products/:id/profile`（成本价）、`POST /api/products/:id/stocktake`（盘点：按实盘数与当前库存差额调整，写「盘点调整」流水，备注必填，失败回滚）；商品列表附加 `costPrice`/`stockValue`（=库存×成本）/`cumulativeSales`（订单聚合）
- **商品编辑接口多权限**：`PUT /api/products/:id` 守卫为 `@RequirePermissions('product:manage', 'price:manage')`（OR 语义），财务角色凭 `price:manage` 可改价；新增/删除仍仅 `product:manage`；前端编辑按钮同样双权限点可见
- **库存页两视图**（/inventory）：全部商品/库存预警（按库存升序+红色高亮）；独立流水页 `/stock-flows`
- **财务利润模块**：订单下单时快照商品成本价（应用库 `order_cost_snapshot`，创建/换商品时 upsert，利润以此为准不受后续调价影响；存量订单回退 `product_profile.cost_price`）；`OrderFeeService.recomputeOrderFinancials` 三触发点：订单创建后（无随单费用时）、订单编辑后、配送完成时；口径：收入=订单金额+收取费用，利润=收入-商品成本-全部费用，利润率=利润/收入×100；财务字段（含利润率）经新实例 `bitable_order_finance_sync_v2_1` 推送 Base（旧实例 `bitable_order_finance_1` 快照不含利润率已弃用）。商品编辑支持成本价（新建表单不含成本价，创建后经列表「成本价」入口设置）；商品列表附毛利率=(售价-成本)/售价。接口（守卫 `report:finance`）：`GET /api/finance/dashboard`、`/report/timeline?groupBy=day|week|month`、`/report/product`、`/report/customer`、`/export?type=timeline|product|customer`（xlsx，日期区间 Asia/Shanghai 半开区间，缺省本月）。**稳定性**：`BitableClient` 只读操作（searchRecords/getRecord/aggregateQuery）自带 15s 超时 + 最多 3 次尝试退避重试（写操作不重试）；仪表盘/客户报表的订单计算与客户名拉取 `Promise.all` 并行；前端 finance API 统一 30s 超时，超时/网络错误/5xx 自动重试 3 次（`client/src/api/finance.ts` 的 `getWithRetry`）。新增财务类 GET 请求必须走 `getWithRetry`，禁止裸调 `axiosForBackend.get`
- **销售费用**：`fee_type`（5 预设：安装费/上楼费/运输费/服务费/赠品成本，被订单引用时删除 409）+ `order_fee`（订单费用明细，`isChargeCustomer` 区分向客户收取/成本）；订单总金额 = 商品金额 + 向客户收取的费用合计，利润/成本为财务预留。订单创建支持随单费用、失败回滚；费用每次写操作经 `OrderFeeService.recalcAndPush` 重算并推送 Base。安装完成时 `install_fee` 自动同步为订单「安装费」明细（已有则更新金额）。删除订单/批量删除同步清理费用明细。接口：`/api/fee-types` CRUD、`/api/orders/:id/fees` 查询/新增、`PUT/DELETE /api/orders/:orderId/fees/:feeId`；费用类型管理弹窗挂在订单页
- **跟进人规则**：新增跟进记录可选跟进人（系统用户下拉，数据源 `GET /api/auth/user-options`，**禁止用平台 UserSelect**——follower 存自建账号 UUID，平台用户服务解析不了会显示「未知用户」）；选客户后前端默认带出该客户负责销售（同样校验在用户选项内），无负责销售回退当前登录用户（`GET /api/follow-ups/current-user` 返回 `{userId, name}`）；前端未传时服务端亦回退当前登录用户。列表按客户分组折叠展示（客户名+记录数+最近跟进时间，按最近跟进倒序，无记录的客户不显示）；跟进人展示优先服务端返回的 `followerName` 文本（service 批量 join `app_user.name`），缺失才回退 UserDisplay。列表客户名经 bitable 查询失败时降级为空字符串，不再抛 500
- **配送安装状态机**（上门安装、货车自配送，无快递）：待出库→运输中→在安装→已完成，无退回态。确认出库（→运输中）扣库存并写「发货出库」流水、记录出库时间与发货人；开始安装（→在安装）记录开始时间与安装人员；确认安装完成（→已完成）记录完成时间/安装费用/安装备注/验收照片。订单状态同一套标签（待出库/运输中/在安装/已完成/已取消），流转实时同步写入订单。库存仅在出库时扣减一次；取消配送单已出库则回补「发货退回」流水。非法流转一律 400。所有库存变动流水记录操作人（`req.userContext.userId`）与关联订单/配送单号
- **型号核对**：订单要求型号取订单商品 SKU 编码（公式字段），与实际发货商品 SKU 比对，不一致时明细标红、发货单 `has_model_diff=true`
- **配送操作一键化**：确认出库为对话框式信息核对与填写（安装联系人/电话/地址必填、货车司机选填、发货明细预览），先保存配送信息再提交出库；开始安装点击直调无确认；完成安装弹窗仅采集验收信息一次提交；操作成功后列表刷新并 `row-highlight` 高亮该行；状态按钮下方有简短说明文字。原 `OutboundPopover` 已从 popover 浮层改为对话框形式，禁止恢复轻量一键确认。
- **订单弹窗简化**：商品选择为可搜索 Combobox（`OrderProductCombobox`，按名称过滤、显示库存/单价、库存 0 禁选）；弹窗顶部有操作步骤引导条；`/orders?new=1` 自动打开新增弹窗；保存后高亮订单行。
- **配送安装接口**：`GET /api/shipments`、`GET /api/shipments/:id`、`PATCH /api/shipments/:id`（修改配送信息）、`PATCH /api/shipments/:id/status`（body 为 `targetStatus`）、`DELETE /api/shipments/:id`（取消）。配送单由订单创建时自动生成（待出库），安装地址/联系人/电话默认带出客户信息可修改；历史状态迁移 `POST /api/bitable-sync/migrate-legacy-status`（待发货→待出库、已发货→运输中、已签收/已退回→已完成，幂等）
- **多维表格双向同步**（`bitable-sync` 模块）：`follow_up`/`shipment`/`shipment_item`/`customer_crm` 四实体；应用侧写入经 service 钩子实时推送（`SyncPushService`），Base 侧变更由 30 分钟 cron 触发器 `bitable_pull_sync` 拉取回写（`SyncPullService`）；`sync_mapping` 表维护本地 id ↔ Base record_id，映射丢失按 Base 侧编号字段与本地业务编号匹配重建（兼容遗留 UUID）；Base 新建记录插入本地时沿用其合法编号，否则生成新编号回写。**业务编号体系**：跟进编号 `follow_no`（GJ+日期+3位序号）、发货明细 `detail_no`（MX+日期+3位序号）持久化于应用库并唯一索引；订单号 JSD、发货单号 FHD 为日期+随机数；推送 Base 的编号字段一律用业务编号（缺失时先生成回写，禁止推 UUID）；`POST /api/bitable-sync/repair-numbers` 幂等修复两侧编号不一致；`POST /api/bitable-sync/repair` 全量一致性修复（孤儿映射清理/按编号重建映射/缺失记录补推/库存变动链接纠正/全量拉取收敛，幂等）。实例见 `CAPABILITY_INSTANCE_IDS` 的 sync 系列。订单财务字段（费用总金额/成本总金额/利润/订单总金额）经专用实例 `bitable_order_finance_1` 推送，失败仅告警不阻断
- **订单删除防护与关联容错**：删除订单时存在未取消配送单一律 409 拒绝（防脏数据）；推送发货单时关联订单在 Base 不存在则跳过链接字段（避免整条写入失败）；订单取消时先联动取消待出库配送单
- **库存变动关联字段**：关联订单/关联发货单经专用实例 `bitable_stock_change_link_maintain_1` 在记录创建后补写（尽力而为，旧实例快照不含这两个字段）；订单/发货流程的库存变动透传 Base 记录 id 自动填充；存量空链接或指向幽灵记录的链接由 `/repair` 按备注中的订单号/发货单号解析纠正（发货单号 Lookup 随之自动填充）；订单已从 Base 删除的流水无法回填
- **客户↔跟进记录反向关联维护**：跟进记录表「关联客户」与客户表「跟进记录」均为单向关联，同步逻辑双向手动维护（`follow-up-customer-link.ts` 的 `applyFollowUpCustomerLinks`，读现有关联→增删去重→仅变化时写回，幂等）；推送跟进记录后追加客户反向关联（客户变更时从旧客户移除），拉取时对存在记录批量补齐、对被删记录从客户关联列表移除；客户表「跟进记录」字段读写专用实例 `bitable_customer_reverse_link_maintain_1`（既有客户实例快照不含该字段，读也会被剥离）
- **操作日志**：`op_log` 表记录订单/配送单/客户的创建/编辑/取消/删除/收款等操作；查询 `GET /api/op-logs?entityType=&entityId=&page=&pageSize=`，操作人姓名由服务端关联 `app_user.name` 返回 `operatorName`（operator 存的是自建账号 UUID，前端 UserDisplay 无法解析，优先展示 `operatorName` 文本，缺失时回退 UserDisplay）；订单详情面板底部「操作日志」区块（`OrderOpLogSection`）分页展示
- **财务往来域（第一阶段）**：5 张应用表 `supplier`（供应商，编号 GYS）/`ar_receivable`（应收，YS）/`ap_payable`（应付，YF）/`receipt_payment`（收付款，批次号 SK/FK）/`reconciliation`（对账单，DZ，含 `share_token`），编号生成器在 `business-no.ts`。模块：`server/modules/supplier/` + `server/modules/finance-contract/`（4 service + 4 controller，均 `imports: [AuthModule]`）
- **财务第二阶段**：`fund_flow`（资金流水，编号 ZJ，`server/modules/fund-flow/`）/`expense`（费用，编号 FY，附件列名为 `attachment`，接口字段名 `attachmentUrl`，`server/modules/expense/`）。联动：收付款创建后自动生成流水（收款→销售收款/付款→采购付款，支付方式映射账户，失败仅告警）；费用审批通过自动生成费用支出流水。费用审批三态（待审批/已审批/已驳回），仅待审批可编辑/删除，重复审批 400。接口 `/api/fund-flows`（列表含期初/收入/支出/期末汇总随筛选联动、手工录入仅其他收入/其他支出）与 `/api/expenses`（列表/详情/增删改/`/:id/approve`）
- **信用额度管控**：`customer_crm.credit_limit`（0=不限制）/`credit_warning_ratio`（默认 80）；`PATCH /api/customers/:id/credit`（权限 `finance_credit_manage`）、`GET :id/credit` 返回 `CustomerCreditView`（额度/已用/剩余/比例/超额预警标记）；订单创建后按「未收账款+本单总金额」校验额度，超额 409 并回滚订单（费用删除/配送取消/bitable 记录删除），前端 `OrderFormDialog` 识别 409+「信用额度」弹阻断弹窗；客户档案弹窗 `CustomerCreditSection` 展示进度条与设置入口（失败降级）
- **逾期提醒**：应收列表行含 `overdueDays`（>0 且未结清显示红色「逾期 N 天」徽标）与 `overLimit`（客户超额红标）；列表筛选新增 `overdue`/`aging`（0-30/31-60/61-90/90+）/`overLimit`，支持 `?overdue=1` URL 初始化；`GET /api/receivables/overdue-summary`（逾期金额/笔数/账龄分段）驱动工作台 `HomeOverdueCard`（权限 `finance:receivable:view`，失败静默，点击跳 `/receivables?overdue=1`）
- **财务权限（第二阶段）**：新增 `finance_fund_flow_view|edit`、`finance_expense_view|edit|approval`、`finance_credit_manage` 共 6 权限点，已加入 `ROLES_SYNC_PERMISSIONS`（finance/admin 同步）；费用审批仅管理员与财务
- **应收自动联动**：订单创建自动生成应收（金额=订单总金额+向客户收取费用，到期日默认+30 天）；订单取消/删除/批量删除自动作废应收（状态「已作废」并从汇总排除）；订单编辑金额变化同步应收。收/付款支持批量（同一对方多笔合并），部分收付→「部分结清」、收满→「已结清」，超未收/未付余额 409 阻断（原子条件 UPDATE）；停用供应商新建应付 409。接口：`/api/receivables`（列表+汇总/详情含收款记录/`PATCH` 到期日备注/`customer-summary/:id`）、`/api/payables`（同构+创建）、`/api/receipt-payments`（列表筛选+创建）、`/api/customers/:id/receivable-summary`
- **对账管理**：`POST /api/reconciliations/preview` 预览（汇总账期内往来与收付款）→ `POST /api/reconciliations` 生成对账单；分享链路免登录：`GET /api/reconciliations/shared/:token` 查看、`POST .../confirm` 客户确认（待确认→已确认）；详情页支持导出 PDF（前端 window.print）与分享链接（`resolveAppUrl('/recon-share/<token>')`）
- **财务权限**：第一阶段 10 权限点 `finance:receivable|payable|payment|recon:view/edit` + `supplier:view/edit`；finance/admin 全有、销售有 `finance:receivable:view`。路由：`/receivables` `/payables` `/receipts` `/payments` `/receipt-payments` `/reconciliations` `/recon-generate` `/recon-share/:token`（免登录）`/suppliers` `/fund-flows` `/expenses`，导航「财务」分组 9 项
- **跟进提醒**：待跟进视图行操作「提醒跟进」始终可点击（无负责销售也进入弹窗阻断态，禁止恢复按钮禁用逻辑），提醒弹窗展示负责销售/下次跟进/销售阶段与可编辑提醒内容；阻断态下红字提示，`customer:manage` 用户另见「改派负责销售」下拉（数据源 `GET /api/auth/user-options`，保存调 `PATCH /api/customers/:id/owner` 后重拉草稿重渲染，经 `onOwnerChanged` 回调刷新列表负责销售列；改派后仍阻断保留提示可继续改选）；草稿接口返回 `blockCode`（owner_missing/owner_invalid/owner_not_found/owner_no_feishu）驱动前端展示改派入口；「提醒设置」模板编辑器含占位符（`{customerName}`/`{salesName}`/`{nextFollowDate}`/`{salesStage}`）说明、点击插入与实时渲染预览；发送按 `customer_crm.owner` 解析 `app_user.feishuUserId` 经 `follow_up_reminder_notify_1`（action `send_feishu_message`，receiverIds 为 miaoda 数字 ID）发飞书卡片，未关联飞书/无销售 400 阻断、插件失败 502 且写 failed 日志；成功写 `follow_up_reminder`（sent）并在行内展示「已提醒」徽标 + 行高亮。接口：`GET/PUT /api/reminder-settings`、`POST /api/reminders`、`GET /api/reminders/latest`、`GET /api/reminders/draft`（守卫复用 customer:view / customer:manage）
- **product_profile 表 RLS**：已补 `匿名用户写入`/`匿名用户更新` anon 策略（自建账号体系下写路径走 anon，缺策略报 42501），与 app_user/app_role 匿名写策略同模式

- **角色权限管理（自建账号体系，账密与飞书独立）**：`app_user`（用户名+bcrypt 密码+可选手机号+`auth_type` 区分账密/飞书+可选 `feishu_user_id` 唯一索引）/`app_role`（permissions JSON 数组）/`app_permission`（24 权限点）/`order_owner`（订单归属，销售数据范围）四表；登录 `POST /api/auth/login` 按用户名或手机号任一匹配，返回 JWT（12h）+用户信息+权限列表，会话校验 `GET /api/auth/me`；飞书登录 `POST /api/auth/feishu-login`（读 `req.userContext.userId` 匹配 `feishu_user_id` 直接登录；未命中时自动创建飞书账号，默认角色销售，用户名 `feishu_<id>`，名称取飞书姓名）；会话经 httpOnly cookie `app_auth_token` 传递（解决线上网关不透传 Authorization 头问题），前端不再管理 token；登出 `POST /api/auth/logout` 清除 cookie；用户列表返回 `authType`（password/feishu）；手机号新建/编辑时校验 `^1\d{10}$` 与应用层唯一性（409）；接口守卫 `AppAuthGuard`（`@UseGuards` + `@RequirePermissions('code')`，cookie 优先、Authorization Bearer 兜底；**线上网关不透传 Authorization 头，守卫在 cookie/header 均无效时用网关注入的 `req.userContext.userId` 按 `app_user.feishu_user_id` 兜底鉴权**，`/api/auth/me` 直接读 `req.appUser`，新增受保护接口无需额外处理）+ 数据范围过滤（销售只看自己客户/订单，仓库只看待出库配送单，安装只看运输中/在安装）；前端 `useAuth()`（AuthProvider 在 app.tsx 包裹）提供 hasPerm/login/feishuLogin/logout，会话校验失败静默处理，登出经 sessionStorage 标记抑制自动登录；6 系统角色：管理员(26)/销售(9)/仓库发货员(5：仪表盘/订单查看/商品库存查看/配送查看/确认出库)/安装人员(4：仪表盘/订单查看/配送查看/安装操作)/财务(10)/库管(5)，启动时幂等 seed（含 admin/admin123）；默认权限调整过的系统角色启动时同步存量数据（`ROLES_SYNC_PERMISSIONS`，当前为 warehouse/installer）；axios 拦截器 401 经 `utils/auth-events` 事件驱动清理登录态（登录/飞书登录两接口除外），由 `RequireAuth` 守卫自然回登录页；「登录已过期」toast 仅在本会话曾存在用户态时弹出，禁止整页 `location.replace`；菜单/路由/按钮三级权限控制（`RequireAuth`+`RequirePermission` 路由守卫，无权限路由重定向 /）；初始密码权限点码表见 `server/modules/auth/auth.constants.ts`

# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 电商运营团队；高频后台操作+每日数据复盘；追求效率与异常即时感知
- **核心目的**: 快速掌握经营全局、高效处理订单流转、精准识别库存预警
- **情绪基调**: 掌控感 / 清晰有序 / 避免焦虑与信息过载

### 1.2 设计方向

- **Design Style**: Soft Blocks 柔色块 — 仪表盘渐变卡片需柔和过渡，表格页面用浅底色托白卡降低视觉疲劳
- **Application Type**: Admin/SaaS — 左侧固定侧边栏 + 右侧内容区标准后台布局
- **Aesthetic Direction**: 浅灰蓝基底衬托纯白卡片，品牌蓝主色聚焦关键数据与行动点，预警红仅用于异常态呼吸提示

## 2. Color System (色彩系统)

**色彩关系**: 品牌蓝主色 + 低饱和青灰底 + 深墨文字 + 语义状态色衍生
**配色设计理由**: 运营后台需长时间使用不疲劳，浅灰蓝底降低对比刺激；蓝色建立专业信任；预警红克制使用避免焦虑
**主色推导**: Primary 取品牌蓝 HSL(217 91% 60%)，对应「新增订单」「发货」等核心行动与图表主系列
**使用比例**: 60% 中性背景 / 30% 白色卡片与边框 / 10% Primary 仅限按钮、激活态、关键数值强调

### 2.1 主题颜色

| Token                | HSL 值            | 说明                          |
| -------------------- | ----------------- | ----------------------------- |
| `background`         | hsl(220 20% 97%)  | 页面底色，低饱和青灰减少疲劳  |
| `card`               | hsl(0 0% 100%)    | 卡片/容器背景                 |
| `foreground`         | hsl(222 47% 11%)  | 主文字，深墨蓝确保可读性      |
| `muted-foreground`   | hsl(220 9% 46%)   | 次要文字/说明                 |
| `primary`            | hsl(217 91% 60%)  | 主交互色，品牌蓝              |
| `primary-foreground` | hsl(0 0% 100%)    | 主按钮文字                    |
| `accent`             | hsl(217 91% 95%)  | 次级交互反馈，极浅蓝          |
| `accent-foreground`  | hsl(217 91% 40%)  | accent 上文字                 |
| `border`             | hsl(220 13% 91%)  | 边框/分隔线                   |

### 2.2 导航区配色

- **基调关系**: 复用主配色系统，侧边栏背景取 `background` 同色或微深 1%，无独立色系
- **关键状态**: 激活态用 `accent` 背景 + `primary` 文字；Hover 用 `accent` 背景；默认文字 `foreground`
- **边界与背景**: 非透明背景；右侧 1px `border` 分隔内容区

### 2.3 语义颜色

| 用途       | 色相方向        | 衍生规则                                      |
| ---------- | --------------- | --------------------------------------------- |
| 成功/已发货 | H: 152 S: 65%   | 边框 L:45% / 背景 L:95% / 文字 L:30%          |
| 警告/待发货 | H: 38 S: 90%    | 边框 L:50% / 背景 L:95% / 文字 L:35%          |
| 错误/预警  | H: 4 S: 85%     | 边框 L:50% / 背景 L:95% / 文字 L:35%；呼吸动效 |
| 取消/禁用  | H: 220 S: 10%   | 边框 L:70% / 背景 L:96% / 文字 L:50%          |

## 3. Typography (字体排版)

- **Heading**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
- **Body**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
- **字体策略**: 西文用 Inter 保证数字等宽对齐与仪表盘大数清晰度；中文回退苹方/微软雅黑保障跨平台一致

## 4. Layout Strategy (布局策略)

- **导航意图**: 左侧固定侧边栏导航（菜单项高 48px、图标 20px、文字 16px）；非透明背景；移动端折叠为底部 Tab
- **页面架构**: 侧边栏 + 右侧内容区，内容区铺满可用宽度（`w-full`），内边距 `p-6`
- **响应式**: 桌面端侧边栏常驻；≤1024px 侧边栏收起为图标模式；≤768px 切换底部 Tab + 全宽内容

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-lg (0.75rem)` · 阴影 `shadow-sm` 卡片 / `shadow-none` 表格行 · 间距 `spacious (gap-6/p-6)`
- **识别签名**: 仪表盘统计卡片顶部 3px 渐变色条标识类别；状态标签 pill 形 `rounded-full px-2.5 py-0.5 text-xs font-medium`
- **装饰策略**: 仅统计卡片使用线性渐变（主色→浅主色），其余区域纯色无装饰
- **动效原则**: 状态变更 200ms ease-out；预警呼吸动画 2s infinite ease-in-out opacity 0.6↔1
- **可及性**: 正文对比度 ≥ 4.5:1；预警红文字在浅色背景上 L≤35% 达标；所有交互元素有 focus-visible ring

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Table Row/Status Badge 覆盖 Default/Hover/Focus/Active/Disabled；Toast 自动消失 3s
- **层级清晰**: Primary 按钮填充主色；Ghost 按钮 hover 用 `accent` 背景；表单 Error 态边框变语义红 + 下方提示
- **一致性**: 表格行高统一 `h-12`；弹窗宽度 `max-w-lg` 居中；统计卡片四列等宽网格

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求，优先通过排版、色彩和局部图形建立视觉记忆点
- **Image Art Direction**: 无强制图片需求
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 无

## 8. 应避免 (Anti-patterns)

- ❌ 大面积高饱和红色铺底造成焦虑 — 预警仅用文字色+小标识+呼吸动效，背景保持中性
- ❌ 仪表盘卡片用纯深色/暗色主题 — 运营白天高频使用，浅底白卡减少眩光疲劳
- ❌ 表格每行加阴影/圆角卡片化 — 数据密集页保持紧凑平面排布，仅外层容器用 shadow-sm
