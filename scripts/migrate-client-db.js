#!/usr/bin/env node

/**
 * 客户端数据库迁移脚本
 * Client Database Migration Script
 */

const path = require('path')
const fs = require('fs')
const mysql = require('mysql2/promise')
const { sequelize, initDatabase } = require('../src/client-api/models/mysql')
require('dotenv').config()

// 命令行参数解析
const args = process.argv.slice(2)
const command = args[0]
const force = args.includes('--force')

// MySQL连接配置
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4'
}

/**
 * 创建数据库
 */
async function createDatabase() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    const databaseName = process.env.MYSQL_DATABASE || 'claude_relay_client'

    // 创建数据库
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` 
       DEFAULT CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci`
    )

    console.log(`✓ Database '${databaseName}' created or already exists`)

    // 切换到新数据库
    await connection.changeUser({ database: databaseName })

    return connection
  } catch (error) {
    console.error('Error creating database:', error)
    throw error
  }
}

/**
 * 执行SQL文件
 */
async function executeSQLFile(connection, filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8')

    // 分割SQL语句（处理存储过程和事件）
    const statements = sql.split(/(?:^|\n)DELIMITER\s+(\S+)/gm).reduce((acc, part, index, arr) => {
      if (index % 2 === 0) {
        // SQL内容
        if (part.trim()) {
          const delimiter = index > 0 ? arr[index - 1] : ';'
          const stmts = part
            .split(
              new RegExp(`${delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:\\n|$)`, 'g')
            )
            .filter((s) => s.trim())
          acc.push(...stmts)
        }
      }
      return acc
    }, [])

    // 执行每个语句
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement)
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`)
        } catch (error) {
          console.error(`✗ Failed to execute statement: ${statement.substring(0, 50)}...`)
          console.error(error.message)
        }
      }
    }

    console.log(`✓ SQL file executed: ${filePath}`)
  } catch (error) {
    console.error(`Error executing SQL file ${filePath}:`, error)
    throw error
  }
}

/**
 * 运行迁移
 */
async function runMigration() {
  console.log('Starting database migration...')

  let connection

  try {
    // 创建数据库
    connection = await createDatabase()

    // 执行schema.sql
    const schemaPath = path.join(__dirname, '../database/mysql/schema.sql')
    if (fs.existsSync(schemaPath)) {
      console.log('Executing schema.sql...')
      await executeSQLFile(connection, schemaPath)
    }

    // 使用Sequelize同步模型（创建或更新表结构）
    console.log('Synchronizing Sequelize models...')
    await initDatabase()

    if (force) {
      console.log('Force syncing database (dropping existing tables)...')
      await sequelize.sync({ force: true })
    } else {
      console.log('Syncing database (preserving existing data)...')
      await sequelize.sync({ alter: true })
    }

    console.log('✓ Database migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
    await sequelize.close()
  }
}

/**
 * 回滚迁移
 */
async function rollbackMigration() {
  console.log('Rolling back database...')

  let connection

  try {
    connection = await mysql.createConnection(dbConfig)
    const databaseName = process.env.MYSQL_DATABASE || 'claude_relay_client'

    // 删除数据库
    await connection.execute(`DROP DATABASE IF EXISTS \`${databaseName}\``)
    console.log(`✓ Database '${databaseName}' dropped`)
  } catch (error) {
    console.error('Rollback failed:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

/**
 * 生成测试数据
 */
async function seedDatabase() {
  console.log('Seeding database with test data...')

  try {
    await initDatabase()

    const { User, ApiKey } = require('../src/client-api/models/mysql')
    const bcrypt = require('bcrypt')

    // 创建测试用户
    const testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      plan: 'basic'
    })

    console.log(`✓ Created test user: ${testUser.email}`)

    // 创建测试API Key
    const apiKey = ApiKey.generateKey()

    console.log(`✓ Created test API key: ${apiKey}`)
    console.log('\nTest Credentials:')
    console.log('================')
    console.log(`Email: test@example.com`)
    console.log(`Password: password123`)
    console.log(`API Key: ${apiKey}`)
    console.log('================')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

/**
 * 检查数据库状态
 */
async function checkStatus() {
  console.log('Checking database status...')

  let connection

  try {
    connection = await mysql.createConnection(dbConfig)
    const databaseName = process.env.MYSQL_DATABASE || 'claude_relay_client'

    // 检查数据库是否存在
    const [databases] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [databaseName]
    )

    if (databases.length === 0) {
      console.log(`✗ Database '${databaseName}' does not exist`)
      return
    }

    console.log(`✓ Database '${databaseName}' exists`)

    // 切换到数据库
    await connection.changeUser({ database: databaseName })

    // 检查表
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME, TABLE_ROWS 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [databaseName]
    )

    console.log('\nTables:')
    console.log('=======')
    tables.forEach((table) => {
      console.log(`  - ${table.TABLE_NAME}: ~${table.TABLE_ROWS} rows`)
    })

    // 测试Sequelize连接
    console.log('\nTesting Sequelize connection...')
    await sequelize.authenticate()
    console.log('✓ Sequelize connection successful')
  } catch (error) {
    console.error('Status check failed:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
    await sequelize.close()
  }
}

// 主程序
async function main() {
  console.log('Client Database Migration Tool')
  console.log('==============================\n')

  switch (command) {
    case 'migrate':
      await runMigration()
      break

    case 'rollback':
      await rollbackMigration()
      break

    case 'seed':
      await seedDatabase()
      break

    case 'status':
      await checkStatus()
      break

    default:
      console.log('Usage: node migrate-client-db.js <command> [options]')
      console.log('\nCommands:')
      console.log('  migrate    - Run database migration')
      console.log('  rollback   - Drop the database')
      console.log('  seed       - Generate test data')
      console.log('  status     - Check database status')
      console.log('\nOptions:')
      console.log('  --force    - Force sync (drops existing tables)')
      process.exit(0)
  }
}

// 运行主程序
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
