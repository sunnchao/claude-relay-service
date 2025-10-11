/**
 * 客户端认证路由
 * Client Authentication Routes
 */

const express = require('express')
const router = express.Router()
const userService = require('../services/userService')
const { authenticateJWT } = require('../middleware/auth')
const { Session } = require('../models/mysql')
const logger = require('../../utils/logger')
const { getPublicKey, decryptPassword, verifyNonce } = require('../utils/crypto')

// 获取RSA公钥端点（用于客户端加密密码）
router.get('/public-key', (req, res) => {
  const publicKey = getPublicKey()
  const nonce = require('../utils/crypto').generateNonce()

  res.json({
    publicKey,
    nonce,
    timestamp: Date.now()
  })
})

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password, confirmPassword } = req.body

    // 验证输入
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email, username and password are required'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Password must be at least 8 characters long'
      })
    }

    // 创建用户
    const user = await userService.createUser({ email, username, password })

    // 生成token
    const { token, refreshToken } = userService.generateToken(user)

    // 创建会话
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    if (process.env.DATABASE_TYPE === 'mysql') {
      await Session.create({
        userId: user.id,
        token,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt,
        refreshExpiresAt
      })
    }

    res.status(201).json({
      success: true,
      user: user.toJSON(),
      token,
      refreshToken
    })
  } catch (error) {
    logger.error('Registration error:', error)
    if (error.message.includes('already registered')) {
      return res.status(409).json({
        error: 'ConflictError',
        message: error.message
      })
    }
    next(error)
  }
})

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { email, encryptedPassword, nonce, password: plainPassword } = req.body

    // 验证输入
    if (!email || (!encryptedPassword && !plainPassword)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email and password are required'
      })
    }

    let password

    // 如果提供了加密密码，使用加密流程
    if (encryptedPassword) {
      // 验证nonce防止重放攻击
      if (!verifyNonce(nonce)) {
        return res.status(400).json({
          error: 'SecurityError',
          message: 'Invalid or expired request. Please refresh and try again.'
        })
      }

      // 解密密码
      try {
        password = decryptPassword(encryptedPassword)
      } catch (error) {
        logger.error('Password decryption failed:', error)
        return res.status(400).json({
          error: 'SecurityError',
          message: 'Password decryption failed. Please refresh and try again.'
        })
      }
    } else {
      // 向后兼容：使用明文密码（不推荐）
      password = plainPassword
      logger.warn('Plain password login used for:', email)
    }

    // 验证用户
    const result = await userService.authenticateUser(email, password)

    if (!result.success) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: result.message
      })
    }

    const { user } = result

    // 生成token
    const { token, refreshToken } = userService.generateToken(user)

    // 创建会话
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    if (process.env.DATABASE_TYPE === 'mysql') {
      await Session.create({
        userId: user.id,
        token,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt,
        refreshExpiresAt
      })
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON ? user.toJSON() : user,
        token,
        refreshToken
      }
    })
  } catch (error) {
    logger.error('Login error:', error)
    next(error)
  }
})

// 用户登出
router.post('/logout', authenticateJWT, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    // 删除会话
    if (process.env.DATABASE_TYPE === 'mysql') {
      await Session.destroy({ where: { token } })
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    logger.error('Logout error:', error)
    next(error)
  }
})

// 刷新Token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Refresh token is required'
      })
    }

    // 验证refresh token
    const decoded = userService.verifyToken(refreshToken)

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      })
    }

    // 查找会话
    if (process.env.DATABASE_TYPE === 'mysql') {
      const session = await Session.findOne({ where: { refreshToken } })

      if (!session || !session.isRefreshValid()) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Refresh token expired or invalid'
        })
      }

      // 生成新token
      const user = await userService.findById(decoded.id)
      const { token: newToken } = userService.generateToken(user)

      // 更新会话
      session.token = newToken
      session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await session.save()

      res.json({
        success: true,
        data: { token: newToken }
      })
    } else {
      // Redis实现
      const user = await userService.findById(decoded.id)
      const { token: newToken } = userService.generateToken(user)

      res.json({
        success: true,
        data: { token: newToken }
      })
    }
  } catch (error) {
    logger.error('Token refresh error:', error)
    next(error)
  }
})

// 邮箱验证
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Verification token is required'
      })
    }

    const user = await userService.verifyEmail(token)

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: { user: user.toJSON ? user.toJSON() : user }
    })
  } catch (error) {
    logger.error('Email verification error:', error)
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({
        error: 'BadRequest',
        message: error.message
      })
    }
    next(error)
  }
})

// 请求重置密码
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email is required'
      })
    }

    const result = await userService.requestPasswordReset(email)

    // 为了安全，总是返回成功
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    })
  } catch (error) {
    logger.error('Password reset request error:', error)
    // 为了安全，即使出错也返回成功
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    })
  }
})

// 重置密码
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, encryptedPassword, encryptedConfirmPassword, nonce } = req.body

    // 验证nonce防止重放攻击
    if (!verifyNonce(nonce)) {
      return res.status(400).json({
        error: 'SecurityError',
        message: 'Invalid or expired request. Please refresh and try again.'
      })
    }

    if (!token || !encryptedPassword) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Token and password are required'
      })
    }

    // 解密密码
    let password, confirmPassword
    try {
      password = decryptPassword(encryptedPassword)
      confirmPassword = encryptedConfirmPassword
        ? decryptPassword(encryptedConfirmPassword)
        : password
    } catch (error) {
      logger.error('Password decryption failed:', error)
      return res.status(400).json({
        error: 'SecurityError',
        message: 'Password decryption failed. Please refresh and try again.'
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Passwords do not match'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Password must be at least 8 characters long'
      })
    }

    await userService.resetPassword(token, password)

    res.json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    logger.error('Password reset error:', error)
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({
        error: 'BadRequest',
        message: error.message
      })
    }
    next(error)
  }
})

module.exports = router
