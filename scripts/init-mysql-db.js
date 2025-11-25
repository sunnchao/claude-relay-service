#!/usr/bin/env node

/**
 * MySQL 数据库初始化脚本
 * 创建请求日志和响应日志表
 */

const mysql = require('mysql2/promise')
const chalk = require('chalk')
const config = require('../config/config')

// SQL 创建表语句
const createRequestLogsTable = `
CREATE TABLE IF NOT EXISTS request_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL UNIQUE COMMENT '请求唯一标识',
  api_key_id VARCHAR(64) DEFAULT NULL COMMENT 'API Key ID',
  api_key_name VARCHAR(255) DEFAULT NULL COMMENT 'API Key 名称',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID',
  account_id VARCHAR(64) DEFAULT NULL COMMENT '账户ID',
  account_type VARCHAR(32) DEFAULT NULL COMMENT '账户类型',
  model VARCHAR(128) DEFAULT NULL COMMENT '使用的模型',
  endpoint VARCHAR(255) DEFAULT NULL COMMENT '请求端点',
  method VARCHAR(10) DEFAULT NULL COMMENT 'HTTP 方法',
  user_agent TEXT DEFAULT NULL COMMENT '客户端 User-Agent',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT '客户端 IP 地址',
  request_headers JSON DEFAULT NULL COMMENT '请求头（JSON格式）',
  request_body LONGTEXT DEFAULT NULL COMMENT '请求体（JSON格式）',
  request_timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '请求时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  INDEX idx_api_key_id (api_key_id),
  INDEX idx_user_id (user_id),
  INDEX idx_account_id (account_id),
  INDEX idx_model (model),
  INDEX idx_request_timestamp (request_timestamp),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 请求日志表';
`

const createResponseLogsTable = `
CREATE TABLE IF NOT EXISTS response_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL COMMENT '请求唯一标识，关联 request_logs.request_id',
  status_code INT DEFAULT NULL COMMENT 'HTTP 状态码',
  response_headers JSON DEFAULT NULL COMMENT '响应头（JSON格式）',
  response_body LONGTEXT DEFAULT NULL COMMENT '响应体（JSON格式或文本）',
  response_timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '响应时间',
  duration_ms INT DEFAULT NULL COMMENT '请求处理时长（毫秒）',
  error_message TEXT DEFAULT NULL COMMENT '错误信息（如果有）',
  is_stream BOOLEAN DEFAULT FALSE COMMENT '是否为流式响应',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  INDEX idx_request_id (request_id),
  INDEX idx_status_code (status_code),
  INDEX idx_response_timestamp (response_timestamp),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 响应日志表';
`

const createUsageLogsTable = `
CREATE TABLE IF NOT EXISTS usage_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL COMMENT '请求唯一标识，关联 request_logs.request_id',
  api_key_id VARCHAR(64) DEFAULT NULL COMMENT 'API Key ID',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID',
  account_id VARCHAR(64) DEFAULT NULL COMMENT '账户ID',
  account_type VARCHAR(32) DEFAULT NULL COMMENT '账户类型',
  model VARCHAR(128) DEFAULT NULL COMMENT '使用的模型',
  input_tokens INT DEFAULT 0 COMMENT '输入 tokens',
  output_tokens INT DEFAULT 0 COMMENT '输出 tokens',
  cache_create_tokens INT DEFAULT 0 COMMENT '缓存创建 tokens',
  cache_read_tokens INT DEFAULT 0 COMMENT '缓存读取 tokens',
  ephemeral_5m_tokens INT DEFAULT 0 COMMENT '5分钟临时缓存 tokens',
  ephemeral_1h_tokens INT DEFAULT 0 COMMENT '1小时临时缓存 tokens',
  total_tokens INT DEFAULT 0 COMMENT '总 tokens',
  cost DECIMAL(12, 6) DEFAULT 0 COMMENT '总成本',
  cost_breakdown JSON DEFAULT NULL COMMENT '成本明细（JSON格式）',
  is_long_context BOOLEAN DEFAULT FALSE COMMENT '是否为长上下文请求',
  usage_timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '使用统计时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  INDEX idx_request_id (request_id),
  INDEX idx_api_key_id (api_key_id),
  INDEX idx_user_id (user_id),
  INDEX idx_account_id (account_id),
  INDEX idx_model (model),
  INDEX idx_usage_timestamp (usage_timestamp),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 使用统计日志表';
`

