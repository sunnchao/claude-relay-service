#!/usr/bin/env node
/**
 * 迁移到混合数据库模式
 * 将现有的Redis或MySQL数据迁移到混合模式
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const ora = require('ora')

// 设置为混合模式以便正确初始化
process.env.DATABASE_TYPE = 'hybrid'

const config = require('../config/config')

async function migrateFromRedis() {
  console.log(chalk.cyan('\n📦 Migrating data from Redis to hybrid mode...\n'))

  const spinner = ora('Connecting to databases...').start()

  try {
    // 连接到Redis
    const redisClient = require('../src/models/redis')
    await redisClient.connect()
    spinner.succeed('Connected to Redis')

    // 连接到MySQL
    spinner.start('Connecting to MySQL...')
    const mysqlClient = require('../src/models/mysql')
    await mysqlClient.connect()
    spinner.succeed('Connected to MySQL')

    // 迁移API Keys
    spinner.start('Migrating API Keys...')
    const apiKeys = await redisClient.getAllApiKeys()
    let apiKeyCount = 0

    for (const key of apiKeys) {
      try {
        await mysqlClient.setApiKey(key.id, key)
        apiKeyCount++
      } catch (error) {
        console.log(chalk.yellow(`\n  ⚠️ Failed to migrate API Key ${key.id}: ${error.message}`))
      }
    }
    spinner.succeed(`Migrated ${apiKeyCount} API Keys`)

    // 迁移Claude账户
    spinner.start('Migrating Claude accounts...')
    const claudeAccounts = await redisClient.getAllClaudeAccounts()
    let claudeCount = 0

    for (const account of claudeAccounts) {
      try {
        await mysqlClient.setClaudeAccount(account.id, account)
        claudeCount++
      } catch (error) {
        console.log(
          chalk.yellow(`\n  ⚠️ Failed to migrate Claude account ${account.id}: ${error.message}`)
        )
      }
    }
    spinner.succeed(`Migrated ${claudeCount} Claude accounts`)

    // 迁移Gemini账户
    spinner.start('Migrating Gemini accounts...')
    const geminiAccounts = await redisClient.getAllGeminiAccounts()
    let geminiCount = 0

    for (const account of geminiAccounts) {
      try {
        await mysqlClient.setGeminiAccount(account.id, account)
        geminiCount++
      } catch (error) {
        console.log(
          chalk.yellow(`\n  ⚠️ Failed to migrate Gemini account ${account.id}: ${error.message}`)
        )
      }
    }
    spinner.succeed(`Migrated ${geminiCount} Gemini accounts`)

    // 断开连接
    await redisClient.disconnect()
    await mysqlClient.disconnect()

    console.log(chalk.green('\n✅ Migration from Redis completed successfully!'))
    console.log(chalk.cyan('\nSummary:'))
    console.log(`  • API Keys: ${apiKeyCount}`)
    console.log(`  • Claude Accounts: ${claudeCount}`)
    console.log(`  • Gemini Accounts: ${geminiCount}`)
  } catch (error) {
    spinner.fail('Migration failed')
    console.error(chalk.red('\nError:'), error.message)
    throw error
  }
}

async function migrateFromMySQL() {
  console.log(chalk.cyan('\n📦 Migrating data from MySQL to hybrid mode...\n'))

  const spinner = ora('Connecting to databases...').start()

  try {
    // 连接到MySQL
    const mysqlClient = require('../src/models/mysql')
    await mysqlClient.connect()
    spinner.succeed('Connected to MySQL')

    // 连接到Redis
    spinner.start('Connecting to Redis...')
    const redisClient = require('../src/models/redis')
    await redisClient.connect()
    spinner.succeed('Connected to Redis')

    // 同步管理员凭据到Redis（用于会话管理）
    spinner.start('Syncing admin credentials to Redis...')
    const pool = mysqlClient.getPool()

    if (pool) {
      const [admins] = await pool.query('SELECT * FROM admin_users')

      for (const admin of admins) {
        const adminData = {
          id: admin.id,
          username: admin.username,
          password: admin.password_hash,
          role: admin.role,
          createdAt: admin.created_at.toISOString()
        }

        await redisClient.client.hset(`admin:${admin.id}`, adminData)
        await redisClient.client.set(`admin_username:${admin.username}`, admin.id)
      }

      spinner.succeed(`Synced ${admins.length} admin users to Redis`)
    }

    // 为API Keys创建Redis缓存索引
    spinner.start('Creating Redis cache indexes for API Keys...')
    const apiKeys = await mysqlClient.getAllApiKeys()
    let indexCount = 0

    for (const key of apiKeys) {
      if (key.hashedKey) {
        await redisClient.setApiKeyHash(key.hashedKey, { id: key.id }, 3600)
        indexCount++
      }
    }
    spinner.succeed(`Created ${indexCount} Redis cache indexes`)

    // 断开连接
    await mysqlClient.disconnect()
    await redisClient.disconnect()

    console.log(chalk.green('\n✅ Migration from MySQL completed successfully!'))
    console.log(chalk.cyan('\nSummary:'))
    console.log(`  • Admin users synced to Redis`)
    console.log(`  • API Key indexes created: ${indexCount}`)
  } catch (error) {
    spinner.fail('Migration failed')
    console.error(chalk.red('\nError:'), error.message)
    throw error
  }
}

async function detectCurrentMode() {
  // 检查当前运行模式
  const initFiles = {
    redis: path.join(__dirname, '..', 'data', 'init.json'),
    mysql: path.join(__dirname, '..', 'data', 'init-mysql.json'),
    hybrid: path.join(__dirname, '..', 'data', 'init-hybrid.json')
  }

  if (fs.existsSync(initFiles.hybrid)) {
    return 'hybrid'
  } else if (fs.existsSync(initFiles.mysql)) {
    return 'mysql'
  } else if (fs.existsSync(initFiles.redis)) {
    return 'redis'
  }

  // 如果没有初始化文件，检查配置
  return config.database?.type || 'redis'
}

async function main() {
  console.log(chalk.blue.bold('\n🚀 Hybrid Database Migration Tool\n'))

  const currentMode = await detectCurrentMode()
  console.log(chalk.cyan(`📊 Current database mode: ${currentMode}\n`))

  if (currentMode === 'hybrid') {
    console.log(chalk.green('✅ Already running in hybrid mode!'))
    console.log(chalk.yellow('\nNo migration needed.\n'))
    return
  }

  console.log(chalk.yellow('⚠️ This will migrate your data to hybrid mode (Redis + MySQL).'))
  console.log(chalk.yellow('   Please ensure both databases are running and accessible.\n'))

  // 询问用户确认
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const answer = await new Promise((resolve) => {
    rl.question('Continue with migration? (yes/no): ', resolve)
  })

  rl.close()

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log(chalk.red('\nMigration cancelled.\n'))
    return
  }

  try {
    // 首先初始化混合数据库
    console.log(chalk.cyan('\n🔧 Initializing hybrid database structure...\n'))
    const { initHybridDatabase } = require('./init-hybrid-db')
    await initHybridDatabase()

    // 根据当前模式执行相应的迁移
    if (currentMode === 'redis') {
      await migrateFromRedis()
    } else if (currentMode === 'mysql') {
      await migrateFromMySQL()
    }

    // 创建迁移完成标记
    const migrationData = {
      migratedFrom: currentMode,
      migratedTo: 'hybrid',
      migratedAt: new Date().toISOString(),
      version: '1.0.0'
    }

    fs.writeFileSync(
      path.join(__dirname, '..', 'data', 'migration-to-hybrid.json'),
      JSON.stringify(migrationData, null, 2)
    )

    console.log(chalk.green('\n🎉 Migration to hybrid mode completed successfully!\n'))
    console.log(chalk.blue('📝 Next steps:'))
    console.log('1. Update your .env file: DATABASE_TYPE=hybrid')
    console.log('2. Restart the service: npm restart')
    console.log('3. Verify everything works correctly')
    console.log('4. Monitor logs for any issues\n')
  } catch (error) {
    console.error(chalk.red('\n❌ Migration failed:'), error.message)
    console.log(chalk.yellow('\nPlease fix the issue and try again.\n'))
    process.exit(1)
  }
}

// 执行
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}

module.exports = { migrateFromRedis, migrateFromMySQL }
