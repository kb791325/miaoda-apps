# 技能路由总表（Skill Map）

> 目录：按能力域查找要分派的本地技能。所有技能名均已在当前环境核实存在。
> 用法：只读取当前阶段/当前任务所需的那一行技能的 SKILL.md，不要批量加载。
> 标记：【新】本次新安装；【官】官方业务技能目录；其余为社区工程技能。

## 目录
1. 需求与现状测绘
2. 架构与系统设计
3. 计划与项目协作
4. 后端实现（Java / Python / 通用）
5. 前端与全栈实现
6. 数据：数据库 / 多维表 / 分析
7. 质量：测试 / 评审 / 安全
8. 深度排障
9. Agent / MCP / 技能开发
10. 交付：Git / 部署 / 验证 / 文档
11. 业务与行业理解
12. 易混技能选型对比

---

## 1. 需求与现状测绘

| 场景 | 技能 |
|---|---|
| 需求工作坊、用户故事、EARS 规格、验收标准 | feature-forge【新】 |
| 发散构思、方案探索、需求澄清对话 | brainstorming |
| 从遗留/优秀代码库逆向出规格与架构 | spec-miner【新】 |
| 代码库导览、调用链/数据流/模块责任测绘 | doubao-coding-analyze-codebase【官】 |
| 遗留系统现代化改造评估 | architecture-designer【新】 |

## 2. 架构与系统设计

| 场景 | 技能 |
|---|---|
| 高层系统设计、ADR、技术权衡、NFR | architecture-designer【新】 |
| 微服务拆分、DDD、Saga、事件溯源、CQRS | microservices-architect【新】 |
| C4 架构图与架构评审 | ws-c4-architect、ws-architect-review |
| 架构决策记录沉淀 | architecture-decision-records |
| 代码级架构模式 | architecture-patterns、microservices-patterns |
| REST/GraphQL API 设计与契约 | api-design-principles、openapi-spec-generation、ws-graphql-architect |
| 分布式一致性/编排 | saga-orchestration、workflow-orchestration-patterns、event-store-design、cqrs-implementation |
| 可观测/可靠性 | distributed-tracing、service-mesh-observability、prometheus-configuration、slo-implementation、python-resilience、error-handling-patterns |
| 云原生与部署架构 | multi-cloud-architecture、k8s-manifest-generator、helm-chart-scaffolding、deployment-pipeline-design、terraform-module-library |

## 3. 计划与项目协作

| 场景 | 技能 |
|---|---|
| 写实施计划 | writing-plans |
| 按计划执行 | executing-plans |
| 任务跟踪与并行编排 | track-management、task-coordination-strategies、dispatching-parallel-agents、subagent-driven-development |
| 飞书任务/项目（Meego） | lark-task【官】、lark-project【官】 |
| 团队协作约定 | team-composition-patterns、team-communication-protocols |
| 进度汇报/站会 | lark-workflow-standup-report【官】 |

## 4. 后端实现

### Java / Spring（本次补齐）
| 场景 | 技能 |
|---|---|
| Java/Spring Boot 3.x 设计与疑难 | java-architect【新】 |
| 生成配置/控制器/Security/JPA/WebFlux | spring-boot-engineer【新】 |
| 端到端实现一个 Java 功能（编排子代理） | java-feature-development【新】 |
| Java 编码规范 | java-coding-standards【新】 |
| 发布前验证闭环 | java-spring-boot-verification-loop【新】 |

### Python
| 场景 | 技能 |
|---|---|
| Python 设计模式/项目结构 | python-design-patterns、python-project-structure |
| FastAPI 项目 | fastapi-templates |
| 异步并发 | async-python-patterns |
| 类型安全/错误处理/配置 | python-type-safety、python-error-handling、python-configuration |
| 测试/性能/打包/后台任务 | python-testing-patterns、python-performance-optimization、python-packaging、python-background-jobs |

### 后端通用
| 场景 | 技能 |
|---|---|
| 后端方案设计与功能开发 | doubao-coding-design-solution【官】、doubao-coding-develop-backend-features【官】 |
| Node/Go/Rust/.NET | nodejs-backend-patterns、modern-javascript-patterns、go-concurrency-patterns、rust-async-patterns、dotnet-backend-patterns |
| 认证授权 | auth-implementation-patterns |
| 消息/事件/集成 | ws-event-sourcing-architect、workflow-patterns |

## 5. 前端与全栈实现

| 场景 | 技能 |
|---|---|
| 全栈一体化（DB→API→UI，带每层安全） | fullstack-guardian【新】 |
| 全栈特性编排（架构→前端→后端→DB→测试） | ws-full-stack-feature |
| 全栈工程流程/专家 | fullstack-flow、fullstack-engineer-pro |
| Vue3/Nuxt/Pinia/Vite | vue-expert【新】 |
| React/Next/组件化 | react-modernization、react-state-management、nextjs-app-router-patterns、ws-frontend-developer、ws-component-scaffold |
| 设计与样式基线 | frontend-design、visual-design-foundations、tailwind-design-system、design-system-patterns、responsive-design、accessibility-compliance |
| 前端功能开发（官方流程） | doubao-coding-develop-frontend-features【官】 |
| 网页应用/H5 生成 | doubao-app-builder【官】、web-artifacts-builder |
| 移动端 | react-native-design、mobile-ios-design、mobile-android-design、ws-mobile-developer |

