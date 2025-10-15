/**
 * MySQL会话模型
 * MySQL Session Model
 */

const { DataTypes, Model } = require('sequelize')
const { sequelize } = require('../database')
const { v4: uuidv4 } = require('uuid')

class Session extends Model {
  /**
   * 检查会话是否有效
   */
  isValid() {
    return this.expiresAt && new Date(this.expiresAt) > new Date()
  }

  /**
   * 检查刷新令牌是否有效
   */
  isRefreshValid() {
    return this.refreshExpiresAt && new Date(this.refreshExpiresAt) > new Date()
  }

  /**
   * 延长会话
   */
  async extend(hours = 24) {
    const now = new Date()
    this.expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000)
    await this.save()
    return this.expiresAt
  }
}

// 定义模型
Session.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => `cs_${uuidv4()}`
    },
    userId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'user_id'
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true
    },
    refreshToken: {
      type: DataTypes.STRING(500),
      unique: true,
      field: 'refresh_token'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    refreshExpiresAt: {
      type: DataTypes.DATE,
      field: 'refresh_expires_at'
    }
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'client_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
)

module.exports = Session
