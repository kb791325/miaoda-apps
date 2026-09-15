# 分栈落地手册（Stack Playbooks）

> S4 编码实现阶段按技术栈选择对应链路。每条链路给出：技能组合、标准目录骨架、起步命令、落地顺序、Top 踩坑库、栈特有质量门。
> 通用前提：S1-S3 已完成；用户点名的框架/版本是硬约束，不得静默替换。

## 目录
1. Java / Spring Boot 从 0 链路
2. Python / FastAPI 从 0 链路
3. Vue / React 前端从 0 链路
4. 全栈一体化链路
5. 数据库从 0 链路
6. 飞书多维表（lark-base）对接链路
7. Agent / MCP / 技能开发链路
8. 跨栈通用约定（配置/日志/错误返回/提交前动作）

---

## 1. Java / Spring Boot 从 0 链路

技能组合：java-feature-development（主编排）→ java-architect / spring-boot-engineer（实现细节）→ java-coding-standards（规范）→ test-driven-development + java-spring-boot-verification-loop（质量）。

标准目录骨架：
```
app/
├── pom.xml / build.gradle
├── src/main/java/com/x/app/
│   ├── AppApplication.java
│   ├── controller/   # 只做参数绑定与转发，不写业务
│   ├── service/      # 业务逻辑与事务边界
│   ├── repository/   # 数据访问
│   ├── domain/       # 实体、值对象、枚举
│   ├── dto/          # 入参/出参 record，与实体隔离
│   ├── config/       # Bean/安全/线程池配置
│   └── common/       # 统一返回、全局异常、错误码
├── src/main/resources/
│   ├── application.yml / application-dev.yml / application-prod.yml
│   └── db/migration/ # Flyway 迁移脚本 V1__init.sql
└── src/test/java/    # 与 main 同包结构
```

起步命令：
```bash
# 骨架（已选 Maven 时）
mvn -q clean verify                       # 全量构建+测试
mvn spring-boot:run                       # 本地启动
mvn -Dtest=XxxServiceTest test            # 跑单个测试类
mvn dependency:tree -Dverbose | less      # 排查依赖冲突
```

落地顺序：
1. 工程骨架：包结构、Spring Boot 版本与依赖管理、配置分环境（application-{env}.yml，密钥走环境变量）。
2. 领域层先行：实体/值对象 → 仓储接口 → service 业务逻辑；用 java-coding-standards 约束 Optional、异常分层、不可变 DTO、record 使用。
3. 数据访问：JPA 实体关系、FetchType、N+1 规避；复杂查询走显式 JPQL/投影；迁移用 Flyway/Liquibase，脚本可上下回滚。
4. Web 层：REST 控制器统一返回结构、全局异常处理、参数校验（Bean Validation）、OpenAPI 契约。
5. 安全：Spring Security 6 过滤链、JWT/OAuth2、方法级鉴权；密码哈希；接口最小权限。
6. 异步/响应式：明确需要才上 WebFlux/消息队列；线程池与背压参数显式配置。
7. 可观测：结构化日志（traceId）、Actuator 健康检查、Micrometer 指标。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| 事务不生效/不回滚 | 同类自调用绕过代理、异常被 catch 吞掉、非 public、非 Spring Bean | 事务方法放独立 Bean；异常抛出或显式 rollbackFor |
| LazyInitializationException | 事务外访问懒加载关联 | 事务内组装 DTO，或改 fetch join / EntityGraph |
| 接口慢、日志刷大量 SQL | 懒加载 N+1 | @EntityGraph / fetch join / @BatchSize；测试断言 SQL 条数上界 |
| 打包后 NoSuchMethodError | 依赖版本仲裁冲突 | dependency:tree 定位，统一 BOM 版本 |
| 时间/金额出错 | Date 时区混乱、double 算钱 | 一律 LocalDateTime/Instant + UTC；金额用 BigDecimal |
| 连接池超时 | 长事务占连接、连接泄漏 | 事务只包 DB 操作；看 Hikari active/pending |
| Bean 循环依赖 | 设计耦合 | 重构抽取，不建议靠 @Lazy 掩盖 |

栈质量门：
- `mvn/gradle clean verify` 全绿；测试覆盖率对核心 service 有阈值。
- java-spring-boot-verification-loop 五件套：编译、静态分析（SpotBugs/CheckStyle/Spotless）、测试、依赖漏洞扫描、diff 自审。
- 启动一次真实实例，用示例请求打通主链路；异常路径至少各一条测试。

## 2. Python / FastAPI 从 0 链路