## 6. 数据：数据库 / 多维表 / 分析

| 场景 | 技能 |
|---|---|
| 数据库架构设计 | ws-database-architect |
| 表结构设计（PG） | postgresql-table-design |
| SQL 编写与优化 | ws-sql-pro、sql-optimization-patterns |
| 查询性能/索引 | vector-index-tuning |
| 迁移与演进 | database-migration |
| **飞书多维表格（台账/看板/收集表）** | lark-base【官】 |
| 在线表格/Excel/CSV | sheet【官】 |
| 数据分析与可视化 | doubao-data-analysis【官】、doubao-visualization【官】、data-storytelling、kpi-dashboard-design、grafana-dashboards |
| RAG/向量检索 | rag-implementation、hybrid-search-implementation、similarity-search-patterns |

## 7. 质量：测试 / 评审 / 安全

| 场景 | 技能 |
|---|---|
| 测试驱动开发 | test-driven-development |
| 单元测试（官方流程） | doubao-coding-develop-unit-tests【官】 |
| Web/E2E/集成测试 | webapp-testing、e2e-testing-patterns、bats-testing-patterns、ws-test-automator、ws-tdd-orchestrator |
| 代码评审 | code-review-excellence、doubao-coding-review-code【官】、requesting-code-review、receiving-code-review、multi-reviewer-patterns |
| 安全审计/需求 | ws-security-auditor、security-requirement-extraction、stride-analysis-patterns、threat-mitigation-mapping、secrets-management、sast-configuration |
| 性能优化 | doubao-coding-optimize-performance【官】、ws-performance-engineer、python-performance-optimization |
| 完成前自检 | verification-before-completion |
| 技术债识别 | ai-debt-detector |

## 8. 深度排障

| 场景 | 技能 |
|---|---|
| 系统化调试主流程 | debugging-strategies、系统化调试、parallel-debugging |
| 官方缺陷修复流程 | doubao-coding-diagnose-and-fix-bugs【官】 |
| 事故响应/复盘 | incident-runbook-templates、postmortem-writing、on-call-handoff-patterns |
| Java 排障 | java-architect【新】、java-spring-boot-verification-loop【新】 |
| 详细 SOP | 本技能 references/debugging-playbook.md |

## 9. Agent / MCP / 技能开发

| 场景 | 技能 |
|---|---|
| 构建 MCP 服务 | mcp-builder、protect-mcp-setup |
| 创建/优化技能 | skill-creator、skill-creator-for-work【官】、writing-skills |
| Agent 架构/RAG 编排 | langchain-architecture、review-agent-setup |
| 多代理编排 | dispatching-parallel-agents、subagent-driven-development、team-composition-analysis |
| 提示词工程 | prompt-engineering-patterns |

## 10. 交付：Git / 部署 / 验证 / 文档

| 场景 | 技能 |
|---|---|
| Git 工作流/分支收尾 | git-advanced-workflows、using-git-worktrees、finishing-a-development-branch |
| GitHub/Gitee 远程操作 | github-remote【官】、gitee-repositories【官】 |
| CI/CD | github-actions-templates、gitlab-ci-patterns、gitops-workflow、deployment-pipeline-design |
| 部署工程 | ws-deployment-engineer |
| 产物校验/预览 | verifier-hub【官】、artifact-preview【官】 |
| 在线文档/知识库 | lark-doc【官】、lark-wiki【官】、lark-drive【官】、lark-markdown【官】 |
| PPT / PDF / Word | ppt【官】、pdf、docx、pptx 系列 |
| 网页发布托管 | edgeone-pages【官】 |

## 11. 业务与行业理解

| 场景 | 技能 |
|---|---|
| 产品思维/需求管理 | doubao-product-manager【官】、doubao-product-qa【官】 |
| 竞品/市场/商业测算 | competitive-landscape、market-sizing-analysis、startup-metrics-framework、startup-financial-modeling |
| 行业/公司研究 | doubao-industry-analysis【官】、doubao-public-company-analysis【官】、doubao-enterprise-search【官】 |
| 指标体系 | kpi-dashboard-design、startup-metrics-framework |

---

## 12. 易混技能选型对比（同域多个技能时怎么选）

