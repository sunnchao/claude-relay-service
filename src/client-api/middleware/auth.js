/**
 * 认证中间件
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken')
const clientConfig = require('../../../config/client-config')
const userService = require('../services/userService')
const apiKeyService = require('../services/apiKeyService')
const logger = require('../../utils/logger')

/**
 * JWT认证中间件
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided'
      })
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    const decoded = jwt.verify(token, clientConfig.jwt.secret)

    // 获取用户信息
    const user = await userService.findById(decoded.id)

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      })
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is not active'
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Token has expired'
      })
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'InvalidToken',
        message: 'Invalid token'
      })
    }

    logger.error('JWT authentication error:', error)
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Authentication failed'
    })
  }
}

/**
 * API Key认证中间件
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No API key provided'
      })
    }

    // 验证API Key
    const key = await apiKeyService.verifyApiKey(apiKey)

    if (!key) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      })
    }

    // 检查速率限制
    const rateLimit = await key.checkRateLimit()

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded',
        retryAfter: rateLimit.resetAt
      })
    }

    // 设置速率限制响应头
    res.set({
      'X-RateLimit-Limit': rateLimit.limit,
      'X-RateLimit-Remaining': rateLimit.remaining,
      'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString()
    })

    // 获取用户信息
    const user = key.user || (await userService.findById(key.userId))

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      })
    }

    // 检查用户使用限制
    const usageLimit = await user.checkUsageLimit()

    if (usageLimit.exceeded) {
      return res.status(403).json({
        error: 'UsageLimitExceeded',
        message: 'Monthly usage limit exceeded',
        limit: usageLimit.limit,
        current: usageLimit.current
      })
    }

    req.apiKey = key
    req.user = user
    next()
  } catch (error) {
    logger.error('API key authentication error:', error)
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Authentication failed'
    })
  }
}

/**
 * 可选认证中间件
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const apiKey = req.headers['x-api-key'] || req.query.api_key

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

      try {
        const decoded = jwt.verify(token, clientConfig.jwt.secret)
        req.user = await userService.findById(decoded.id)
      } catch (error) {
        // 忽略无效token
      }
    } else if (apiKey) {
      try {
        const key = await apiKeyService.verifyApiKey(apiKey)
        if (key) {
          req.apiKey = key
          req.user = key.user || (await userService.findById(key.userId))
        }
      } catch (error) {
        // 忽略无效API key
      }
    }

    next()
  } catch (error) {
    // 可选认证，忽略错误
    next()
  }
}

/**
 * 检查用户权限
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    })
  }

  // 如果使用API Key，检查权限
  if (req.apiKey) {
    const permissions = req.apiKey.permissions || []
    if (!permissions.includes(permission) && !permissions.includes('*')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' required`
      })
    }
  }

  // 检查用户计划权限
  const plan = clientConfig.plans[req.user.plan]
  if (!plan) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid user plan'
    })
  }

  // TODO: 实现更细粒度的权限检查

  next()
}

module.exports = {
  authenticateJWT,
  authenticateApiKey,
  optionalAuth,
  requirePermission
}
