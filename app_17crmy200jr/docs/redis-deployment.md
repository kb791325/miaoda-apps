# Redis 部署文档

> 适用于：mutang 资产管理系统  
> Redis 版本：7.x（推荐 7-Alpine 用于容器化部署）  
> 用途：缓存热点数据、会话管理、分布式锁、限流计数

---

## 1. 生产环境部署指南

### 1.1 Redis 单机部署

#### Docker 部署（推荐）

```bash
# 拉取镜像
docker pull redis:7-alpine

# 启动容器
docker run -d \
  --name mutang-redis \
  --restart always \
  -p 6379:6379 \
  -v redis-data:/data \
  -e REDIS_PASSWORD=your_strong_password \
  redis:7-alpine \
  redis-server --requirepass ${REDIS_PASSWORD} \
               --maxmemory 256mb \
               --maxmemory-policy allkeys-lru \
               --appendonly yes
```

或使用 docker-compose（参见 `docker/redis/docker-compose.yml`）：

```bash
cd docker/redis
REDIS_PASSWORD=your_strong_password docker-compose up -d
```

#### 裸机部署（Ubuntu/Debian）

```bash
# 安装
apt-get update && apt-get install -y redis-server

# 配置文件路径：/etc/redis/redis.conf
# 关键配置项
sed -i 's/^# requirepass .*/requirepass your_strong_password/' /etc/redis/redis.conf
sed -i 's/^maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# 重启服务
systemctl restart redis-server
systemctl enable redis-server
```

### 1.2 Redis 主从复制部署

**架构**：1 主 + N 从，主节点负责写入，从节点负责读取，实现读写分离。

**主节点配置**（redis.conf）：

```conf
port 6379
requirepass master_password
masterauth master_password  # 主节点自身也需要，用于哨兵和故障转移
```

**从节点配置**：

```conf
port 6380
requirepass slave_password
replicaof <master-ip> 6379
masterauth master_password
replica-read-only yes
```

**验证主从状态**：

```bash
redis-cli -a master_password INFO replication
# 期望输出：role:master / connected_slaves:1
```

> ⚠️ 主从复制仅提供数据冗余和读写分离，**不自动故障转移**。需自动故障转移请使用 Sentinel。

### 1.3 Redis Sentinel 高可用部署

**架构图文字描述**：

```
┌─────────────────────────────────────────────┐
│                  Sentinel 集群                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Sentinel1 │  │ Sentinel2 │  │ Sentinel3 │  │
│  │ :26379    │  │ :26380    │  │ :26381    │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
│        │              │              │         │
│        └──────────────┼──────────────┘         │
│                       │ 监控 + 选举             │
│         ┌─────────────┴─────────────┐          │
│         │     Redis 数据节点         │          │
│  ┌──────┴──────┐           ┌───────┴──────┐   │
│  │  Master     │◄─复制────│  Slave       │   │
│  │  :6379      │           │  :6380       │   │
│  └─────────────┘           └──────────────┘   │
└─────────────────────────────────────────────┘
```

**Sentinel 配置示例**（`sentinel.conf`，每个 Sentinel 节点一份）：

```conf
port 26379
dir /tmp

# 监控主节点：名称、IP、端口、Quorum（至少 2 个 Sentinel 同意才故障转移）
sentinel monitor mymaster <master-ip> 6379 2

# 主节点无响应超过 5 秒判定为下线
sentinel down-after-milliseconds mymaster 5000

# 故障转移超时 60 秒
sentinel failover-timeout mymaster 60000

# 并行同步的从节点数
sentinel parallel-syncs mymaster 1

# 认证密码
sentinel auth-pass mymaster your_strong_password
```

**启动 Sentinel**：

```bash
redis-sentinel /path/to/sentinel.conf
# 或
redis-server /path/to/sentinel.conf --sentinel
```

**应用连接 Sentinel**：设置环境变量 `REDIS_SENTINEL_HOSTS` 和 `REDIS_SENTINEL_MASTER_NAME`，应用会自动通过 Sentinel 发现当前主节点。

