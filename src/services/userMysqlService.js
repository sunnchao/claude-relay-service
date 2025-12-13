/**
 * 用户端 MySQL 查询服务
 * 提供优化的 MySQL 查询用于客户端数据获取
 */

const mysqlService = require('./mysqlService')
const logger = require('../utils/logger')

class UserMysqlService {
  /**
   * 检查 MySQL 是否可用
   */
  isAvailable() {
    return mysqlService.isConnectionHealthy()
  }

  /**
   * 获取用户的 API Keys 列表（从 MySQL）
   * @param {string} userId - 用户 ID
   * @param {boolean} includeDeleted - 是否包含已删除的 Keys
   * @returns {Promise<Array>} API Keys 列表
   */
  async getUserApiKeys(userId, includeDeleted = false) {
    if (!this.isAvailable()) {
      return null
    }

    try {
      let sql = `
        SELECT
          ak.id,
          ak.name,
          ak.description,
          ak.api_key_plain,
          ak.token_limit,
          ak.is_active,
          ak.created_at,
          ak.updated_at,
          ak.last_used_at,
          ak.expires_at,
          ak.daily_cost_limit,
          ak.total_cost_limit,
          ak.is_deleted,
          ak.deleted_at,
          ak.deleted_by,
          ak.deleted_by_type,
          ak.permissions,
          COALESCE(usage_stats.total_requests, 0) as total_requests,
          COALESCE(usage_stats.total_input_tokens, 0) as total_input_tokens,
          COALESCE(usage_stats.total_output_tokens, 0) as total_output_tokens,
          COALESCE(usage_stats.total_cost, 0) as total_cost,
          COALESCE(daily_stats.daily_cost, 0) as daily_cost
        FROM api_keys ak
        LEFT JOIN (
          SELECT
            api_key_id,
            COUNT(*) as total_requests,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(cost) as total_cost
          FROM usage_logs
          GROUP BY api_key_id
        ) usage_stats ON ak.id = usage_stats.api_key_id
        LEFT JOIN (
          SELECT
            api_key_id,
            SUM(cost) as daily_cost
          FROM usage_logs
          WHERE DATE(usage_timestamp) = CURDATE()
          GROUP BY api_key_id
        ) daily_stats ON ak.id = daily_stats.api_key_id
        WHERE ak.user_id = ?
      `

      if (!includeDeleted) {
        sql += ' AND (ak.is_deleted = FALSE OR ak.is_deleted IS NULL)'
      }

      sql += ' ORDER BY ak.created_at DESC'

      const results = await mysqlService.query(sql, [userId])
      return results
    } catch (error) {
      logger.error('❌ UserMysqlService.getUserApiKeys error:', error)
      return null
    }
  }

  /**
   * 获取用户的使用统计（从 MySQL）
   * @param {string} userId - 用户 ID
   * @param {Object} options - 查询选项
   * @param {string} options.period - 时间范围 (day, week, month, year)
   * @param {string} options.model - 可选的模型过滤
   * @returns {Promise<Object>} 使用统计
   */
  async getUserUsageStats(userId, options = {}) {
    if (!this.isAvailable()) {
      return null
    }

    const { period = 'week', model } = options

    try {
      // 计算时间范围
      let dateFilter = ''
      switch (period) {
        case 'day':
          dateFilter = 'DATE(ul.usage_timestamp) = CURDATE()'
          break
        case 'week':
          dateFilter = 'ul.usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
          break
        case 'month':
          dateFilter = 'ul.usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
          break
        case 'year':
          dateFilter = 'ul.usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)'
          break
        default:
          dateFilter = 'ul.usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
      }

      // 总计统计
      let totalSql = `
        SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(ul.input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(ul.output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(ul.cost), 0) as total_cost
        FROM usage_logs ul
        INNER JOIN api_keys ak ON ul.api_key_id = ak.id
        WHERE ak.user_id = ? AND ${dateFilter}
      `

      const totalParams = [userId]

      if (model) {
        totalSql += ' AND ul.model = ?'
        totalParams.push(model)
      }

      const totalResults = await mysqlService.query(totalSql, totalParams)
      const totals = totalResults?.[0] || {
        total_requests: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost: 0
      }

      // 按日期统计
      let dailySql = `
        SELECT
          DATE(ul.usage_timestamp) as date,
          COUNT(*) as requests,
          COALESCE(SUM(ul.input_tokens), 0) as input_tokens,
          COALESCE(SUM(ul.output_tokens), 0) as output_tokens,
          COALESCE(SUM(ul.cost), 0) as cost
        FROM usage_logs ul
        INNER JOIN api_keys ak ON ul.api_key_id = ak.id
        WHERE ak.user_id = ? AND ${dateFilter}
      `

      const dailyParams = [userId]

      if (model) {
        dailySql += ' AND ul.model = ?'
        dailyParams.push(model)
      }

      dailySql += ' GROUP BY DATE(ul.usage_timestamp) ORDER BY date DESC'

      const dailyResults = await mysqlService.query(dailySql, dailyParams)

      // 按模型统计
      let modelSql = `
        SELECT
          ul.model,
          COUNT(*) as requests,
          COALESCE(SUM(ul.input_tokens), 0) as input_tokens,
          COALESCE(SUM(ul.output_tokens), 0) as output_tokens,
          COALESCE(SUM(ul.cost), 0) as cost
        FROM usage_logs ul
        INNER JOIN api_keys ak ON ul.api_key_id = ak.id
        WHERE ak.user_id = ? AND ${dateFilter}
      `

      const modelParams = [userId]

      if (model) {
        modelSql += ' AND ul.model = ?'
        modelParams.push(model)
      }

      modelSql += ' GROUP BY ul.model ORDER BY cost DESC'

      const modelResults = await mysqlService.query(modelSql, modelParams)

      return {
        totalRequests: parseInt(totals.total_requests) || 0,
        totalInputTokens: parseInt(totals.total_input_tokens) || 0,
        totalOutputTokens: parseInt(totals.total_output_tokens) || 0,
        totalCost: parseFloat(totals.total_cost) || 0,
        byDate: this._formatDailyStats(dailyResults),
        byModel: this._formatModelStats(modelResults)
      }
    } catch (error) {
      logger.error('❌ UserMysqlService.getUserUsageStats error:', error)
      return null
    }
  }

