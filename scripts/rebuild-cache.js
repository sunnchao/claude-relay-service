#!/usr/bin/env node
/**
 * 重建Redis缓存
 * 用于Redis故障恢复后重建缓存索引
 */

const chalk = require('chalk')
const ora = require('ora')

// 确保使用混合模式
process.env.DATABASE_TYPE = 'hybrid'

async function rebuildCache() {
  console.log(chalk.blue.bold('\n🔄 Rebuilding Redis Cache\n'))

  const spinner = ora('Connecting to databases...').start()

  try {
    // 连接混合数据库
    const database = require('../src/models/database')
    await database.connect()
    spinner.succeed('Connected to hybrid database')

    // 重建API Key缓存索引
    spinner.start('Rebuilding API Key cache indexes...')
    const apiKeys = await database.getAllApiKeys()
    let apiKeyCount = 0

    for (const key of apiKeys) {
      if (key.hashedKey) {
        await database.setApiKeyHash(key.hashedKey, { id: key.id }, 3600)
        apiKeyCount++
      }

      // 清理并重建API Key缓存
      const cacheKey = `cache:api_key:${key.id}`
      await database.client.redisClient.client?.del(cacheKey)
    }
    spinner.succeed(`Rebuilt ${apiKeyCount} API Key indexes`)

    // 重建账户缓存
    spinner.start('Rebuilding account caches...')

    // Claude账户
    const claudeAccounts = await database.getAllClaudeAccounts()
    for (const account of claudeAccounts) {
      const cacheKey = `cache:claude_account:${account.id}`
      await database.client.redisClient.client?.del(cacheKey)
    }

    // Gemini账户
    const geminiAccounts = await database.getAllGeminiAccounts()
    for (const account of geminiAccounts) {
      const cacheKey = `cache:gemini_account:${account.id}`
      await database.client.redisClient.client?.del(cacheKey)
    }

    spinner.succeed(`Cleared account caches for refresh`)

    // 清理过期的会话
    spinner.start('Cleaning up expired sessions...')
    const redis = database.client.redisClient.client

    if (redis) {
      // 清理过期的OAuth会话
      const oauthSessions = await redis.keys('oauth_session:*')
      for (const key of oauthSessions) {
        const ttl = await redis.ttl(key)
        if (ttl === -2 || ttl === -1) {
          await redis.del(key)
        }
      }

      // 清理过期的sticky会话映射
      const stickyMappings = await redis.keys('sticky_session:*')
      for (const key of stickyMappings) {
        const ttl = await redis.ttl(key)
        if (ttl === -2 || ttl === -1) {
          await redis.del(key)
        }
      }
    }

    spinner.succeed('Cleaned up expired sessions')

    // 显示统计信息
    console.log(chalk.green('\n✅ Cache rebuild completed successfully!\n'))
    console.log(chalk.cyan('Summary:'))
    console.log(`  • API Key indexes: ${apiKeyCount}`)
    console.log(`  • Claude accounts: ${claudeAccounts.length}`)
    console.log(`  • Gemini accounts: ${geminiAccounts.length}`)
    console.log(`  • Expired sessions cleaned`)

    await database.disconnect()
  } catch (error) {
    spinner.fail('Cache rebuild failed')
    console.error(chalk.red('\nError:'), error.message)
    process.exit(1)
  }
}

// 主函数
async function main() {
  try {
    await rebuildCache()
    console.log(chalk.blue('\n💡 Tip: Run this after Redis restarts or data corruption.\n'))
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  }
}

// 执行
if (require.main === module) {
  main()
}

module.exports = { rebuildCache }