### 12.1 需求与现状
| 技能 | 它解决 | 什么时候选它 |
|---|---|---|
| brainstorming | 通过提问把模糊想法问清楚 | 需求还很虚、需要发散和澄清，先于一切设计 |
| feature-forge | 产出规格文档（用户故事/EARS/验收标准） | 想法已明确，要落成可签字、可测试的规格 |
| spec-miner | 从已有代码逆向出规格与架构 | 接手老项目、读优秀源码、文档缺失 |
| doubao-coding-analyze-codebase【官】 | 调用链/数据流/模块责任导览 | 要在具体代码库里定位入口、影响面 |
顺序口诀：想不清→brainstorming；要落地→feature-forge；读存量→spec-miner/analyze-codebase。

### 12.2 架构四件套
| 技能 | 抽象层级 | 产出 |
|---|---|---|
| architecture-designer | 系统级（最高层） | 架构图、ADR、技术选型、NFR |
| microservices-architect | 分布式系统拆分 | 限界上下文、服务边界、Saga/CQRS/通信 |
| ws-c4-architect | 视图表达 | C4 四层图（上下文/容器/组件/代码） |
| architecture-patterns | 代码级模式 | 分层/六边形/端口适配器等实现模式 |
先 architecture-designer 定方向 → 分布式再上 microservices-architect → ws-c4-architect 出图 → 落到代码用 architecture-patterns。

### 12.3 全栈交付三兄弟
| 技能 | 定位 | 选用 |
|---|---|---|
| fullstack-guardian | 单应用纵向打通，每层强制安全 | 一个人快速交付全栈功能、安全要求高 |
| ws-full-stack-feature | 多角色编排（架构/前端/后端/DB/测试/部署） | 模块多、要按角色分工推进 |
| fullstack-flow / fullstack-engineer-pro | 工程流程纪律/资深全栈视角 | 大特性需要严格阶段流程或疑难攻坚 |

### 12.4 排障技能群
| 场景 | 选择 |
|---|---|
| 不知道根因、要一套系统方法 | debugging-strategies / 系统化调试 |
| 多个疑似根因要并行验证 | parallel-debugging |
| 官方规范化缺陷修复闭环 | doubao-coding-diagnose-and-fix-bugs【官】 |
| Java/Spring 栈内问题 | java-architect + java-spring-boot-verification-loop |
| 线上事故应急/复盘 | incident-runbook-templates + postmortem-writing |
一次只立一个主排障技能，详细 SOP 统一看本技能 debugging-playbook。

### 12.5 测试与评审
| 目的 | 技能 |
|---|---|
| 先测试后写代码（红绿重构） | test-driven-development |
| 测试编排与覆盖率策略 | ws-tdd-orchestrator / ws-test-automator |
| 浏览器/E2E 行为验证 | webapp-testing / e2e-testing-patterns |
| 官方补单测流程 | doubao-coding-develop-unit-tests【官】 |
| 通用代码评审 | code-review-excellence / doubao-coding-review-code【官】 |
| 专项安全评审 | ws-security-auditor（不是通用评审的替代品） |
| 多人交叉评审组织 | multi-reviewer-patterns |

### 12.6 数据层分工
| 目的 | 技能 |
|---|---|
| 从零建模、定实体关系 | ws-database-architect |
| PostgreSQL 具体建表 | postgresql-table-design |
| 写 SQL/复杂查询 | ws-sql-pro |
| 慢查询与索引优化 | sql-optimization-patterns |
| 表结构演进/迁移 | database-migration |
| 业务台账/看板/协作（非代码库） | lark-base【官】 |
判断：程序侧持久化用前五个；团队协作型数据管理用 lark-base，不要混淆。

### 12.7 Java 五件套分工
java-feature-development 负责端到端编排；java-architect 管设计与疑难；spring-boot-engineer 管具体配置与组件生成；java-coding-standards 管编码风格；java-spring-boot-verification-loop 管发布前验证。一个 Java 特性 = 编排 1 个 + 当前工序 1 个 + 验证 1 个，不要五个同时加载。

### 12.8 计划与跟踪
writing-plans 产出计划文档；executing-plans 约束按计划执行；track-management 管任务状态与并行；需要落到飞书协作时用 lark-task/lark-project【官】。

### 12.9 Agent 开发
做 MCP 服务 → mcp-builder（+protect-mcp-setup 安全约束）；做技能 → skill-creator / skill-creator-for-work【官】；做应用编排架构 → langchain-architecture；多代理分工 → dispatching-parallel-agents / subagent-driven-development。

---

## 选择规则

1. 同场景多个技能时：官方【官】流程技能用于规范化交付，社区技能用于深度模式参考；两者可叠加，不冲突。
2. 技能名找不到时，不猜测、不硬套：用关键词在 `.user_skills` 与 `.skills` 目录检索 SKILL.md 的 description。
3. 一次任务的主技能不超过 3 个（编排技能 + 当前工序技能 + 质量技能），避免上下文拥塞。
4. 同域技能按第 12 节"流水线顺序"选，而不是凭名字感觉选；仍无法判断时，先读候选技能 SKILL.md 的前 10 行 description 再定。
