#!/usr/bin/env node
/**
 * Redis to MySQL 数据迁移脚本
 * 将现有Redis数据迁移到MySQL数据库
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const ora = require('ora')
const Redis = require('ioredis')
const mysql = require('mysql2/promise')
const config = require('../config/config')

class RedisMySQLMigration {
  constructor() {
    this.redis = null
    this.mysql = null
    this.stats = {
      apiKeys: 0,
      claudeAccounts: 0,
      geminiAccounts: 0,
      openaiAccounts: 0,
      droidAccounts: 0,
      usageStats: 0,
      costStats: 0,
      sessions: 0,
      errors: []
    }
  }

  async connectRedis() {
    const spinner = ora('连接到Redis...').start()
    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db
      })

      await this.redis.ping()
      spinner.succeed('Redis连接成功')
      return true
    } catch (error) {
      spinner.fail('Redis连接失败')
      console.error(chalk.red(error.message))
      return false
    }
  }

  async connectMySQL() {
    const spinner = ora('连接到MySQL...').start()
    try {
      this.mysql = await mysql.createPool({
        host: config.mysql?.host || config.database?.host || 'localhost',
        port: config.mysql?.port || config.database?.port || 3306,
        user: config.mysql?.user || config.database?.user || 'root',
        password: config.mysql?.password || config.database?.password || '',
        database: config.mysql?.database || config.database?.database || 'claude_relay_service',
        charset: 'utf8mb4',
        connectionLimit: 10,
        waitForConnections: true
      })

      const connection = await this.mysql.getConnection()
      await connection.ping()
      connection.release()

      spinner.succeed('MySQL连接成功')
      return true
    } catch (error) {
      spinner.fail('MySQL连接失败')
      console.error(chalk.red(error.message))
      return false
    }
  }

  async initializeDatabase() {
    const spinner = ora('初始化MySQL数据库结构...').start()
    try {
      // 读取并执行schema.sql
      const schemaPath = path.join(__dirname, '..', 'src', 'models', 'mysql', 'schema.sql')
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8')
        const statements = schema.split(';').filter((s) => s.trim())

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await this.mysql.query(statement)
            } catch (err) {
              // 忽略表已存在等错误
              if (!err.message.includes('already exists')) {
                console.error(chalk.yellow(`警告: ${err.message}`))
              }
            }
          }
        }
      }

      spinner.succeed('数据库结构初始化完成')
      return true
    } catch (error) {
      spinner.fail('数据库结构初始化失败')
      console.error(chalk.red(error.message))
      return false
    }
  }

  // 迁移API Keys
  async migrateApiKeys() {
    const spinner = ora('迁移API Keys...').start()
    try {
      const keys = await this.redis.keys('apikey:*')
      let migrated = 0

      for (const key of keys) {
        if (key === 'apikey:hash_map') {
          continue
        }

        const keyData = await this.redis.hgetall(key)
        if (!keyData || !Object.keys(keyData).length) {
          continue
        }

        const keyId = key.replace('apikey:', '')

        // 准备数据
        const apiKeyRecord = {
          id: keyId,
          name: keyData.name || 'Unnamed',
          description: keyData.description || null,
          api_key_hash: keyData.apiKey,
          token_limit: parseInt(keyData.tokenLimit) || 0,
          concurrency_limit: parseInt(keyData.concurrencyLimit) || 0,
          rate_limit_window: parseInt(keyData.rateLimitWindow) || 0,
          rate_limit_requests: parseInt(keyData.rateLimitRequests) || 0,
          rate_limit_cost: parseFloat(keyData.rateLimitCost) || 0,
          is_active: keyData.isActive === 'true',
          claude_account_id: keyData.claudeAccountId || null,
          claude_console_account_id: keyData.claudeConsoleAccountId || null,
          gemini_account_id: keyData.geminiAccountId || null,
          openai_account_id: keyData.openaiAccountId || null,
          azure_openai_account_id: keyData.azureOpenaiAccountId || null,
          bedrock_account_id: keyData.bedrockAccountId || null,
          droid_account_id: keyData.droidAccountId || null,
          permissions: keyData.permissions || 'all',
          enable_model_restriction: keyData.enableModelRestriction === 'true',
          restricted_models: keyData.restrictedModels || '[]',
          enable_client_restriction: keyData.enableClientRestriction === 'true',
          allowed_clients: keyData.allowedClients || '[]',
          daily_cost_limit: parseFloat(keyData.dailyCostLimit) || 0,
          total_cost_limit: parseFloat(keyData.totalCostLimit) || 0,
          weekly_opus_cost_limit: parseFloat(keyData.weeklyOpusCostLimit) || 0,
          tags: keyData.tags || '[]',
          activation_days: parseInt(keyData.activationDays) || 0,
          activation_unit: keyData.activationUnit || 'days',
          expiration_mode: keyData.expirationMode || 'fixed',
          is_activated: keyData.isActivated === 'true',
          activated_at: keyData.activatedAt ? new Date(keyData.activatedAt) : null,
          expires_at: keyData.expiresAt ? new Date(keyData.expiresAt) : null,
          created_by: keyData.createdBy || 'admin',
          user_id: keyData.userId || null,
          user_username: keyData.userUsername || null,
          icon: keyData.icon || null,
          created_at: keyData.createdAt ? new Date(keyData.createdAt) : new Date(),
          last_used_at: keyData.lastUsedAt ? new Date(keyData.lastUsedAt) : null
        }

        // 插入到MySQL
        await this.mysql.query(
          'INSERT INTO api_keys SET ? ON DUPLICATE KEY UPDATE id = id',
          apiKeyRecord
        )
        migrated++
      }

      this.stats.apiKeys = migrated
      spinner.succeed(`API Keys迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('API Keys迁移失败')
      this.stats.errors.push(`API Keys: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  // 迁移Claude账户
  async migrateClaudeAccounts() {
    const spinner = ora('迁移Claude账户...').start()
    try {
      const keys = await this.redis.keys('claude_account:*')
      let migrated = 0

      for (const key of keys) {
        const accountData = await this.redis.hgetall(key)
        if (!accountData || !Object.keys(accountData).length) {
          continue
        }

        const accountId = key.replace('claude_account:', '')

        // 准备数据
        const accountRecord = {
          id: accountId,
          name: accountData.name || 'Unnamed',
          email: accountData.email || null,
          claude_ai_oauth: accountData.claudeAiOauth
            ? this.encrypt(accountData.claudeAiOauth)
            : null,
          proxy_config: accountData.proxy
            ? JSON.stringify(JSON.parse(accountData.proxy || '{}'))
            : '{}',
          is_active: accountData.isActive === 'true',
          status: accountData.status || 'active',
          priority: parseInt(accountData.priority) || 1,
          expires_at: accountData.expiresAt ? new Date(accountData.expiresAt) : null,
          last_refreshed_at: accountData.lastRefreshedAt
            ? new Date(accountData.lastRefreshedAt)
            : null,
          created_at: accountData.createdAt ? new Date(accountData.createdAt) : new Date()
        }

        // 插入到MySQL
        await this.mysql.query(
          'INSERT INTO claude_accounts SET ? ON DUPLICATE KEY UPDATE id = id',
          accountRecord
        )
        migrated++
      }

      this.stats.claudeAccounts = migrated
      spinner.succeed(`Claude账户迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('Claude账户迁移失败')
      this.stats.errors.push(`Claude账户: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  async migrateGeminiAccounts() {
    const spinner = ora('迁移Gemini账户...').start()
    try {
      const keys = await this.redis.keys('gemini_account:*')
      let migrated = 0

      for (const key of keys) {
        const accountData = await this.redis.hgetall(key)
        if (!accountData || !Object.keys(accountData).length) {
          continue
        }

        const accountId = key.replace('gemini_account:', '')
        const record = {
          id: accountId,
          name: accountData.name || 'Unnamed',
          email: accountData.email || null,
          status: accountData.status || 'active',
          account_type: accountData.accountType || 'shared',
          schedulable: accountData.schedulable !== 'false',
          expires_at: accountData.expiresAt ? new Date(accountData.expiresAt) : null,
          last_refreshed_at: accountData.lastRefresh ? new Date(accountData.lastRefresh) : null,
          data: JSON.stringify(accountData)
        }

        await this.mysql.query(
          `INSERT INTO gemini_accounts (id, name, email, status, account_type, schedulable, expires_at, last_refreshed_at, data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             email = VALUES(email),
             status = VALUES(status),
             account_type = VALUES(account_type),
             schedulable = VALUES(schedulable),
             expires_at = VALUES(expires_at),
             last_refreshed_at = VALUES(last_refreshed_at),
             data = VALUES(data)`,
          [
            record.id,
            record.name,
            record.email,
            record.status,
            record.account_type,
            record.schedulable,
            record.expires_at,
            record.last_refreshed_at,
            record.data
          ]
        )
        migrated++
      }

      this.stats.geminiAccounts = migrated
      spinner.succeed(`Gemini账户迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('Gemini账户迁移失败')
      this.stats.errors.push(`Gemini账户: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  async migrateOpenAiAccounts() {
    const spinner = ora('迁移OpenAI账户...').start()
    try {
      const keys = await this.redis.keys('openai:account:*')
      let migrated = 0

      for (const key of keys) {
        const accountData = await this.redis.hgetall(key)
        if (!accountData || !Object.keys(accountData).length) {
          continue
        }

        const accountId = key.replace('openai:account:', '')
        const record = {
          id: accountId,
          name: accountData.name || 'Unnamed',
          account_type: accountData.accountType || 'shared',
          status: accountData.status || 'active',
          is_active: accountData.isActive !== 'false',
          schedulable: accountData.schedulable !== 'false',
          priority: parseInt(accountData.priority) || 50,
          group_id: accountData.groupId || null,
          subscription_expires_at: accountData.subscriptionExpiresAt
            ? new Date(accountData.subscriptionExpiresAt)
            : null,
          last_refresh: accountData.lastRefresh ? new Date(accountData.lastRefresh) : null,
          data: JSON.stringify(accountData)
        }

        await this.mysql.query(
          `INSERT INTO openai_accounts (id, name, account_type, status, is_active, schedulable, priority, group_id, subscription_expires_at, last_refresh, data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             account_type = VALUES(account_type),
             status = VALUES(status),
             is_active = VALUES(is_active),
             schedulable = VALUES(schedulable),
             priority = VALUES(priority),
             group_id = VALUES(group_id),
             subscription_expires_at = VALUES(subscription_expires_at),
             last_refresh = VALUES(last_refresh),
             data = VALUES(data)`,
          [
            record.id,
            record.name,
            record.account_type,
            record.status,
            record.is_active,
            record.schedulable,
            record.priority,
            record.group_id,
            record.subscription_expires_at,
            record.last_refresh,
            record.data
          ]
        )
        migrated++
      }

      this.stats.openaiAccounts = migrated
      spinner.succeed(`OpenAI账户迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('OpenAI账户迁移失败')
      this.stats.errors.push(`OpenAI账户: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  async migrateDroidAccounts() {
    const spinner = ora('迁移Droid账户...').start()
    try {
      const keys = await this.redis.keys('droid:account:*')
      let migrated = 0

      for (const key of keys) {
        const accountData = await this.redis.hgetall(key)
        if (!accountData || !Object.keys(accountData).length) {
          continue
        }

        const accountId = key.replace('droid:account:', '')
        const record = {
          id: accountId,
          name: accountData.name || 'Unnamed',
          status: accountData.status || 'active',
          is_active: accountData.isActive !== 'false',
          data: JSON.stringify(accountData)
        }

        await this.mysql.query(
          `INSERT INTO droid_accounts (id, name, status, is_active, data)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             status = VALUES(status),
             is_active = VALUES(is_active),
             data = VALUES(data)`,
          [record.id, record.name, record.status, record.is_active, record.data]
        )
        migrated++
      }

      this.stats.droidAccounts = migrated
      spinner.succeed(`Droid账户迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('Droid账户迁移失败')
      this.stats.errors.push(`Droid账户: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  // 迁移使用统计
  async migrateUsageStats() {
    const spinner = ora('迁移使用统计...').start()
    try {
      // 迁移每日统计
      const dailyKeys = await this.redis.keys('usage:daily:*')

      let migrated = 0

      // 处理每日统计
      for (const key of dailyKeys) {
        const parts = key.split(':')
        if (parts.length >= 4) {
          const apiKeyId = parts[2]
          const statDate = parts[3]

          const data = await this.redis.hgetall(key)
          if (!data || !Object.keys(data).length) {
            continue
          }

          const statRecord = {
            api_key_id: apiKeyId,
            account_type: 'api_key',
            model: 'unknown',
            stat_date: statDate,
            stat_hour: null,
            stat_month: statDate.substring(0, 7),
            total_tokens: parseInt(data.tokens || data.allTokens) || 0,
            input_tokens: parseInt(data.inputTokens) || 0,
            output_tokens: parseInt(data.outputTokens) || 0,
            cache_create_tokens: parseInt(data.cacheCreateTokens) || 0,
            cache_read_tokens: parseInt(data.cacheReadTokens) || 0,
            ephemeral_5m_tokens: parseInt(data.ephemeral5mTokens) || 0,
            ephemeral_1h_tokens: parseInt(data.ephemeral1hTokens) || 0,
            long_context_input_tokens: parseInt(data.longContextInputTokens) || 0,
            long_context_output_tokens: parseInt(data.longContextOutputTokens) || 0,
            long_context_requests: parseInt(data.longContextRequests) || 0,
            requests: parseInt(data.requests) || 0
          }

          await this.mysql.query(
            'INSERT INTO usage_stats SET ? ON DUPLICATE KEY UPDATE ' +
              'total_tokens = total_tokens + VALUES(total_tokens), ' +
              'input_tokens = input_tokens + VALUES(input_tokens), ' +
              'output_tokens = output_tokens + VALUES(output_tokens), ' +
              'requests = requests + VALUES(requests)',
            statRecord
          )
          migrated++
        }
      }

      this.stats.usageStats = migrated
      spinner.succeed(`使用统计迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('使用统计迁移失败')
      this.stats.errors.push(`使用统计: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  // 迁移费用统计
  async migrateCostStats() {
    const spinner = ora('迁移费用统计...').start()
    try {
      const costKeys = await this.redis.keys('usage:cost:*')
      let migrated = 0

      for (const key of costKeys) {
        const parts = key.split(':')
        if (parts.length >= 5) {
          const costType = parts[2] // daily, monthly, hourly, total
          const apiKeyId = parts[3]
          const costDate = parts[4] || 'all'

          const amount = await this.redis.get(key)
          if (!amount) {
            continue
          }

          await this.mysql.query(
            'INSERT INTO cost_stats (api_key_id, cost_type, cost_date, amount) ' +
              'VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)',
            [apiKeyId, costType, costDate, parseFloat(amount) || 0]
          )
          migrated++
        }
      }

      this.stats.costStats = migrated
      spinner.succeed(`费用统计迁移完成 (${migrated}条)`)
    } catch (error) {
      spinner.fail('费用统计迁移失败')
      this.stats.errors.push(`费用统计: ${error.message}`)
      console.error(chalk.red(error.message))
    }
  }

  // 加密函数
  encrypt(text) {
    if (!text) {
      return null
    }
    const crypto = require('crypto')
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(
      config.security.encryptionKey || 'default-key-32-chars-for-testing',
      'utf8'
    ).slice(0, 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()

    return JSON.stringify({
      encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex')
    })
  }

  async run() {
    console.log(chalk.blue.bold('\n🚀 Redis到MySQL数据迁移工具\n'))

    // 连接数据库
    if (!(await this.connectRedis())) {
      return
    }
    if (!(await this.connectMySQL())) {
      return
    }

    // 初始化数据库结构
    if (!(await this.initializeDatabase())) {
      return
    }

    console.log(chalk.yellow('\n开始数据迁移...\n'))

    // 执行各项迁移任务
    await this.migrateApiKeys()
    await this.migrateClaudeAccounts()
    await this.migrateGeminiAccounts()
    await this.migrateOpenAiAccounts()
    await this.migrateDroidAccounts()
    await this.migrateUsageStats()
    await this.migrateCostStats()

    // 显示迁移结果
    console.log(chalk.green.bold('\n✅ 数据迁移完成！\n'))
    console.log(chalk.cyan('迁移统计：'))
    console.log(`  API Keys: ${this.stats.apiKeys}条`)
    console.log(`  Claude账户: ${this.stats.claudeAccounts}条`)
    console.log(`  Gemini账户: ${this.stats.geminiAccounts}条`)
    console.log(`  OpenAI账户: ${this.stats.openaiAccounts}条`)
    console.log(`  Droid账户: ${this.stats.droidAccounts}条`)
    console.log(`  使用统计: ${this.stats.usageStats}条`)
    console.log(`  费用统计: ${this.stats.costStats}条`)

    if (this.stats.errors.length > 0) {
      console.log(chalk.red('\n错误列表：'))
      this.stats.errors.forEach((err) => console.log(`  - ${err}`))
    }

    // 关闭连接
    if (this.redis) {
      this.redis.disconnect()
    }
    if (this.mysql) {
      await this.mysql.end()
    }

    process.exit(0)
  }
}

// 执行迁移
const migration = new RedisMySQLMigration()
migration.run().catch((error) => {
  console.error(chalk.red('迁移失败：'), error)
  process.exit(1)
})
