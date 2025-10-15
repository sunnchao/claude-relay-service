#!/usr/bin/env node
/**
 * 混合数据库初始化脚本
 * 同时初始化Redis和MySQL，支持混合模式运行
 */

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const Redis = require('ioredis')
const chalk = require('chalk')
const ora = require('ora')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const config = require('../config/config')

async function testRedisConnection() {
  const spinner = ora('Testing Redis connection...').start()

  try {
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      connectTimeout: 5000,
      lazyConnect: false
    })

    await redis.ping()
    spinner.succeed('Redis connection successful')
    await redis.quit()
    return true
  } catch (error) {
    spinner.fail(`Redis connection failed: ${error.message}`)
    return false
  }
}

async function testMySQLConnection() {
  const spinner = ora('Testing MySQL connection...').start()

  let connection
  try {
    connection = await mysql.createConnection({
      host: config.mysql?.host || config.database?.host || 'localhost',
      port: config.mysql?.port || config.database?.port || 3306,
      user: config.mysql?.user || config.database?.user || 'root',
      password: config.mysql?.password || config.database?.password || '',
      connectTimeout: 5000
    })

    await connection.ping()
    spinner.succeed('MySQL connection successful')
    return true
  } catch (error) {
    spinner.fail(`MySQL connection failed: ${error.message}`)
    return false
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

async function initializeMySQL() {
  const spinner = ora('Initializing MySQL database...').start()

  let connection
  try {
    // 连接到MySQL服务器
    connection = await mysql.createConnection({
      host: config.mysql?.host || config.database?.host || 'localhost',
      port: config.mysql?.port || config.database?.port || 3306,
      user: config.mysql?.user || config.database?.user || 'root',
      password: config.mysql?.password || config.database?.password || '',
      multipleStatements: true
    })

    // 创建数据库
    const dbName = config.mysql?.database || config.database?.database || 'claude_relay_service'
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    await connection.query(`USE \`${dbName}\``)

    spinner.succeed('MySQL database created/selected successfully')

    // 检查是否存在schema文件
    const schemaPath = path.join(__dirname, '..', 'src', 'models', 'mysql', 'schema.sql')

    if (fs.existsSync(schemaPath)) {
      spinner.start('Creating MySQL tables...')

      const schema = fs.readFileSync(schemaPath, 'utf8')
      const statements = schema
        .split(';')
        .filter((s) => s.trim())
        .map((s) => `${s.trim()};`)

      let successCount = 0
      let skipCount = 0

      for (const statement of statements) {
        if (statement.match(/^(USE|CREATE DATABASE)/i)) {
          skipCount++
          continue
        }

        try {
          await connection.query(statement)
          successCount++
        } catch (error) {
          if (error.message.includes('already exists')) {
            skipCount++
          } else {
            console.log(chalk.yellow(`\n  ⚠️ Failed to execute: ${statement.substring(0, 50)}...`))
            console.log(chalk.red(`     Error: ${error.message}`))
          }
        }
      }

      spinner.succeed(`MySQL tables created (Success: ${successCount}, Skipped: ${skipCount})`)
    } else {
      spinner.info('MySQL schema file not found, skipping table creation')
    }

    // 创建默认管理员（如果不存在）
    spinner.start('Checking MySQL admin user...')

    const [admins] = await connection.query(
      'SELECT COUNT(*) as count FROM admin_users WHERE username = ?',
      [process.env.ADMIN_USERNAME || 'admin']
    )

    if (admins[0].count === 0) {
      const adminId = uuidv4()
      const adminUsername = process.env.ADMIN_USERNAME || 'admin'
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
      const passwordHash = await bcrypt.hash(adminPassword, 10)

      await connection.query(
        'INSERT INTO admin_users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
        [adminId, adminUsername, passwordHash, 'admin']
      )

      spinner.succeed('MySQL admin user created')
      return { username: adminUsername, password: adminPassword, created: true }
    } else {
      spinner.info('MySQL admin user already exists')
      return { created: false }
    }
  } catch (error) {
    spinner.fail(`MySQL initialization failed: ${error.message}`)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

async function initializeRedis() {
  const spinner = ora('Initializing Redis data...').start()

  let redis
  try {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      lazyConnect: false
    })

    // 检查是否已有初始化数据
    const initFile = path.join(__dirname, '..', 'data', 'init.json')

    if (fs.existsSync(initFile)) {
      spinner.start('Syncing admin credentials to Redis...')

      const initData = JSON.parse(fs.readFileSync(initFile, 'utf8'))

      // 将管理员信息同步到Redis
      const adminId = uuidv4()
      const adminData = {
        id: adminId,
        username: initData.adminUsername,
        password: await bcrypt.hash(initData.adminPassword, 10),
        role: 'admin',
        createdAt: new Date().toISOString()
      }

      // 存储管理员数据
      await redis.hset(`admin:${adminId}`, adminData)
      await redis.set(`admin_username:${initData.adminUsername}`, adminId)

      spinner.succeed('Redis admin data synchronized')
      return { username: initData.adminUsername, password: initData.adminPassword, synced: true }
    } else {
      spinner.info('No init.json found for Redis synchronization')
      return { synced: false }
    }
  } catch (error) {
    spinner.fail(`Redis initialization failed: ${error.message}`)
    throw error
  } finally {
    if (redis) {
      await redis.quit()
    }
  }
}

async function initHybridDatabase() {
  console.log(chalk.blue.bold('\n🚀 Hybrid Database Initialization (Redis + MySQL)\n'))
  console.log(chalk.cyan('This will initialize both Redis and MySQL for hybrid mode operation.\n'))

  // 测试连接
  const redisOk = await testRedisConnection()
  const mysqlOk = await testMySQLConnection()

  if (!redisOk && !mysqlOk) {
    console.log(chalk.red('\n❌ Both Redis and MySQL connections failed!'))
    console.log(chalk.yellow('\nPlease ensure both databases are running and accessible.'))
    console.log(chalk.yellow('Check your configuration in config/config.js or .env file.\n'))
    process.exit(1)
  }

  if (!redisOk) {
    console.log(chalk.yellow('\n⚠️ Redis connection failed, but MySQL is available.'))
    console.log(chalk.yellow('Hybrid mode requires both databases. Please fix Redis connection.\n'))
    process.exit(1)
  }

  if (!mysqlOk) {
    console.log(chalk.yellow('\n⚠️ MySQL connection failed, but Redis is available.'))
    console.log(chalk.yellow('Hybrid mode requires both databases. Please fix MySQL connection.\n'))
    process.exit(1)
  }

  console.log(chalk.green('\n✅ Both database connections successful!\n'))

  // 初始化数据库
  let mysqlResult = { created: false }
  let redisResult = { synced: false }
  let finalCredentials = null

  try {
    // 初始化MySQL
    mysqlResult = await initializeMySQL()

    // 初始化Redis
    redisResult = await initializeRedis()

    // 确定最终的管理员凭据
    if (mysqlResult.created) {
      finalCredentials = {
        username: mysqlResult.username,
        password: mysqlResult.password
      }
    } else if (redisResult.synced) {
      finalCredentials = {
        username: redisResult.username,
        password: redisResult.password
      }
    }

    // 保存初始化信息
    const initData = {
      mode: 'hybrid',
      initializedAt: new Date().toISOString(),
      databases: {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          initialized: true
        },
        mysql: {
          host: config.mysql?.host || config.database?.host || 'localhost',
          port: config.mysql?.port || config.database?.port || 3306,
          database: config.mysql?.database || config.database?.database || 'claude_relay_service',
          initialized: true
        }
      },
      adminUsername: finalCredentials?.username || process.env.ADMIN_USERNAME || 'admin',
      version: '1.0.0'
    }

    // 如果有新创建的凭据，保存密码
    if (finalCredentials?.password) {
      initData.adminPassword = finalCredentials.password
    }

    const initDir = path.join(__dirname, '..', 'data')
    if (!fs.existsSync(initDir)) {
      fs.mkdirSync(initDir, { recursive: true })
    }

    fs.writeFileSync(path.join(initDir, 'init-hybrid.json'), JSON.stringify(initData, null, 2))

    // 显示成功信息
    console.log(chalk.green('\n✅ Hybrid database initialization completed successfully!\n'))

    console.log(chalk.cyan('📊 Database Status:'))
    console.log(`  Redis: ${chalk.green('✓')} Initialized`)
    console.log(`  MySQL: ${chalk.green('✓')} Initialized`)

    if (finalCredentials) {
      console.log(chalk.yellow('\n🔑 Admin Credentials:'))
      console.log(`  Username: ${chalk.cyan(finalCredentials.username)}`)
      console.log(`  Password: ${chalk.cyan(finalCredentials.password)}`)
      console.log(
        chalk.red('\n⚠️ Please save these credentials and change the password after first login!')
      )
    }

    console.log(chalk.blue('\n📝 Next Steps:'))
    console.log('1. Set DATABASE_TYPE=hybrid in your .env file')
    console.log('2. Ensure both Redis and MySQL services are running')
    console.log('3. Start the service: npm start')
    console.log('4. Access admin panel: http://localhost:3000/web')

    console.log(chalk.green('\n🎉 Hybrid mode provides the best of both worlds:'))
    console.log('  • High-performance caching and sessions (Redis)')
    console.log('  • Reliable persistent storage (MySQL)')
    console.log('  • Automatic failover and redundancy\n')
  } catch (error) {
    console.error(chalk.red('\n❌ Initialization failed:'), error.message)
    console.log(chalk.yellow('\nPlease fix the error and try again.\n'))
    process.exit(1)
  }
}

// 检查是否已经初始化
async function checkInitialized() {
  const hybridInitFile = path.join(__dirname, '..', 'data', 'init-hybrid.json')

  if (fs.existsSync(hybridInitFile)) {
    const initData = JSON.parse(fs.readFileSync(hybridInitFile, 'utf8'))
    console.log(chalk.yellow('\n⚠️ Hybrid mode already initialized!'))
    console.log(`  Initialized at: ${new Date(initData.initializedAt).toLocaleString()}`)
    console.log(`  Mode: ${initData.mode}`)
    console.log(`  Admin: ${initData.adminUsername}`)

    console.log(chalk.cyan('\nTo re-initialize:'))
    console.log('1. Stop the service')
    console.log('2. Delete data/init-hybrid.json')
    console.log('3. Run this script again\n')
    return true
  }

  return false
}

// 主函数
async function main() {
  const initialized = await checkInitialized()

  if (!initialized) {
    await initHybridDatabase()
  }
}

// 执行
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}

module.exports = { initHybridDatabase, checkInitialized }
