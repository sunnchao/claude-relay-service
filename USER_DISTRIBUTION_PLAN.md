# 用户分发功能开发计划

## 项目概述

### 目标
构建一个面向终端用户的分发系统，允许用户自由注册、创建API Key，并通过这些Key访问Claude Code或Codex等AI服务。

### 核心原则
- **低耦合**: 新功能与现有管理系统分离，独立的目录结构
- **高安全性**: 用户间数据隔离，完善的权限控制
- **可扩展性**: 支持未来添加更多AI服务
- **用户友好**: 简洁的注册流程和直观的界面

## 架构设计

### 系统架构
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Client SPA     │────▶│  Client API     │────▶│  AI Services    │
│  (Vue3)         │     │  (Express)      │     │  (Claude/Codex) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        ▲
        │                        │                        │
        ▼                        ▼                        │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Auth      │     │  Redis Store    │     │  Relay Core     │
│  (JWT)          │     │  (User Data)    │     │  (Existing)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 目录结构
```
claude-relay-service/
├── client-spa/                 # 用户端前端应用
│   ├── src/
│   │   ├── views/             # 页面组件
│   │   ├── components/        # 通用组件
│   │   ├── stores/            # Pinia状态管理
│   │   ├── api/              # API请求封装
│   │   ├── router/           # 路由配置
│   │   └── utils/            # 工具函数
│   ├── public/
│   └── package.json
│
├── src/client-api/            # 用户端后端服务
│   ├── routes/               # 路由定义
│   │   ├── auth.js          # 认证相关
│   │   ├── users.js         # 用户管理
│   │   ├── keys.js          # API Key管理
│   │   └── relay.js         # 请求转发
│   ├── services/            # 业务逻辑
│   │   ├── userService.js
│   │   ├── keyService.js
│   │   ├── billingService.js
│   │   └── relayService.js
│   ├── middleware/          # 中间件
│   │   ├── clientAuth.js
│   │   ├── rateLimiter.js
│   │   └── usageTracker.js
│   └── models/              # 数据模型
│       ├── clientUser.js
│       └── clientKey.js
│
└── config/
    └── client-config.js      # 客户端配置
```

## 数据模型设计

### 用户模型 (client_user)
```javascript
{
  id: 'cu_<uuid>',
  email: 'user@example.com',
  username: 'username',
  passwordHash: 'hashed_password',
  status: 'active|suspended|deleted',
  emailVerified: false,
  verificationToken: 'token',
  resetPasswordToken: 'token',
  plan: 'free|basic|pro',
  balance: 0.00,  // 预付费余额
  usage: {
    monthly: 0,
    total: 0
  },
  settings: {
    notifications: true,
    twoFactorEnabled: false
  },
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
  lastLoginAt: 'timestamp'
}
```

### API Key模型 (client_key)
```javascript
{
  id: 'ck_<uuid>',
  userId: 'cu_<uuid>',
  key: 'cuk_<random_string>',  // Client User Key前缀
  keyHash: 'hashed_key',
  name: 'My API Key',
  description: 'Key for my project',
  permissions: ['claude', 'codex'],
  rateLimit: {
    rpm: 60,      // 每分钟请求数
    rpd: 10000,   // 每日请求数
    tpm: 1000000  // 每月token数
  },
  usage: {
    requests: 0,
    tokens: 0,
    lastUsedAt: 'timestamp'
  },
  status: 'active|suspended|revoked',
  expiresAt: 'timestamp',
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
}
```

### 使用记录模型 (client_usage)
```javascript
{
  id: 'usage_<uuid>',
  userId: 'cu_<uuid>',
  keyId: 'ck_<uuid>',
  service: 'claude|codex',
  model: 'model_name',
  endpoint: '/api/v1/messages',
  requestId: 'req_<uuid>',
  tokens: {
    input: 0,
    output: 0,
    total: 0
  },
  cost: 0.00,
  duration: 0,  // 毫秒
  status: 'success|failed',
  error: null,
  metadata: {},
  timestamp: 'timestamp'
}
```

## API接口设计

### 认证接口
```
POST   /api/client/auth/register     # 用户注册
POST   /api/client/auth/login        # 用户登录
POST   /api/client/auth/logout       # 用户登出
POST   /api/client/auth/refresh      # 刷新Token
POST   /api/client/auth/verify-email # 邮箱验证
POST   /api/client/auth/reset-password # 重置密码
```

### 用户管理接口
```
GET    /api/client/users/profile     # 获取个人信息
PUT    /api/client/users/profile     # 更新个人信息
DELETE /api/client/users/account     # 删除账号
GET    /api/client/users/usage       # 获取使用统计
GET    /api/client/users/billing     # 获取账单信息
```

### API Key管理接口
```
GET    /api/client/keys              # 获取Key列表
POST   /api/client/keys              # 创建新Key
GET    /api/client/keys/:id          # 获取Key详情
PUT    /api/client/keys/:id          # 更新Key配置
DELETE /api/client/keys/:id          # 删除Key
POST   /api/client/keys/:id/regenerate # 重新生成Key
GET    /api/client/keys/:id/usage    # 获取Key使用统计
```

