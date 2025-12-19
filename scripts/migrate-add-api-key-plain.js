#!/usr/bin/env node

/**
 * MySQL 数据库迁移脚本
 * 为 api_keys 表添加 api_key_plain 字段
 */

const mysql = require('mysql2/promise')
const chalk = require('chalk')
const config = require('../config/config')

async function migrate() {
  let connection = null

  try {
    console.log(chalk.blue('🔧 Running migration: Add api_key_plain to api_keys...'))
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
    const [columns] = await connection.query(`SHOW COLUMNS FROM api_keys LIKE 'api_key_plain'`)

    if (columns.length > 0) {
      console.log(chalk.yellow('⚠️  Column api_key_plain already exists, skipping migration'))
      return
    }

    // 添加 api_key_plain 列
    console.log(chalk.blue('📝 Adding api_key_plain column to api_keys table...'))
    await connection.query(`
      ALTER TABLE api_keys
      ADD COLUMN api_key_plain VARCHAR(255) DEFAULT NULL COMMENT 'API Key 明文'
      AFTER api_key_hash
    `)

    console.log(chalk.green('✅ Migration completed successfully!'))
    console.log(chalk.gray('\n📊 Changes:'))
    console.log(chalk.gray('   - Added api_key_plain column to api_keys table'))
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