技能组合：python-project-structure + fastapi-templates → python-design-patterns / async-python-patterns → python-type-safety + python-error-handling → python-testing-patterns。

标准目录骨架（src 布局）：
```
app/
├── pyproject.toml            # 依赖与 ruff/mypy/pytest 配置，依赖锁定
├── .env.example
├── src/app/
│   ├── main.py               # 创建 app、挂路由与中间件
│   ├── core/                 # config(settings)、security、logging
│   ├── schemas/              # Pydantic v2 入参出参
│   ├── models/               # ORM 模型
│   ├── repositories/         # 数据访问
│   ├── services/             # 业务逻辑
│   └── routers/              # 路由，仅做绑定
├── alembic/                  # 迁移
└── tests/                    # unit / integration 分层
```

起步命令：
```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"      # 或 uv sync
ruff check src && mypy src   # lint + 类型
pytest -q                    # 测试
uvicorn app.main:app --reload# 启动
```

落地顺序：
1. 工程骨架：src 布局、pyproject.toml、依赖锁定（uv-package-manager）、虚拟环境、ruff/mypy 配置。
2. 分层：schemas（Pydantic v2）→ models → repositories → services → routers；依赖注入用 FastAPI Depends。
3. 异步边界：async def 内禁止阻塞调用（CPU/同步 IO 走线程池）；HTTP 客户端用 httpx.AsyncClient 单例复用。
4. 配置与错误：pydantic-settings 读环境变量；统一异常处理器；请求日志与 request-id 中间件。
5. 数据：SQLAlchemy 2.x 会话生命周期显式管理；迁移用 Alembic；查询避免隐式 N+1（selectinload）。
6. 测试：pytest + httpx AsyncClient + fixture 分层；数据库测试用事务回滚隔离。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| async 接口偶发卡死 | 在协程里做同步阻塞（requests/time.sleep/CPU 密集） | 换异步客户端，或 run_in_executor 卸载 |
| 循环导入 ImportError | 分层反向依赖、模块顶层互相 import | 依赖下沉、局部导入只是临时，根治靠重构 |
| 运行时 KeyError/AttributeError | dict 当对象到处传、返回值可能为 None | 边界用 Pydantic 建模，显式 Optional |
| 时区/序列化报错 | naive datetime、Decimal/UUID 不能直接 json | 统一 UTC；自定义 jsonable 序列化层 |
| 连接 closed / 池耗尽 | session 生命周期乱、长请求占连接 | 请求级 session 依赖，事务尽量短 |
| 依赖装了行为不一致 | 未锁版本、全局环境污染 | venv + 锁文件，不复用系统解释器 |

栈质量门：
- ruff + mypy（核心包严格）零错误；pytest 全绿。
- uvicorn 真实启动，/healthz 与一条主业务请求实测通过。
- 异步函数内无阻塞调用（自审 grep time.sleep / requests.）。

## 3. Vue / React 前端从 0 链路

技能组合：Vue 用 vue-expert；React 用 react-modernization + nextjs-app-router-patterns；共用 frontend-design + responsive-design + accessibility-compliance；组件脚手架 ws-component-scaffold。

标准目录骨架：
```
web/
├── package.json / vite.config.ts / tsconfig.json（strict:true）
├── .env.example（VITE_/NEXT_PUBLIC_ 前缀）
└── src/
    ├── main.tsx(main.ts)
    ├── app/            # 路由、provider、全局 store
    ├── features/       # 按业务域聚合（组件/hook/api/类型）
    ├── components/     # 通用无状态组件
    ├── services/       # API client（拦截器/错误归一）
    ├── stores/         # 客户端状态
    └── styles/         # 设计令牌与全局样式
```

起步命令：
```bash
npm ci            # 严格按锁文件安装
npm run dev       # 本地开发
npm run typecheck # 类型检查
npm run lint      # lint
npm run build     # 生产构建（交付前必过）
```

