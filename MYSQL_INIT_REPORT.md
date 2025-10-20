# MySQL 数据库初始化完成报告

## 执行时间
2025-10-20

## 执行结果：✅ 成功

### 数据库配置信息
- **主机**: 38.55.193.172:3306
- **数据库**: claude-relay
- **用户**: claude-relay
- **MySQL 版本**: 8.4.2

### 解决的问题
初始化脚本报错 `Table 'claude-relay.admin_users' doesn't exist`，原因是 `src/models/mysql/schema.sql` 缺少 `admin_users` 表定义。

**解决方案**：
在 `src/models/mysql/schema.sql` 中添加了 `admin_users` 表：

```sql
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `role` VARCHAR(50) DEFAULT 'admin',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 创建的表 (19个)

#### 核心表
1. **api_keys** - API 密钥管理
2. **admin_users** - 管理员用户 ✨ (新增)
3. **claude_accounts** - Claude 账户
4. **gemini_accounts** - Gemini 账户
5. **openai_accounts** - OpenAI 账户
6. **droid_accounts** - Droid 账户

#### 统计表
7. **usage_stats** - API Key 使用统计
8. **account_usage_stats** - 账户使用统计
9. **cost_stats** - 成本统计
10. **usage_records** - 使用记录

#### 会话管理
11. **sessions** - 用户会话
12. **oauth_sessions** - OAuth 会话
13. **sticky_sessions** - 粘性会话映射

#### 系统表
14. **concurrency_leases** - 并发控制
15. **key_value_store** - KV 存储
16. **system_metrics** - 系统指标

#### 客户端 API 表 (已存在)
17. **client_users** - 客户端用户
18. **client_api_keys** - 客户端 API 密钥
19. **client_sessions** - 客户端会话
20. **client_usage_logs** - 客户端使用日志

### 管理员账户
✅ 已成功创建默认管理员账户

**管理员凭据**：
- 用户名: `sunnchao`
- 密码: `1234567890-aA`

⚠️ **重要提示**: 请立即修改默认密码！

### 后续步骤

#### 1. 配置数据库类型
确认 `.env` 文件中的数据库配置：

```bash
DATABASE_TYPE=hybrid  # 或改为 mysql
MYSQL_HOST=38.55.193.172
MYSQL_PORT=3306
MYSQL_USER=claude-relay
MYSQL_PASSWORD=JBM5CXtNG5JN6wM2
MYSQL_DATABASE=claude-relay
```

#### 2. 迁移现有 Redis 数据（如果有）
```bash
npm run migrate:redis-to-mysql
```

#### 3. 启动服务
```bash
npm start
```

#### 4. 登录管理后台
访问管理后台并使用上述凭据登录：
- URL: `http://your-server:port/admin-next/`
- 用户名: `sunnchao`
- 密码: `1234567890-aA`

#### 5. 修改管理员密码
登录后立即修改默认密码以确保安全。

### 数据库维护建议

#### 定期清理
```sql
-- 清理过期会话
DELETE FROM sessions WHERE expires_at < NOW();
DELETE FROM oauth_sessions WHERE expires_at < NOW();
DELETE FROM sticky_sessions WHERE expires_at < NOW();

-- 清理过期并发租约
DELETE FROM concurrency_leases WHERE expires_at < NOW();

-- 清理30天前的使用记录
DELETE FROM usage_records WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

#### 索引优化
```sql
-- 检查索引使用情况
SHOW INDEX FROM api_keys;
SHOW INDEX FROM usage_stats;

-- 分析表性能
ANALYZE TABLE api_keys;
ANALYZE TABLE usage_stats;
```

#### 备份建议
```bash
# 备份数据库
mysqldump -h 38.55.193.172 -u claude-relay -p claude-relay > backup.sql

# 仅备份结构
mysqldump -h 38.55.193.172 -u claude-relay -p --no-data claude-relay > schema.sql
```

### 与 Redis 混合使用（Hybrid 模式）

当前配置为 `DATABASE_TYPE=hybrid`，系统会：
- 使用 MySQL 存储持久化数据（账户、API Keys、统计数据）
- 使用 Redis 存储临时数据（会话、缓存、速率限制）

这种模式结合了两者的优势：
- MySQL: 可靠的持久化存储
- Redis: 高性能临时数据和缓存

### 验证安装

#### 检查所有表
```bash
mysql -h 38.55.193.172 -u claude-relay -p'JBM5CXtNG5JN6wM2' -D claude-relay -e "SHOW TABLES;"
```

#### 检查管理员账户
```bash
mysql -h 38.55.193.172 -u claude-relay -p'JBM5CXtNG5JN6wM2' -D claude-relay -e "SELECT id, username, role, is_active, created_at FROM admin_users;"
```

#### 检查表行数
```bash
mysql -h 38.55.193.172 -u claude-relay -p'JBM5CXtNG5JN6wM2' -D claude-relay -e "
SELECT
  TABLE_NAME,
  TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'claude-relay'
ORDER BY TABLE_NAME;"
```

## 总结

✅ 成功完成 MySQL 数据库初始化
✅ 创建了 19 个核心表
✅ 修复了缺失的 admin_users 表
✅ 创建了默认管理员账户
✅ 系统已准备就绪

**下一步**: 启动服务并登录管理后台测试功能。

---

**生成时间**: 2025-10-20
**执行人**: Claude Code
**状态**: 成功 ✅