### 1.4 Redis Cluster 集群部署概览

适用于数据量超过单机内存（>256GB）或需要水平扩展的场景。Cluster 将数据按 16384 个哈希槽分布到多个节点。

**最小部署**：3 主 + 3 从（共 6 节点）

```bash
# 每个节点 redis.conf 添加
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000

# 创建集群
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1 \
  -a your_password
```

> **本项目的推荐方案**：单机部署（中小规模）→ 主从 + Sentinel（需要高可用）→ Cluster（大规模数据）。

---

## 2. 配置说明

### 2.1 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `REDIS_HOST` | `localhost` | Redis 服务器地址 |
| `REDIS_PORT` | `6379` | Redis 服务器端口 |
| `REDIS_PASSWORD` | — | Redis 认证密码（生产环境必填） |
| `REDIS_DB` | `0` | 使用的数据库编号（0-15） |
| `REDIS_TLS_ENABLED` | `false` | 是否启用 TLS 加密连接 |
| `REDIS_TLS_REJECT_UNAUTHORIZED` | `true` | 是否拒绝未授权 TLS 证书 |
| `REDIS_SENTINEL_HOSTS` | — | Sentinel 节点列表，逗号分隔（如 `sentinel1:26379,sentinel2:26379,sentinel3:26379`） |
| `REDIS_SENTINEL_MASTER_NAME` | `mymaster` | Sentinel 监控的主节点名称 |
| `CACHE_TTL` | `300` | 默认缓存 TTL（秒），5 分钟 |
| `CACHE_MAX_KEYS` | `10000` | 最大缓存键数量 |
| `CACHE_SLOW_LOG_THRESHOLD` | `100` | 慢操作日志阈值（毫秒） |
| `MEMORY_CACHE_MAX_SIZE` | `1000` | 内存缓存（降级）最大条目数 |

### 2.2 连接池配置说明

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| `max_connections` | 50 | 连接池最大连接数 |
| `min_connections` | 5 | 连接池最小保持连接数 |
| `idle_timeout` | 30000 | 空闲连接回收时间（毫秒） |
| `connect_timeout` | 5000 | 连接超时时间（毫秒） |
| `retry_max_attempts` | 3 | 最大重试次数 |
| `retry_max_delay` | 2000 | 最大重试间隔（毫秒） |

### 2.3 缓存策略

#### TTL（Time-To-Live）策略

每种数据设定合理的过期时间，无需手动清理：

| 数据类型 | 建议 TTL | 理由 |
|----------|---------|------|
| 用户会话 | 1800s（30min） | 安全与资源平衡 |
| API 响应缓存 | 60-300s | 实时性要求中等 |
| 字典/配置数据 | 3600s（1h） | 不常变更 |
| 统计聚合结果 | 300-600s | 允许一定延迟 |
| 热点查询结果 | 60-120s | 高并发场景 |

#### 主动失效策略

在数据变更时主动删除相关缓存：

```typescript
// 示例：更新资产后删除相关缓存
async updateAsset(id: string, data: AssetDto) {
  const result = await this.db.update(assets).set(data).where(eq(assets.id, id));
  // 主动失效缓存
  await this.cacheService.del(`asset:${id}`);
  await this.cacheService.delByPattern(`asset:list:*`);
  return result;
}
```

#### 旁路缓存（Cache-Aside）

读流程：先查缓存 → 命中返回 → 未命中查数据库 → 写入缓存 → 返回  
写流程：更新数据库 → 删除（或更新）缓存

### 2.4 降级策略

#### 自动切换内存缓存

当 Redis 不可用时，应用自动切换到进程内内存缓存（Map/LRU），确保服务不中断：

```typescript
// 降级流程
getFromCache(key: string) {
  try {
    return await this.redis.get(key); // 优先 Redis
  } catch (err) {
    this.logger.warn(`Redis 不可用，降级到内存缓存: ${err.message}`);
    this.useMemoryFallback = true;
    return this.memoryCache.get(key); // 降级到内存
  }
}
```

