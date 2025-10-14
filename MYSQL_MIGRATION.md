# Redis到MySQL迁移指南

本文档介绍如何将Claude Relay Service从Redis数据存储迁移到MySQL数据库。

## 为什么要迁移到MySQL？

### MySQL的优势
- **持久化存储**: 数据永久保存，重启不会丢失
- **事务支持**: 确保数据一致性
- **复杂查询**: 支持SQL查询和报表生成
- **数据备份**: 更容易进行数据备份和恢复
- **扩展性**: 支持主从复制和集群部署
- **成熟生态**: 丰富的管理工具和监控方案

### 适用场景
- 需要持久化存储的生产环境
- 需要复杂数据分析和报表
- 需要严格的数据一致性保证
- 团队更熟悉关系型数据库

## 系统架构变化

### 原架构 (Redis)
```
Application → Redis Client → Redis Server
```

### 新架构 (支持双模式)
```
Application → Database Adapter → Redis Client → Redis Server
                              └→ MySQL Pool → MySQL Server
```

## 迁移步骤

### 1. 环境准备

#### 安装MySQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# macOS
brew install mysql

# Windows
# 下载并安装MySQL Community Server
```

#### 创建数据库用户
```sql
mysql -u root -p

CREATE USER 'claude_relay'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON claude_relay_service.* TO 'claude_relay'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 配置更新

#### 更新环境变量
创建或修改 `.env` 文件：

```env
# 数据库类型选择
DATABASE_TYPE=mysql

# MySQL连接配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=claude_relay
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=claude_relay_service

# MySQL连接池配置
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0

# 其他必要配置
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 3. 初始化MySQL数据库

运行数据库初始化脚本：
```bash
npm run db:init
```

这将会：
- 创建数据库（如果不存在）
- 创建所有必要的表结构
- 创建默认管理员账户

### 4. 数据迁移

#### 备份现有Redis数据（推荐）
```bash
# 导出Redis数据
npm run data:export

# 备份文件将保存在 data/backup/ 目录
```

#### 执行数据迁移
```bash
npm run migrate:redis-to-mysql
```

迁移脚本会自动：
- 连接到Redis和MySQL
- 迁移所有API Keys
- 迁移所有账户信息（Claude, Gemini, OpenAI等）
- 迁移使用统计数据
- 迁移费用统计数据
- 显示迁移进度和结果

### 5. 验证迁移

#### 检查数据
```sql
mysql -u claude_relay -p claude_relay_service

-- 检查API Keys
SELECT COUNT(*) FROM api_keys;

-- 检查账户
SELECT COUNT(*) FROM claude_accounts;
SELECT COUNT(*) FROM gemini_accounts;

-- 检查使用统计
SELECT COUNT(*) FROM usage_stats;

-- 检查费用统计
SELECT COUNT(*) FROM cost_stats;
```

#### 测试功能
1. 启动服务：`npm start`
2. 登录管理界面
3. 检查API Key列表
4. 检查账户列表
5. 测试API调用
6. 验证统计数据

### 6. 切换模式

系统支持在Redis和MySQL之间切换：

#### 切换到MySQL
```env
DATABASE_TYPE=mysql
```

#### 切换回Redis
```env
DATABASE_TYPE=redis
```

## 数据库表结构

### 主要表说明

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| api_keys | API密钥管理 | id, name, api_key_hash, limits, permissions |
| claude_accounts | Claude账户 | id, name, oauth_data, proxy_config |
| gemini_accounts | Gemini账户 | id, name, api_key, oauth_data |
| usage_stats | 使用统计 | api_key_id, model, tokens, requests |
| cost_stats | 费用统计 | api_key_id, cost_type, amount |
| sessions | 会话管理 | id, user_id, expires_at |
| concurrency_leases | 并发控制 | api_key_id, request_id, expires_at |

### 索引优化
所有表都已创建必要的索引：
- 主键索引
- 外键索引
- 查询优化索引（如api_key_hash, is_active等）

## 性能优化

### 连接池配置
```env
# 根据并发需求调整
MYSQL_CONNECTION_LIMIT=10  # 最大连接数
MYSQL_QUEUE_LIMIT=0        # 队列限制（0为无限）
```

### 查询优化
- 使用批量插入/更新
- 使用索引进行查询
- 定期清理过期数据

### 定期维护
```sql
-- 优化表
OPTIMIZE TABLE usage_stats;
OPTIMIZE TABLE cost_stats;

-- 清理过期数据
DELETE FROM sessions WHERE expires_at < NOW();
DELETE FROM concurrency_leases WHERE expires_at < NOW();
```

## 回滚方案

如果需要回滚到Redis：

1. 停止服务
2. 修改 `.env`：
   ```env
   DATABASE_TYPE=redis
   ```
3. 如果需要，恢复Redis数据：
   ```bash
   npm run data:import
   ```
4. 重启服务

## 常见问题

### Q: 迁移需要多长时间？
A: 取决于数据量。通常：
- 1000个API Keys: < 1分钟
- 10000条统计记录: < 5分钟

### Q: 迁移会影响服务吗？
A: 建议在维护窗口进行迁移。迁移期间应停止服务。

### Q: 数据会丢失吗？
A: 迁移脚本会保留所有数据。建议先备份。

### Q: MySQL需要多少存储空间？
A: 大约是Redis内存使用量的2-3倍（包括索引）。

### Q: 可以同时使用Redis和MySQL吗？
A: 不支持同时使用。但可以通过配置快速切换。

### Q: 如何监控MySQL性能？
A: 可以使用：
- MySQL Workbench
- phpMyAdmin
- Grafana + Prometheus
- 内置的 `/metrics` 端点

## 故障排除

### 连接失败
```
Error: Access denied for user 'claude_relay'@'localhost'
```
解决：检查用户名、密码和权限设置

### 表不存在
```
Error: Table 'claude_relay_service.api_keys' doesn't exist
```
解决：运行 `npm run db:init`

### 字符集问题
```
Error: Incorrect string value
```
解决：确保数据库使用 utf8mb4 字符集

### 连接池耗尽
```
Error: Too many connections
```
解决：增加 `MYSQL_CONNECTION_LIMIT` 或优化查询

## 维护建议

### 定期备份
```bash
# 备份数据库
mysqldump -u claude_relay -p claude_relay_service > backup.sql

# 恢复数据库
mysql -u claude_relay -p claude_relay_service < backup.sql
```

### 监控指标
- 连接池使用率
- 查询响应时间
- 表大小增长
- 慢查询日志

### 清理策略
- 定期清理过期会话
- 归档历史统计数据
- 压缩大表

## 支持

如有问题，请：
1. 查看日志文件：`logs/`
2. 检查数据库状态：`npm run status`
3. 提交Issue到项目仓库
