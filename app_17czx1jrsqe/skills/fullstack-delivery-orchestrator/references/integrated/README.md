# integrated/ — 整合自其他全栈总控的独有手册

本目录是 2026-09-08 技能去重整合的产物：以 `fullstack-delivery-orchestrator` 作为唯一全栈总控，把另外两个同构总控的**独有资产**并入此处，原技能已归档到 `_archived/`（可恢复，未删除）。

| 本目录文件 | 来源技能 | 原文件 | 承载的独有能力 |
|---|---|---|---|
| `root-cause-debugging.md` | fullstack-engineer-pro | references/02-root-cause-debugging.md | 根因调试六步决策树、分语言报错分诊、JVM 调试、自我欺骗清单 |
| `architecture-playbook.md` | fullstack-engineer-pro | references/03-architecture-playbook.md | 分层/六边形/DDD 选型、API 契约、事务与 Saga、微服务、ADR 模板 |
| `java-spring-playbook.md` | fullstack-engineer-pro | references/04-java-spring-playbook.md | Spring Boot 3/4、JPA、事务、安全、韧性、Flyway、多模块自包含手册 |
| `agent-dev-playbook.md` | fullstack-engineer-pro | references/07-agent-dev-playbook.md | Agent 模式选型、LangChain/LangGraph、RAG、MCP、多智能体、生产化清单 |
| `role-cards.md` | fullstack-flow | references/role-cards.md | 业务/数据/架构/后端/前端/QA/安全/性能/发布九专家视角关注点与陷阱 |

未并入的文件与两个原技能的其余 references（需求/设计/实现/测试/交付通用阶段说明、技能路由索引等）与本总控原有 `stage-gates.md / stack-playbooks.md / skill-map.md` 重复，故不重复保留；如需查阅原文，见 `_archived/`。
