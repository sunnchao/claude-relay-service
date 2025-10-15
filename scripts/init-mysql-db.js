#!/usr/bin/env node
/**
 * MySQL数据库初始化脚本
 * 创建数据库和表结构
 */

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const chalk = require('chalk')
const ora = require('ora')
const config = require('../config/config')

async function initMySQL() {
  console.log(chalk.blue.bold('\n🚀 MySQL数据库初始化工具\n'))

  const spinner = ora('连接到MySQL服务器...').start()

  let connection
  try {
    // 首先连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: config.mysql?.host || config.database?.host || 'localhost',
      port: config.mysql?.port || config.database?.port || 3306,
      user: config.mysql?.user || config.database?.user || 'root',
      password: config.mysql?.password || config.database?.password || '',
      multipleStatements: true
    })

    spinner.succeed('MySQL服务器连接成功')

    // 创建数据库
    const dbName = config.mysql?.database || config.database?.database || 'claude_relay_service'
    spinner.start(`创建数据库 ${dbName}...`)

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    await connection.query(`USE \`${dbName}\``)

    spinner.succeed(`数据库 ${dbName} 创建/选择成功`)

    // 读取schema文件
    spinner.start('执行表结构创建脚本...')
    const schemaPath = path.join(__dirname, '..', 'src', 'models', 'mysql', 'schema.sql')

    if (!fs.existsSync(schemaPath)) {
      spinner.fail('找不到schema.sql文件')
      console.error(chalk.red(`请确保文件存在: ${schemaPath}`))
      process.exit(1)
    }

    const schema = fs.readFileSync(schemaPath, 'utf8')

    // 分割SQL语句并逐条执行
    const statements = schema
      .split(';')
      .filter((s) => s.trim())
      .map((s) => `${s.trim()};`)

    let successCount = 0
    let skipCount = 0
    const errors = []

    for (const statement of statements) {
      // 跳过USE语句和CREATE DATABASE语句
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
          errors.push({
            statement: `${statement.substring(0, 50)}...`,
            error: error.message
          })
        }
      }
    }

    spinner.succeed(`表结构创建完成 (成功: ${successCount}, 跳过: ${skipCount})`)

    if (errors.length > 0) {
      console.log(chalk.yellow('\n⚠️ 部分语句执行失败：'))
      errors.forEach((e) => {
        console.log(chalk.yellow(`  - ${e.statement}`))
        console.log(chalk.red(`    错误: ${e.error}`))
      })
    }

    // 创建默认管理员账户
    spinner.start('创建默认管理员账户...')

    const bcrypt = require('bcryptjs')
    const { v4: uuidv4 } = require('uuid')

    // 检查是否已有管理员
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM admin_users')

    if (admins[0].count === 0) {
      // 生成默认凭据
      const adminId = uuidv4()
      const adminUsername = process.env.ADMIN_USERNAME || 'admin'
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
      const passwordHash = await bcrypt.hash(adminPassword, 10)

      await connection.query(
        'INSERT INTO admin_users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
        [adminId, adminUsername, passwordHash, 'admin']
      )

      spinner.succeed('默认管理员账户创建成功')
      console.log(chalk.green('\n✅ 管理员凭据：'))
      console.log(chalk.cyan(`   用户名: ${adminUsername}`))
      console.log(chalk.cyan(`   密码: ${adminPassword}`))
      console.log(chalk.yellow('\n⚠️ 请立即修改默认密码！'))
    } else {
      spinner.info('管理员账户已存在，跳过创建')
    }

    // 显示数据库信息
    console.log(chalk.green('\n✅ MySQL数据库初始化完成！\n'))
    console.log(chalk.cyan('数据库配置信息：'))
    console.log(`  主机: ${config.mysql?.host || config.database?.host || 'localhost'}`)
    console.log(`  端口: ${config.mysql?.port || config.database?.port || 3306}`)
    console.log(`  数据库: ${dbName}`)
    console.log(`  用户: ${config.mysql?.user || config.database?.user || 'root'}`)

    console.log(chalk.yellow('\n📝 下一步：'))
    console.log('1. 在 .env 文件中设置 DATABASE_TYPE=mysql')
    console.log('2. 配置MySQL连接参数')
    console.log('3. 运行 npm run migrate:redis-to-mysql 迁移现有数据')
    console.log('4. 启动服务: npm start')
  } catch (error) {
    spinner.fail('初始化失败')
    console.error(chalk.red('\n错误详情：'), error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 执行初始化
initMySQL().catch((error) => {
  console.error(chalk.red('初始化失败：'), error)
  process.exit(1)
})
