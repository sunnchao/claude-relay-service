/**
 * 用户服务层
 * User Service Layer
 */

const { User } = require('../models/mysql')
const ClientUser = require('../models/clientUser') // Redis model
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const clientConfig = require('../../../config/client-config')
const logger = require('../../utils/logger')

class UserService {
  constructor() {
    this.useMySQL = process.env.DATABASE_TYPE === 'mysql'
  }

  /**
   * 创建用户
   */
  async createUser(userData) {
    const { email, username, password } = userData

    try {
      if (this.useMySQL) {
        // 检查邮箱是否已存在
        const existingUser = await User.findOne({ where: { email } })
        if (existingUser) {
          throw new Error('Email already registered')
        }

        // 创建用户
        const passwordHash = await bcrypt.hash(password, 10)
        const verificationToken = crypto.randomBytes(32).toString('hex')

        const user = await User.create({
          email,
          username,
          passwordHash,
          verificationToken,
          emailVerified: clientConfig.development.skipEmailVerification
        })

        return user
      } else {
        // 使用Redis模型
        return await ClientUser.create(userData)
      }
    } catch (error) {
      logger.error('Error creating user:', error)
      throw error
    }
  }

  /**
   * 通过ID查找用户
   */
  async findById(userId) {
    try {
      if (this.useMySQL) {
        return await User.findByPk(userId)
      } else {
        return await ClientUser.findById(userId)
      }
    } catch (error) {
      logger.error('Error finding user by ID:', error)
      return null
    }
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email) {
    try {
      if (this.useMySQL) {
        return await User.findOne({ where: { email } })
      } else {
        return await ClientUser.findByEmail(email)
      }
    } catch (error) {
      logger.error('Error finding user by email:', error)
      return null
    }
  }

  /**
   * 验证用户登录
   */
  async authenticateUser(email, password) {
    try {
      const user = await this.findByEmail(email)
      if (!user) {
        return { success: false, message: 'Invalid credentials' }
      }

      const isValid = await user.verifyPassword(password)
      if (!isValid) {
        return { success: false, message: 'Invalid credentials' }
      }

      if (!user.emailVerified && clientConfig.registration.requireEmailVerification) {
        return { success: false, message: 'Please verify your email first' }
      }

      if (user.status !== 'active') {
        return { success: false, message: 'Account is not active' }
      }

      // 更新最后登录时间
      user.lastLoginAt = new Date()
      await user.save ? await user.save() : await user.update({ lastLoginAt: user.lastLoginAt })

      return { success: true, user }
    } catch (error) {
      logger.error('Error authenticating user:', error)
      throw error
    }
  }

  /**
   * 生成JWT令牌
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      plan: user.plan
    }

    const token = jwt.sign(payload, clientConfig.jwt.secret, {
      expiresIn: clientConfig.jwt.expiresIn
    })

    const refreshToken = jwt.sign(payload, clientConfig.jwt.secret, {
      expiresIn: clientConfig.jwt.refreshExpiresIn
    })

    return { token, refreshToken }
  }

  /**
   * 验证JWT令牌
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, clientConfig.jwt.secret)
    } catch (error) {
      return null
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token) {
    try {
      if (this.useMySQL) {
        const user = await User.findOne({ where: { verificationToken: token } })
        if (!user) {
          throw new Error('Invalid or expired verification token')
        }

        user.emailVerified = true
        user.verificationToken = null
        await user.save()

        return user
      } else {
        return await ClientUser.verifyEmail(token)
      }
    } catch (error) {
      logger.error('Error verifying email:', error)
      throw error
    }
  }

  /**
   * 请求密码重置
   */
  async requestPasswordReset(email) {
    try {
      const user = await this.findByEmail(email)
      if (!user) {
        // 为了安全，不透露用户是否存在
        return { success: true, message: 'If the email exists, a reset link will be sent' }
      }

      const resetToken = crypto.randomBytes(32).toString('hex')
      
      if (this.useMySQL) {
        user.resetPasswordToken = resetToken
        await user.save()
      } else {
        await user.generateResetToken()
      }

      // TODO: 发送重置邮件
      return { success: true, token: resetToken }
    } catch (error) {
      logger.error('Error requesting password reset:', error)
      throw error
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(token, newPassword) {
    try {
      if (this.useMySQL) {
        const user = await User.findOne({ where: { resetPasswordToken: token } })
        if (!user) {
          throw new Error('Invalid or expired reset token')
        }

        const passwordHash = await bcrypt.hash(newPassword, 10)
        user.passwordHash = passwordHash
        user.resetPasswordToken = null
        await user.save()

        return user
      } else {
        return await ClientUser.resetPassword(token, newPassword)
      }
    } catch (error) {
      logger.error('Error resetting password:', error)
      throw error
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updates) {
    try {
      const user = await this.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // 不允许更新某些字段
      delete updates.id
      delete updates.email
      delete updates.passwordHash

      if (this.useMySQL) {
        await user.update(updates)
      } else {
        await user.update(updates)
      }

      return user
    } catch (error) {
      logger.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    try {
      const user = await this.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      if (this.useMySQL) {
        await user.destroy()
      } else {
        await user.delete()
      }

      return { success: true, message: 'User deleted successfully' }
    } catch (error) {
      logger.error('Error deleting user:', error)
      throw error
    }
  }

  /**
   * 获取用户统计
   */
  async getUserStatistics(userId) {
    try {
      const user = await this.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      if (this.useMySQL) {
        const apiKeys = await user.getApiKeys ? await user.getApiKeys() : []
        const usageLogs = await user.getUsageLogs ? 
          await user.getUsageLogs({
            limit: 100,
            order: [['created_at', 'DESC']]
          }) : []

        return {
          user: user.toJSON(),
          apiKeys: apiKeys.length,
          totalRequests: usageLogs.length,
          totalTokens: usageLogs.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
        }
      } else {
        return await user.getStatistics()
      }
    } catch (error) {
      logger.error('Error getting user statistics:', error)
      throw error
    }
  }
}

module.exports = new UserService()