  /**
   * 获取指定 API Keys 的聚合使用统计
   * @param {Array<string>} apiKeyIds - API Key ID 列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 聚合统计
   */
  async getAggregatedUsageStats(apiKeyIds, options = {}) {
    if (!this.isAvailable() || !apiKeyIds || apiKeyIds.length === 0) {
      return null
    }

    const { period = 'week', model } = options

    try {
      // 计算时间范围
      let dateFilter = ''
      switch (period) {
        case 'day':
          dateFilter = 'DATE(usage_timestamp) = CURDATE()'
          break
        case 'week':
          dateFilter = 'usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
          break
        case 'month':
          dateFilter = 'usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
          break
        case 'year':
          dateFilter = 'usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)'
          break
        default:
          dateFilter = 'usage_timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
      }

      const placeholders = apiKeyIds.map(() => '?').join(',')

      // 总计统计
      let totalSql = `
        SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(cost), 0) as total_cost
        FROM usage_logs
        WHERE api_key_id IN (${placeholders}) AND ${dateFilter}
      `

      const totalParams = [...apiKeyIds]

      if (model) {
        totalSql += ' AND model = ?'
        totalParams.push(model)
      }

      const totalResults = await mysqlService.query(totalSql, totalParams)
      const totals = totalResults?.[0] || {
        total_requests: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost: 0
      }

      // 按日期统计
      let dailySql = `
        SELECT
          DATE(usage_timestamp) as date,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(cost), 0) as cost
        FROM usage_logs
        WHERE api_key_id IN (${placeholders}) AND ${dateFilter}
      `

      const dailyParams = [...apiKeyIds]

      if (model) {
        dailySql += ' AND model = ?'
        dailyParams.push(model)
      }

      dailySql += ' GROUP BY DATE(usage_timestamp) ORDER BY date DESC'

      const dailyResults = await mysqlService.query(dailySql, dailyParams)

      // 按模型统计
      let modelSql = `
        SELECT
          model,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(cost), 0) as cost
        FROM usage_logs
        WHERE api_key_id IN (${placeholders}) AND ${dateFilter}
      `

      const modelParams = [...apiKeyIds]

      if (model) {
        modelSql += ' AND model = ?'
        modelParams.push(model)
      }

      modelSql += ' GROUP BY model ORDER BY cost DESC'

      const modelResults = await mysqlService.query(modelSql, modelParams)

      return {
        totalRequests: parseInt(totals.total_requests) || 0,
        totalInputTokens: parseInt(totals.total_input_tokens) || 0,
        totalOutputTokens: parseInt(totals.total_output_tokens) || 0,
        totalCost: parseFloat(totals.total_cost) || 0,
        dailyStats: dailyResults || [],
        modelStats: modelResults || []
      }
    } catch (error) {
      logger.error('❌ UserMysqlService.getAggregatedUsageStats error:', error)
      return null
    }
  }