const createApiKeysTable = `
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(64) PRIMARY KEY COMMENT 'API Key ID',
  name VARCHAR(255) NOT NULL COMMENT 'API Key 名称',
  description TEXT DEFAULT NULL COMMENT '描述',
  api_key_hash VARCHAR(255) NOT NULL COMMENT 'API Key 哈希值',
  token_limit BIGINT DEFAULT 0 COMMENT 'Token 限制',
  concurrency_limit INT DEFAULT 0 COMMENT '并发限制',
  rate_limit_window INT DEFAULT 0 COMMENT '速率限制窗口(分钟)',
  rate_limit_requests INT DEFAULT 0 COMMENT '速率限制请求数',
  rate_limit_cost DECIMAL(12, 6) DEFAULT 0 COMMENT '速率限制费用',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
  claude_account_id VARCHAR(64) DEFAULT NULL COMMENT 'Claude 账户ID',
  claude_console_account_id VARCHAR(64) DEFAULT NULL COMMENT 'Claude Console 账户ID',
  gemini_account_id VARCHAR(64) DEFAULT NULL COMMENT 'Gemini 账户ID',
  openai_account_id VARCHAR(64) DEFAULT NULL COMMENT 'OpenAI 账户ID',
  azure_openai_account_id VARCHAR(64) DEFAULT NULL COMMENT 'Azure OpenAI 账户ID',
  bedrock_account_id VARCHAR(64) DEFAULT NULL COMMENT 'Bedrock 账户ID',
  droid_account_id VARCHAR(64) DEFAULT NULL COMMENT 'Droid 账户ID',
  permissions VARCHAR(255) DEFAULT 'all' COMMENT '权限',
  enable_model_restriction BOOLEAN DEFAULT FALSE COMMENT '是否启用模型限制',
  restricted_models JSON DEFAULT NULL COMMENT '限制的模型列表',
  enable_client_restriction BOOLEAN DEFAULT FALSE COMMENT '是否启用客户端限制',
  allowed_clients JSON DEFAULT NULL COMMENT '允许的客户端列表',
  daily_cost_limit DECIMAL(12, 6) DEFAULT 0 COMMENT '每日费用限制',
  total_cost_limit DECIMAL(12, 6) DEFAULT 0 COMMENT '总费用限制',
  weekly_opus_cost_limit DECIMAL(12, 6) DEFAULT 0 COMMENT '每周 Opus 费用限制',
  tags JSON DEFAULT NULL COMMENT '标签',
  activation_days INT DEFAULT 0 COMMENT '激活后有效天数',
  activation_unit VARCHAR(10) DEFAULT 'days' COMMENT '激活时间单位',
  expiration_mode VARCHAR(20) DEFAULT 'fixed' COMMENT '过期模式',
  is_activated BOOLEAN DEFAULT FALSE COMMENT '是否已激活',
  activated_at DATETIME DEFAULT NULL COMMENT '激活时间',
  expires_at DATETIME DEFAULT NULL COMMENT '过期时间',
  created_by VARCHAR(64) DEFAULT 'admin' COMMENT '创建者',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID',
  user_username VARCHAR(255) DEFAULT NULL COMMENT '用户名',
  icon TEXT DEFAULT NULL COMMENT '图标',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  last_used_at DATETIME DEFAULT NULL COMMENT '最后使用时间',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否已删除',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
  deleted_by VARCHAR(64) DEFAULT NULL COMMENT '删除者',
  deleted_by_type VARCHAR(20) DEFAULT NULL COMMENT '删除者类型',
  INDEX idx_api_key_hash (api_key_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Keys 表';
`

