# 04 · Java / Spring / JVM 工程手册（自包含·重点）

> 这是本地技能库此前的空白领域，本手册自包含，无需外部技能即可工作。内容提炼自 amplicode/spring-skills、rrezartprebreza/spring-boot-skills（Spring Boot 3/4）、wallaceespindola/ai-agents。**版本先判明：Spring Boot 3 = Spring Framework 6 / jakarta.*；Spring Boot 4 = Framework 7，二者注解与默认值有差异，下面凡涉及都会标注。brownfield 以 pom/build 里的实际版本为准。**

## 0. 开工前 30 秒：先探项目，再写代码
1. 判版本：`pom.xml`/`build.gradle` 里 Boot 版本、Java 版本（Boot 3 基线 Java 17，Boot 4 基线 Java 17+/21）、打包方式（jar/war）、单模块还是多模块。
2. 找最相似的现有实现：看它用分层还是六边形、DTO 怎么写、异常怎么处理、响应是否包信封、测试怎么组织——**新代码沿用既有约定**，这是三个仓库共同的第一要求。
3. 若装了 Spring/IDE MCP（Amplicode 等），先用它获取结构化工程上下文（Bean、实体、端点、配置）再动手；没装就手工读，不臆造不存在的 Bean/字段/表。

## 1. 分层铁律与"AI 写 Spring 高频幻觉"红线
（架构形态选择见 03；这里是落地红线，代码评审逐条对照）
- **只允许构造器注入**：用 `@RequiredArgsConstructor` + `final` 字段；**禁止 `@Autowired` 字段注入**。
- `@Transactional` 只在 Service 层；Controller 不出现事务、不出现业务判断、不直接注入 Repository、不返回 JPA 实体。
- 一个聚合根一个 Service，禁止 `OrderAndInventoryService` 上帝类。
- Request/Response DTO 分离，绝不用同一个类既收又发；校验注解只放 Request DTO；实体→响应用 `Response.from(entity)` 静态工厂或独立 Mapper，集合用 `.stream().map(...).toList()`。
- 不可变 DTO 用 Java 16+ `record`；配置类放 `config/` 包，只装配基础设施，成组配置用 `@ConfigurationProperties` 类型安全绑定，不滥用零散 `@Value`。
- 日志用 SLF4J（`@Slf4j`），禁止 `System.out.println`；异常统一走单个 `@RestControllerAdvice`，控制器不 try/catch 兜底；审计用 `@CreatedDate/@LastModifiedDate + @EnableJpaAuditing`。

## 2. REST 落地
- 统一响应信封与状态码见 03 §2；`ApiResponse<T>` 用 record 提供 `ok()/error()` 静态工厂，`@JsonInclude(NON_NULL)`。
- 全局异常处理示例映射：`EntityNotFoundException→404`、`MethodArgumentNotValidException→400`（把字段错误汇成 details）、兜底 `Exception→500`（对外只给通用文案，不泄堆栈）。
- **分页必须设上限**：
```yaml
spring:
  data:
    web:
      pageable:
        default-page-size: 20
        max-page-size: 100   # 超过被静默夹紧，防一次拖全表
```
- 控制器用 `Pageable` 接收，返回前 `.map(OrderResponse::from)`，**绝不直接序列化 `Page<Entity>`**（会暴露 Hibernate 内部结构与懒加载异常）。

