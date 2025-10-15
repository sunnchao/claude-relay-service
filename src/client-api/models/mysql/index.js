/**
 * MySQL模型索引和关联定义
 * MySQL Models Index and Associations
 */

const { sequelize, testConnection, syncDatabase } = require('../database')
const User = require('./User')
const ApiKey = require('./ApiKey')
const Session = require('./Session')
const UsageLog = require('./UsageLog')

// 定义模型关联
const setupAssociations = () => {
  // User -> ApiKeys (一对多)
  User.hasMany(ApiKey, {
    foreignKey: 'userId',
    as: 'apiKeys',
    onDelete: 'CASCADE'
  })
  ApiKey.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  })

  // User -> Sessions (一对多)
  User.hasMany(Session, {
    foreignKey: 'userId',
    as: 'sessions',
    onDelete: 'CASCADE'
  })
  Session.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  })

  // User -> UsageLogs (一对多)
  User.hasMany(UsageLog, {
    foreignKey: 'userId',
    as: 'usageLogs',
    onDelete: 'CASCADE'
  })
  UsageLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  })

  // ApiKey -> UsageLogs (一对多)
  ApiKey.hasMany(UsageLog, {
    foreignKey: 'apiKeyId',
    as: 'usageLogs',
    onDelete: 'CASCADE'
  })
  UsageLog.belongsTo(ApiKey, {
    foreignKey: 'apiKeyId',
    as: 'apiKey'
  })
}

// 初始化数据库
const initDatabase = async () => {
  try {
    // 测试连接
    const connected = await testConnection()
    if (!connected) {
      throw new Error('Failed to connect to MySQL database')
    }

    // 设置关联
    setupAssociations()

    // 同步数据库（开发环境）
    if (process.env.NODE_ENV === 'development' || process.env.FORCE_DB_SYNC === 'true') {
      await syncDatabase()
    }

    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

module.exports = {
  sequelize,
  User,
  ApiKey,
  Session,
  UsageLog,
  initDatabase,
  setupAssociations
}
