/**
 * MySQL 数据库服务
 * 提供 MySQL 连接池管理和数据库操作
 */

const mysql = require('mysql2/promise')
const logger = require('../utils/logger')

class MySQLService {
  constructor() {
    this.pool = null
    this.isConnected = false
  }

  /**
   * 从环境变量获取 MySQL 配置
   */
  getMySQLConfig() {
    return {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306', 10),
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || '',
      connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
      queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT || '0', 10)
    }
  }

  /**
   * 初始化 MySQL 连接池
   */
  async initialize() {
    try {
      const config = this.getMySQLConfig()

      // 创建连接池
      this.pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionLimit: config.connectionLimit,
        queueLimit: config.queueLimit,
        waitForConnections: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      })

      // 测试连接
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()

      this.isConnected = true
      logger.info(
        `✅ MySQL connected successfully: ${config.host}:${config.port}/${config.database}`
      )
    } catch (error) {
      this.isConnected = false
      logger.error('❌ Failed to connect to MySQL:', error)
      // 不抛出错误，允许服务在没有MySQL的情况下运行
    }
  }

  /**
   * 获取连接池
   */
  getPool() {
    return this.pool
  }

  /**
   * 检查连接状态
   */
  isConnectionHealthy() {
    return this.isConnected && this.pool !== null
  }

  /**
   * 执行查询
   * @param {string} sql - SQL 语句
   * @param {Array} params - 参数
   * @returns {Promise<Array>} 查询结果
   */
  async query(sql, params = []) {
    if (!this.isConnectionHealthy()) {
      logger.warn('⚠️ MySQL is not connected, skipping query')
      return null
    }

    try {
      const [results] = await this.pool.execute(sql, params)
      return results
    } catch (error) {
      logger.error('❌ MySQL query error:', error)
      logger.database(`SQL: ${sql}, Params: ${JSON.stringify(params)}`)
      throw error
    }
  }

  /**
   * 执行批量插入
   * @param {string} sql - SQL 语句
   * @param {Array<Array>} values - 批量值数组
   * @returns {Promise<Object>} 执行结果
   */
  async batchInsert(sql, values) {
    if (!this.isConnectionHealthy()) {
      logger.warn('⚠️ MySQL is not connected, skipping batch insert')
      return null
    }

    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()

      const [result] = await connection.query(sql, [values])

      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      logger.error('❌ MySQL batch insert error:', error)
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.pool) {
      try {
        await this.pool.end()
        this.isConnected = false
        logger.info('✅ MySQL connection pool closed')
      } catch (error) {
        logger.error('❌ Error closing MySQL connection pool:', error)
      }
    }
  }

  /**
   * 获取连接池状态
   */
  async getPoolStatus() {
    if (!this.isConnectionHealthy()) {
      return {
        connected: false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0
      }
    }

    return {
      connected: true,
      activeConnections: this.pool._allConnections?.length || 0,
      idleConnections: this.pool._freeConnections?.length || 0,
      totalConnections: this.pool._allConnections?.length || 0
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    if (!this.isConnectionHealthy()) {
      return {
        healthy: false,
        message: 'MySQL is not connected'
      }
    }

    try {
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()

      return {
        healthy: true,
        message: 'MySQL connection is healthy'
      }
    } catch (error) {
      logger.error('❌ MySQL health check failed:', error)
      return {
        healthy: false,
        message: error.message
      }
    }
  }
}

// 创建单例实例
const mysqlService = new MySQLService()

module.exports = mysqlService