### AI服务转发接口
```
POST   /api/client/v1/messages       # Claude消息接口
POST   /api/client/v1/completions    # Codex补全接口
GET    /api/client/v1/models         # 获取可用模型
```

## 功能实现步骤

### 第一阶段：基础架构搭建
- [x] 创建任务文档
- [ ] 创建目录结构
- [ ] 初始化客户端前端项目 (Vue3 + Vite)
- [ ] 设置客户端API服务基础框架
- [ ] 配置Redis数据模型

### 第二阶段：用户系统
- [ ] 实现用户注册功能
  - [ ] 邮箱验证
  - [ ] 密码强度检查
  - [ ] 防机器人验证
- [ ] 实现用户登录/登出
  - [ ] JWT认证
  - [ ] Remember Me功能
  - [ ] 登录日志记录
- [ ] 实现密码重置功能
- [ ] 用户资料管理

### 第三阶段：API Key管理
- [ ] Key生成和存储
  - [ ] 安全的Key生成算法
  - [ ] Key哈希存储
- [ ] Key权限管理
  - [ ] 服务访问权限
  - [ ] 速率限制配置
- [ ] Key使用统计
  - [ ] 实时统计更新
  - [ ] 历史数据查询

### 第四阶段：请求转发系统
- [ ] 请求认证中间件
  - [ ] Key验证
  - [ ] 权限检查
- [ ] 请求转发逻辑
  - [ ] 路由到对应AI服务
  - [ ] 请求/响应转换
- [ ] 流式响应支持
- [ ] 错误处理和重试机制

### 第五阶段：计费和限流
- [ ] 使用量追踪
  - [ ] Token计数
  - [ ] 请求计数
- [ ] 速率限制实现
  - [ ] 滑动窗口算法
  - [ ] 分布式限流
- [ ] 计费系统
  - [ ] 使用量计算
  - [ ] 账单生成

### 第六阶段：前端界面
- [ ] 登录/注册页面
- [ ] 用户仪表板
  - [ ] 使用统计图表
  - [ ] 快速操作面板
- [ ] API Key管理界面
  - [ ] Key列表和搜索
  - [ ] Key详情和配置
- [ ] 使用文档页面
- [ ] 账单和充值页面

### 第七阶段：优化和安全
- [ ] 性能优化
  - [ ] 缓存策略
  - [ ] 数据库索引
- [ ] 安全加固
  - [ ] SQL注入防护
  - [ ] XSS防护
  - [ ] CSRF防护
- [ ] 监控和日志
  - [ ] 错误追踪
  - [ ] 性能监控
- [ ] 单元测试和集成测试

## 技术栈

### 前端 (client-spa)
- Vue 3.x
- Vite
- Vue Router
- Pinia
- Axios
- TailwindCSS
- Chart.js (统计图表)
- DaisyUI (UI组件库)

### 后端 (client-api)
- Node.js + Express
- Redis (数据存储)
- JWT (认证)
- Bcrypt (密码加密)
- Rate-limiter-flexible (限流)
- Winston (日志)
- Joi (参数验证)

## 安全考虑

1. **数据隔离**: 用户数据完全隔离，使用独立的Redis键前缀
2. **密码安全**: Bcrypt加密，强密码策略
3. **API Key安全**:
   - 生成后只显示一次
   - 存储哈希值而非明文
   - 支持Key轮换
4. **速率限制**: 多层级限流策略
5. **输入验证**: 所有输入严格验证
6. **审计日志**: 关键操作记录

## 部署考虑

1. **独立部署**: 客户端API可独立部署和扩展
2. **负载均衡**: 支持水平扩展
3. **缓存策略**: Redis缓存热数据
4. **监控告警**: 完善的监控体系
5. **备份策略**: 定期数据备份

## 开发优先级

1. **P0 - 核心功能**
   - 用户注册/登录
   - API Key创建和验证
   - 基础请求转发

2. **P1 - 重要功能**
   - 使用统计
   - 速率限制
   - 基础前端界面

3. **P2 - 增强功能**
   - 计费系统
   - 高级统计
   - 文档中心

4. **P3 - 优化功能**
   - 性能优化
   - 高级安全特性
   - 监控集成

## 注意事项

1. 保持与现有系统的独立性，避免代码耦合
2. 使用独立的Redis键空间，避免数据冲突
3. API路径使用 `/api/client/` 前缀，与管理端区分
4. 前端项目独立构建和部署
5. 保持代码风格一致性
6. 完善的错误处理和日志记录
7. 考虑国际化支持
8. 移动端响应式设计

## 成功指标

- 用户注册转化率 > 50%
- API调用成功率 > 99.9%
- 平均响应时间 < 200ms
- 系统可用性 > 99.95%
- 用户满意度 > 4.5/5

## 时间估算

- 第一阶段：1天
- 第二阶段：2天
- 第三阶段：2天
- 第四阶段：2天
- 第五阶段：2天
- 第六阶段：3天
- 第七阶段：2天

总计：约14天完成MVP版本

---

**下一步行动**：
1. 确认任务文档内容
2. 开始创建目录结构
3. 初始化前后端项目