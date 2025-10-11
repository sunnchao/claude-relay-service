/**
 * 速率限制中间件
 * Rate Limiting Middleware
 */

const { RateLimiterRedis } = require('rate-limiter-flexible');
const redisClient = require('../../models/redis');
const clientConfig = require('../../../config/client-config');

// 创建速率限制器的工厂函数（延迟初始化）
let globalRateLimiter = null;
let loginRateLimiter = null;
let registerRateLimiter = null;

// 初始化速率限制器
const initRateLimiters = () => {
  const client = redisClient.getClient();
  if (!client) {
    throw new Error('Redis client not initialized');
  }

  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiterRedis({
      storeClient: client,
      keyPrefix: clientConfig.redis.keyPrefix.rateLimit + 'global',
      points: clientConfig.rateLimit.global.points,
      duration: clientConfig.rateLimit.global.duration,
      blockDuration: clientConfig.rateLimit.global.blockDuration,
      execEvenly: true
    });
  }

  if (!loginRateLimiter) {
    loginRateLimiter = new RateLimiterRedis({
      storeClient: client,
      keyPrefix: clientConfig.redis.keyPrefix.rateLimit + 'login',
      points: clientConfig.rateLimit.login.points,
      duration: clientConfig.rateLimit.login.duration,
      blockDuration: clientConfig.rateLimit.login.blockDuration
    });
  }

  if (!registerRateLimiter) {
    registerRateLimiter = new RateLimiterRedis({
      storeClient: client,
      keyPrefix: clientConfig.redis.keyPrefix.rateLimit + 'register',
      points: clientConfig.rateLimit.register.points,
      duration: clientConfig.rateLimit.register.duration,
      blockDuration: clientConfig.rateLimit.register.blockDuration
    });
  }
};

// API调用速率限制器（动态创建）
const apiRateLimiters = new Map();

// 获取客户端IP
const getClientIp = (req) => {
  return req.ip ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress;
};

// 全局速率限制中间件
exports.global = async (req, res, next) => {
  try {
    // 确保限制器已初始化
    if (!globalRateLimiter) {
      initRateLimiters();
    }

    const ip = getClientIp(req);
    await globalRateLimiter.consume(ip);
    next();
  } catch (error) {
    if (error instanceof Error) {
      return next(error);
    }

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Global rate limit exceeded. Please slow down.',
      retryAfter: Math.round(error.msBeforeNext / 1000) || 60
    });
  }
};

// 登录速率限制中间件
exports.login = async (req, res, next) => {
  try {
    // 确保限制器已初始化
    if (!loginRateLimiter) {
      initRateLimiters();
    }

    const ip = getClientIp(req);
    const key = `${ip}:${req.body?.email || 'unknown'}`;

    await loginRateLimiter.consume(key);
    next();
  } catch (error) {
    if (error instanceof Error) {
      return next(error);
    }

    res.status(429).json({
      error: 'Too Many Login Attempts',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: Math.round(error.msBeforeNext / 1000) || 900
    });
  }
};

// 注册速率限制中间件
exports.register = async (req, res, next) => {
  try {
    // 确保限制器已初始化
    if (!registerRateLimiter) {
      initRateLimiters();
    }

    const ip = getClientIp(req);
    await registerRateLimiter.consume(ip);
    next();
  } catch (error) {
    if (error instanceof Error) {
      return next(error);
    }

    res.status(429).json({
      error: 'Too Many Registration Attempts',
      message: 'Registration rate limit exceeded. Please try again later.',
      retryAfter: Math.round(error.msBeforeNext / 1000) || 3600
    });
  }
};

// API Key速率限制中间件
exports.apiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API Key required'
      });
    }

    // 从请求上下文获取已验证的Key信息
    const keyInfo = req.keyInfo;
    if (!keyInfo) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API Key'
      });
    }

    // 获取或创建该Key的速率限制器
    let rateLimiter = apiRateLimiters.get(keyInfo.id);
    if (!rateLimiter) {
      const client = redisClient.getClient();
      if (!client) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Rate limiting service temporarily unavailable'
        });
      }

      rateLimiter = new RateLimiterRedis({
        storeClient: client,
        keyPrefix: `${clientConfig.rateLimit.api.keyPrefix}${keyInfo.id}`,
        points: keyInfo.rateLimit.rpm,
        duration: 60, // 1分钟
        blockDuration: clientConfig.rateLimit.api.blockDuration,
        execEvenly: true
      });
      apiRateLimiters.set(keyInfo.id, rateLimiter);
    }

    // 消费速率限制
    const rateLimitRes = await rateLimiter.consume(keyInfo.id);

    // 设置速率限制响应头
    res.set({
      'X-RateLimit-Limit': keyInfo.rateLimit.rpm,
      'X-RateLimit-Remaining': rateLimitRes.remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString()
    });

    next();
  } catch (error) {
    if (error instanceof Error) {
      return next(error);
    }

    // 速率限制超出
    res.set({
      'X-RateLimit-Limit': req.keyInfo?.rateLimit?.rpm || 60,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(Date.now() + (error.msBeforeNext || 60000)).toISOString(),
      'Retry-After': Math.round((error.msBeforeNext || 60000) / 1000)
    });

    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'API rate limit exceeded for this key',
      retryAfter: Math.round((error.msBeforeNext || 60000) / 1000)
    });
  }
};

// 清理过期的速率限制器（定期调用）
exports.cleanup = () => {
  const now = Date.now();
  for (const [keyId, limiter] of apiRateLimiters.entries()) {
    // 如果超过1小时没有使用，移除限制器
    if (!limiter.lastUsed || now - limiter.lastUsed > 3600000) {
      apiRateLimiters.delete(keyId);
    }
  }
};

// 每10分钟清理一次
setInterval(exports.cleanup, 600000);