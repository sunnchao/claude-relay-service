#!/usr/bin/env node

/**
 * MySQL 数据库迁移脚本
 * 为 usage_logs 表添加 account_name 字段
 */

const mysql = require('mysql2/promise')
const chalk = require('chalk')
const config = require('../config/config')

async function migrate() {
  let connection = null

  try {
    console.log(chalk.blue('🔧 Running migration: Add account_name to usage_logs...'))
    console.log(
      chalk.gray(
        `   Connecting to: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`
      )
    )

    // 创建连接
    connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database
    })

    // 检查列是否已存在
    const [columns] = await connection.query(`SHOW COLUMNS FROM usage_logs LIKE 'account_name'`)

    if (columns.length > 0) {
      console.log(chalk.yellow('⚠️  Column account_name already exists, skipping migration'))
      return
    }

    // 添加 account_name 列
    console.log(chalk.blue('📝 Adding account_name column to usage_logs table...'))
    await connection.query(`
      ALTER TABLE usage_logs
      ADD COLUMN account_name VARCHAR(255) DEFAULT NULL COMMENT '账户名称'
      AFTER account_type
    `)

    console.log(chalk.green('✅ Migration completed successfully!'))
    console.log(chalk.gray('\n📊 Changes:'))
    console.log(chalk.gray('   - Added account_name column to usage_logs table'))
  } catch (error) {
    console.error(chalk.red('\n❌ Error running migration:'))
    console.error(chalk.red(error.message))
    if (error.sqlMessage) {
      console.error(chalk.red('SQL Error:'), error.sqlMessage)
    }
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrate()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error(chalk.red('Unexpected error:'), error)
      process.exit(1)
    })
}

module.exports = { migrate }