  /**
   * 获取单个 API Key 的详细信息
   * @param {string} keyId - API Key ID
   * @param {string} userId - 用户 ID（可选，用于权限验证）
   * @returns {Promise<Object>} API Key 详情
   */
  async getApiKeyById(keyId, userId = null) {
    if (!this.isAvailable()) {
      return null
    }

    try {
      let sql = `
        SELECT
          ak.*,
          COALESCE(usage_stats.total_requests, 0) as total_requests,
          COALESCE(usage_stats.total_input_tokens, 0) as total_input_tokens,
          COALESCE(usage_stats.total_output_tokens, 0) as total_output_tokens,
          COALESCE(usage_stats.total_cost, 0) as usage_total_cost,
          COALESCE(daily_stats.daily_cost, 0) as daily_cost
        FROM api_keys ak
        LEFT JOIN (
          SELECT
            api_key_id,
            COUNT(*) as total_requests,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(cost) as total_cost
          FROM usage_logs
          GROUP BY api_key_id
        ) usage_stats ON ak.id = usage_stats.api_key_id
        LEFT JOIN (
          SELECT
            api_key_id,
            SUM(cost) as daily_cost
          FROM usage_logs
          WHERE DATE(usage_timestamp) = CURDATE()
          GROUP BY api_key_id
        ) daily_stats ON ak.id = daily_stats.api_key_id
        WHERE ak.id = ?
      `

      const params = [keyId]

      if (userId) {
        sql += ' AND ak.user_id = ?'
        params.push(userId)
      }

      const results = await mysqlService.query(sql, params)
      return results?.[0] || null
    } catch (error) {
      logger.error('❌ UserMysqlService.getApiKeyById error:', error)
      return null
    }
  }

  /**
   * 获取用户的总使用量统计（用于 profile）
   * @param {string} userId - 用户 ID
   * @returns {Promise<Object>} 总使用量
   */
  async getUserTotalUsage(userId) {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const sql = `
        SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(ul.input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(ul.output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(ul.cost), 0) as total_cost
        FROM usage_logs ul
        INNER JOIN api_keys ak ON ul.api_key_id = ak.id
        WHERE ak.user_id = ?
      `

      const results = await mysqlService.query(sql, [userId])
      const totals = results?.[0]

      if (!totals) {
        return {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0
        }
      }

      return {
        requests: parseInt(totals.total_requests) || 0,
        inputTokens: parseInt(totals.total_input_tokens) || 0,
        outputTokens: parseInt(totals.total_output_tokens) || 0,
        totalCost: parseFloat(totals.total_cost) || 0
      }
    } catch (error) {
      logger.error('❌ UserMysqlService.getUserTotalUsage error:', error)
      return null
    }
  }

  /**
   * 获取用户的 API Key 数量
   * @param {string} userId - 用户 ID
   * @returns {Promise<number>} API Key 数量
   */
  async getUserApiKeyCount(userId) {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM api_keys
        WHERE user_id = ? AND (is_deleted = FALSE OR is_deleted IS NULL)
      `

      const results = await mysqlService.query(sql, [userId])
      return parseInt(results?.[0]?.count) || 0
    } catch (error) {
      logger.error('❌ UserMysqlService.getUserApiKeyCount error:', error)
      return null
    }
  }

  /**
   * 格式化日期统计数据
   * @private
   */
  _formatDailyStats(results) {
    if (!results || results.length === 0) {
      return {}
    }

    const byDate = {}
    for (const row of results) {
      const dateStr =
        row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date)
      byDate[dateStr] = {
        requests: parseInt(row.requests) || 0,
        inputTokens: parseInt(row.input_tokens) || 0,
        outputTokens: parseInt(row.output_tokens) || 0,
        cost: parseFloat(row.cost) || 0
      }
    }
    return byDate
  }

  /**
   * 格式化模型统计数据
   * @private
   */
  _formatModelStats(results) {
    if (!results || results.length === 0) {
      return {}
    }

    const byModel = {}
    for (const row of results) {
      byModel[row.model] = {
        requests: parseInt(row.requests) || 0,
        inputTokens: parseInt(row.input_tokens) || 0,
        outputTokens: parseInt(row.output_tokens) || 0,
        cost: parseFloat(row.cost) || 0
      }
    }
    return byModel
  }
}

// 创建单例实例
const userMysqlService = new UserMysqlService()

module.exports = userMysqlService