#### 重连机制

- 指数退避重连：初始间隔 100ms，最大 30s，每次失败翻倍
- 重连成功后自动恢复 Redis 优先模式
- 健康检查：每 30 秒一次 ping

---

## 3. 监控与告警

### 3.1 Redis 关键指标

| 指标 | INFO 命令 | 说明 |
|------|-----------|------|
| 内存使用率 | `used_memory_rss / maxmemory` | 实际内存使用比例 |
| 命中率 | `keyspace_hits / (keyspace_hits + keyspace_misses)` | 缓存效率核心指标 |
| 连接数 | `connected_clients` | 当前活跃连接数 |
| 慢查询数 | `slowlog len` | 慢查询积压数量 |
| 过期键数 | `expired_keys` | 已过期键累计数 |
| 键空间大小 | `db0:keys` | 当前数据库键总数 |
| 碎片率 | `mem_fragmentation_ratio` | >1.5 建议重启 |
| 阻塞客户端 | `blocked_clients` | BLPOP 等阻塞命令等待数 |

### 3.2 告警阈值建议

| 指标 | 告警级别 | 阈值 | 处理建议 |
|------|---------|------|---------|
| 内存使用率 | Warning | >70% | 检查 TTL 策略、考虑扩容 |
| 内存使用率 | Critical | >85% | 立即扩容或清理，`maxmemory-policy` 将触发淘汰 |
| 命中率 | Warning | <90% | 检查缓存策略和 TTL 设置 |
| 命中率 | Critical | <80% | 缓存穿透风险，需排查 |
| 连接数 | Warning | >80% maxclients | 检查连接泄漏 |
| 慢查询数 | Warning | >10 条/分钟 | 优化慢查询或调整阈值 |
| 碎片率 | Warning | >1.5 | 计划重启或执行 `MEMORY PURGE` |
| 过期键数激增 | Warning | 增速 >1000/s | 检查批量过期对性能的影响 |

### 3.3 使用 redis-cli 和 INFO 命令监控

```bash
# 连接 Redis
redis-cli -h <host> -p <port> -a <password>

# 查看整体统计
INFO

# 查看内存使用
INFO memory

# 查看命中率
INFO stats | grep keyspace

# 查看慢查询
SLOWLOG GET 10

# 查看客户端连接
CLIENT LIST

# 实时监控（每秒刷新）
redis-cli -h <host> -a <password> --stat

# 延迟监控
redis-cli -h <host> -a <password> --latency

# 大键扫描
redis-cli -h <host> -a <password> --bigkeys
```

---

## 4. 性能优化

### 4.1 键设计最佳实践

#### 命名规范

```
<业务模块>:<实体类型>:<标识符>
```

| 示例 | 说明 |
|------|------|
| `asset:detail:ck-20260905-0001` | 资产详情 |
| `asset:list:page:1:size:20` | 资产列表分页 |
| `user:session:abc123` | 用户会话 |
| `config:dict:asset_status` | 字典配置 |
| `counter:inventory:warehouse-01` | 库存计数器 |

#### 避免大 Key

- 单个 Key 的 Value 不超过 10KB（字符串）或 5000 个元素（集合类型）
- 大对象拆分为 Hash 的多个 Field
- 大列表使用分页存储

#### 合理 TTL

- 每个 Key 必须设置过期时间，避免内存无限增长
- 热点数据 TTL 内加随机偏移（±10%），防止缓存雪崩

### 4.2 缓存策略选择

| 策略 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **Cache-Aside** | 读多写少，数据一致性要求不高 | 简单、灵活 | 首次请求慢，缓存一致性问题 |
| **Write-Through** | 写操作频繁，需要强一致性 | 缓存始终最新 | 写延迟高 |
| **Write-Behind** | 高吞吐写场景 | 写性能极高 | 数据丢失风险，实现复杂 |

