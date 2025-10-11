/**
 * 错误处理中间件
 * Error Handling Middleware
 */

const clientConfig = require('../../../config/client-config');

module.exports = (logger) => {
  return (err, req, res, next) => {
    // 记录错误
    logger.error('Client API Error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
      ip: req.ip
    });

    // 设置默认错误状态码
    const statusCode = err.statusCode || err.status || 500;

    // 构建错误响应
    const errorResponse = {
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };

    // 在开发环境中，暴露更多错误信息
    if (clientConfig.development.exposeErrors) {
      errorResponse.stack = err.stack;
      errorResponse.details = err.details;
    }

    // 特殊错误处理
    switch (err.name) {
      case 'ValidationError':
        res.status(400).json({
          ...errorResponse,
          error: 'ValidationError',
          message: 'Invalid request data',
          details: err.details
        });
        break;

      case 'UnauthorizedError':
      case 'JsonWebTokenError':
      case 'TokenExpiredError':
        res.status(401).json({
          ...errorResponse,
          error: 'Unauthorized',
          message: 'Authentication failed'
        });
        break;

      case 'ForbiddenError':
        res.status(403).json({
          ...errorResponse,
          error: 'Forbidden',
          message: 'Access denied'
        });
        break;

      case 'NotFoundError':
        res.status(404).json({
          ...errorResponse,
          error: 'NotFound',
          message: err.message || 'Resource not found'
        });
        break;

      case 'ConflictError':
        res.status(409).json({
          ...errorResponse,
          error: 'Conflict',
          message: err.message || 'Resource conflict'
        });
        break;

      case 'RateLimitError':
        res.status(429).json({
          ...errorResponse,
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
          retryAfter: err.retryAfter
        });
        break;

      case 'PayloadTooLargeError':
        res.status(413).json({
          ...errorResponse,
          error: 'PayloadTooLarge',
          message: 'Request payload too large'
        });
        break;

      default:
        // 通用错误响应
        res.status(statusCode).json(errorResponse);
    }
  };
};