## 3. Spring Data JPA
- 关联默认 `FetchType.LAZY`（`@ManyToOne/@ManyToMany` 尤其不许 EAGER）；枚举用 `@Enumerated(EnumType.STRING)`，**不用 ORDINAL**；主键优先 UUID，慎用自增 Long 对外暴露。
- **N+1 治理**：循环里访问关联就是 N+1。单对象用 `JOIN FETCH`；列表用 `@EntityGraph(attributePaths=...)` 避免 JOIN 重复行；只读列表用接口投影（不加载实体）：
```java
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id=:id")
Optional<Order> findByIdWithItems(@Param("id") UUID id);

@EntityGraph(attributePaths = {"items","items.product"})
List<Order> findByStatus(OrderStatus status);

public interface OrderSummary { UUID getId(); String getCustomerEmail(); OrderStatus getStatus(); }
List<OrderSummary> findByCustomerEmail(String email);
```
- 存在性判断用 `existsBy...`（比 findById+isPresent 快）；原生 SQL 仅在 JPQL 做不到时用。
- **深分页用 keyset（游标）代替 OFFSET**：大表 `OFFSET 100000` 仍要扫描并丢弃前 10 万行；用 `WHERE id > :lastId ORDER BY id LIMIT :n`。
- `@OneToMany` 配 `orphanRemoval=true` 防孤儿；实体不暴露 setter，用行为方法改状态。
- **批量插入陷阱**：`GenerationType.IDENTITY` 会让 Hibernate 批量插入静默失效（每条一次 insert）；要批量用 UUID/序列生成策略 + `jdbc.batch_size`。

## 4. 事务与一致性（要点见 03 §3，这里给 Spring 细节）
- 类级 `@Transactional(readOnly=true)` 默认只读，写方法单独 `@Transactional` 覆盖。
- **自调用失效**：同类中 `this.method()` 绕过 Spring 代理，注解不生效——拆到独立 Bean 注入调用。`private` 方法上的事务注解永远无效。
- 传播级别：`REQUIRED`(默认)/`REQUIRES_NEW`(独立新事务，审计场景)/`SUPPORTS`/`MANDATORY`/`NEVER` 等，按语义选。
- 受检异常默认不回滚，需 `@Transactional(rollbackFor=XxxException.class)`；不想回滚用 `noRollbackFor`。
- 乐观锁 `@Version Long version;`，并发修改抛 `ObjectOptimisticLockingFailureException`。
- 外部副作用用 `@TransactionalEventListener(phase=AFTER_COMMIT)`；监听器内写库要再开 `REQUIRES_NEW`。跨服务用 Saga + 补偿 + 幂等键。

## 5. 测试金字塔（70 / 20 / 10）
```
单元测试 70%   不起 Spring 上下文，Mockito mock 依赖，纯快
切片测试 20%   @WebMvcTest（控制器层）、@DataJpaTest（持久层）等部分上下文
集成测试 10%   @SpringBootTest + Testcontainers 真实数据库，端到端少量精用
```
- 单元：`@ExtendWith(MockitoExtension.class)` + `@Mock/@InjectMocks`，Given-When-Then，AssertJ `assertThat`（不用 JUnit assertEquals）。
- 控制器切片：`@WebMvcTest(XxxController.class)` + MockMvc；**Spring Boot 3.4 起 `@MockBean` 弃用，改用 `@MockitoBean`（spy 用 `@MockitoSpyBean`）**；带安全的接口加 `@WithMockUser`，否则过滤器直接 401/403。
- 持久层：**不用 H2 冒充生产数据库**，用 Testcontainers（`@ServiceConnection` 复用容器，`@AutoConfigureTestDatabase(replace=Replace.NONE)`），保证方言/约束/SQL 行为一致。
- 命名：`方法名_条件_期望行为`，如 `createOrder_whenInventoryUnavailable_shouldThrow()`。
- 每个功能覆盖正常/边界/错误三类；bug 先写成失败测试再修（回归用例）；新代码覆盖 80%+，断言质量优先于数字。
- 运行：`mvn -q -Dtest=OrderServiceTest test`、`./gradlew test --tests '*OrderServiceTest'`；覆盖率 JaCoCo，变异测试可选 PIT（mutation-testing）评估断言强度。