const createAccountsTable = `
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY COMMENT '账户ID',
  platform VARCHAR(32) NOT NULL COMMENT '平台类型 (claude, openai, gemini, etc.)',
  name VARCHAR(255) NOT NULL COMMENT '账户名称',
  description TEXT DEFAULT NULL COMMENT '描述',
  email VARCHAR(255) DEFAULT NULL COMMENT '邮箱',
  password TEXT DEFAULT NULL COMMENT '密码(加密)',
  access_token TEXT DEFAULT NULL COMMENT 'Access Token(加密)',
  refresh_token TEXT DEFAULT NULL COMMENT 'Refresh Token(加密)',
  id_token TEXT DEFAULT NULL COMMENT 'ID Token(加密)',
  session_key TEXT DEFAULT NULL COMMENT 'Session Key(加密)',
  oauth_data TEXT DEFAULT NULL COMMENT 'OAuth 数据(加密)',
  proxy TEXT DEFAULT NULL COMMENT '代理配置',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
  status VARCHAR(32) DEFAULT 'active' COMMENT '状态',
  error_message TEXT DEFAULT NULL COMMENT '错误信息',
  account_type VARCHAR(32) DEFAULT 'shared' COMMENT '账户类型 (shared, dedicated, group)',
  priority INT DEFAULT 50 COMMENT '优先级',
  schedulable BOOLEAN DEFAULT TRUE COMMENT '是否可调度',
  auto_stop_on_warning BOOLEAN DEFAULT FALSE COMMENT '警告时自动停止',
  use_unified_user_agent BOOLEAN DEFAULT FALSE COMMENT '使用统一 User-Agent',
  use_unified_client_id BOOLEAN DEFAULT FALSE COMMENT '使用统一 Client ID',
  unified_client_id VARCHAR(255) DEFAULT NULL COMMENT '统一 Client ID',
  subscription_info TEXT DEFAULT NULL COMMENT '订阅信息',
  subscription_expires_at DATETIME DEFAULT NULL COMMENT '订阅过期时间',
  ext_info TEXT DEFAULT NULL COMMENT '扩展信息',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  last_used_at DATETIME DEFAULT NULL COMMENT '最后使用时间',
  last_refresh_at DATETIME DEFAULT NULL COMMENT '最后刷新时间',
  INDEX idx_platform (platform),
  INDEX idx_is_active (is_active),
  INDEX idx_status (status),
  INDEX idx_account_type (account_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账户表';
`

async function initializeDatabase() {
  let connection = null

  try {
    console.log(chalk.blue('🔧 Initializing MySQL database...'))
    console.log(
      chalk.gray(
        `   Connecting to: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`
      )
    )

    // 创建连接
    connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      multipleStatements: true
    })

    // 创建数据库（如果不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``)
    console.log(chalk.green(`✅ Database '${config.mysql.database}' created or already exists`))

    // 选择数据库
    await connection.query(`USE \`${config.mysql.database}\``)

    // 创建请求日志表
    console.log(chalk.blue('📝 Creating request_logs table...'))
    await connection.query(createRequestLogsTable)
    console.log(chalk.green('✅ request_logs table ready'))

    // 创建响应日志表
    console.log(chalk.blue('📝 Creating response_logs table...'))
    await connection.query(createResponseLogsTable)
    console.log(chalk.green('✅ response_logs table ready'))

    // 创建使用统计日志表
    console.log(chalk.blue('📝 Creating usage_logs table...'))
    await connection.query(createUsageLogsTable)
    console.log(chalk.green('✅ usage_logs table ready'))

    // 创建 API Keys 表
    console.log(chalk.blue('📝 Creating api_keys table...'))
    await connection.query(createApiKeysTable)
    console.log(chalk.green('✅ api_keys table ready'))

    // 创建账户表
    console.log(chalk.blue('📝 Creating accounts table...'))
    await connection.query(createAccountsTable)
    console.log(chalk.green('✅ accounts table ready'))

    console.log(chalk.green('\n✨ Database initialization completed successfully!'))
    console.log(chalk.gray('\n📊 Created tables:'))
    console.log(chalk.gray('   - request_logs: API 请求日志'))
    console.log(chalk.gray('   - response_logs: API 响应日志'))
    console.log(chalk.gray('   - usage_logs: API 使用统计日志'))
    console.log(chalk.gray('   - api_keys: API Keys 表'))
    console.log(chalk.gray('   - accounts: 账户表'))
  } catch (error) {
    console.error(chalk.red('\n❌ Error initializing database:'))
    console.error(chalk.red(error.message))
    if (error.sqlMessage) {
      console.error(chalk.red('SQL Error:'), error.sqlMessage)
    }
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error(chalk.red('Unexpected error:'), error)
      process.exit(1)
    })
}

module.exports = { initializeDatabase }
