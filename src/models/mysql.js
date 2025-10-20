const mysql = require('mysql2/promise')
const crypto = require('crypto')
const config = require('../../config/config')
const logger = require('../utils/logger')
const CostCalculator = require('../utils/costCalculator')

class MySQLClient {
  constructor() {
    this.pool = null
    this.isConnected = false
  }

  _parseJson(value, fallback = null) {
    if (value === null || value === undefined) {
      return fallback
    }

    if (typeof value === 'object') {
      return value
    }

    try {
      return JSON.parse(value)
    } catch (error) {
      logger.debug('Failed to parse JSON payload:', error)
      return fallback
    }
  }

  _stringifyJson(value) {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'string') {
      return value
    }

    try {
      return JSON.stringify(value)
    } catch (error) {
      logger.debug('Failed to stringify JSON payload:', error)
      return null
    }
  }

  _boolFromMixed(value, defaultValue = false) {
    if (value === null || value === undefined) {
      return defaultValue
    }

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'number') {
      return value !== 0
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      return lower === '1' || lower === 'true' || lower === 'yes'
    }

    return defaultValue
  }

  async connect() {
    try {
      // 创建连接池配置
      const poolConfig = {
        host: config.mysql?.host || config.database?.host || 'localhost',
        port: config.mysql?.port || config.database?.port || 3306,
        user: config.mysql?.user || config.database?.user || 'root',
        password: config.mysql?.password || config.database?.password || '',
        database: config.mysql?.database || config.database?.database || 'claude_relay_service',
        charset: 'utf8mb4',
        timezone: '+08:00',
        connectionLimit: config.mysql?.connectionLimit || 10,
        queueLimit: config.mysql?.queueLimit || 0,
        waitForConnections: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // 添加SSL配置支持
        ssl: config.mysql?.ssl || false
      }

      // 创建连接池
      this.pool = await mysql.createPool(poolConfig)

      // 测试连接
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()

      this.isConnected = true
      logger.info('🔗 MySQL connected successfully')

      // 初始化表结构（如果需要）
      await this.initializeTables()

      return this.pool
    } catch (error) {
      logger.error('💥 Failed to connect to MySQL:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end()
      this.isConnected = false
      logger.info('👋 MySQL disconnected')
    }
  }

  getPool() {
    if (!this.pool || !this.isConnected) {
      logger.warn('⚠️ MySQL pool is not connected')
      return null
    }
    return this.pool
  }

  getPoolSafe() {
    if (!this.pool || !this.isConnected) {
      throw new Error('MySQL pool is not connected')
    }
    return this.pool
  }

  getClient() {
    if (!this.pool || !this.isConnected) {
      logger.warn('⚠️ MySQL client is not connected')
      return null
    }

    return {
      get: (key) => this.get(key),
      set: (key, value, ...args) => this.set(key, value, ...args),
      setex: (key, ttl, value) => this.setex(key, ttl, value),
      del: (...keys) => this.del(...keys),
      keys: (pattern) => this.keys(pattern),
      incr: (key) => this.incr(key),
      incrby: (key, amount) => this.incrby(key, amount),
      incrbyfloat: (key, amount) => this.incrbyfloat(key, amount)
    }
  }

  getClientSafe() {
    const client = this.getClient()
    if (!client) {
      throw new Error('MySQL client is not connected')
    }
    return client
  }

  // 初始化表结构
  async initializeTables() {
    // 这里可以执行schema.sql或检查表是否存在
    // 实际部署时应该通过迁移脚本来管理
    logger.info('📊 Checking database tables...')
  }

  // 辅助函数：加密敏感数据
  encrypt(text) {
    if (!text) {
      return null
    }
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

  // 辅助函数：解密敏感数据
  decrypt(encryptedData) {
    if (!encryptedData) {
      return null
    }
    try {
      const data = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData
      const algorithm = 'aes-256-gcm'
      const key = Buffer.from(
        config.security.encryptionKey || 'default-key-32-chars-for-testing',
        'utf8'
      ).slice(0, 32)
      const iv = Buffer.from(data.iv, 'hex')
      const authTag = Buffer.from(data.authTag, 'hex')

      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      logger.error('Failed to decrypt data:', error)
      return null
    }
  }

  // 获取时区调整后的日期
  getDateInTimezone(date = new Date()) {
    const offset = config.system?.timezoneOffset || 8
    const offsetMs = offset * 3600000
    return new Date(date.getTime() + offsetMs)
  }

  getDateStringInTimezone(date = new Date()) {
    const tzDate = this.getDateInTimezone(date)
    return `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(2, '0')}-${String(
      tzDate.getUTCDate()
    ).padStart(2, '0')}`
  }

  getHourInTimezone(date = new Date()) {
    const tzDate = this.getDateInTimezone(date)
    return tzDate.getUTCHours()
  }

  getWeekStringInTimezone(date = new Date()) {
    const tzDate = this.getDateInTimezone(date)
    const year = tzDate.getUTCFullYear()
    const dateObj = new Date(tzDate)
    const dayOfWeek = dateObj.getUTCDay() || 7
    const firstThursday = new Date(dateObj)
    firstThursday.setUTCDate(dateObj.getUTCDate() + 4 - dayOfWeek)
    const yearStart = new Date(firstThursday.getUTCFullYear(), 0, 1)
    const weekNumber = Math.ceil(((firstThursday - yearStart) / 86400000 + 1) / 7)
    return `${year}-W${String(weekNumber).padStart(2, '0')}`
  }

  // 🔑 API Key 相关操作
  async setApiKey(keyId, keyData, hashedKey = null) {
    const pool = this.getPoolSafe()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 准备数据
      const apiKeyRecord = {
        id: keyId,
        name: keyData.name,
        description: keyData.description || null,
        api_key_hash: hashedKey || keyData.apiKey,
        token_limit: parseInt(keyData.tokenLimit) || 0,
        concurrency_limit: parseInt(keyData.concurrencyLimit) || 0,
        rate_limit_window: parseInt(keyData.rateLimitWindow) || 0,
        rate_limit_requests: parseInt(keyData.rateLimitRequests) || 0,
        rate_limit_cost: parseFloat(keyData.rateLimitCost) || 0,
        is_active: keyData.isActive === 'true' || keyData.isActive === true,
        claude_account_id: keyData.claudeAccountId || null,
        claude_console_account_id: keyData.claudeConsoleAccountId || null,
        gemini_account_id: keyData.geminiAccountId || null,
        openai_account_id: keyData.openaiAccountId || null,
        azure_openai_account_id: keyData.azureOpenaiAccountId || null,
        bedrock_account_id: keyData.bedrockAccountId || null,
        droid_account_id: keyData.droidAccountId || null,
        permissions: keyData.permissions || 'all',
        enable_model_restriction:
          keyData.enableModelRestriction === 'true' || keyData.enableModelRestriction === true,
        restricted_models: keyData.restrictedModels
          ? JSON.stringify(keyData.restrictedModels)
          : '[]',
        enable_client_restriction:
          keyData.enableClientRestriction === 'true' || keyData.enableClientRestriction === true,
        allowed_clients: keyData.allowedClients ? JSON.stringify(keyData.allowedClients) : '[]',
        daily_cost_limit: parseFloat(keyData.dailyCostLimit) || 0,
        total_cost_limit: parseFloat(keyData.totalCostLimit) || 0,
        weekly_opus_cost_limit: parseFloat(keyData.weeklyOpusCostLimit) || 0,
        tags: keyData.tags ? JSON.stringify(keyData.tags) : '[]',
        activation_days: parseInt(keyData.activationDays) || 0,
        activation_unit: keyData.activationUnit || 'days',
        expiration_mode: keyData.expirationMode || 'fixed',
        is_activated: keyData.isActivated === 'true' || keyData.isActivated === true,
        activated_at: keyData.activatedAt ? new Date(keyData.activatedAt) : null,
        expires_at: keyData.expiresAt ? new Date(keyData.expiresAt) : null,
        created_by: keyData.createdBy || 'admin',
        user_id: keyData.userId || null,
        user_username: keyData.userUsername || null,
        icon: keyData.icon || null,
        created_at: keyData.createdAt ? new Date(keyData.createdAt) : new Date(),
        last_used_at: keyData.lastUsedAt ? new Date(keyData.lastUsedAt) : null
      }

      // 使用 INSERT ... ON DUPLICATE KEY UPDATE
      const query = `
        INSERT INTO api_keys SET ?
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          token_limit = VALUES(token_limit),
          concurrency_limit = VALUES(concurrency_limit),
          rate_limit_window = VALUES(rate_limit_window),
          rate_limit_requests = VALUES(rate_limit_requests),
          rate_limit_cost = VALUES(rate_limit_cost),
          is_active = VALUES(is_active),
          claude_account_id = VALUES(claude_account_id),
          claude_console_account_id = VALUES(claude_console_account_id),
          gemini_account_id = VALUES(gemini_account_id),
          openai_account_id = VALUES(openai_account_id),
          azure_openai_account_id = VALUES(azure_openai_account_id),
          bedrock_account_id = VALUES(bedrock_account_id),
          droid_account_id = VALUES(droid_account_id),
          permissions = VALUES(permissions),
          enable_model_restriction = VALUES(enable_model_restriction),
          restricted_models = VALUES(restricted_models),
          enable_client_restriction = VALUES(enable_client_restriction),
          allowed_clients = VALUES(allowed_clients),
          daily_cost_limit = VALUES(daily_cost_limit),
          total_cost_limit = VALUES(total_cost_limit),
          weekly_opus_cost_limit = VALUES(weekly_opus_cost_limit),
          tags = VALUES(tags),
          activation_days = VALUES(activation_days),
          activation_unit = VALUES(activation_unit),
          expiration_mode = VALUES(expiration_mode),
          is_activated = VALUES(is_activated),
          activated_at = VALUES(activated_at),
          expires_at = VALUES(expires_at),
          last_used_at = VALUES(last_used_at),
          icon = VALUES(icon),
          updated_at = CURRENT_TIMESTAMP
      `

      await connection.query(query, apiKeyRecord)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async getApiKey(keyId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [keyId])

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]
    // 转换为Redis格式的对象
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      apiKey: row.api_key_hash,
      tokenLimit: String(row.token_limit || 0),
      concurrencyLimit: String(row.concurrency_limit || 0),
      rateLimitWindow: String(row.rate_limit_window || 0),
      rateLimitRequests: String(row.rate_limit_requests || 0),
      rateLimitCost: String(row.rate_limit_cost || 0),
      isActive: String(row.is_active),
      claudeAccountId: row.claude_account_id || '',
      claudeConsoleAccountId: row.claude_console_account_id || '',
      geminiAccountId: row.gemini_account_id || '',
      openaiAccountId: row.openai_account_id || '',
      azureOpenaiAccountId: row.azure_openai_account_id || '',
      bedrockAccountId: row.bedrock_account_id || '',
      droidAccountId: row.droid_account_id || '',
      permissions: row.permissions || 'all',
      enableModelRestriction: String(row.enable_model_restriction),
      restrictedModels: JSON.stringify(row.restricted_models || []),
      enableClientRestriction: String(row.enable_client_restriction),
      allowedClients: JSON.stringify(row.allowed_clients || []),
      dailyCostLimit: String(row.daily_cost_limit || 0),
      totalCostLimit: String(row.total_cost_limit || 0),
      weeklyOpusCostLimit: String(row.weekly_opus_cost_limit || 0),
      tags: JSON.stringify(row.tags || []),
      activationDays: String(row.activation_days || 0),
      activationUnit: row.activation_unit || 'days',
      expirationMode: row.expiration_mode || 'fixed',
      isActivated: String(row.is_activated),
      activatedAt: row.activated_at ? row.activated_at.toISOString() : '',
      expiresAt: row.expires_at ? row.expires_at.toISOString() : '',
      createdBy: row.created_by || 'admin',
      userId: row.user_id || '',
      userUsername: row.user_username || '',
      icon: row.icon || '',
      createdAt: row.created_at ? row.created_at.toISOString() : '',
      lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : ''
    }
  }

  async deleteApiKey(keyId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM api_keys WHERE id = ?', [keyId])
    return result.affectedRows
  }

  async getAllApiKeys() {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM api_keys ORDER BY created_at DESC')

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      apiKey: row.api_key_hash,
      tokenLimit: String(row.token_limit || 0),
      concurrencyLimit: String(row.concurrency_limit || 0),
      rateLimitWindow: String(row.rate_limit_window || 0),
      rateLimitRequests: String(row.rate_limit_requests || 0),
      rateLimitCost: String(row.rate_limit_cost || 0),
      isActive: String(row.is_active),
      claudeAccountId: row.claude_account_id || '',
      claudeConsoleAccountId: row.claude_console_account_id || '',
      geminiAccountId: row.gemini_account_id || '',
      openaiAccountId: row.openai_account_id || '',
      azureOpenaiAccountId: row.azure_openai_account_id || '',
      bedrockAccountId: row.bedrock_account_id || '',
      droidAccountId: row.droid_account_id || '',
      permissions: row.permissions || 'all',
      enableModelRestriction: String(row.enable_model_restriction),
      restrictedModels: JSON.stringify(row.restricted_models || []),
      enableClientRestriction: String(row.enable_client_restriction),
      allowedClients: JSON.stringify(row.allowed_clients || []),
      dailyCostLimit: String(row.daily_cost_limit || 0),
      totalCostLimit: String(row.total_cost_limit || 0),
      weeklyOpusCostLimit: String(row.weekly_opus_cost_limit || 0),
      tags: JSON.stringify(row.tags || []),
      activationDays: String(row.activation_days || 0),
      activationUnit: row.activation_unit || 'days',
      expirationMode: row.expiration_mode || 'fixed',
      isActivated: String(row.is_activated),
      activatedAt: row.activated_at ? row.activated_at.toISOString() : '',
      expiresAt: row.expires_at ? row.expires_at.toISOString() : '',
      createdBy: row.created_by || 'admin',
      userId: row.user_id || '',
      userUsername: row.user_username || '',
      icon: row.icon || '',
      createdAt: row.created_at ? row.created_at.toISOString() : '',
      lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : ''
    }))
  }

  async findApiKeyByHash(hashedKey) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE api_key_hash = ?', [hashedKey])

    if (rows.length === 0) {
      return null
    }

    const row = rows[0]
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      apiKey: row.api_key_hash,
      tokenLimit: String(row.token_limit || 0),
      concurrencyLimit: String(row.concurrency_limit || 0),
      rateLimitWindow: String(row.rate_limit_window || 0),
      rateLimitRequests: String(row.rate_limit_requests || 0),
      rateLimitCost: String(row.rate_limit_cost || 0),
      isActive: String(row.is_active),
      claudeAccountId: row.claude_account_id || '',
      claudeConsoleAccountId: row.claude_console_account_id || '',
      geminiAccountId: row.gemini_account_id || '',
      openaiAccountId: row.openai_account_id || '',
      azureOpenaiAccountId: row.azure_openai_account_id || '',
      bedrockAccountId: row.bedrock_account_id || '',
      droidAccountId: row.droid_account_id || '',
      permissions: row.permissions || 'all',
      enableModelRestriction: String(row.enable_model_restriction),
      restrictedModels: JSON.stringify(row.restricted_models || []),
      enableClientRestriction: String(row.enable_client_restriction),
      allowedClients: JSON.stringify(row.allowed_clients || []),
      dailyCostLimit: String(row.daily_cost_limit || 0),
      totalCostLimit: String(row.total_cost_limit || 0),
      weeklyOpusCostLimit: String(row.weekly_opus_cost_limit || 0),
      tags: JSON.stringify(row.tags || []),
      activationDays: String(row.activation_days || 0),
      activationUnit: row.activation_unit || 'days',
      expirationMode: row.expiration_mode || 'fixed',
      isActivated: String(row.is_activated),
      activatedAt: row.activated_at ? row.activated_at.toISOString() : '',
      expiresAt: row.expires_at ? row.expires_at.toISOString() : '',
      createdBy: row.created_by || 'admin',
      userId: row.user_id || '',
      userUsername: row.user_username || '',
      icon: row.icon || '',
      createdAt: row.created_at ? row.created_at.toISOString() : '',
      lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : ''
    }
  }

  async setApiKeyHash() {
    // MySQL存储已包含哈希，不需要单独的映射表
    return null
  }

  async getApiKeyHash(hashedKey) {
    const record = await this.findApiKeyByHash(hashedKey)
    if (!record) {
      return null
    }
    return { id: record.id }
  }

  async deleteApiKeyHash() {
    // 无需操作
    return null
  }

  async clearApiKeyDeletionMetadata() {
    // MySQL使用列存储，不需要额外清理
    return null
  }

  async deleteUsageDataForKey(keyId) {
    const pool = this.getPoolSafe()
    await Promise.all([
      pool.query('DELETE FROM usage_stats WHERE api_key_id = ?', [keyId]),
      pool.query('DELETE FROM usage_records WHERE api_key_id = ?', [keyId]),
      pool.query('DELETE FROM cost_stats WHERE api_key_id = ?', [keyId]),
      pool.query('DELETE FROM concurrency_leases WHERE api_key_id = ?', [keyId])
    ])
  }

  // 📊 使用统计相关操作
  async incrementTokenUsage(
    keyId,
    tokens,
    inputTokens = 0,
    outputTokens = 0,
    cacheCreateTokens = 0,
    cacheReadTokens = 0,
    model = 'unknown',
    ephemeral5mTokens = 0,
    ephemeral1hTokens = 0,
    isLongContextRequest = false
  ) {
    const pool = this.getPoolSafe()
    const now = new Date()
    const today = this.getDateStringInTimezone(now)
    const currentHour = this.getHourInTimezone(now)
    const tzDate = this.getDateInTimezone(now)
    const currentMonth = `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(2, '0')}`

    // 标准化模型名
    const normalizedModel = this._normalizeModelName(model)

    // 智能处理输入输出token分配
    const finalInputTokens = inputTokens || 0
    const finalOutputTokens = outputTokens || (finalInputTokens > 0 ? 0 : tokens)
    const finalCacheCreateTokens = cacheCreateTokens || 0
    const finalCacheReadTokens = cacheReadTokens || 0

    const totalTokens =
      finalInputTokens + finalOutputTokens + finalCacheCreateTokens + finalCacheReadTokens

    const query = `
      INSERT INTO usage_stats (
        api_key_id, account_type, model, stat_date, stat_hour, stat_month,
        total_tokens, input_tokens, output_tokens, 
        cache_create_tokens, cache_read_tokens,
        ephemeral_5m_tokens, ephemeral_1h_tokens,
        long_context_input_tokens, long_context_output_tokens, long_context_requests,
        requests
      ) VALUES (?, 'api_key', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        total_tokens = total_tokens + VALUES(total_tokens),
        input_tokens = input_tokens + VALUES(input_tokens),
        output_tokens = output_tokens + VALUES(output_tokens),
        cache_create_tokens = cache_create_tokens + VALUES(cache_create_tokens),
        cache_read_tokens = cache_read_tokens + VALUES(cache_read_tokens),
        ephemeral_5m_tokens = ephemeral_5m_tokens + VALUES(ephemeral_5m_tokens),
        ephemeral_1h_tokens = ephemeral_1h_tokens + VALUES(ephemeral_1h_tokens),
        long_context_input_tokens = long_context_input_tokens + VALUES(long_context_input_tokens),
        long_context_output_tokens = long_context_output_tokens + VALUES(long_context_output_tokens),
        long_context_requests = long_context_requests + VALUES(long_context_requests),
        requests = requests + 1,
        updated_at = CURRENT_TIMESTAMP
    `

    const values = [
      keyId,
      normalizedModel,
      today,
      currentHour,
      currentMonth,
      totalTokens,
      finalInputTokens,
      finalOutputTokens,
      finalCacheCreateTokens,
      finalCacheReadTokens,
      ephemeral5mTokens,
      ephemeral1hTokens,
      isLongContextRequest ? finalInputTokens : 0,
      isLongContextRequest ? finalOutputTokens : 0,
      isLongContextRequest ? 1 : 0
    ]

    await pool.query(query, values)
  }

  // 标准化模型名称
  _normalizeModelName(model) {
    if (!model || model === 'unknown') {
      return model
    }

    // 对于Bedrock模型，去掉区域前缀进行统一
    if (model.includes('.anthropic.') || model.includes('.claude')) {
      let normalized = model.replace(/^[a-z0-9-]+\./, '')
      normalized = normalized.replace('anthropic.', '')
      normalized = normalized.replace(/-v\d+:\d+$/, '')
      return normalized
    }

    // 对于其他模型，去掉常见的版本后缀
    return model.replace(/-v\d+:\d+$|:latest$/, '')
  }

  async getUsageStats(keyId) {
    const pool = this.getPoolSafe()
    const today = this.getDateStringInTimezone()
    const tzDate = this.getDateInTimezone()
    const currentMonth = `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(2, '0')}`

    // 获取总计、今日、本月的统计
    const [totalRows] = await pool.query(
      'SELECT SUM(total_tokens) as totalTokens, SUM(input_tokens) as totalInputTokens, ' +
        'SUM(output_tokens) as totalOutputTokens, SUM(cache_create_tokens) as totalCacheCreateTokens, ' +
        'SUM(cache_read_tokens) as totalCacheReadTokens, SUM(requests) as totalRequests ' +
        'FROM usage_stats WHERE api_key_id = ?',
      [keyId]
    )

    const [dailyRows] = await pool.query(
      'SELECT SUM(total_tokens) as tokens, SUM(input_tokens) as inputTokens, ' +
        'SUM(output_tokens) as outputTokens, SUM(cache_create_tokens) as cacheCreateTokens, ' +
        'SUM(cache_read_tokens) as cacheReadTokens, SUM(requests) as requests ' +
        'FROM usage_stats WHERE api_key_id = ? AND stat_date = ?',
      [keyId, today]
    )

    const [monthlyRows] = await pool.query(
      'SELECT SUM(total_tokens) as tokens, SUM(input_tokens) as inputTokens, ' +
        'SUM(output_tokens) as outputTokens, SUM(cache_create_tokens) as cacheCreateTokens, ' +
        'SUM(cache_read_tokens) as cacheReadTokens, SUM(requests) as requests ' +
        'FROM usage_stats WHERE api_key_id = ? AND stat_month = ?',
      [keyId, currentMonth]
    )

    const total = totalRows[0] || {}
    const daily = dailyRows[0] || {}
    const monthly = monthlyRows[0] || {}

    // 计算平均值
    const [keyData] = await pool.query('SELECT created_at FROM api_keys WHERE id = ?', [keyId])
    const createdAt = keyData[0]?.created_at || new Date()
    const now = new Date()
    const daysSinceCreated = Math.max(1, Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24)))
    const totalMinutes = Math.max(1, daysSinceCreated * 24 * 60)

    const totalTokens = parseInt(total.totalTokens) || 0
    const totalRequests = parseInt(total.totalRequests) || 0
    const avgRPM = totalRequests / totalMinutes
    const avgTPM = totalTokens / totalMinutes

    return {
      total: {
        tokens: totalTokens,
        inputTokens: parseInt(total.totalInputTokens) || 0,
        outputTokens: parseInt(total.totalOutputTokens) || 0,
        cacheCreateTokens: parseInt(total.totalCacheCreateTokens) || 0,
        cacheReadTokens: parseInt(total.totalCacheReadTokens) || 0,
        allTokens: totalTokens,
        requests: totalRequests
      },
      daily: {
        tokens: parseInt(daily.tokens) || 0,
        inputTokens: parseInt(daily.inputTokens) || 0,
        outputTokens: parseInt(daily.outputTokens) || 0,
        cacheCreateTokens: parseInt(daily.cacheCreateTokens) || 0,
        cacheReadTokens: parseInt(daily.cacheReadTokens) || 0,
        allTokens: parseInt(daily.tokens) || 0,
        requests: parseInt(daily.requests) || 0
      },
      monthly: {
        tokens: parseInt(monthly.tokens) || 0,
        inputTokens: parseInt(monthly.inputTokens) || 0,
        outputTokens: parseInt(monthly.outputTokens) || 0,
        cacheCreateTokens: parseInt(monthly.cacheCreateTokens) || 0,
        cacheReadTokens: parseInt(monthly.cacheReadTokens) || 0,
        allTokens: parseInt(monthly.tokens) || 0,
        requests: parseInt(monthly.requests) || 0
      },
      averages: {
        rpm: Math.round(avgRPM * 100) / 100,
        tpm: Math.round(avgTPM * 100) / 100,
        dailyRequests: Math.round((totalRequests / daysSinceCreated) * 100) / 100,
        dailyTokens: Math.round((totalTokens / daysSinceCreated) * 100) / 100
      }
    }
  }

  // 添加使用记录
  async addUsageRecord(keyId, record, maxRecords = 200) {
    const pool = this.getPoolSafe()

    const query = `
      INSERT INTO usage_records (
        api_key_id, model, endpoint, input_tokens, output_tokens, 
        cache_tokens, cost, response_time_ms, status_code, 
        error_message, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await pool.query(query, [
      keyId,
      record.model || 'unknown',
      record.endpoint || '',
      record.inputTokens || 0,
      record.outputTokens || 0,
      record.cacheTokens || 0,
      record.cost || 0,
      record.responseTime || 0,
      record.statusCode || 200,
      record.error || null,
      JSON.stringify(record.metadata || {})
    ])

    // 清理旧记录，保持maxRecords限制
    await pool.query(
      'DELETE FROM usage_records WHERE api_key_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM usage_records WHERE api_key_id = ? ORDER BY created_at DESC LIMIT ?) as t)',
      [keyId, keyId, maxRecords]
    )
  }

  async getUsageRecords(keyId, limit = 50) {
    const pool = this.getPool()
    if (!pool) {
      return []
    }

    const [rows] = await pool.query(
      'SELECT * FROM usage_records WHERE api_key_id = ? ORDER BY created_at DESC LIMIT ?',
      [keyId, limit]
    )

    return rows.map((row) => ({
      model: row.model,
      endpoint: row.endpoint,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cacheTokens: row.cache_tokens,
      cost: row.cost,
      responseTime: row.response_time_ms,
      statusCode: row.status_code,
      error: row.error_message,
      metadata: row.metadata,
      timestamp: row.created_at
    }))
  }

  // 💰 费用管理
  async getDailyCost(keyId) {
    const pool = this.getPoolSafe()
    const today = this.getDateStringInTimezone()

    const [rows] = await pool.query(
      'SELECT amount FROM cost_stats WHERE api_key_id = ? AND cost_type = ? AND cost_date = ?',
      [keyId, 'daily', today]
    )

    return rows[0]?.amount || 0
  }

  async incrementDailyCost(keyId, amount) {
    const pool = this.getPoolSafe()
    const today = this.getDateStringInTimezone()
    const tzDate = this.getDateInTimezone()
    const currentMonth = `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(2, '0')}`
    const currentHour = `${today}:${String(this.getHourInTimezone(new Date())).padStart(2, '0')}`

    const queries = [
      { type: 'daily', date: today },
      { type: 'monthly', date: currentMonth },
      { type: 'hourly', date: currentHour },
      { type: 'total', date: 'all' }
    ]

    for (const { type, date } of queries) {
      await pool.query(
        `INSERT INTO cost_stats (api_key_id, cost_type, cost_date, amount) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
        [keyId, type, date, amount]
      )
    }
  }

  async getCostStats(keyId) {
    const pool = this.getPoolSafe()
    const today = this.getDateStringInTimezone()
    const tzDate = this.getDateInTimezone()
    const currentMonth = `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(2, '0')}`
    const currentHour = `${today}:${String(this.getHourInTimezone(new Date())).padStart(2, '0')}`

    const [rows] = await pool.query(
      'SELECT cost_type, amount FROM cost_stats WHERE api_key_id = ? AND cost_date IN (?, ?, ?, ?)',
      [keyId, today, currentMonth, currentHour, 'all']
    )

    const costs = {
      daily: 0,
      monthly: 0,
      hourly: 0,
      total: 0
    }

    rows.forEach((row) => {
      if (row.cost_type === 'daily') {
        costs.daily = parseFloat(row.amount)
      }
      if (row.cost_type === 'monthly') {
        costs.monthly = parseFloat(row.amount)
      }
      if (row.cost_type === 'hourly') {
        costs.hourly = parseFloat(row.amount)
      }
      if (row.cost_type === 'total') {
        costs.total = parseFloat(row.amount)
      }
    })

    return costs
  }

  async getWeeklyOpusCost(keyId) {
    const pool = this.getPoolSafe()
    const currentWeek = this.getWeekStringInTimezone()

    const [rows] = await pool.query(
      'SELECT amount FROM cost_stats WHERE api_key_id = ? AND cost_type = ? AND cost_date = ?',
      [keyId, 'opus_weekly', currentWeek]
    )

    return rows[0]?.amount || 0
  }

  async incrementWeeklyOpusCost(keyId, amount) {
    const pool = this.getPoolSafe()
    const currentWeek = this.getWeekStringInTimezone()

    await pool.query(
      `INSERT INTO cost_stats (api_key_id, cost_type, cost_date, amount) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
      [keyId, 'opus_weekly', currentWeek, amount]
    )
  }

  async getAccountDailyCost(accountId) {
    const pool = this.getPoolSafe()
    const today = this.getDateStringInTimezone()

    const [rows] = await pool.query(
      'SELECT model, input_tokens, output_tokens, cache_create_tokens, cache_read_tokens FROM account_usage_stats WHERE account_id = ? AND stat_date = ? AND model <> ?',
      [accountId, today, 'all']
    )

    if (!rows.length) {
      return 0
    }

    let totalCost = 0

    for (const row of rows) {
      const usage = {
        input_tokens: parseInt(row.input_tokens) || 0,
        output_tokens: parseInt(row.output_tokens) || 0,
        cache_creation_input_tokens: parseInt(row.cache_create_tokens) || 0,
        cache_read_input_tokens: parseInt(row.cache_read_tokens) || 0
      }

      try {
        const costResult = CostCalculator.calculateCost(usage, row.model)
        totalCost += costResult.costs.total || 0
      } catch (error) {
        logger.debug('Failed to calculate account daily cost:', error)
      }
    }

    return Number(totalCost.toFixed(6))
  }

  // 🏢 Claude 账户管理
  async setClaudeAccount(accountId, accountData) {
    const pool = this.getPoolSafe()

    // 加密OAuth数据
    const claudeAiOauth = accountData.claudeAiOauth
      ? this.encrypt(JSON.stringify(accountData.claudeAiOauth))
      : null

    const query = `
      INSERT INTO claude_accounts (
        id, name, email, claude_ai_oauth, proxy_config, 
        is_active, status, priority, expires_at, last_refreshed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        claude_ai_oauth = VALUES(claude_ai_oauth),
        proxy_config = VALUES(proxy_config),
        is_active = VALUES(is_active),
        status = VALUES(status),
        priority = VALUES(priority),
        expires_at = VALUES(expires_at),
        last_refreshed_at = VALUES(last_refreshed_at),
        updated_at = CURRENT_TIMESTAMP
    `

    await pool.query(query, [
      accountId,
      accountData.name,
      accountData.email || null,
      claudeAiOauth,
      JSON.stringify(accountData.proxy || {}),
      accountData.isActive === 'true' || accountData.isActive === true,
      accountData.status || 'active',
      parseInt(accountData.priority) || 1,
      accountData.expiresAt ? new Date(accountData.expiresAt) : null,
      accountData.lastRefreshedAt ? new Date(accountData.lastRefreshedAt) : null
    ])
  }

  async getClaudeAccount(accountId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM claude_accounts WHERE id = ?', [accountId])

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]

    // 解密OAuth数据
    let claudeAiOauth = null
    if (row.claude_ai_oauth) {
      const decrypted = this.decrypt(row.claude_ai_oauth)
      if (decrypted) {
        claudeAiOauth = JSON.parse(decrypted)
      }
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email || '',
      claudeAiOauth,
      proxy: row.proxy_config || {},
      isActive: String(row.is_active),
      status: row.status,
      priority: String(row.priority),
      expiresAt: row.expires_at ? row.expires_at.toISOString() : '',
      lastRefreshedAt: row.last_refreshed_at ? row.last_refreshed_at.toISOString() : '',
      createdAt: row.created_at ? row.created_at.toISOString() : ''
    }
  }

  async getAllClaudeAccounts() {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query(
      'SELECT * FROM claude_accounts ORDER BY priority DESC, created_at DESC'
    )

    return rows.map((row) => {
      // 解密OAuth数据
      let claudeAiOauth = null
      if (row.claude_ai_oauth) {
        const decrypted = this.decrypt(row.claude_ai_oauth)
        if (decrypted) {
          claudeAiOauth = JSON.parse(decrypted)
        }
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email || '',
        claudeAiOauth,
        proxy: row.proxy_config || {},
        isActive: String(row.is_active),
        status: row.status,
        priority: String(row.priority),
        expiresAt: row.expires_at ? row.expires_at.toISOString() : '',
        lastRefreshedAt: row.last_refreshed_at ? row.last_refreshed_at.toISOString() : '',
        createdAt: row.created_at ? row.created_at.toISOString() : ''
      }
    })
  }

  async deleteClaudeAccount(accountId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM claude_accounts WHERE id = ?', [accountId])
    return result.affectedRows
  }

  // Gemini账户管理
  async setGeminiAccount(accountId, accountData) {
    const pool = this.getPoolSafe()

    const payload = {
      id: accountId,
      name: accountData.name || accountId,
      email: accountData.email || null,
      status: accountData.status || 'active',
      account_type: accountData.accountType || accountData.account_type || 'shared',
      schedulable: this._boolFromMixed(accountData.schedulable, true) ? 1 : 0,
      expires_at: accountData.expiresAt ? new Date(accountData.expiresAt) : null,
      last_refreshed_at: accountData.lastRefreshedAt ? new Date(accountData.lastRefreshedAt) : null,
      data: this._stringifyJson({ ...accountData, id: accountId })
    }

    await pool.query(
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
         data = VALUES(data),
         updated_at = CURRENT_TIMESTAMP`,
      [
        payload.id,
        payload.name,
        payload.email,
        payload.status,
        payload.account_type,
        payload.schedulable,
        payload.expires_at,
        payload.last_refreshed_at,
        payload.data
      ]
    )
  }

  async getGeminiAccount(accountId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM gemini_accounts WHERE id = ?', [accountId])

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]
    const data = this._parseJson(row.data, {})

    return {
      ...data,
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      accountType: row.account_type,
      schedulable: row.schedulable ? 'true' : 'false',
      expiresAt: row.expires_at ? row.expires_at.toISOString() : undefined,
      lastRefreshedAt: row.last_refreshed_at ? row.last_refreshed_at.toISOString() : undefined
    }
  }

  async getAllGeminiAccounts() {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM gemini_accounts ORDER BY created_at DESC')

    return rows.map((row) => {
      const data = this._parseJson(row.data, {})
      return {
        ...data,
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status,
        accountType: row.account_type,
        schedulable: row.schedulable ? 'true' : 'false',
        expiresAt: row.expires_at ? row.expires_at.toISOString() : undefined,
        lastRefreshedAt: row.last_refreshed_at ? row.last_refreshed_at.toISOString() : undefined
      }
    })
  }

  async deleteGeminiAccount(accountId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM gemini_accounts WHERE id = ?', [accountId])
    return result.affectedRows
  }

  // OpenAI账户管理
  async setOpenAiAccount(accountId, accountData) {
    const pool = this.getPoolSafe()

    const payload = {
      id: accountId,
      name: accountData.name || accountId,
      account_type: accountData.accountType || accountData.account_type || 'shared',
      status: accountData.status || 'active',
      is_active: this._boolFromMixed(accountData.isActive, true) ? 1 : 0,
      schedulable: this._boolFromMixed(accountData.schedulable, true) ? 1 : 0,
      priority: accountData.priority ? parseInt(accountData.priority, 10) || 50 : 50,
      group_id: accountData.groupId || null,
      subscription_expires_at: accountData.subscriptionExpiresAt
        ? new Date(accountData.subscriptionExpiresAt)
        : null,
      last_refresh: accountData.lastRefresh ? new Date(accountData.lastRefresh) : null,
      data: this._stringifyJson({ ...accountData, id: accountId })
    }

    await pool.query(
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
         data = VALUES(data),
         updated_at = CURRENT_TIMESTAMP`,
      [
        payload.id,
        payload.name,
        payload.account_type,
        payload.status,
        payload.is_active,
        payload.schedulable,
        payload.priority,
        payload.group_id,
        payload.subscription_expires_at,
        payload.last_refresh,
        payload.data
      ]
    )
  }

  async getOpenAiAccount(accountId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM openai_accounts WHERE id = ?', [accountId])

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]
    const data = this._parseJson(row.data, {})

    return {
      ...data,
      id: row.id,
      name: row.name,
      accountType: row.account_type,
      status: row.status,
      isActive: row.is_active ? 'true' : 'false',
      schedulable: row.schedulable ? 'true' : 'false',
      priority: row.priority,
      groupId: row.group_id,
      subscriptionExpiresAt: row.subscription_expires_at
        ? row.subscription_expires_at.toISOString()
        : undefined,
      lastRefresh: row.last_refresh ? row.last_refresh.toISOString() : undefined
    }
  }

  async getAllOpenAIAccounts() {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM openai_accounts ORDER BY created_at DESC')

    return rows.map((row) => {
      const data = this._parseJson(row.data, {})
      return {
        ...data,
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        status: row.status,
        isActive: row.is_active ? 'true' : 'false',
        schedulable: row.schedulable ? 'true' : 'false',
        priority: row.priority,
        groupId: row.group_id,
        subscriptionExpiresAt: row.subscription_expires_at
          ? row.subscription_expires_at.toISOString()
          : undefined,
        lastRefresh: row.last_refresh ? row.last_refresh.toISOString() : undefined
      }
    })
  }

  async deleteOpenAiAccount(accountId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM openai_accounts WHERE id = ?', [accountId])
    return result.affectedRows
  }

  // Droid账户管理
  async setDroidAccount(accountId, accountData) {
    const pool = this.getPoolSafe()

    const payload = {
      id: accountId,
      name: accountData.name || accountId,
      status: accountData.status || 'active',
      is_active: this._boolFromMixed(accountData.isActive, true) ? 1 : 0,
      data: this._stringifyJson({ ...accountData, id: accountId })
    }

    await pool.query(
      `INSERT INTO droid_accounts (id, name, status, is_active, data)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         status = VALUES(status),
         is_active = VALUES(is_active),
         data = VALUES(data),
         updated_at = CURRENT_TIMESTAMP`,
      [payload.id, payload.name, payload.status, payload.is_active, payload.data]
    )
  }

  async getDroidAccount(accountId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM droid_accounts WHERE id = ?', [accountId])

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]
    const data = this._parseJson(row.data, {})

    return {
      ...data,
      id: row.id,
      name: row.name,
      status: row.status,
      isActive: row.is_active ? 'true' : 'false'
    }
  }

  async getAllDroidAccounts() {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM droid_accounts ORDER BY created_at DESC')

    return rows.map((row) => {
      const data = this._parseJson(row.data, {})
      return {
        ...data,
        id: row.id,
        name: row.name,
        status: row.status,
        isActive: row.is_active ? 'true' : 'false'
      }
    })
  }

  async deleteDroidAccount(accountId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM droid_accounts WHERE id = ?', [accountId])
    return result.affectedRows
  }

  // 类似地实现其他账户类型的方法...
  // Gemini, OpenAI, Droid等账户管理方法的实现模式相同

  // 📊 账户使用统计
  async incrementAccountUsage(
    accountId,
    totalTokens,
    inputTokens = 0,
    outputTokens = 0,
    cacheCreateTokens = 0,
    cacheReadTokens = 0,
    model = 'unknown',
    isLongContextRequest = false,
    accountType = 'claude'
  ) {
    const pool = this.getPoolSafe()
    const now = new Date()
    const today = this.getDateStringInTimezone(now)
    const tzDate = this.getDateInTimezone(now)
    const currentMonth = `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}`
    const currentHour = `${today}:${String(this.getHourInTimezone(now)).padStart(2, '0')}`

    const normalizedModel = this._normalizeModelName(model)
    const coreTokens = (inputTokens || 0) + (outputTokens || 0)
    // Total tokens including cache tokens (not used in current implementation but kept for future use)
    const _totalAllTokens =
      (inputTokens || 0) + (outputTokens || 0) + (cacheCreateTokens || 0) + (cacheReadTokens || 0)

    const rows = [
      {
        account_id: accountId,
        account_type: accountType,
        model: 'all',
        stat_date: today,
        stat_hour: null,
        stat_month: currentMonth,
        total_tokens: coreTokens,
        input_tokens: inputTokens || 0,
        output_tokens: outputTokens || 0,
        cache_create_tokens: cacheCreateTokens || 0,
        cache_read_tokens: cacheReadTokens || 0,
        long_context_input_tokens: isLongContextRequest ? inputTokens || 0 : 0,
        long_context_output_tokens: isLongContextRequest ? outputTokens || 0 : 0,
        long_context_requests: isLongContextRequest ? 1 : 0,
        requests: 1
      },
      {
        account_id: accountId,
        account_type: accountType,
        model: normalizedModel,
        stat_date: today,
        stat_hour: currentHour,
        stat_month: currentMonth,
        total_tokens: coreTokens,
        input_tokens: inputTokens || 0,
        output_tokens: outputTokens || 0,
        cache_create_tokens: cacheCreateTokens || 0,
        cache_read_tokens: cacheReadTokens || 0,
        long_context_input_tokens: isLongContextRequest ? inputTokens || 0 : 0,
        long_context_output_tokens: isLongContextRequest ? outputTokens || 0 : 0,
        long_context_requests: isLongContextRequest ? 1 : 0,
        requests: 1
      }
    ]

    const query = `
      INSERT INTO account_usage_stats (
        account_id, account_type, model, stat_date, stat_hour, stat_month,
        total_tokens, input_tokens, output_tokens,
        cache_create_tokens, cache_read_tokens,
        long_context_input_tokens, long_context_output_tokens, long_context_requests,
        requests
      ) VALUES ?
      ON DUPLICATE KEY UPDATE
        total_tokens = total_tokens + VALUES(total_tokens),
        input_tokens = input_tokens + VALUES(input_tokens),
        output_tokens = output_tokens + VALUES(output_tokens),
        cache_create_tokens = cache_create_tokens + VALUES(cache_create_tokens),
        cache_read_tokens = cache_read_tokens + VALUES(cache_read_tokens),
        long_context_input_tokens = long_context_input_tokens + VALUES(long_context_input_tokens),
        long_context_output_tokens = long_context_output_tokens + VALUES(long_context_output_tokens),
        long_context_requests = long_context_requests + VALUES(long_context_requests),
        requests = requests + VALUES(requests),
        updated_at = CURRENT_TIMESTAMP
    `

    const values = rows.map((row) => [
      row.account_id,
      row.account_type,
      row.model,
      row.stat_date,
      row.stat_hour,
      row.stat_month,
      row.total_tokens,
      row.input_tokens,
      row.output_tokens,
      row.cache_create_tokens,
      row.cache_read_tokens,
      row.long_context_input_tokens,
      row.long_context_output_tokens,
      row.long_context_requests,
      row.requests
    ])

    await pool.query(query, [values])
  }

  async getAccountUsageStats(accountId, accountType = 'claude') {
    const pool = this.getPoolSafe()
    const today = this.getDateStringInTimezone()
    const tzDate = this.getDateInTimezone()
    const currentMonth = `${tzDate.getUTCFullYear()}-${String(tzDate.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}`

    const [totalRows] = await pool.query(
      'SELECT SUM(total_tokens) AS totalTokens, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, SUM(cache_create_tokens) AS cacheCreateTokens, SUM(cache_read_tokens) AS cacheReadTokens, SUM(requests) AS requests FROM account_usage_stats WHERE account_id = ? AND account_type = ?',
      [accountId, accountType]
    )

    const [dailyRows] = await pool.query(
      'SELECT SUM(total_tokens) AS totalTokens, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, SUM(cache_create_tokens) AS cacheCreateTokens, SUM(cache_read_tokens) AS cacheReadTokens, SUM(requests) AS requests FROM account_usage_stats WHERE account_id = ? AND account_type = ? AND stat_date = ?',
      [accountId, accountType, today]
    )

    const [monthlyRows] = await pool.query(
      'SELECT SUM(total_tokens) AS totalTokens, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, SUM(cache_create_tokens) AS cacheCreateTokens, SUM(cache_read_tokens) AS cacheReadTokens, SUM(requests) AS requests FROM account_usage_stats WHERE account_id = ? AND account_type = ? AND stat_month = ?',
      [accountId, accountType, currentMonth]
    )

    const total = totalRows[0] || {}
    const daily = dailyRows[0] || {}
    const monthly = monthlyRows[0] || {}

    const totalRequests = parseInt(total.requests) || 0
    const totalTokens = parseInt(total.totalTokens) || 0
    const createdAt = new Date(0)
    const now = new Date()
    const days = Math.max(1, Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24)))
    const totalMinutes = days * 24 * 60

    return {
      accountId,
      total: {
        tokens: totalTokens,
        inputTokens: parseInt(total.inputTokens) || 0,
        outputTokens: parseInt(total.outputTokens) || 0,
        cacheCreateTokens: parseInt(total.cacheCreateTokens) || 0,
        cacheReadTokens: parseInt(total.cacheReadTokens) || 0,
        allTokens: totalTokens,
        requests: totalRequests
      },
      daily: {
        tokens: parseInt(daily.totalTokens) || 0,
        inputTokens: parseInt(daily.inputTokens) || 0,
        outputTokens: parseInt(daily.outputTokens) || 0,
        cacheCreateTokens: parseInt(daily.cacheCreateTokens) || 0,
        cacheReadTokens: parseInt(daily.cacheReadTokens) || 0,
        allTokens: parseInt(daily.totalTokens) || 0,
        requests: parseInt(daily.requests) || 0,
        cost: await this.getAccountDailyCost(accountId)
      },
      monthly: {
        tokens: parseInt(monthly.totalTokens) || 0,
        inputTokens: parseInt(monthly.inputTokens) || 0,
        outputTokens: parseInt(monthly.outputTokens) || 0,
        cacheCreateTokens: parseInt(monthly.cacheCreateTokens) || 0,
        cacheReadTokens: parseInt(monthly.cacheReadTokens) || 0,
        allTokens: parseInt(monthly.totalTokens) || 0,
        requests: parseInt(monthly.requests) || 0
      },
      averages: {
        rpm: totalRequests / totalMinutes,
        tpm: totalTokens / totalMinutes,
        dailyRequests: totalRequests / days,
        dailyTokens: totalTokens / days
      }
    }
  }

  async getAllAccountsUsageStats() {
    try {
      const pool = this.getPoolSafe()
      const [accounts] = await pool.query(
        'SELECT id, name, email, status, is_active FROM claude_accounts'
      )

      const stats = []
      for (const account of accounts) {
        const usage = await this.getAccountUsageStats(account.id)
        stats.push({
          id: account.id,
          name: account.name,
          email: account.email,
          status: account.status,
          isActive: account.is_active ? true : false,
          ...usage
        })
      }

      stats.sort((a, b) => (b.daily?.allTokens || 0) - (a.daily?.allTokens || 0))
      return stats
    } catch (error) {
      logger.error('Failed to fetch all account usage stats:', error)
      return []
    }
  }

  async getAccountSessionWindowUsage(accountId, windowStart, windowEnd) {
    if (!windowStart || !windowEnd) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCacheCreateTokens: 0,
        totalCacheReadTokens: 0,
        totalAllTokens: 0,
        totalRequests: 0,
        modelUsage: {}
      }
    }

    const pool = this.getPoolSafe()
    const startKey = windowStart.substring(0, 13)
    const endKey = windowEnd.substring(0, 13)

    const [rows] = await pool.query(
      'SELECT stat_hour, model, input_tokens, output_tokens, cache_create_tokens, cache_read_tokens, requests FROM account_usage_stats WHERE account_id = ? AND stat_hour IS NOT NULL AND stat_hour BETWEEN ? AND ?',
      [accountId, startKey, endKey]
    )

    const summary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheCreateTokens: 0,
      totalCacheReadTokens: 0,
      totalAllTokens: 0,
      totalRequests: 0,
      modelUsage: {}
    }

    for (const row of rows) {
      const inputTokens = parseInt(row.input_tokens) || 0
      const outputTokens = parseInt(row.output_tokens) || 0
      const cacheCreateTokens = parseInt(row.cache_create_tokens) || 0
      const cacheReadTokens = parseInt(row.cache_read_tokens) || 0
      const allTokens = inputTokens + outputTokens + cacheCreateTokens + cacheReadTokens
      const requests = parseInt(row.requests) || 0

      summary.totalInputTokens += inputTokens
      summary.totalOutputTokens += outputTokens
      summary.totalCacheCreateTokens += cacheCreateTokens
      summary.totalCacheReadTokens += cacheReadTokens
      summary.totalAllTokens += allTokens
      summary.totalRequests += requests

      const modelKey = row.model || 'unknown'
      if (!summary.modelUsage[modelKey]) {
        summary.modelUsage[modelKey] = {
          inputTokens: 0,
          outputTokens: 0,
          cacheCreateTokens: 0,
          cacheReadTokens: 0,
          allTokens: 0,
          requests: 0
        }
      }

      const modelStats = summary.modelUsage[modelKey]
      modelStats.inputTokens += inputTokens
      modelStats.outputTokens += outputTokens
      modelStats.cacheCreateTokens += cacheCreateTokens
      modelStats.cacheReadTokens += cacheReadTokens
      modelStats.allTokens += allTokens
      modelStats.requests += requests
    }

    return summary
  }

  async resetAllUsageStats() {
    const pool = this.getPoolSafe()
    await Promise.all([
      pool.query('TRUNCATE TABLE usage_stats'),
      pool.query('TRUNCATE TABLE account_usage_stats'),
      pool.query('TRUNCATE TABLE cost_stats'),
      pool.query('TRUNCATE TABLE usage_records')
    ])

    return {
      usageStatsCleared: true
    }
  }

  // 🔐 会话管理
  async setSession(sessionId, sessionData, ttl = 86400) {
    const pool = this.getPoolSafe()
    const expiresAt = new Date(Date.now() + ttl * 1000)

    await pool.query(
      `INSERT INTO sessions (id, user_id, user_type, data, expires_at) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         data = VALUES(data), 
         expires_at = VALUES(expires_at)`,
      [
        sessionId,
        sessionData.userId || null,
        sessionData.userType || 'admin',
        JSON.stringify(sessionData),
        expiresAt
      ]
    )
  }

  async getSession(sessionId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()', [
      sessionId
    ])

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]
    return this._parseJson(row.data, {})
  }

  async deleteSession(sessionId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId])
    return result.affectedRows
  }

  // Sticky会话映射
  async setSessionAccountMapping(sessionHash, accountId, ttl = null, accountType = 'claude') {
    const pool = this.getPoolSafe()
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + 3600 * 1000)

    await pool.query(
      `INSERT INTO sticky_sessions (session_hash, account_id, account_type, expires_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         account_id = VALUES(account_id),
         account_type = VALUES(account_type),
         expires_at = VALUES(expires_at),
         updated_at = CURRENT_TIMESTAMP`,
      [sessionHash, accountId, accountType, expiresAt]
    )
  }

  async getSessionAccountMapping(sessionHash) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query(
      'SELECT account_id, account_type, expires_at FROM sticky_sessions WHERE session_hash = ?',
      [sessionHash]
    )

    if (rows.length === 0) {
      return null
    }

    const row = rows[0]
    if (row.expires_at && row.expires_at < new Date()) {
      await this.deleteSessionAccountMapping(sessionHash)
      return null
    }

    return {
      accountId: row.account_id,
      accountType: row.account_type,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : null
    }
  }

  async extendSessionAccountMappingTTL(sessionHash, ttlSeconds = 3600) {
    const pool = this.getPoolSafe()
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
    const [result] = await pool.query(
      'UPDATE sticky_sessions SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE session_hash = ?',
      [expiresAt, sessionHash]
    )
    return result.affectedRows
  }

  async deleteSessionAccountMapping(sessionHash) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM sticky_sessions WHERE session_hash = ?', [
      sessionHash
    ])
    return result.affectedRows
  }

  // OAuth会话管理
  async setOAuthSession(sessionId, sessionData, ttl = 600) {
    const pool = this.getPoolSafe()
    const expiresAt = new Date(Date.now() + ttl * 1000)

    await pool.query(
      `INSERT INTO oauth_sessions (id, state, code_verifier, proxy_config, account_name, description, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         state = VALUES(state),
         code_verifier = VALUES(code_verifier),
         proxy_config = VALUES(proxy_config),
         expires_at = VALUES(expires_at)`,
      [
        sessionId,
        sessionData.state || null,
        sessionData.codeVerifier || null,
        JSON.stringify(sessionData.proxy || {}),
        sessionData.accountName || null,
        sessionData.description || null,
        expiresAt
      ]
    )
  }

  async getOAuthSession(sessionId) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query(
      'SELECT * FROM oauth_sessions WHERE id = ? AND expires_at > NOW()',
      [sessionId]
    )

    if (rows.length === 0) {
      return {}
    }

    const row = rows[0]
    return {
      state: row.state,
      codeVerifier: row.code_verifier,
      proxy: this._parseJson(row.proxy_config, null),
      accountName: row.account_name,
      description: row.description
    }
  }

  async deleteOAuthSession(sessionId) {
    const pool = this.getPoolSafe()
    const [result] = await pool.query('DELETE FROM oauth_sessions WHERE id = ?', [sessionId])
    return result.affectedRows
  }

  // 并发控制
  async incrConcurrency(apiKeyId, requestId, leaseSeconds = 300) {
    if (!requestId) {
      throw new Error('Request ID is required for concurrency tracking')
    }

    const pool = this.getPoolSafe()
    const expiresAt = new Date(Date.now() + leaseSeconds * 1000)

    // 清理过期的租约
    await pool.query('DELETE FROM concurrency_leases WHERE api_key_id = ? AND expires_at < NOW()', [
      apiKeyId
    ])

    // 插入新租约
    await pool.query(
      `INSERT INTO concurrency_leases (api_key_id, request_id, expires_at) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
      [apiKeyId, requestId, expiresAt]
    )

    // 获取当前并发数
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM concurrency_leases WHERE api_key_id = ? AND expires_at > NOW()',
      [apiKeyId]
    )

    return rows[0].count
  }

  async refreshConcurrencyLease(apiKeyId, requestId, leaseSeconds = 300) {
    if (!requestId) {
      return 0
    }

    const pool = this.getPoolSafe()
    const expiresAt = new Date(Date.now() + leaseSeconds * 1000)

    await pool.query(
      'UPDATE concurrency_leases SET expires_at = ? WHERE api_key_id = ? AND request_id = ?',
      [expiresAt, apiKeyId, requestId]
    )

    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM concurrency_leases WHERE api_key_id = ? AND expires_at > NOW()',
      [apiKeyId]
    )

    return rows[0].count
  }

  async decrConcurrency(apiKeyId, requestId) {
    if (!requestId) {
      return 0
    }

    const pool = this.getPoolSafe()

    await pool.query('DELETE FROM concurrency_leases WHERE api_key_id = ? AND request_id = ?', [
      apiKeyId,
      requestId
    ])

    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM concurrency_leases WHERE api_key_id = ? AND expires_at > NOW()',
      [apiKeyId]
    )

    return rows[0].count
  }

  async getConcurrency(apiKeyId) {
    const pool = this.getPoolSafe()

    // 清理过期的租约
    await pool.query('DELETE FROM concurrency_leases WHERE expires_at < NOW()')

    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM concurrency_leases WHERE api_key_id = ? AND expires_at > NOW()',
      [apiKeyId]
    )

    return rows[0].count
  }

  // 系统统计
  async getSystemStats() {
    const pool = this.getPoolSafe()
    const [[apiKeys]] = await pool.query('SELECT COUNT(*) AS count FROM api_keys')
    const [[claudeAccounts]] = await pool.query('SELECT COUNT(*) AS count FROM claude_accounts')
    const [[usage]] = await pool.query('SELECT COUNT(*) AS count FROM usage_stats')

    return {
      totalApiKeys: apiKeys.count || 0,
      totalClaudeAccounts: claudeAccounts.count || 0,
      totalUsageRecords: usage.count || 0
    }
  }

  async getTodayStats() {
    try {
      const pool = this.getPoolSafe()
      const today = this.getDateStringInTimezone()

      const [[daily]] = await pool.query(
        'SELECT SUM(requests) AS requests, SUM(total_tokens) AS tokens, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, SUM(cache_create_tokens) AS cacheCreateTokens, SUM(cache_read_tokens) AS cacheReadTokens FROM usage_stats WHERE stat_date = ?',
        [today]
      )

      const [[apiKeysToday]] = await pool.query(
        'SELECT COUNT(*) AS count FROM api_keys WHERE DATE(created_at) = ?',
        [today]
      )

      return {
        requestsToday: parseInt(daily.requests) || 0,
        tokensToday: parseInt(daily.tokens) || 0,
        inputTokensToday: parseInt(daily.inputTokens) || 0,
        outputTokensToday: parseInt(daily.outputTokens) || 0,
        cacheCreateTokensToday: parseInt(daily.cacheCreateTokens) || 0,
        cacheReadTokensToday: parseInt(daily.cacheReadTokens) || 0,
        apiKeysCreatedToday: parseInt(apiKeysToday.count) || 0
      }
    } catch (error) {
      logger.error('Failed to compute today stats:', error)
      return {
        requestsToday: 0,
        tokensToday: 0,
        inputTokensToday: 0,
        outputTokensToday: 0,
        cacheCreateTokensToday: 0,
        cacheReadTokensToday: 0,
        apiKeysCreatedToday: 0
      }
    }
  }

  async getSystemAverages() {
    try {
      const pool = this.getPoolSafe()
      const [[aggregated]] = await pool.query(
        'SELECT SUM(requests) AS requests, SUM(total_tokens) AS tokens, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, MIN(created_at) AS firstRecord FROM usage_stats'
      )

      const totalRequests = parseInt(aggregated.requests) || 0
      const totalTokens = parseInt(aggregated.tokens) || 0
      const totalInputTokens = parseInt(aggregated.inputTokens) || 0
      const totalOutputTokens = parseInt(aggregated.outputTokens) || 0

      if (!aggregated.firstRecord) {
        return {
          systemRPM: 0,
          systemTPM: 0,
          totalInputTokens,
          totalOutputTokens,
          totalTokens
        }
      }

      const firstRecord = new Date(aggregated.firstRecord)
      const minutes = Math.max(1, (Date.now() - firstRecord.getTime()) / 60000)

      return {
        systemRPM: totalRequests / minutes,
        systemTPM: totalTokens / minutes,
        totalInputTokens,
        totalOutputTokens,
        totalTokens
      }
    } catch (error) {
      logger.error('Failed to compute system averages:', error)
      return {
        systemRPM: 0,
        systemTPM: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0
      }
    }
  }

  async getRealtimeSystemMetrics() {
    try {
      const pool = this.getPoolSafe()
      const windowMinutes = config.system?.metricsWindow || 5
      const currentMinute = Math.floor(Date.now() / 60000)
      const fromMinute = currentMinute - windowMinutes + 1

      const [rows] = await pool.query(
        'SELECT * FROM system_metrics WHERE minute_timestamp BETWEEN ? AND ?',
        [fromMinute, currentMinute]
      )

      const summary = {
        totalRequests: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCacheCreateTokens: 0,
        totalCacheReadTokens: 0
      }

      for (const row of rows) {
        summary.totalRequests += parseInt(row.requests) || 0
        summary.totalTokens += parseInt(row.total_tokens) || 0
        summary.totalInputTokens += parseInt(row.input_tokens) || 0
        summary.totalOutputTokens += parseInt(row.output_tokens) || 0
        summary.totalCacheCreateTokens += parseInt(row.cache_create_tokens) || 0
        summary.totalCacheReadTokens += parseInt(row.cache_read_tokens) || 0
      }

      return summary
    } catch (error) {
      logger.error('Failed to compute realtime metrics:', error)
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCacheCreateTokens: 0,
        totalCacheReadTokens: 0
      }
    }
  }

  // 基础KV操作（用于兼容依赖Redis的调用）
  async get(key) {
    const pool = this.getPoolSafe()
    const [rows] = await pool.query(
      'SELECT cache_value, expires_at FROM key_value_store WHERE cache_key = ?',
      [key]
    )

    if (rows.length === 0) {
      return null
    }

    const row = rows[0]
    if (row.expires_at && row.expires_at < new Date()) {
      await pool.query('DELETE FROM key_value_store WHERE cache_key = ?', [key])
      return null
    }

    return row.cache_value
  }

  async set(key, value, ...args) {
    const pool = this.getPoolSafe()
    let ttlMs = null

    if (args && args.length >= 2) {
      const option = String(args[0] || '').toUpperCase()
      const amount = parseInt(args[1], 10)
      if (!Number.isNaN(amount)) {
        if (option === 'EX') {
          ttlMs = amount * 1000
        } else if (option === 'PX') {
          ttlMs = amount
        }
      }
    }

    const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null

    await pool.query(
      `INSERT INTO key_value_store (cache_key, cache_value, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cache_value = VALUES(cache_value), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
      [key, value, expiresAt]
    )

    return 'OK'
  }

  async setex(key, ttlSeconds, value) {
    return this.set(key, value, 'EX', ttlSeconds)
  }

  async del(...keys) {
    if (!keys || keys.length === 0) {
      return 0
    }

    const pool = this.getPoolSafe()
    const [result] = await pool.query(
      `DELETE FROM key_value_store WHERE cache_key IN (${keys.map(() => '?').join(',')})`,
      keys
    )

    return result.affectedRows || 0
  }

  async keys(pattern) {
    const pool = this.getPoolSafe()
    const results = []

    const appendWithPrefix = (rows, prefix) => {
      for (const row of rows) {
        results.push(`${prefix}${row.id}`)
      }
    }

    if (pattern === 'apikey:*') {
      const [rows] = await pool.query('SELECT id FROM api_keys')
      appendWithPrefix(rows, 'apikey:')
    } else if (pattern === 'claude:account:*') {
      const [rows] = await pool.query('SELECT id FROM claude_accounts')
      appendWithPrefix(rows, 'claude:account:')
    } else if (pattern === 'gemini_account:*') {
      const [rows] = await pool.query('SELECT id FROM gemini_accounts')
      appendWithPrefix(rows, 'gemini_account:')
    } else if (pattern === 'openai:account:*') {
      const [rows] = await pool.query('SELECT id FROM openai_accounts')
      appendWithPrefix(rows, 'openai:account:')
    } else if (pattern === 'droid:account:*') {
      const [rows] = await pool.query('SELECT id FROM droid_accounts')
      appendWithPrefix(rows, 'droid:account:')
    } else if (pattern === 'sticky_session:*') {
      const [rows] = await pool.query('SELECT session_hash AS id FROM sticky_sessions')
      appendWithPrefix(rows, 'sticky_session:')
    } else if (pattern === 'oauth:*') {
      const [rows] = await pool.query('SELECT id FROM oauth_sessions')
      appendWithPrefix(rows, 'oauth:')
    } else if (pattern === 'concurrency:*') {
      const [rows] = await pool.query('SELECT DISTINCT api_key_id AS id FROM concurrency_leases')
      appendWithPrefix(rows, 'concurrency:')
    } else if (pattern === 'usage:cost:*') {
      const [rows] = await pool.query('SELECT api_key_id, cost_type, cost_date FROM cost_stats')
      rows.forEach((row) => {
        results.push(`usage:cost:${row.cost_type}:${row.api_key_id}:${row.cost_date}`)
      })
    } else if (pattern === 'system:metrics:minute:*') {
      const [rows] = await pool.query('SELECT minute_timestamp FROM system_metrics')
      rows.forEach((row) => {
        results.push(`system:metrics:minute:${row.minute_timestamp}`)
      })
    } else {
      const sqlPattern = pattern
        .replace(/[%_]/g, (match) => `\\${match}`)
        .replace(/\*/g, '%')
        .replace(/\?/g, '_')
      const [rows] = await pool.query(
        'SELECT cache_key FROM key_value_store WHERE cache_key LIKE ?',
        [sqlPattern]
      )
      rows.forEach((row) => results.push(row.cache_key))
    }

    return results
  }

  async incr(key) {
    const pool = this.getPoolSafe()
    await pool.query(
      `INSERT INTO key_value_store (cache_key, cache_value, expires_at)
       VALUES (?, '1', NULL)
       ON DUPLICATE KEY UPDATE cache_value = CAST(cache_value AS SIGNED) + 1, updated_at = CURRENT_TIMESTAMP`,
      [key]
    )

    const [rows] = await pool.query('SELECT cache_value FROM key_value_store WHERE cache_key = ?', [
      key
    ])

    return parseInt(rows[0]?.cache_value) || 0
  }

  async incrby(key, amount) {
    const pool = this.getPoolSafe()
    const delta = Number(amount)
    const increment = Number.isFinite(delta) ? delta : 0

    await pool.query(
      `INSERT INTO key_value_store (cache_key, cache_value, expires_at)
       VALUES (?, ?, NULL)
       ON DUPLICATE KEY UPDATE cache_value = CAST(IFNULL(cache_value, '0') AS SIGNED) + ?, updated_at = CURRENT_TIMESTAMP`,
      [key, String(Math.trunc(increment)), Math.trunc(increment)]
    )

    const [rows] = await pool.query('SELECT cache_value FROM key_value_store WHERE cache_key = ?', [
      key
    ])

    return parseInt(rows[0]?.cache_value) || 0
  }

  async incrbyfloat(key, amount) {
    const pool = this.getPoolSafe()
    const delta = Number(amount)
    const increment = Number.isFinite(delta) ? delta : 0

    await pool.query(
      `INSERT INTO key_value_store (cache_key, cache_value, expires_at)
       VALUES (?, ?, NULL)
       ON DUPLICATE KEY UPDATE cache_value = CAST(IFNULL(cache_value, '0') AS DECIMAL(30, 12)) + ?, updated_at = CURRENT_TIMESTAMP`,
      [key, String(increment), increment]
    )

    const [rows] = await pool.query('SELECT cache_value FROM key_value_store WHERE cache_key = ?', [
      key
    ])

    return parseFloat(rows[0]?.cache_value) || 0
  }

  // 清理过期数据
  async cleanup() {
    try {
      const pool = this.getPoolSafe()

      // 清理过期会话
      await pool.query('DELETE FROM sessions WHERE expires_at < NOW()')
      await pool.query('DELETE FROM oauth_sessions WHERE expires_at < NOW()')
      await pool.query('DELETE FROM sticky_sessions WHERE expires_at < NOW()')
      await pool.query('DELETE FROM concurrency_leases WHERE expires_at < NOW()')

      // 清理30天前的使用记录
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      await pool.query('DELETE FROM usage_records WHERE created_at < ?', [thirtyDaysAgo])

      logger.info('🧹 MySQL cleanup completed')
    } catch (error) {
      logger.error('❌ MySQL cleanup failed:', error)
    }
  }

  // 其他辅助方法...
  // TODO: 实现剩余的方法，如系统统计、账户使用统计等
}

// 创建单例实例
const mysqlClient = new MySQLClient()

module.exports = mysqlClient