## 6. 安全（Spring Security）
- **统一在 SecurityFilterChain 声明规则**：先 `authorizeHttpRequests` 明确公开/认证/角色路径，方法级用 `@PreAuthorize("hasRole(...)")` 做细粒度；默认拒绝兜底。
- 资源服务器优先 OAuth2 Resource Server（JWT 校验）；自签 JWT 也要：强密钥/短过期/刷新令牌分离、过滤器里解析并填充 Authentication、**401/403 返回 JSON 而非框架默认跳转页**。
- RBAC：URL 粗粒度 + 方法级细粒度；务必查**水平越权**（A 用户能否操作 B 用户资源——代码里比对资源归属，不能只看登录）。
- 密码用 `BCryptPasswordEncoder`/Argon2，**禁止 MD5/SHA1/明文**；令牌/密钥用 `SecureRandom`，不用 `java.util.Random`；凭据全部外置到环境变量/密钥管理（`${DB_PASSWORD}`），**禁止硬编码与提交进 git**。
- CORS 显式白名单（不 `*` 带凭证）；无状态 REST 关闭 CSRF 但要有其他防跨站手段，表单/ Cookie 会话保留 CSRF 防护；接口加限流防刷。
- 依赖漏洞进 CI（OWASP Dependency-Check）；输入用 Bean Validation 在边界校验（`@NotNull/@Size/@Pattern`），注解不是运行时校验，别把 null-safety 注解当输入校验。

## 7. 韧性与并发
- **版本选型**：Boot 3/FW6 没有框架内建韧性注解——简单命中式重试用 **Spring Retry**（`@EnableRetry`+`@Retryable`+`@Recover`），需要熔断/限流/舱壁组合用 **Resilience4j**；不要把 FW7 的 `@EnableResilientMethods` 用到 Boot 3。
- `@Retryable(maxAttempts=4)` 的次数**包含首次调用**（即重试 3 次）；退避用指数 `@Backoff(delay=200,multiplier=2,maxDelay=2000)`。
- **非幂等写操作没有幂等键不许自动重试**（支付/下单尤其）；重试同样走代理、且要放在事务 Bean 外层（事务内重试不会每次给新事务）。
- 熔断 `@CircuitBreaker(fallbackMethod=...)` + 必设超时（Resilience4j TimeLimiter，如 2s）+ 舱壁限制并发；fallback 返回缓存/安全默认值。
- 并发：优先不可变 + 线程安全集合/并发工具；`@Async` 要配线程池别用默认；理解 `synchronized`/`ReentrantLock`/CAS 适用面，避免共享可变状态。

## 8. Null 安全
- Boot 3/FW6 常用 `org.springframework.lang.@Nullable/@NonNull` 与包级 `@NonNullApi`（包标注文件要能编译）；**不要假设 FW7 的 JSpecify 默认语义**。
- 建立包级默认非空，只对真正可空的返回值/参数标 `@Nullable`，别给每个值都贴 `@NonNull`；仓储返回契约（Optional/可空/空集合）变更必须同步所有调用方；Java/Kotlin 混用时对齐编译器检查。

## 9. 数据迁移（Flyway；Liquibase 同理）
- 命名规范：`V{版本}__{描述}.sql`（如 `V12__add_order_status_index.sql`），版本号一旦发布不可修改；重复迁移用 `R__`。
- 安全模式：加列先可空/带默认 → 双写或回填（backfill 分批）→ 切读 → 再删旧列（扩展-迁移-收缩），避免长时间锁表；删列/改类型这类破坏性变更分多个版本。
- 种子数据只放 test/dev；多人并行用独立版本号区间或时间戳版本避免冲突；迁移纳入部署独立阶段，先迁移后发应用，回滚策略写进 runbook（Flyway 社区版不自动回滚，靠正向补偿脚本）。

## 10. 多模块 Maven / Gradle
典型依赖方向（依赖只能向内、不能反向）：
```
parent（统一依赖版本/dependencyManagement，不写业务）
├── domain        纯 Java，零 Spring 依赖
├── application   依赖 domain，允许 Spring
├── infrastructure 依赖 application，放 JPA/web/外部适配器
└── web(boot-app) 可运行启动模块，聚合其余
```
- 子模块只声明自己需要的依赖；domain 模块的 pom 里**不允许出现 spring-boot-starter-web/jpa**。
- 常用命令：整仓 `mvn -q clean verify`；只构建某模块及其依赖 `mvn -pl module -am clean package`；跳过测试 `-DskipTests`（仅本地临时，CI 不许）；Gradle 多项目 `./gradlew :module:build`。
- 用 Maven `dependency:tree`/Gradle `dependencies` 排查版本冲突，统一在父 POM/版本目录锁版本；构建缓存、并行（`-T1C`）、Gradle 守护进程与配置缓存用于提速。

