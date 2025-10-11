/**
 * 客户端用户数据模型
 * Client User Data Model
 */

const redisClient = require('../../models/redis');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const clientConfig = require('../../../config/client-config');

// 获取 Redis 客户端的辅助函数
const getRedisClient = () => {
  const client = redisClient.getClient();
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
};

class ClientUser {
  constructor(data) {
    this.id = data.id || `cu_${uuidv4()}`;
    this.email = data.email;
    this.username = data.username;
    this.passwordHash = data.passwordHash;
    this.status = data.status || 'active';
    this.emailVerified = data.emailVerified || false;
    this.verificationToken = data.verificationToken;
    this.resetPasswordToken = data.resetPasswordToken;
    this.plan = data.plan || 'free';
    this.balance = data.balance || 0;
    this.usage = data.usage || { monthly: 0, total: 0 };
    this.settings = data.settings || {
      notifications: true,
      twoFactorEnabled: false
    };
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastLoginAt = data.lastLoginAt;
  }

  // 转换为JSON
  toJSON() {
    const obj = { ...this };
    delete obj.passwordHash; // 不返回密码哈希
    delete obj.verificationToken;
    delete obj.resetPasswordToken;
    return obj;
  }

  // 创建新用户
  static async create(userData) {
    const redis = getRedisClient();
    const { email, username, password } = userData;

    // 检查邮箱是否已存在
    const existingEmail = await redis.get(`${clientConfig.redis.keyPrefix.userEmail}${email}`);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, clientConfig.security.bcryptRounds);

    // 生成验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 创建用户对象
    const user = new ClientUser({
      email,
      username,
      passwordHash,
      verificationToken,
      emailVerified: clientConfig.development.skipEmailVerification
    });

    // 保存到Redis
    const pipeline = redis.pipeline();

    // 保存用户数据
    pipeline.set(
      `${clientConfig.redis.keyPrefix.user}${user.id}`,
      JSON.stringify(user)
    );

    // 创建邮箱索引
    pipeline.set(
      `${clientConfig.redis.keyPrefix.userEmail}${email}`,
      user.id
    );

    // 设置验证令牌（24小时过期）
    if (!clientConfig.development.skipEmailVerification) {
      pipeline.setex(
        `${clientConfig.redis.keyPrefix.verification}${verificationToken}`,
        clientConfig.registration.emailVerificationExpiry / 1000,
        user.id
      );
    }

    await pipeline.exec();

    return user;
  }

  // 通过ID查找用户
  static async findById(userId) {
    const redis = getRedisClient();
    const userData = await redis.get(`${clientConfig.redis.keyPrefix.user}${userId}`);

    if (!userData) {
      return null;
    }

    return new ClientUser(JSON.parse(userData));
  }

  // 通过邮箱查找用户
  static async findByEmail(email) {
    const redis = getRedisClient();
    const userId = await redis.get(`${clientConfig.redis.keyPrefix.userEmail}${email}`);

    if (!userId) {
      return null;
    }

    return this.findById(userId);
  }

  // 验证密码
  async verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  // 更新用户信息
  async update(updates) {
    const redis = getRedisClient();

    // 更新字段
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'email') { // 不允许更新ID和邮箱
        this[key] = updates[key];
      }
    });

    this.updatedAt = new Date().toISOString();

    // 保存到Redis
    await redis.set(
      `${clientConfig.redis.keyPrefix.user}${this.id}`,
      JSON.stringify(this)
    );

    return this;
  }

  // 验证邮箱
  static async verifyEmail(token) {
    const redis = getRedisClient();
    const userId = await redis.get(`${clientConfig.redis.keyPrefix.verification}${token}`);

    if (!userId) {
      throw new Error('Invalid or expired verification token');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户状态
    await user.update({
      emailVerified: true,
      verificationToken: null
    });

    // 删除验证令牌
    await redis.del(`${clientConfig.redis.keyPrefix.verification}${token}`);

    return user;
  }

  // 生成密码重置令牌
  async generateResetToken() {
    const redis = getRedisClient();
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 保存令牌（1小时过期）
    await redis.setex(
      `${clientConfig.redis.keyPrefix.resetToken}${resetToken}`,
      3600,
      this.id
    );

    this.resetPasswordToken = resetToken;
    await this.update({ resetPasswordToken });

    return resetToken;
  }

  // 重置密码
  static async resetPassword(token, newPassword) {
    const redis = getRedisClient();
    const userId = await redis.get(`${clientConfig.redis.keyPrefix.resetToken}${token}`);

    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(newPassword, clientConfig.security.bcryptRounds);

    // 更新密码
    await user.update({
      passwordHash,
      resetPasswordToken: null
    });

    // 删除重置令牌
    await redis.del(`${clientConfig.redis.keyPrefix.resetToken}${token}`);

    return user;
  }

  // 删除用户
  async delete() {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();

    // 删除用户数据
    pipeline.del(`${clientConfig.redis.keyPrefix.user}${this.id}`);

    // 删除邮箱索引
    pipeline.del(`${clientConfig.redis.keyPrefix.userEmail}${this.email}`);

    // 删除相关的会话和令牌
    // TODO: 清理用户的所有API Key和使用记录

    await pipeline.exec();

    return true;
  }

  // 更新使用量
  async updateUsage(tokens, requests = 1) {
    const redis = getRedisClient();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 更新月度使用量
    await redis.hincrby(
      `${clientConfig.redis.keyPrefix.usage}monthly:${this.id}`,
      monthKey,
      tokens
    );

    // 更新总使用量
    await redis.hincrby(
      `${clientConfig.redis.keyPrefix.usage}total:${this.id}`,
      'tokens',
      tokens
    );
    await redis.hincrby(
      `${clientConfig.redis.keyPrefix.usage}total:${this.id}`,
      'requests',
      requests
    );

    // 更新用户对象中的使用量
    this.usage.monthly += tokens;
    this.usage.total += tokens;

    await this.update({ usage: this.usage });

    return this.usage;
  }

  // 检查使用限制
  async checkUsageLimit() {
    const plan = clientConfig.plans[this.plan];
    if (!plan) {
      throw new Error('Invalid plan');
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const redis = getRedisClient();
    const monthlyUsage = await redis.hget(
      `${clientConfig.redis.keyPrefix.usage}monthly:${this.id}`,
      monthKey
    );

    const currentUsage = parseInt(monthlyUsage || 0);
    const limit = plan.limits.monthlyTokens;

    return {
      current: currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage),
      exceeded: currentUsage >= limit
    };
  }

  // 获取用户统计
  async getStatistics() {
    const redis = getRedisClient();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 获取月度使用量
    const monthlyTokens = await redis.hget(
      `${clientConfig.redis.keyPrefix.usage}monthly:${this.id}`,
      monthKey
    );

    // 获取总使用量
    const totalStats = await redis.hgetall(
      `${clientConfig.redis.keyPrefix.usage}total:${this.id}`
    );

    // 获取API Key数量
    const keys = await redis.keys(`${clientConfig.redis.keyPrefix.apiKey}*:${this.id}`);

    return {
      monthly: {
        tokens: parseInt(monthlyTokens || 0),
        month: monthKey
      },
      total: {
        tokens: parseInt(totalStats?.tokens || 0),
        requests: parseInt(totalStats?.requests || 0)
      },
      apiKeys: keys.length,
      plan: this.plan,
      limits: clientConfig.plans[this.plan]?.limits
    };
  }
}

module.exports = ClientUser;