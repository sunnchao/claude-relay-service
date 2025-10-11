/**
 * MySQL使用日志模型
 * MySQL Usage Log Model
 */

const { DataTypes, Model } = require('sequelize')
const { sequelize } = require('../database')

class UsageLog extends Model {
  /**
   * 计算费用
   */
  calculateCost(pricePerToken = 0.00001) {
    return (this.totalTokens || 0) * pricePerToken
  }

  /**
   * 获取简要信息
   */
  getSummary() {
    return {
      model: this.model,
      tokens: this.totalTokens,
      cost: this.cost,
      responseTime: this.responseTimeMs,
      status: this.statusCode
    }
  }
}

// 定义模型
UsageLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'user_id'
    },
    apiKeyId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'api_key_id'
    },
    requestId: {
      type: DataTypes.STRING(100),
      unique: true,
      field: 'request_id'
    },
    model: {
      type: DataTypes.STRING(50)
    },
    endpoint: {
      type: DataTypes.STRING(255)
    },
    method: {
      type: DataTypes.STRING(10)
    },
    requestTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'request_tokens'
    },
    responseTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'response_tokens'
    },
    totalTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_tokens'
    },
    cost: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0
    },
    statusCode: {
      type: DataTypes.INTEGER,
      field: 'status_code'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message'
    },
    responseTimeMs: {
      type: DataTypes.INTEGER,
      field: 'response_time_ms'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  },
  {
    sequelize,
    modelName: 'UsageLog',
    tableName: 'client_usage_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
)

module.exports = UsageLog