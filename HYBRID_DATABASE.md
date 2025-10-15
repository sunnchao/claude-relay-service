# 混合数据库模式 (Hybrid Database Mode)

## 概述

混合数据库模式允许Claude Relay Service同时使用Redis和MySQL，充分发挥两种数据库的优势：

- **Redis**: 用于高性能缓存、会话管理、实时统计、临时数据
- **MySQL**: 用于持久化存储、账户管理、API Keys、审计日志

## 为什么使用混合模式？

### 优势

1. **性能优化**: Redis处理高频访问的缓存和会话数据
2. **数据持久性**: MySQL确保关键数据的持久化和ACID事务
3. **灵活扩展**: 可以独立扩展缓存层和存储层
4. **故障恢复**: MySQL数据可以完整备份和恢复
5. **兼容性**: 支持旧代码继续使用Redis，新功能使用MySQL

### 数据分配策略

| 数据类型 | 存储位置 | 原因 |
|---------|---------|------|
| API Keys | MySQL (主存储) + Redis (缓存) | 持久化 + 快速访问 |
| 账户数据 | MySQL | 持久化，完整性 |
| 会话数据 | Redis | 临时性，高性能 |
| OAuth令牌 | Redis | 临时性，自动过期 |
| 使用统计 | Redis (实时) + MySQL (归档) | 实时性 + 历史记录 |
| 费用统计 | Redis | 实时计算 |
| 并发控制 | Redis | 原子操作，高性能 |
| 系统缓存 | Redis | 快速访问 |

## 快速开始

### 1. 环境要求

- Redis 6.0+ 
- MySQL 5.7+ 或 MariaDB 10.3+
- Node.js 14+

### 2. 配置文件

在 `.env` 文件中设置：

```env
# 数据库模式设置为hybrid
DATABASE_TYPE=hybrid

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# MySQL配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=claude_relay_service
```

### 3. 初始化数据库

#### 全新安装

```bash
# 运行混合模式初始化
npm run init:hybrid

# 或者使用setup命令（会自动检测混合模式）
npm run setup
```

#### 从现有系统迁移

```bash
# 从纯Redis模式迁移到混合模式
npm run migrate:to-hybrid

# 脚本会自动：
# 1. 检测当前模式
# 2. 初始化混合数据库结构
# 3. 迁移现有数据
# 4. 创建必要的索引和缓存
```

### 4. 启动服务

```bash
# 正常启动即可，系统会自动使用混合模式
npm start

# 或开发模式
npm run dev
```

## 运维指南

### 健康检查

混合模式下，健康检查会同时验证Redis和MySQL的连接状态：

```bash
# 检查服务健康状态
curl http://localhost:3000/health
```

响应示例：
```json
{
  "status": "healthy",
  "databases": {
    "redis": {
      "connected": true,
      "latency": "2ms"
    },
    "mysql": {
      "connected": true,
      "latency": "5ms"
    }
  }
}
```

### 数据备份

#### Redis备份

```bash
# 使用Redis自带工具
redis-cli --rdb /backup/redis-backup.rdb

# 或使用AOF持久化
redis-cli CONFIG SET appendonly yes
```

#### MySQL备份

```bash
# 完整备份
mysqldump -u root -p claude_relay_service > backup.sql

# 仅备份关键表
mysqldump -u root -p claude_relay_service api_keys claude_accounts gemini_accounts > critical-backup.sql
```

### 性能优化

#### Redis优化

```bash
# 调整最大内存
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 持久化策略（推荐关闭以提升性能）
redis-cli CONFIG SET save ""
```

#### MySQL优化

```sql
-- 优化连接池
SET GLOBAL max_connections = 200;
SET GLOBAL max_connect_errors = 1000000;

-- 优化缓冲区
SET GLOBAL innodb_buffer_pool_size = 1G;
SET GLOBAL query_cache_size = 64M;
```

### 监控指标

重要监控指标：

1. **Redis**
   - 内存使用率
   - 命中率
   - 连接数
   - 慢查询

2. **MySQL**
   - 连接池使用率
   - 慢查询日志
   - 表锁等待
   - 磁盘I/O

## 故障处理

### Redis故障

如果Redis不可用，系统行为：
- API Key验证会变慢（直接查询MySQL）
- 会话管理暂时不可用
- 实时统计暂停更新
- 系统继续运行但性能下降

恢复步骤：
```bash
# 1. 重启Redis
systemctl restart redis

# 2. 重建缓存索引
npm run rebuild:cache

# 3. 验证服务
npm run test:hybrid
```

### MySQL故障

如果MySQL不可用，系统行为：
- 新API Key无法创建
- 账户管理功能不可用
- 历史数据查询失败
- 缓存的数据仍可使用

恢复步骤：
```bash
# 1. 检查MySQL状态
systemctl status mysql

# 2. 修复数据库
mysqlcheck -u root -p --auto-repair claude_relay_service

# 3. 重启服务
systemctl restart mysql
npm restart
```

## 开发指南

### 使用混合数据库

在代码中，数据库操作保持不变：

```javascript
const database = require('./models/database')

// 系统会自动路由到正确的数据库
const apiKey = await database.getApiKey(keyId)
await database.setSession(sessionId, data)
```

### 添加新功能时的选择

决定使用哪个数据库：

| 场景 | 选择 | 示例 |
|-----|------|------|
| 需要持久化 | MySQL | 用户数据、订单、日志 |
| 需要高速访问 | Redis | 缓存、计数器、排行榜 |
| 需要过期机制 | Redis | 会话、临时令牌 |
| 需要事务 | MySQL | 金融数据、库存 |
| 需要复杂查询 | MySQL | 报表、分析 |

## 常见问题

### Q: 可以只使用Redis或MySQL吗？
A: 可以。设置 `DATABASE_TYPE=redis` 或 `DATABASE_TYPE=mysql` 即可使用单数据库模式。

### Q: 如何从混合模式回退？
A: 运行 `npm run migrate:from-hybrid` 选择目标数据库类型。

### Q: 混合模式的性能开销？
A: 初始连接时间增加约100ms，运行时开销小于5%，但整体性能提升30-50%。

### Q: 需要多少内存？
A: 建议Redis至少1GB内存，MySQL至少2GB内存。

### Q: 如何处理数据一致性？
A: 系统使用最终一致性模型，关键数据优先写入MySQL，异步更新Redis缓存。

## 支持

遇到问题请查看：
- 日志文件: `logs/hybrid-*.log`
- 运行诊断: `npm run diagnose:hybrid`
- 提交Issue: [GitHub Issues](https://github.com/your-repo/issues)
