/**
 * 客户端API Key管理路由
 * Client API Key Management Routes
 */

const express = require('express')
const router = express.Router()
const apiKeyService = require('../services/apiKeyService')
const { authenticateJWT } = require('../middleware/auth')
const logger = require('../../utils/logger')

// 所有路由都需要JWT认证
router.use(authenticateJWT)

// 获取Key列表
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const keys = await apiKeyService.getUserApiKeys(userId)

    res.json({
      success: true,
      data: keys.map((key) => (key.toJSON ? key.toJSON() : key))
    })
  } catch (error) {
    logger.error('Error fetching API keys:', error)
    next(error)
  }
})

// 创建新Key
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { name, description, permissions, rateLimit, expiresAt } = req.body

    // 验证输入
    if (!name) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'API key name is required'
      })
    }

    // 创建API Key
    const key = await apiKeyService.createApiKey(userId, {
      name,
      description,
      permissions,
      rateLimit,
      expiresAt
    })

    res.status(201).json({
      success: true,
      data: key,
      message:
        'API key created successfully. Please save the key securely as it will not be shown again.'
    })
  } catch (error) {
    logger.error('Error creating API key:', error)
    if (error.message.includes('Maximum number')) {
      return res.status(403).json({
        error: 'LimitExceeded',
        message: error.message
      })
    }
    next(error)
  }
})

// 获取Key详情
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id
    const keyId = req.params.id

    const key = await apiKeyService.findById(keyId, userId)

    if (!key) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'API key not found'
      })
    }

    res.json({
      success: true,
      data: key.toJSON ? key.toJSON() : key
    })
  } catch (error) {
    logger.error('Error fetching API key:', error)
    next(error)
  }
})

// 更新Key配置
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id
    const keyId = req.params.id
    const updates = req.body

    // 不允许更新某些字段
    delete updates.id
    delete updates.userId
    delete updates.keyHash
    delete updates.key

    const key = await apiKeyService.updateApiKey(keyId, userId, updates)

    res.json({
      success: true,
      data: key.toJSON ? key.toJSON() : key,
      message: 'API key updated successfully'
    })
  } catch (error) {
    logger.error('Error updating API key:', error)
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message
      })
    }
    next(error)
  }
})

// 删除Key
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id
    const keyId = req.params.id

    await apiKeyService.deleteApiKey(keyId, userId)

    res.json({
      success: true,
      message: 'API key deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting API key:', error)
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message
      })
    }
    next(error)
  }
})

// 重新生成Key
router.post('/:id/regenerate', async (req, res, next) => {
  try {
    const userId = req.user.id
    const keyId = req.params.id

    const result = await apiKeyService.regenerateApiKey(keyId, userId)

    res.json({
      success: true,
      data: result,
      message: 'API key regenerated successfully. Please save the new key securely.'
    })
  } catch (error) {
    logger.error('Error regenerating API key:', error)
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message
      })
    }
    next(error)
  }
})

// 获取Key使用统计
router.get('/:id/usage', async (req, res, next) => {
  try {
    const userId = req.user.id
    const keyId = req.params.id
    const days = parseInt(req.query.days) || 7

    const statistics = await apiKeyService.getKeyStatistics(keyId, userId, days)

    res.json({
      success: true,
      data: statistics
    })
  } catch (error) {
    logger.error('Error fetching API key usage:', error)
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message
      })
    }
    next(error)
  }
})

// 验证Key（公开端点，不需要JWT）
router.post('/verify', async (req, res, next) => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'API key is required'
      })
    }

    const key = await apiKeyService.verifyApiKey(apiKey)

    if (!key) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      })
    }

    res.json({
      success: true,
      valid: true,
      data: {
        name: key.name,
        permissions: key.permissions,
        status: key.status
      }
    })
  } catch (error) {
    logger.error('Error verifying API key:', error)
    next(error)
  }
})

module.exports = router
