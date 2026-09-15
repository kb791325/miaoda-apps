# 深度排障手册（Debugging Playbook）

> 入口分诊 Q1（报错/崩溃/结果不对/用户说"错了"）走本手册。
> 核心原则：先定位根因再改代码；禁止靠"再试一次/换个写法碰碰运气"式修复。

## 目录
1. 七步排障 SOP
2. 假设矩阵与二分定位
3. 错误类型 → 技能分派
3.5 分语言常见异常速查
3.6 实战走查样例
4. 修复与防复发
5. 复盘模板

---

## 1. 七步排障 SOP

1. **完整取证**：拿到完整报错堆栈、触发输入、环境（版本/OS/依赖版本）、期望 vs 实际、复现率。信息不全先复现，不猜。
2. **稳定复现**：构造最小复现路径；偶发问题记录频率与并发/时序/数据特征。无法复现时先加日志/观测点，而不是盲改。
3. **划定边界**：确定"最后正常点"和"最早异常点"——用版本对比、日志时间线、调用链（distributed-tracing）夹逼。
4. **假设排序**：列出可能原因并按"先验概率 × 验证成本"排序（见第 2 节），一次只验证一个变量。
5. **证伪验证**：每个假设设计能证明它错的实验；读代码、加断点/日志、最小用例、git bisect。被证伪就划掉，不恋战。
6. **根因修复**：改导致问题的机制，而不是压掉症状；同类位置全量排查（同一错误出现第二次必查共同成因）。
7. **回归与防复发**：先写一个能复现该 bug 的失败测试，修复使其转绿；再跑全量相关测试；必要时加 lint/规则/断言让同类问题无法再出现。

硬约束：
- 不允许通过注释测试、加 try-catch 吞异常、`@Disabled`、放宽校验来让问题"消失"。
- 修复后必须解释清"为什么之前错、为什么现在对、还有哪些地方会犯"。

## 2. 假设矩阵与二分定位

假设矩阵模板：

| # | 假设 | 依据 | 验证实验（单变量） | 预期若成立 | 结果 |
|---|---|---|---|---|---|

二分定位手段（按成本从低到高）：
- **数据二分**：最小输入集逐步删减，定位触发数据特征。
- **代码二分**：git bisect 在好/坏提交间定位引入变更。
- **配置二分**：回退配置/依赖版本，区分环境问题与代码问题。
- **层间二分**：前端→网关→服务→DB，逐层用独立请求验证，确定故障层。
- **并发/时序问题**：先怀疑共享可变状态、锁粒度、连接池耗尽、缓存一致性；用压力/延迟注入复现。

## 3. 错误类型 → 技能分派

| 现象类型 | 首选技能 |
|---|---|
| 通用缺陷定位与修复流程 | debugging-strategies、系统化调试、doubao-coding-diagnose-and-fix-bugs【官】 |
| 多个疑似根因并行排查 | parallel-debugging |
| Java/Spring 报错、JVM、JPA、Security | java-architect【新】、java-spring-boot-verification-loop【新】 |
| Python 异常/异步/类型 | python-error-handling、python-type-safety、async-python-patterns |
| SQL 慢/锁/连接 | ws-sql-pro、sql-optimization-patterns、postgresql-table-design |
| 性能退化/CPU/内存 | doubao-coding-optimize-performance【官】、ws-performance-engineer、python-performance-optimization |
| 前端渲染/状态/构建 | vue-expert【新】/ react-state-management、webapp-testing |
| 测试不稳定/失败 | test-driven-development、webapp-testing、ws-tdd-orchestrator |
| 安全相关异常 | ws-security-auditor、security-requirement-extraction |
| 线上事故/应急 | incident-runbook-templates、on-call-handoff-patterns、slo-implementation |
| 部署/流水线失败 | deployment-pipeline-design、gitlab-ci-patterns、github-actions-templates |
| 遗留系统看不懂导致的问题 | spec-miner【新】、doubao-coding-analyze-codebase【官】 |

## 3.5 分语言常见异常速查（先查这些点，再走假设矩阵）

### Java / Spring
| 现象/异常 | 首查点 |
|---|---|
| NullPointerException | 哪个引用为 null：入参未校验、查询结果未判空、链式 getter；用 Objects.requireNonNull 或 Optional 显式化 |
| LazyInitializationException | 事务外访问懒加载；在事务内组装 DTO 或改 fetch 策略 |
| TransactionRequiredException / 事务不生效 | 自调用代理失效、方法非 public、异常被吞、类未被 Spring 管理 |
| ConcurrentModificationException | 遍历中修改集合；用 Iterator.remove / removeIf / 并发集合 / 快照 |
| OutOfMemoryError（heap/GC overhead/Metaspace） | 大结果集无分页、无界队列/缓存、线程泄漏；dump 分析再调参，禁止只加 -Xmx 糊弄 |
| StackOverflowError | 递归无出口/双向 toString/双向 JSON 序列化循环 |
| NoSuchMethodError/ClassNotFoundException | 依赖版本冲突（mvn dependency:tree 看仲裁）、打包遗漏、类重复 |
| BindException 端口占用 / 连接池超时 | 端口占用；Hikari 连接耗尽（长事务/连接泄漏，看 active/pending 指标） |
| 401/403 | SecurityFilterChain 顺序、路径匹配、JWT 解析、方法级注解 |
| 接口慢且日志刷 SQL | N+1（开 hibernate SQL 日志数语句条数） |

