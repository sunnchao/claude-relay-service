/**
 * API Key服务层
 * API Key Service Layer
 */

const { ApiKey, User } = require('../models/mysql')
const ClientKey = require('../models/clientKey') // Redis model
const clientConfig = require('../../../config/client-config')
const logger = require('../../utils/logger')

class ApiKeyService {
  constructor() {
    this.useMySQL = process.env.DATABASE_TYPE === 'mysql'
  }

  /**
   * 创建API Key
   */
  async createApiKey(userId, keyData) {
    try {
      if (this.useMySQL) {
        // 检查用户
        const user = await User.findByPk(userId)
        if (!user) {
          throw new Error('User not found')
        }

        // 检查Key数量限制
        const existingKeys = await ApiKey.findAll({
          where: { userId, status: 'active' }
        })

        const plan = clientConfig.plans[user.plan]
        if (existingKeys.length >= plan.limits.maxKeys) {
          throw new Error(
            `Maximum number of API keys (${plan.limits.maxKeys}) reached for your plan`
          )
        }

        // 生成新的API Key
        const apiKey = ApiKey.generateKey()
        const keyHash = ApiKey.hashKey(apiKey)

        // 创建Key记录
        const key = await ApiKey.create({
          userId,
          keyHash,
          keyPrefix: apiKey.substring(0, 7),
          keySuffix: apiKey.slice(-4),
          name: keyData.name,
          description: keyData.description,
          permissions: keyData.permissions || ['claude'],
          rateLimit: keyData.rateLimit || plan.limits.rateLimit,
          expiresAt: keyData.expiresAt
        })

        // 返回包含明文密钥的对象（仅在创建时）
        return {
          ...key.toJSON(),
          key: apiKey
        }
      } else {
        // 使用Redis模型
        return await ClientKey.create(userId, keyData)
      }
    } catch (error) {
      logger.error('Error creating API key:', error)
      throw error
    }
  }

  /**
   * 通过ID查找API Key
   */
  async findById(keyId, userId = null) {
    try {
      if (this.useMySQL) {
        const where = { id: keyId }
        if (userId) {
          where.userId = userId
        }
        return await ApiKey.findOne({ where })
      } else {
        return await ClientKey.findById(keyId, userId)
      }
    } catch (error) {
      logger.error('Error finding API key by ID:', error)
      return null
    }
  }

  /**
   * 验证API Key
   */
  async verifyApiKey(apiKey) {
    try {
      if (this.useMySQL) {
        return await ApiKey.verifyKey(apiKey)
      } else {
        return await ClientKey.verifyKey(apiKey)
      }
    } catch (error) {
      logger.error('Error verifying API key:', error)
      return null
    }
  }

  /**
   * 获取用户的所有API Keys
   */
  async getUserApiKeys(userId) {
    try {
      if (this.useMySQL) {
        return await ApiKey.findAll({
          where: { userId },
          order: [['created_at', 'DESC']]
        })
      } else {
        return await ClientKey.findByUserId(userId)
      }
    } catch (error) {
      logger.error('Error getting user API keys:', error)
      return []
    }
  }

  /**
   * 更新API Key
   */
  async updateApiKey(keyId, userId, updates) {
    try {
      const key = await this.findById(keyId, userId)
      if (!key) {
        throw new Error('API key not found')
      }

      // 不允许更新某些字段
      delete updates.id
      delete updates.userId
      delete updates.keyHash

      if (this.useMySQL) {
        await key.update(updates)
      } else {
        await key.update(updates)
      }

      return key
    } catch (error) {
      logger.error('Error updating API key:', error)
      throw error
    }
  }

  /**
   * 删除API Key
   */
  async deleteApiKey(keyId, userId) {
    try {
      const key = await this.findById(keyId, userId)
      if (!key) {
        throw new Error('API key not found')
      }

      if (this.useMySQL) {
        await key.destroy()
      } else {
        await key.delete()
      }

      return { success: true, message: 'API key deleted successfully' }
    } catch (error) {
      logger.error('Error deleting API key:', error)
      throw error
    }
  }

  /**
   * 重新生成API Key
   */
  async regenerateApiKey(keyId, userId) {
    try {
      const key = await this.findById(keyId, userId)
      if (!key) {
        throw new Error('API key not found')
      }

      return await key.regenerate()
    } catch (error) {
      logger.error('Error regenerating API key:', error)
      throw error
    }
  }

  /**
   * 更新使用统计
   */
  async updateUsage(apiKey, tokens, requests = 1) {
    try {
      const key = await this.verifyApiKey(apiKey)
      if (!key) {
        throw new Error('Invalid API key')
      }

      return await key.updateUsage(tokens, requests)
    } catch (error) {
      logger.error('Error updating API key usage:', error)
      throw error
    }
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit(apiKey) {
    try {
      const key = await this.verifyApiKey(apiKey)
      if (!key) {
        return {
          allowed: false,
          error: 'Invalid API key'
        }
      }

      return await key.checkRateLimit()
    } catch (error) {
      logger.error('Error checking rate limit:', error)
      return {
        allowed: false,
        error: error.message
      }
    }
  }

  /**
   * 获取API Key统计
   */
  async getKeyStatistics(keyId, userId, days = 7) {
    try {
      const key = await this.findById(keyId, userId)
      if (!key) {
        throw new Error('API key not found')
      }

      if (this.useMySQL) {
        const UsageLog = require('../models/mysql/UsageLog')
        const { Op } = require('sequelize')
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const usageLogs = await UsageLog.findAll({
          where: {
            apiKeyId: keyId,
            created_at: {
              [Op.gte]: startDate
            }
          },
          attributes: [
            [UsageLog.sequelize.fn('DATE', UsageLog.sequelize.col('created_at')), 'date'],
            [UsageLog.sequelize.fn('COUNT', '*'), 'requests'],
            [UsageLog.sequelize.fn('SUM', UsageLog.sequelize.col('total_tokens')), 'tokens']
          ],
          group: [UsageLog.sequelize.fn('DATE', UsageLog.sequelize.col('created_at'))],
          order: [[UsageLog.sequelize.fn('DATE', UsageLog.sequelize.col('created_at')), 'ASC']]
        })

        const dailyStats = usageLogs.map((log) => ({
          date: log.get('date'),
          requests: parseInt(log.get('requests') || 0),
          tokens: parseInt(log.get('tokens') || 0)
        }))

        return {
          keyId: key.id,
          name: key.name,
          total: {
            requests: key.usageRequests || 0,
            tokens: key.usageTokens || 0,
            lastUsedAt: key.lastUsedAt
          },
          daily: dailyStats,
          limits: key.rateLimit
        }
      } else {
        return await key.getStatistics(days)
      }
    } catch (error) {
      logger.error('Error getting API key statistics:', error)
      throw error
    }
  }
}

module.exports = new ApiKeyService()
