/**
 * MySQL数据库连接配置
 * MySQL Database Connection Configuration
 */

const { Sequelize } = require('sequelize')
const logger = require('../../utils/logger')

// 数据库配置
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DATABASE || 'claude-relay',
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: parseInt(process.env.MYSQL_CONNECTION_LIMIT) || 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: '+08:00',
  dialectOptions: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: true,
    typeCast: function (field, next) {
      if (field.type === 'DATETIME') {
        return field.string()
      }
      return next()
    }
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
    charset: 'utf8mb4',
    dialectOptions: {
      collate: 'utf8mb4_unicode_ci'
    }
  }
}

// 创建Sequelize实例
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
)

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    logger.info('MySQL database connection has been established successfully.')
    return true
  } catch (error) {
    logger.error('Unable to connect to the MySQL database:', error)
    return false
  }
}

// 同步数据库（开发环境）
const syncDatabase = async (force = false) => {
  try {
    if (process.env.NODE_ENV === 'development' || process.env.FORCE_DB_SYNC === 'true') {
      await sequelize.sync({ force })
      logger.info('Database synchronized successfully')
    }
  } catch (error) {
    logger.error('Database synchronization failed:', error)
    throw error
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  Sequelize
}
