/**
 * 请求/响应日志记录服务
 * 记录 API 请求和响应到 MySQL 数据库
 */

const { v4: uuidv4 } = require('uuid')
const mysqlService = require('./mysqlService')
const logger = require('../utils/logger')

class RequestLogService {
  /**
   * 生成请求ID
   */
  generateRequestId() {
    return uuidv4()
  }

  /**
   * 记录请求日志
   * @param {Object} requestData - 请求数据
   * @returns {Promise<string>} 请求ID
   */
  async logRequest(requestData) {
    const requestId = requestData.requestId || this.generateRequestId()

    try {
      if (!mysqlService.isConnectionHealthy()) {
        logger.debug('⚠️ MySQL not available, skipping request log')
        return requestId
      }

      const {
        apiKeyId,
        apiKeyName,
        userId,
        accountId,
        accountType,
        model,
        endpoint,
        method,
        userAgent,
        ipAddress,
        headers,
        body,
        timestamp
      } = requestData

      const sql = `
        INSERT INTO request_logs (
          request_id, api_key_id, api_key_name, user_id, account_id, account_type,
          model, endpoint, method, user_agent, ip_address, request_headers,
          request_body, request_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const params = [
        requestId,
        apiKeyId || null,
        apiKeyName || null,
        userId || null,
        accountId || null,
        accountType || null,
        model || null,
        endpoint || null,
        method || 'POST',
        userAgent || null,
        ipAddress || null,
        headers ? JSON.stringify(headers) : null,
        body ? JSON.stringify(body) : null,
        timestamp || new Date()
      ]

      await mysqlService.query(sql, params)
      logger.database(`📝 Request logged to MySQL: ${requestId}`)
    } catch (error) {
      // 记录错误但不抛出，避免影响主流程
      logger.error('❌ Failed to log request to MySQL:', error)
    }

    return requestId
  }

  /**
   * 记录响应日志
   * @param {string} requestId - 请求ID
   * @param {Object} responseData - 响应数据
   */
  async logResponse(requestId, responseData) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        logger.debug('⚠️ MySQL not available, skipping response log')
        return
      }

      const { statusCode, headers, body, durationMs, errorMessage, isStream, timestamp } =
        responseData

      const sql = `
        INSERT INTO response_logs (
          request_id, status_code, response_headers, response_body,
          response_timestamp, duration_ms, error_message, is_stream
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `

      const params = [
        requestId,
        statusCode || null,
        headers ? JSON.stringify(headers) : null,
        body ? JSON.stringify(body) : null,
        timestamp || new Date(),
        durationMs || null,
        errorMessage || null,
        isStream || false
      ]

      await mysqlService.query(sql, params)
      logger.database(`📝 Response logged to MySQL: ${requestId}`)
    } catch (error) {
      // 记录错误但不抛出，避免影响主流程
      logger.error('❌ Failed to log response to MySQL:', error)
    }
  }

  /**
   * 记录使用统计
   * @param {string} requestId - 请求ID
   * @param {Object} usageData - 使用统计数据
   */
  async logUsage(requestId, usageData) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        logger.debug('⚠️ MySQL not available, skipping usage log')
        return
      }

      const {
        apiKeyId,
        userId,
        accountId,
        accountType,
        model,
        inputTokens,
        outputTokens,
        cacheCreateTokens,
        cacheReadTokens,
        ephemeral5mTokens,
        ephemeral1hTokens,
        totalTokens,
        cost,
        costBreakdown,
        isLongContext,
        timestamp
      } = usageData

      const sql = `
        INSERT INTO usage_logs (
          request_id, api_key_id, user_id, account_id, account_type, model,
          input_tokens, output_tokens, cache_create_tokens, cache_read_tokens,
          ephemeral_5m_tokens, ephemeral_1h_tokens, total_tokens,
          cost, cost_breakdown, is_long_context, usage_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const params = [
        requestId,
        apiKeyId || null,
        userId || null,
        accountId || null,
        accountType || null,
        model || null,
        inputTokens || 0,
        outputTokens || 0,
        cacheCreateTokens || 0,
        cacheReadTokens || 0,
        ephemeral5mTokens || 0,
        ephemeral1hTokens || 0,
        totalTokens || 0,
        cost || 0,
        costBreakdown ? JSON.stringify(costBreakdown) : null,
        isLongContext || false,
        timestamp || new Date()
      ]

      await mysqlService.query(sql, params)
      logger.database(
        `📝 Usage logged to MySQL: ${requestId} - Model: ${model}, Total tokens: ${totalTokens}, Cost: $${cost}`
      )
    } catch (error) {
      // 记录错误但不抛出，避免影响主流程
      logger.error('❌ Failed to log usage to MySQL:', error)
    }
  }

  /**
   * 完整记录（请求+响应+使用统计）
   * @param {Object} logData - 完整日志数据
   */
  async logComplete(logData) {
    const { request, response, usage } = logData
    const requestId = await this.logRequest(request)

    // 异步记录响应和使用统计，不阻塞主流程
    if (response) {
      this.logResponse(requestId, response).catch((error) => {
        logger.error('❌ Failed to log response:', error)
      })
    }

    if (usage) {
      this.logUsage(requestId, { ...usage, requestId }).catch((error) => {
        logger.error('❌ Failed to log usage:', error)
      })
    }

    return requestId
  }

  /**
   * 查询请求日志
   * @param {Object} filters - 查询过滤条件
   * @param {number} limit - 返回记录数限制
   * @param {number} offset - 偏移量
   */
  async queryRequestLogs(filters = {}, limit = 100, offset = 0) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        return []
      }

      let sql = 'SELECT * FROM request_logs WHERE 1=1'
      const params = []

      if (filters.apiKeyId) {
        sql += ' AND api_key_id = ?'
        params.push(filters.apiKeyId)
      }

      if (filters.userId) {
        sql += ' AND user_id = ?'
        params.push(filters.userId)
      }

      if (filters.accountId) {
        sql += ' AND account_id = ?'
        params.push(filters.accountId)
      }

      if (filters.model) {
        sql += ' AND model = ?'
        params.push(filters.model)
      }

      if (filters.startDate) {
        sql += ' AND request_timestamp >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        sql += ' AND request_timestamp <= ?'
        params.push(filters.endDate)
      }

      sql += ' ORDER BY request_timestamp DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const results = await mysqlService.query(sql, params)
      return results
    } catch (error) {
      logger.error('❌ Failed to query request logs:', error)
      return []
    }
  }

  /**
   * 查询响应日志
   * @param {string} requestId - 请求ID
   */
  async queryResponseLog(requestId) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        return null
      }

      const sql = 'SELECT * FROM response_logs WHERE request_id = ?'
      const results = await mysqlService.query(sql, [requestId])

      return results && results.length > 0 ? results[0] : null
    } catch (error) {
      logger.error('❌ Failed to query response log:', error)
      return null
    }
  }

  /**
   * 查询使用统计日志
   * @param {string} requestId - 请求ID
   */
  async queryUsageLog(requestId) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        return null
      }

      const sql = 'SELECT * FROM usage_logs WHERE request_id = ?'
      const results = await mysqlService.query(sql, [requestId])

      return results && results.length > 0 ? results[0] : null
    } catch (error) {
      logger.error('❌ Failed to query usage log:', error)
      return null
    }
  }

  /**
   * 查询完整日志（请求+响应+使用统计）
   * @param {string} requestId - 请求ID
   */
  async queryCompleteLogs(requestId) {
    try {
      const [request, response, usage] = await Promise.all([
        this.queryRequestLog(requestId),
        this.queryResponseLog(requestId),
        this.queryUsageLog(requestId)
      ])

      return {
        request,
        response,
        usage
      }
    } catch (error) {
      logger.error('❌ Failed to query complete logs:', error)
      return null
    }
  }

  /**
   * 查询单个请求日志
   * @param {string} requestId - 请求ID
   */
  async queryRequestLog(requestId) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        return null
      }

      const sql = 'SELECT * FROM request_logs WHERE request_id = ?'
      const results = await mysqlService.query(sql, [requestId])

      return results && results.length > 0 ? results[0] : null
    } catch (error) {
      logger.error('❌ Failed to query request log:', error)
      return null
    }
  }

  /**
   * 删除旧日志
   * @param {number} daysToKeep - 保留天数
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      if (!mysqlService.isConnectionHealthy()) {
        logger.warn('⚠️ MySQL not available, skipping log cleanup')
        return
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      // 删除请求日志（响应和使用统计会通过外键级联删除）
      const sql = 'DELETE FROM request_logs WHERE created_at < ?'
      const result = await mysqlService.query(sql, [cutoffDate])

      logger.info(
        `✅ Cleaned up old logs: ${result.affectedRows} records deleted (older than ${daysToKeep} days)`
      )
    } catch (error) {
      logger.error('❌ Failed to cleanup old logs:', error)
    }
  }
}

// 创建单例实例
const requestLogService = new RequestLogService()

module.exports = requestLogService