### Python / FastAPI
| 现象/异常 | 首查点 |
|---|---|
| KeyError / AttributeError / TypeError | dict 漂流未用模型、None 返回值、可变对象共享；边界补 Pydantic 校验 |
| UnboundLocalError | 函数内对同名全局变量赋值导致整体被视为局部 |
| ImportError / circular import | 循环导入；依赖下沉或延迟导入，更好是重构分层 |
| Pydantic ValidationError | 入参结构/类型不符；打印 errors() 定位字段，前后端契约对齐 |
| OperationalError/connection closed | 会话生命周期、连接池上限、阻塞占连接；事务缩短 |
| RuntimeError: event loop / 协程卡死 | 同步阻塞混入 async；线程池卸载或换异步驱动 |
| Object of type X is not JSON serializable | datetime/Decimal/UUID 未自定义编码器；统一序列化层 |
| 时区/浮点偏差 | naive datetime、float 算钱；UTC + Decimal |

### 前端 Vue/React
| 现象 | 首查点 |
|---|---|
| 白屏 | 路由 base、首屏 JS 报错、构建 publicPath；看控制台第一条红错 |
| CORS / 401 死循环 | 预检配置、cookie SameSite/Secure、拦截器重复刷新 token |
| 改数据不渲染(Vue) | 直接改 props/下标、reactive 解构丢响应性 |
| useEffect 死循环/陈旧闭包(React) | 依赖数组、内联对象/函数、清理函数缺失 |
| hydration mismatch(SSR) | 服务端客户端渲染不一致（时间、随机数、window 访问） |
| 页面越用越卡 | 未清理定时器/监听/订阅、大列表无虚拟滚动 |
| 打包 OOM/产物巨大 | sourcemap、无分割、全量引入；路由 lazy + 产物分析 |

### 数据库 / 连接
| 现象 | 首查点 |
|---|---|
| deadlock detected | 多事务加锁顺序不一致；统一顺序、缩短事务、必要时重试 |
| 连接池耗尽 | 连接泄漏/长事务；看池监控 active/idle/wait |
| 查询偶发极慢 | 锁等待、统计信息过期、隐式类型转换、换执行计划；EXPLAIN ANALYZE |
| 唯一约束冲突 | 缺幂等/并发重复提交；upsert 或业务唯一键+捕获重试 |
| 迁移失败卡住 | DDL 锁等待、脚本非幂等；先在同版本库演练、可回滚 |

## 3.6 实战走查样例（"订单列表接口偶发超时"）
1. 取证：p95 8s、p99 30s，订单过千的客户必现；堆栈停在 JSON 序列化；SQL 日志同一请求打出上千条相同 SQL。
2. 复现：构造一个含 1200 订单的客户，本地稳定复现。
3. 夹逼边界：Controller 计时正常、service 查订单主表只用 30ms → 异常在"订单→明细→商品"序列化阶段。
4. 假设排序：H1 懒加载 N+1（先验高、验证快）；H2 网络；H3 GC。先验 H1。
5. 证伪/证实：数 SQL 条数 = 1 + 订单数×2，符合 N+1；H1 证实，其余划掉。
6. 根因修复：改批量抓取（fetch join / 批量 size=100），并在事务内组装 DTO，杜绝实体出界。
7. 回归：先写回归测试（断言单请求 SQL 条数有上界），修复后 SQL 降为 3 条、p95 120ms；全量回归；新增"列表接口必须声明 SQL 条数上界"的评审项防复发。

## 4. 修复与防复发

1. 修复顺序：失败测试（红）→ 最小修复（绿）→ 重构（保持绿）。
2. 影响面排查：用 Grep 找同一模式的所有出现点；跨模块影响走调用链分析。
3. 防复发手段按代价选择：编译期约束 > 类型/校验 > 自动化测试 > lint 规则 > 文档备注。
4. 数据修复与代码修复分开：脏数据写一次性修复脚本并可重入（幂等），执行前备份。
5. 修复完成后更新相关文档/ADR/注释，避免下个人重蹈。
6. 修复后跑 `scripts/preflight_check.py <根> --stage s5`，确认没有引入空吞异常、调试残留、硬编码密钥等新问题。

## 5. 复盘模板（postmortem-writing）

```
# 故障复盘：<标题>
- 影响范围/时长/严重度：
- 时间线（发现→定位→修复→恢复）：
- 根因（5 Why，追到机制层，不停在人）：
- 触发条件与为何此前未发现：
- 修复内容（代码/测试/数据，附提交与验证）：
- 同类排查结果：
- 防复发行动项（负责人/截止/验证方式）：
- 遗留风险：
```

复盘对事不对人：根因落到机制与系统，不写指责性结论。
