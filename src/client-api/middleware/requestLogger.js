/**
 * 请求日志中间件
 * Request Logging Middleware
 */

module.exports = (logger) => (req, res, next) => {
  const startTime = Date.now()

  // 记录请求信息
  const requestInfo = {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  }

  // 保存原始的end方法
  const originalEnd = res.end

  // 重写end方法以记录响应
  res.end = function (...args) {
    // 恢复原始方法
    res.end = originalEnd

    // 调用原始方法
    res.end.apply(res, args)

    // 计算响应时间
    const duration = Date.now() - startTime

    // 记录响应信息
    const logData = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    }

    // 根据状态码决定日志级别
    if (res.statusCode >= 500) {
      logger.error('Client API Request Error:', logData)
    } else if (res.statusCode >= 400) {
      logger.warn('Client API Request Warning:', logData)
    } else {
      logger.info('Client API Request:', logData)
    }
  }

  next()
}