落地顺序：
1. 工程骨架：构建工具（Vite）、TS 严格模式、目录约定、环境变量前缀规范。
2. 设计基线：设计令牌（色/字/间距）、布局栅格、组件库选型先定；走 frontend-design 保证可用性基线。
3. 数据层：API client 封装（拦截器/错误归一/重试）；状态分层——服务端状态与客户端状态分离（Pinia / 合理的 React 状态方案），不全局滥用。
4. 组件：先抽无状态展示组件，再容器组件；props/emit 类型显式；表单统一校验与错误提示。
5. 路由与权限：路由守卫、按角色菜单、未授权兜底页。
6. 响应式与无障碍：断点策略、触控尺寸、键盘可达、对比度。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| 白屏、首屏报错 | 路由 base/publicPath 错、首屏 JS 异常 | 先看控制台第一条红错；构建后用产物实测 |
| Vue 改数据不更新 | 直接改 props、下标赋值、解构丢响应性 | 走响应式 API，props 单向流 |
| React useEffect 死循环 | 依赖数组里每次新建对象/函数、缺清理 | 稳定依赖、补 cleanup、列表加 key |
| 接口跨域/401 循环 | CORS 配置、cookie SameSite、拦截器重复刷新 | 后端配 CORS，前端单点处理 token 刷新 |
| 打包慢、产物巨大 | 全量引入、无代码分割、sourcemap 误开生产 | 路由懒加载、按需引入、产物分析 |
| 页面越用越卡 | 定时器/监听/订阅未清理、大列表全量渲染 | unmount 清理；长列表虚拟滚动 |

栈质量门：
- 类型检查 + 构建通过；lint 零错误。
- 主流程在真实页面走通（artifact-preview/浏览器），覆盖加载、空、错三种态。
- 移动端视口抽查；无控制台报错/警告。

## 4. 全栈一体化链路

技能组合：fullstack-guardian（DB→API→UI 全层 + 每层安全）或 ws-full-stack-feature（角色编排：架构→前端→后端→DB→测试→部署）。

落地顺序（纵向薄片）：
1. 一个业务薄片打通：表/迁移 → 后端接口（含校验与错误码）→ 前端页面联调 → 测试，再做下一片。
2. 契约先行：前后端共享接口 schema（OpenAPI/TS 类型生成），避免口头约定。
3. 每层安全：参数化 SQL、输出编码、鉴权下沉到服务端、敏感字段不落日志。
4. 联调环境：本地一键启动（docker compose 起依赖），环境变量样例文件。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| 前后端字段对不上 | 口头契约、各自命名 | OpenAPI 单一事实源，类型自动生成 |
| 联调时好时坏 | 依赖服务没起/端口写死 | docker compose 统一编排，配置走环境变量 |
| 安全只在前端做 | 前端校验可绕过 | 服务端重复校验与鉴权，前端只做体验 |
| 一片没通就堆下一片 | 横向分层开发、攒 bug | 纵向薄片，每片端到端可演示再继续 |

栈质量门：每片都能端到端演示；接口测试 + 关键 UI 流程测试；安全清单（见 stage-gates S5）逐条过。

## 5. 数据库从 0 链路

技能组合：ws-database-architect（建模）→ postgresql-table-design / ws-sql-pro（实现）→ sql-optimization-patterns（优化）→ database-migration（演进）。

落地顺序：
1. 概念模型：实体、关系、基数、多态取舍；逻辑模型到第三范式，反范式只用于明确性能点并记录。
2. 物理模型：字段类型、非空/默认值、主键策略、外键策略、索引（先列查询模式再建索引，避免滥建）。
3. 约束与一致：唯一约束、检查约束、乐观锁版本列；软删除策略显式决定。
4. 迁移脚本：向前向后可回滚；大表变更用在线 DDL 策略；脚本纳入版本库。
5. 初始化数据与权限：种子脚本；应用账号最小权限，不用超级用户连业务库。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| 慢查询偶发 | 缺索引/隐式类型转换/统计信息过期 | EXPLAIN ANALYZE 看真实计划，参数类型对齐 |
| 死锁 | 多事务加锁顺序不一致 | 统一按主键顺序更新、缩短事务 |
| 迁移上线失败 | DDL 锁表、脚本不可回滚 | 先在同版本库演练；大表在线 DDL；写回滚 |
| 唯一约束冲突 | 并发重复提交、缺幂等 | 业务唯一键 + upsert/幂等令牌 |
| 时间/枚举难维护 | 用字符串魔法值、时间戳无时区 | 枚举用专用类型/字典表；timestamptz |
| 软删除导致数据"复活/重复" | 唯一索引未含删除标记 | 唯一约束带上删除维度或用部分索引 |

栈质量门：核心查询 EXPLAIN 看执行计划无全表扫描；迁移在干净库与上一版本库各跑一次；外键/唯一约束与业务规则对齐。

## 6. 飞书多维表（lark-base）对接链路

技能组合：lark-base（主）；需要本地表格中转用 sheet；流程通知/待办联动 lark-im / lark-task。

