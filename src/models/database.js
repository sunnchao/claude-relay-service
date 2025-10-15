/**
 * 数据库抽象层
 * 根据配置自动选择使用Redis还是MySQL
 */

const config = require('../../config/config')
const logger = require('../utils/logger')

class DatabaseAdapter {
  constructor() {
    this.client = null
    this.type = config.database?.type || 'redis' // 默认使用redis
  }

  async connect() {
    logger.info(`🔄 Initializing database: ${this.type}`)

    if (this.type === 'mysql') {
      const mysqlClient = require('./mysql')
      await mysqlClient.connect()
      this.client = mysqlClient
    } else if (this.type === 'hybrid') {
      // 混合模式：同时使用Redis和MySQL
      const hybridClient = require('./hybrid')
      await hybridClient.connect()
      this.client = hybridClient
    } else {
      const redisClient = require('./redis')
      await redisClient.connect()
      this.client = redisClient
    }

    logger.info(`✅ Database ${this.type} initialized successfully`)
    return this.client
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect()
    }
  }

  // 代理所有方法到实际的客户端
  getClient() {
    return this.client?.getClient?.() || this.client?.getPool?.()
  }

  getClientSafe() {
    return this.client?.getClientSafe?.() || this.client?.getPoolSafe?.()
  }

  // API Key 相关操作
  async setApiKey(keyId, keyData, hashedKey = null) {
    return this.client.setApiKey(keyId, keyData, hashedKey)
  }

  async getApiKey(keyId) {
    return this.client.getApiKey(keyId)
  }

  async deleteApiKey(keyId) {
    return this.client.deleteApiKey(keyId)
  }

  async getAllApiKeys() {
    return this.client.getAllApiKeys()
  }

  async findApiKeyByHash(hashedKey) {
    return this.client.findApiKeyByHash(hashedKey)
  }

  // 使用统计相关操作
  async incrementTokenUsage(...args) {
    return this.client.incrementTokenUsage(...args)
  }

  async getUsageStats(keyId) {
    return this.client.getUsageStats(keyId)
  }

  async addUsageRecord(keyId, record, maxRecords = 200) {
    return this.client.addUsageRecord(keyId, record, maxRecords)
  }

  async getUsageRecords(keyId, limit = 50) {
    return this.client.getUsageRecords(keyId, limit)
  }

  // 费用相关操作
  async getDailyCost(keyId) {
    return this.client.getDailyCost(keyId)
  }

  async incrementDailyCost(keyId, amount) {
    return this.client.incrementDailyCost(keyId, amount)
  }

  async getCostStats(keyId) {
    return this.client.getCostStats(keyId)
  }

  async getWeeklyOpusCost(keyId) {
    return this.client.getWeeklyOpusCost(keyId)
  }

  async incrementWeeklyOpusCost(keyId, amount) {
    return this.client.incrementWeeklyOpusCost(keyId, amount)
  }

  // Claude账户管理
  async setClaudeAccount(accountId, accountData) {
    return this.client.setClaudeAccount(accountId, accountData)
  }

  async getClaudeAccount(accountId) {
    return this.client.getClaudeAccount(accountId)
  }

  async getAllClaudeAccounts() {
    return this.client.getAllClaudeAccounts()
  }

  async deleteClaudeAccount(accountId) {
    return this.client.deleteClaudeAccount(accountId)
  }

  // Gemini账户管理
  async setGeminiAccount(accountId, accountData) {
    // 适配器方法，根据数据库类型调用对应方法
    if (this.type === 'mysql') {
      return this.client.setGeminiAccount(accountId, accountData)
    } else {
      // Redis使用不同的key前缀
      const key = `gemini:account:${accountId}`
      return this.client.client.hset(key, accountData)
    }
  }

  async getGeminiAccount(accountId) {
    if (this.type === 'mysql') {
      return this.client.getGeminiAccount(accountId)
    } else {
      const key = `gemini:account:${accountId}`
      return this.client.client.hgetall(key)
    }
  }

  async getAllGeminiAccounts() {
    if (this.type === 'mysql') {
      return this.client.getAllGeminiAccounts()
    } else {
      const keys = await this.client.client.keys('gemini:account:*')
      const accounts = []
      for (const key of keys) {
        const accountData = await this.client.client.hgetall(key)
        if (accountData && Object.keys(accountData).length > 0) {
          accounts.push({ id: key.replace('gemini:account:', ''), ...accountData })
        }
      }
      return accounts
    }
  }

  async deleteGeminiAccount(accountId) {
    if (this.type === 'mysql') {
      return this.client.deleteGeminiAccount(accountId)
    } else {
      const key = `gemini:account:${accountId}`
      return this.client.client.del(key)
    }
  }

  // OpenAI账户管理
  async setOpenAiAccount(accountId, accountData) {
    if (this.type === 'mysql') {
      return this.client.setOpenAiAccount(accountId, accountData)
    } else {
      return this.client.setOpenAiAccount(accountId, accountData)
    }
  }

  async getOpenAiAccount(accountId) {
    if (this.type === 'mysql') {
      return this.client.getOpenAiAccount(accountId)
    } else {
      return this.client.getOpenAiAccount(accountId)
    }
  }

  async getAllOpenAIAccounts() {
    if (this.type === 'mysql') {
      return this.client.getAllOpenAIAccounts()
    } else {
      return this.client.getAllOpenAIAccounts()
    }
  }

  async deleteOpenAiAccount(accountId) {
    if (this.type === 'mysql') {
      return this.client.deleteOpenAiAccount(accountId)
    } else {
      return this.client.deleteOpenAiAccount(accountId)
    }
  }

  // Droid账户管理
  async setDroidAccount(accountId, accountData) {
    return this.client.setDroidAccount(accountId, accountData)
  }

  async getDroidAccount(accountId) {
    return this.client.getDroidAccount(accountId)
  }

  async getAllDroidAccounts() {
    return this.client.getAllDroidAccounts()
  }

  async deleteDroidAccount(accountId) {
    return this.client.deleteDroidAccount(accountId)
  }

  // 会话管理
  async setSession(sessionId, sessionData, ttl = 86400) {
    return this.client.setSession(sessionId, sessionData, ttl)
  }

  async getSession(sessionId) {
    return this.client.getSession(sessionId)
  }

  async deleteSession(sessionId) {
    return this.client.deleteSession(sessionId)
  }

  // OAuth会话管理
  async setOAuthSession(sessionId, sessionData, ttl = 600) {
    return this.client.setOAuthSession(sessionId, sessionData, ttl)
  }

  async getOAuthSession(sessionId) {
    return this.client.getOAuthSession(sessionId)
  }

  async deleteOAuthSession(sessionId) {
    return this.client.deleteOAuthSession(sessionId)
  }

  // Sticky会话映射
  async setSessionAccountMapping(sessionHash, accountId, ttl = null) {
    return this.client.setSessionAccountMapping(sessionHash, accountId, ttl)
  }

  async getSessionAccountMapping(sessionHash) {
    return this.client.getSessionAccountMapping(sessionHash)
  }

  async extendSessionAccountMappingTTL(sessionHash) {
    return this.client.extendSessionAccountMappingTTL(sessionHash)
  }

  async deleteSessionAccountMapping(sessionHash) {
    return this.client.deleteSessionAccountMapping(sessionHash)
  }

  // 并发控制
  async incrConcurrency(apiKeyId, requestId, leaseSeconds = null) {
    return this.client.incrConcurrency(apiKeyId, requestId, leaseSeconds)
  }

  async refreshConcurrencyLease(apiKeyId, requestId, leaseSeconds = null) {
    return this.client.refreshConcurrencyLease(apiKeyId, requestId, leaseSeconds)
  }

  async decrConcurrency(apiKeyId, requestId) {
    return this.client.decrConcurrency(apiKeyId, requestId)
  }

  async getConcurrency(apiKeyId) {
    return this.client.getConcurrency(apiKeyId)
  }

  // 账户使用统计
  async incrementAccountUsage(...args) {
    return this.client.incrementAccountUsage(...args)
  }

  async getAccountUsageStats(accountId, accountType = null) {
    return this.client.getAccountUsageStats(accountId, accountType)
  }

  async getAllAccountsUsageStats() {
    return this.client.getAllAccountsUsageStats()
  }

  async getAccountDailyCost(accountId) {
    return this.client.getAccountDailyCost(accountId)
  }

  // 系统统计
  async getSystemStats() {
    return this.client.getSystemStats()
  }

  async getTodayStats() {
    return this.client.getTodayStats()
  }

  async getSystemAverages() {
    return this.client.getSystemAverages()
  }

  async getRealtimeSystemMetrics() {
    return this.client.getRealtimeSystemMetrics()
  }

  // 重置操作
  async resetAllUsageStats() {
    return this.client.resetAllUsageStats()
  }

  // 清理操作
  async cleanup() {
    return this.client.cleanup()
  }

  // API Key哈希索引管理 (仅Redis使用，MySQL不需要)
  async setApiKeyHash(hashedKey, keyData, ttl = 0) {
    if (this.type === 'redis') {
      return this.client.setApiKeyHash(hashedKey, keyData, ttl)
    }
    // MySQL不需要此方法，因为使用索引
    return null
  }

  async getApiKeyHash(hashedKey) {
    if (this.type === 'redis') {
      return this.client.getApiKeyHash(hashedKey)
    }
    // MySQL直接查询api_keys表
    return this.findApiKeyByHash(hashedKey)
  }

  async deleteApiKeyHash(hashedKey) {
    if (this.type === 'redis') {
      return this.client.deleteApiKeyHash(hashedKey)
    }
    // MySQL不需要此方法
    return null
  }
}

// 创建单例实例
const database = new DatabaseAdapter()

module.exports = database