## 11. Quarkus（当项目用 Quarkus 时）
- 创建用 code.quarkus.io；`mvn quarkus:dev` 热重载 + Dev UI（`/q/dev`）；REST 用 RESTEasy Reactive（注解与 Spring 不同，`@Path/@GET/@Produces`，Jakarta REST）。
- 持久层 Panache 两种风格：**Active Record**（实体继承 `PanacheEntity`，自带 `list/find/persist`）与 **Repository 模式**（`PanacheRepository`），项目内二选一保持一致。
- DI 用 CDI（`@ApplicationScoped/@Inject`，对应 Spring 的单例/构造注入理念，同样避免字段注入滥用）；消息用 Reactive Messaging（`@Incoming/@Outgoing` 对接 Kafka）；内置健康检查（`/q/health`、`/q/health/ready`）。
- 原生镜像：`./mvnw package -Dnative` 走 GraalVM native，需要提前处理反射/动态代理（`@RegisterForReflection`、配置可达性元数据），把 native 构建单独验证，别等上线才发现反射问题。

## 12. JVM 性能调优（先 profiling 再优化，不做"感觉优化"）
- 定位：用 async-profiler/JFR/VisualVM 先确认是 CPU、内存分配、锁竞争还是 GC，再动手；数据库侧先排 N+1（往往是首要瓶颈）。
- 堆：容器内显式 `-Xms/-Xmx`（或使用容器感知的 MaxRAMPercentage），别让堆超过容器内存触发 OOMKilled；GC：JDK 17+ 默认 G1，超低延迟可选 ZGC/Shenandoah，开 GC 日志观察停顿与晋升。
- 代码层：循环内字符串拼接用 `StringBuilder`；按访问模式选集合（随机访问多 ArrayList，频繁头尾 LinkedList/ArrayDeque，按键查找 HashMap）；减少短命大对象、避免自动装箱；热点算法先降复杂度（O(n²)→O(n)）。
- 数据库连接池大小按公式估：`池大小 ≈ 核数*2 + 有效磁盘数`（4 核 1 盘约 9），不是越大越好，过大反而上下文切换与数据库连接压力。
- 缓存只加在被 profiling 证明的热点，带过期与失效策略；分页/异步/批处理解决大批量。

## 13. Spring AI / LangChain4j（Agent 与 LLM，配合 07）
- 抽象：ChatClient/模型、Prompt 模板、结构化输出（绑定 DTO）、Embedding+向量库 RAG、Tool/Function Calling、记忆（ChatMemory）。
- 生产要点：外部模型调用必设超时与重试、token/成本预算、流式输出、降级模型；提示与检索结果属外部输入，工具调用要白名单与确认；全链路 trace（输入/检索/工具/输出/耗时/Token）。Spring 也可用 `spring-ai` MCP server/ client 暴露或接入工具。

## 14. 交付前 Java 专项自检（对照 Gotchas 总表）
- [ ] 无字段 `@Autowired`，全构造器注入；事务只在 Service 且无自调用/private 失效
- [ ] Controller 不返回实体、不直接访问 Repository、异常走统一 advice、响应信封一致
- [ ] 关联 LAZY、枚举 STRING、无循环内 N+1、列表分页且有上限、深分页用 keyset
- [ ] 测试金字塔比例合理、Boot≥3.4 用 `@MockitoBean`、数据库用 Testcontainers 非 H2、AssertJ、命名规范
- [ ] 密码 BCrypt、SecureRandom、凭据外置、水平越权已查、401/403 返回 JSON、CORS 白名单
- [ ] 重试仅幂等且带幂等键、外部调用有超时/熔断、事务后才发外部副作用
- [ ] 版本特性与 Boot 版本匹配（FW7 注解/JSpecify 不误用到 Boot3；jakarta.* 而非 javax.*）
- [ ] 无 `System.out`、无硬编码密钥、无注释掉的代码块；`mvn clean verify` / `gradlew build` 真实通过