**本项目推荐**：Cache-Aside + 主动失效（写操作时删除相关缓存）。

### 4.3 内存优化

- **maxmemory-policy**：推荐 `allkeys-lru`（淘汰最少使用的键）
- **压缩**：对大 Value 使用 gzip 压缩后存储（需应用层实现）
- **小对象**：用 Hash 代替多个 String Key（`hash-max-ziplist-entries 512`）
- **定期清理**：避免批量过期造成的性能抖动

### 4.4 网络优化

- **Pipeline**：批量命令使用管道，减少 RTT：

```typescript
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const results = await pipeline.exec();
```

- **连接池复用**：避免每次请求新建连接，使用连接池管理
- **本地部署**：Redis 与应用部署在同一网络 / 同一机器，延迟 <1ms

---

## 5. 故障排查

### 5.1 连接失败排查步骤

1. **检查网络连通性**：
   ```bash
   ping <redis-host>
   telnet <redis-host> 6379
   ```

2. **检查 Redis 服务状态**：
   ```bash
   docker ps | grep redis
   # 或
   systemctl status redis-server
   ```

3. **检查 Redis 日志**：
   ```bash
   docker logs mutang-redis
   # 或
   tail -f /var/log/redis/redis-server.log
   ```

4. **验证密码和权限**：
   ```bash
   redis-cli -h <host> -p <port> -a <password> PING
   # 预期：PONG
   ```

5. **检查连接数**：
   ```bash
   redis-cli -a <password> INFO clients
   # 若 connected_clients 接近 maxclients，需增加连接数上限或排查连接泄漏
   ```

### 5.2 缓存穿透/击穿/雪崩处理方案

| 问题 | 说明 | 解决方案 |
|------|------|---------|
| **缓存穿透** | 查询不存在的数据，缓存永远不命中 | ① 布隆过滤器 ② 空值缓存（TTL 短）③ 参数校验 |
| **缓存击穿** | 热点 Key 过期瞬间大量请求打到 DB | ① 互斥锁（只让一个请求查 DB）② 永不过期 + 异步刷新 |
| **缓存雪崩** | 大量 Key 同时过期 | ① TTL 加随机偏移 ② 多级缓存 ③ 限流降级 |

**实现示例**：

```typescript
// 防止缓存穿透：缓存空值
async getAsset(id: string) {
  const cacheKey = `asset:${id}`;
  let data = await this.redis.get(cacheKey);
  if (data === '__NULL__') return null; // 缓存的空值
  if (data) return JSON.parse(data);

  const asset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
  if (asset) {
    await this.redis.set(cacheKey, JSON.stringify(asset), 'EX', 300);
  } else {
    // 缓存空值，防止穿透
    await this.redis.set(cacheKey, '__NULL__', 'EX', 60);
  }
  return asset;
}

// 防止缓存击穿：互斥锁
async getHotAsset(id: string) {
  const cacheKey = `asset:${id}`;
  const lockKey = `lock:asset:${id}`;
  let data = await this.redis.get(cacheKey);
  if (data) return JSON.parse(data);

  // 尝试获取锁
  const locked = await this.redis.set(lockKey, '1', 'NX', 'EX', 5);
  if (!locked) {
    // 等待 100ms 后重试
    await sleep(100);
    return this.getHotAsset(id);
  }

  // 双重检查
  data = await this.redis.get(cacheKey);
  if (data) {
    await this.redis.del(lockKey);
    return JSON.parse(data);
  }

  const asset = await this.db.query.assets.findFirst({ where: eq(assets.id, id) });
  await this.redis.set(cacheKey, JSON.stringify(asset), 'EX', 300 + Math.random() * 60);
  await this.redis.del(lockKey);
  return asset;
}
```

### 5.3 内存溢出处理

1. **排查阶段**：
   ```bash
   redis-cli -a <password> INFO memory
   redis-cli -a <password> --bigkeys  # 查找大键
   redis-cli -a <password> MEMORY DOCTOR  # 内存诊断
   ```

