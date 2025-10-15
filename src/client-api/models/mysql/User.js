/**
 * MySQL用户模型
 * MySQL User Model
 */

const { DataTypes, Model } = require('sequelize')
const { sequelize } = require('../database')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')

class User extends Model {
  /**
   * 验证密码
   */
  async verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash)
  }

  /**
   * 生成验证令牌
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 生成重置密码令牌
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 更新使用量
   */
  async updateUsage(tokens, _requests = 1) {
    this.usageMonthly = (this.usageMonthly || 0) + tokens
    this.usageTotal = (this.usageTotal || 0) + tokens
    await this.save()
    return {
      monthly: this.usageMonthly,
      total: this.usageTotal
    }
  }

  /**
   * 检查使用限制
   */
  checkUsageLimit() {
    const limits = {
      free: { monthlyTokens: 100000 },
      basic: { monthlyTokens: 1000000 },
      pro: { monthlyTokens: 10000000 },
      enterprise: { monthlyTokens: 100000000 }
    }

    const limit = limits[this.plan]?.monthlyTokens || 0
    return {
      current: this.usageMonthly || 0,
      limit,
      remaining: Math.max(0, limit - (this.usageMonthly || 0)),
      exceeded: (this.usageMonthly || 0) >= limit
    }
  }

  /**
   * 转换为JSON（隐藏敏感信息）
   */
  toJSON() {
    const values = Object.assign({}, this.get())
    delete values.passwordHash
    delete values.verificationToken
    delete values.resetPasswordToken
    return values
  }
}

// 定义模型
User.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => `cu_${uuidv4()}`
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 100]
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'deleted'),
      defaultValue: 'active'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified'
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      field: 'verification_token'
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      field: 'reset_password_token'
    },
    plan: {
      type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
      defaultValue: 'free'
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0
    },
    usageMonthly: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'usage_monthly'
    },
    usageTotal: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'usage_total'
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'client_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.passwordHash = await bcrypt.hash(user.password, 10)
          delete user.password
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.passwordHash = await bcrypt.hash(user.password, 10)
          delete user.password
        }
      }
    }
  }
)

module.exports = User
