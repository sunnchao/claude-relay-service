# 快速开始 - 混合数据库模式

本指南帮助您快速启用Redis+MySQL混合数据库模式。

## 为什么使用混合模式？

- **高性能**：Redis处理缓存和会话，MySQL存储持久数据
- **可靠性**：关键数据在MySQL中持久化，不会丢失
- **兼容性**：支持旧代码继续使用Redis，新功能使用MySQL

## 快速设置（5分钟）

### 1. 配置环境变量

编辑 `.env` 文件，添加以下配置：

```bash
# 设置为混合模式
DATABASE_TYPE=hybrid

# Redis配置（缓存和会话）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# MySQL配置（持久存储）
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=claude_relay_service
```

### 2. 初始化数据库

运行初始化命令：

```bash
# 初始化混合数据库（会同时设置Redis和MySQL）
npm run init:hybrid
```

这将自动：
- 创建MySQL数据库和表结构
- 测试Redis连接
- 创建默认管理员账户
- 设置必要的索引

### 3. 从现有系统迁移（可选）

如果您有现有的Redis或MySQL数据：

```bash
# 自动检测并迁移数据
npm run migrate:to-hybrid
```

### 4. 启动服务

```bash
# 启动服务
npm start

# 或使用后台模式
npm run service:start:daemon
```

### 5. 验证安装

访问管理界面：
```
http://localhost:3000/web
```

运行测试：
```bash
# 测试混合模式是否正常工作
npm run test:hybrid-mode
```

## 常用命令

| 命令 | 说明 |
|-----|------|
| `npm run init:hybrid` | 初始化混合数据库 |
| `npm run migrate:to-hybrid` | 迁移到混合模式 |
| `npm run test:hybrid-mode` | 测试混合模式 |
| `npm run rebuild:cache` | 重建Redis缓存 |

## 故障处理

### Redis连接失败
```bash
# 检查Redis是否运行
redis-cli ping

# 重启Redis
sudo service redis restart
```

### MySQL连接失败
```bash
# 检查MySQL是否运行
mysql -u root -p -e "SELECT 1"

# 重启MySQL
sudo service mysql restart
```

### 缓存不同步
```bash
# 重建所有缓存
npm run rebuild:cache
```

## 性能优化建议

1. **Redis内存设置**
   - 建议至少1GB内存
   - 设置 `maxmemory-policy allkeys-lru`

2. **MySQL优化**
   - 增加 `innodb_buffer_pool_size`
   - 启用查询缓存

3. **连接池配置**
   - MySQL: `MYSQL_CONNECTION_LIMIT=20`
   - Redis: 使用连接池复用

## 获取帮助

- 查看详细文档：[HYBRID_DATABASE.md](HYBRID_DATABASE.md)
- 查看日志：`logs/hybrid-*.log`
- 提交问题：[GitHub Issues](https://github.com/your-repo/issues)