2. **应急处理**：
   - 临时提高 `maxmemory`（如有空闲内存）
   - 手动清理过期键：`redis-cli -a <password> --scan --pattern "temp:*" | xargs redis-cli -a <password> DEL`
   - 若 `maxmemory-policy` 为 `noeviction`，临时改为 `allkeys-lru`

3. **长期方案**：
   - 检查所有键是否设置了 TTL
   - 优化大 Key 拆分
   - 评估是否需要扩容或 Cluster

### 5.4 降级切换验证步骤

1. **模拟 Redis 故障**：
   ```bash
   docker stop mutang-redis
   ```

2. **验证应用行为**：
   - 服务不应崩溃，应返回数据（可能略有延迟）
   - 日志中应出现降级提示
   - 监控指标显示切换到内存缓存

3. **恢复 Redis 并验证**：
   ```bash
   docker start mutang-redis
   ```
   - 应用应自动检测到 Redis 恢复
   - 日志中应出现恢复提示
   - 缓存命中率恢复正常

---

## 6. 安全配置

### 6.1 密码认证（requirepass）

```conf
# redis.conf
requirepass your_strong_password_here

# 密码复杂度要求：
# - 长度 ≥ 16 位
# - 包含大小写字母、数字、特殊字符
# - 不包含字典单词
```

**连接方式**：

```bash
redis-cli -a your_password
# 或交互式
redis-cli
127.0.0.1:6379> AUTH your_password
```

### 6.2 TLS 加密配置

适用于 Redis 与应用跨网络通信的场景。

```conf
# redis.conf
port 0                    # 关闭非 TLS 端口
tls-port 6380             # 启用 TLS 端口
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
tls-auth-clients yes      # 要求客户端证书（可选）
```

**应用侧配置**：

```bash
REDIS_TLS_ENABLED=true
REDIS_PORT=6380
```

### 6.3 访问控制

#### ACL（Redis 6+）

```bash
# 创建受限用户
redis-cli -a admin_password

# 创建只读用户
ACL SETUSER readonly_user on >password ~* +@read

# 创建应用用户（限制键前缀）
ACL SETUSER app_user on >password ~asset:* ~cache:* +@all -@dangerous

# 查看所有用户
ACL LIST

# 持久化
ACL SAVE
```

#### bind 与 protected-mode

```conf
# 仅监听内网 IP（裸机部署）
bind 127.0.0.1 10.0.0.5

# Docker 内必须 bind 0.0.0.0，由 Docker 网络安全组控制
bind 0.0.0.0

# 非 Docker 环境建议开启 protected-mode
protected-mode yes
```

#### 网络安全组 / 防火墙

```bash
# 仅允许应用服务器访问 Redis 端口
iptables -A INPUT -p tcp --dport 6379 -s <app-server-ip> -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

### 6.4 数据加密

- **传输加密**：使用 TLS（见 6.2）
- **存储加密**：
  - 敏感字段在应用层加密后再存入 Redis
  - 使用 AES-256-GCM 加密
  - 密钥通过环境变量注入，不硬编码

```typescript
// 示例：敏感数据加密存储
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function encryptValue(plaintext: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
```

---

## 附录

### A. 快速检查清单

部署前确认：

- [ ] `requirepass` 已设置强密码
- [ ] `maxmemory` 已根据机器内存合理设置
- [ ] `maxmemory-policy` 设置为 `allkeys-lru`
- [ ] `protected-mode` 在非 Docker 环境下为 `yes`
- [ ] AOF 持久化已开启
- [ ] 慢查询日志已配置
- [ ] 健康检查已配置（Docker）
- [ ] 监控和告警已接入
- [ ] 降级切换已测试
- [ ] 备份策略已就绪

### B. 参考资源

- [Redis 官方文档](https://redis.io/docs/latest/)
- [Redis Sentinel 文档](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [Redis Cluster 教程](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Redis 安全指南](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)