落地顺序：
1. 先定数据模型：表、字段类型（单选/多选/关联/公式/查找引用）、表间关联关系，等价于数据库概念设计。
2. 视图设计：按角色建表格视图/看板/甘特/画册；筛选与权限分层。
3. 自动化：字段公式、自动化流程（到期提醒、状态流转、消息通知）。
4. 采集与汇总：表单收集 → 汇总表；仪表盘指标口径先定义再建图。
5. 程序对接（如需）：走开放接口时鉴权、分页、限流、字段 ID 映射集中管理，批量写入做幂等。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| 关联记录对不上 | 关联字段建错方向、存在孤儿记录 | 先画实体关系再建关联，定期查孤儿 |
| 汇总数字对不上 | 公式口径不一致、筛选遗漏 | 指标口径写文档，用同一公式字段 |
| 权限越权 | 只配了视图没配表/记录权限 | 用受限账号实测每个角色可见范围 |
| API 写入丢数据 | 未分页/未限流/字段名当 ID | 用字段 ID、分页拉全、失败重试幂等 |
| 自动化不触发 | 触发条件配置成"编辑"而非"满足条件" | 造真实数据走一遍触发链路 |

栈质量门：字段类型与业务口径一致；关联无孤儿记录；权限按角色实测（用受限账号打开验证）；自动化触发一次真实走查。

## 7. Agent / MCP / 技能开发链路

技能组合：mcp-builder（MCP 服务）/ skill-creator、skill-creator-for-work（技能）；架构参考 langchain-architecture、review-agent-setup；编排参考 dispatching-parallel-agents。

落地顺序：
1. 先写能力边界：这个 agent/skill 解决什么、输入输出、不做什么；技能必须写清触发场景（description 决定何时被调用）。
2. 工具最小化：MCP 工具职责单一、参数 schema 严格、失败返回结构化错误；遵循 protect-mcp-setup 的安全约束。
3. 流程显式化：状态、步骤、回退路径写清；长任务支持断点/幂等。
4. 可测试：工具调用可用 mock 验证；准备 3-5 个真实触发样例做回放。
5. 渐进式披露：SKILL.md 精简，细节放 references；脚本放 scripts 并实测。

Top 踩坑库：
| 现象 | 根因 | 规避 |
|---|---|---|
| 技能该触发没触发 | description 没写场景/触发词 | description 写清 what+when，略 pushy，做正/反触发样例 |
| 无关任务误触发 | description 过于宽泛 | 明确边界与"不适用"场景 |
| SKILL.md 越写越臃肿 | 细节全堆主文件 | 主文件只留流程与导航，细节进 references |
| 脚本交付即报错 | 脚本没实测、依赖没声明 | 脚本必须实际运行；优先纯标准库 |
| MCP 工具被注入利用 | 参数未校验、权限过大 | 严格 schema、最小权限、结构化错误 |

栈质量门：技能通过 quick_validate；每个工具至少一条成功/失败用例；description 触发测试（样例问句能命中、无关问句不误触发）。

## 8. 跨栈通用约定（所有栈都遵守）

### 8.1 配置管理
- 一份代码多环境：环境差异全部走环境变量/配置中心，禁止把环境地址、密钥写死进代码。
- 必须提供 `.env.example`（或等价样例）列全变量名、示例、是否必填；真实 `.env` 不入库（.gitignore）。
- 配置项集中、类型化、启动时校验（缺关键配置要快速失败并报清楚缺哪个）。

### 8.2 日志
- 结构化、带 request/traceId 贯穿一次请求；关键路径记"入参摘要 + 结果 + 耗时"。
- 日志级别语义：ERROR 需要人处理、WARN 可自愈异常、INFO 关键业务节点、DEBUG 排障细节。
- 禁止打印：密码、token、完整身份证/银行卡、长串密钥；必要时脱敏。
- 禁止用异常做正常控制流，更禁止 catch 后什么都不做（空吞）。

### 8.3 统一错误返回
- 对外错误结构统一：`{code, message, details, traceId}`；HTTP 状态码与业务 code 语义一致。
- 错误码集中枚举、可检索；异常在边界（controller/全局 handler）统一转换，内部异常不直接泄漏堆栈给用户。
- 参数错误逐字段返回；外部依赖失败要区分"可重试/不可重试"。

### 8.4 提交前固定动作（Definition of Done 最小集）
1. 跑通构建/类型检查/lint；2. 跑通本次相关测试且不新增 skip；3. 真实启动走一遍主流程；
4. 跑静态体检脚本：`python3 scripts/preflight_check.py <项目根> --stage s5`（BLOCKER 清零）；
5. 自查无硬编码密钥、无空吞异常、无被注释的失败测试、无调试残留（print/console.log/TODO 带责任人）；
6. README 或运行说明同步更新（启动方式、配置、回滚）。
