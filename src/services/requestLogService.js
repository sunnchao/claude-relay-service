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
        accountName,
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
          request_id, api_key_id, user_id, account_id, account_type, account_name, model,
          input_tokens, output_tokens, cache_create_tokens, cache_read_tokens,
          ephemeral_5m_tokens, ephemeral_1h_tokens, total_tokens,
          cost, cost_breakdown, is_long_context, usage_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const params = [
        requestId,
        apiKeyId || null,
        userId || null,
        accountId || null,
        accountType || null,
        accountName || null,
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
   * 分页查询使用日志
   * @param {Object} filters 过滤条件
   * @param {number} limit 返回记录数
   * @param {number} offset 偏移量
   * @returns {Promise<{records: Array, total: number, summary: Object}>}
   */
  async queryUsageLogs(filters = {}, limit = 50, offset = 0) {
    const emptySummary = {
      totalCost: 0,
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheCreateTokens: 0,
      totalCacheReadTokens: 0
    }

    if (!mysqlService.isConnectionHealthy()) {
      return {
        records: [],
        total: 0,
        summary: emptySummary
      }
    }

    try {
      const whereClauses = []
      const params = []

      const addEqualFilter = (field, value) => {
        if (value) {
          whereClauses.push(`${field} = ?`)
          params.push(value)
        }
      }

      addEqualFilter('ul.api_key_id', filters.apiKeyId)
      addEqualFilter('ul.user_id', filters.userId)
      addEqualFilter('ul.account_id', filters.accountId)
      addEqualFilter('ul.account_type', filters.accountType)
      addEqualFilter('ul.model', filters.model)

      if (filters.search) {
        const trimmed = filters.search.trim()
        if (trimmed) {
          const wildcard = `%${trimmed}%`
          whereClauses.push(
            '(ul.api_key_id LIKE ? OR ul.request_id LIKE ? OR ul.user_id LIKE ? OR ul.model LIKE ? OR ak.name LIKE ? OR ul.account_id LIKE ?)'
          )
          params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard)
        }
      }

      const startDate = filters.startDate ? new Date(filters.startDate) : null
      if (startDate && !isNaN(startDate.getTime())) {
        whereClauses.push('ul.usage_timestamp >= ?')
        params.push(startDate)
      }

      const endDate = filters.endDate ? new Date(filters.endDate) : null
      if (endDate && !isNaN(endDate.getTime())) {
        whereClauses.push('ul.usage_timestamp <= ?')
        params.push(endDate)
      }

      if (filters.isLongContext === true) {
        whereClauses.push('ul.is_long_context = true')
      } else if (filters.isLongContext === false) {
        whereClauses.push('ul.is_long_context = false')
      }

      const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
      const offsetNum = Math.max(parseInt(offset, 10) || 0, 0)

      const dataSql = `
        SELECT
          ul.id,
          ul.request_id,
          ul.api_key_id,
          ul.user_id,
          ul.account_id,
          ul.account_type,
          ul.account_name,
          ul.model,
          ul.input_tokens,
          ul.output_tokens,
          ul.cache_create_tokens,
          ul.cache_read_tokens,
          ul.ephemeral_5m_tokens,
          ul.ephemeral_1h_tokens,
          ul.total_tokens,
          ul.cost,
          ul.cost_breakdown,
          ul.is_long_context,
          ul.usage_timestamp,
          ul.created_at,
          ak.name AS api_key_name
        FROM usage_logs ul
        LEFT JOIN api_keys ak ON ak.id = ul.api_key_id
        ${whereClause}
        ORDER BY ul.usage_timestamp DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `

      const rows = (await mysqlService.query(dataSql, params)) || []

      const summarySql = `
        SELECT
          COUNT(1) AS total,
          COALESCE(SUM(ul.cost), 0) AS totalCost,
          COALESCE(SUM(ul.total_tokens), 0) AS totalTokens,
          COALESCE(SUM(ul.input_tokens), 0) AS totalInputTokens,
          COALESCE(SUM(ul.output_tokens), 0) AS totalOutputTokens,
          COALESCE(SUM(ul.cache_create_tokens), 0) AS totalCacheCreateTokens,
          COALESCE(SUM(ul.cache_read_tokens), 0) AS totalCacheReadTokens
        FROM usage_logs ul
        ${whereClause}
      `

      const summaryRows = await mysqlService.query(summarySql, params)
      const summaryRow = summaryRows && summaryRows.length ? summaryRows[0] : null

      const parseJson = (value) => {
        if (!value) {
          return null
        }
        if (typeof value === 'object') {
          return value
        }
        try {
          return JSON.parse(value)
        } catch (error) {
          logger.warn('⚠️ Failed to parse cost breakdown JSON:', error)
          return null
        }
      }

      const records = rows.map((row) => ({
        id: row.id,
        requestId: row.request_id,
        apiKeyId: row.api_key_id,
        apiKeyName: row.api_key_name || null,
        userId: row.user_id,
        accountId: row.account_id,
        accountType: row.account_type,
        accountName: row.account_name || null,
        model: row.model,
        inputTokens: Number(row.input_tokens) || 0,
        outputTokens: Number(row.output_tokens) || 0,
        cacheCreateTokens: Number(row.cache_create_tokens) || 0,
        cacheReadTokens: Number(row.cache_read_tokens) || 0,
        ephemeral5mTokens: Number(row.ephemeral_5m_tokens) || 0,
        ephemeral1hTokens: Number(row.ephemeral_1h_tokens) || 0,
        totalTokens: Number(row.total_tokens) || 0,
        cost: Number(row.cost) || 0,
        costBreakdown: parseJson(row.cost_breakdown),
        isLongContext: Boolean(row.is_long_context),
        usageTimestamp: row.usage_timestamp,
        createdAt: row.created_at
      }))

      return {
        records,
        total: summaryRow?.total || 0,
        summary: summaryRow
          ? {
              totalCost: Number(summaryRow.totalCost) || 0,
              totalTokens: Number(summaryRow.totalTokens) || 0,
              totalInputTokens: Number(summaryRow.totalInputTokens) || 0,
              totalOutputTokens: Number(summaryRow.totalOutputTokens) || 0,
              totalCacheCreateTokens: Number(summaryRow.totalCacheCreateTokens) || 0,
              totalCacheReadTokens: Number(summaryRow.totalCacheReadTokens) || 0
            }
          : emptySummary
      }
    } catch (error) {
      logger.error('❌ Failed to query usage logs list:', error)
      return {
        records: [],
        total: 0,
        summary: emptySummary
      }
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
