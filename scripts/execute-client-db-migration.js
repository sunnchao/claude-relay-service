#!/usr/bin/env node

/**
 * 执行客户端数据库 Schema 迁移
 * Execute Client Database Schema Migration
 */

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'claude-relay',
  charset: 'utf8mb4',
  multipleStatements: true
}

async function testConnection() {
  console.log('Testing MySQL connection...')
  console.log(`Host: ${config.host}:${config.port}`)
  console.log(`User: ${config.user}`)
  console.log(`Database: ${config.database}`)

  let connection
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    })

    const [rows] = await connection.query('SELECT VERSION() as version')
    console.log(`✓ MySQL Version: ${rows[0].version}`)

    const [databases] = await connection.query('SHOW DATABASES')
    console.log('\n✓ Available databases:')
    databases.forEach((db) => console.log(`  - ${Object.values(db)[0]}`))

    return true
  } catch (error) {
    console.error('✗ Connection failed:', error.message)
    return false
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

async function executeSchemaSQL() {
  console.log('\n========================================')
  console.log('Executing Client Database Schema...')
  console.log('========================================\n')

  const schemaPath = path.join(__dirname, '../database/mysql/schema.sql')

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`)
  }

  let connection
  try {
    // 连接到数据库
    connection = await mysql.createConnection(config)
    console.log(`✓ Connected to database: ${config.database}`)

    // 读取 schema.sql
    const sql = fs.readFileSync(schemaPath, 'utf8')
    console.log(`✓ Loaded schema file: ${schemaPath}`)

    // 解析并执行 SQL 语句
    // 处理 DELIMITER 命令和多语句执行
    const parts = sql.split(/DELIMITER\s+(\S+)/i)
    let currentDelimiter = ';'
    const statements = []

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim()

      if (i % 2 === 0) {
        // SQL 内容部分
        if (part) {
          const regex = new RegExp(
            `${currentDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:\\n|$)`,
            'g'
          )
          const stmts = part
            .split(regex)
            .map((s) => s.trim())
            .filter((s) => s && !s.startsWith('--') && s !== 'USE')

          statements.push(...stmts)
        }
      } else {
        // DELIMITER 定义部分
        currentDelimiter = part
      }
    }

    console.log(`\n✓ Parsed ${statements.length} SQL statements`)

    // 执行每个语句
    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // 跳过 USE 语句和注释
      if (
        statement.toLowerCase().startsWith('use ') ||
        statement.startsWith('--') ||
        statement.startsWith('/*')
      ) {
        skipCount++
        continue
      }

      // 跳过创建数据库语句（已经连接到目标数据库）
      if (statement.toLowerCase().includes('create database')) {
        console.log(`  [${i + 1}/${statements.length}] SKIP: Create database statement`)
        skipCount++
        continue
      }

      try {
        await connection.query(statement)
        successCount++

        // 显示进度
        const preview = statement.substring(0, 60).replace(/\s+/g, ' ')
        console.log(`  [${i + 1}/${statements.length}] ✓ ${preview}...`)
      } catch (error) {
        errorCount++
        const preview = statement.substring(0, 60).replace(/\s+/g, ' ')

        // 某些错误可以忽略（如已存在的对象）
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log(`  [${i + 1}/${statements.length}] ⚠ ${preview}... (already exists)`)
          successCount++
        } else {
          console.error(`  [${i + 1}/${statements.length}] ✗ ${preview}...`)
          console.error(`    Error: ${error.message}`)
        }
      }
    }

    console.log('\n========================================')
    console.log('Migration Summary:')
    console.log('========================================')
    console.log(`  ✓ Success: ${successCount}`)
    console.log(`  - Skipped: ${skipCount}`)
    console.log(`  ✗ Errors: ${errorCount}`)
    console.log('========================================\n')

    return { successCount, skipCount, errorCount }
  } catch (error) {
    console.error('\n✗ Migration failed:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

async function verifyTables() {
  console.log('Verifying table structure...\n')

  let connection
  try {
    connection = await mysql.createConnection(config)

    // 查询所有表
    const [tables] = await connection.query(
      `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [config.database]
    )

    console.log('Tables created:')
    console.log('===============')
    tables.forEach((table) => {
      console.log(
        `  - ${table.TABLE_NAME.padEnd(30)} (${table.TABLE_ROWS || 0} rows, created: ${table.CREATE_TIME || 'N/A'})`
      )
    })

    // 查询触发器
    const [triggers] = await connection.query(
      `SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
       FROM INFORMATION_SCHEMA.TRIGGERS
       WHERE TRIGGER_SCHEMA = ?`,
      [config.database]
    )

    if (triggers.length > 0) {
      console.log('\nTriggers created:')
      console.log('=================')
      triggers.forEach((trigger) => {
        console.log(
          `  - ${trigger.TRIGGER_NAME} (${trigger.EVENT_MANIPULATION} on ${trigger.EVENT_OBJECT_TABLE})`
        )
      })
    }

    // 查询存储过程
    const [procedures] = await connection.query(
      `SELECT ROUTINE_NAME, ROUTINE_TYPE, CREATED
       FROM INFORMATION_SCHEMA.ROUTINES
       WHERE ROUTINE_SCHEMA = ?`,
      [config.database]
    )

    if (procedures.length > 0) {
      console.log('\nProcedures created:')
      console.log('===================')
      procedures.forEach((proc) => {
        console.log(`  - ${proc.ROUTINE_NAME} (${proc.ROUTINE_TYPE}, created: ${proc.CREATED})`)
      })
    }

    console.log('')
    return { tables: tables.length, triggers: triggers.length, procedures: procedures.length }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

async function main() {
  console.log('\n========================================')
  console.log('Client Database Migration Tool')
  console.log('========================================\n')

  try {
    // 1. 测试连接
    const connected = await testConnection()
    if (!connected) {
      console.error('\n✗ Cannot proceed without database connection')
      process.exit(1)
    }

    // 2. 执行 schema
    const result = await executeSchemaSQL()

    // 3. 验证表结构
    const verification = await verifyTables()

    // 4. 最终总结
    console.log('========================================')
    console.log('Migration Complete!')
    console.log('========================================')
    console.log(`  Database: ${config.database}`)
    console.log(`  Host: ${config.host}:${config.port}`)
    console.log(`  Tables: ${verification.tables}`)
    console.log(`  Triggers: ${verification.triggers}`)
    console.log(`  Procedures: ${verification.procedures}`)
    console.log(`  Statements executed: ${result.successCount}`)
    console.log('========================================\n')

    console.log('✓ All done! Your client database is ready to use.')
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error)
    process.exit(1)
  }
}

// 运行主程序
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
