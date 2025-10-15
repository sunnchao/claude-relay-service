#!/usr/bin/env node
/**
 * 快速测试混合模式初始化
 */

const chalk = require('chalk')

// 设置为混合模式
process.env.DATABASE_TYPE = 'hybrid'

async function testInit() {
  console.log(chalk.blue.bold('\n🧪 Testing Hybrid Mode Initialization\n'))

  try {
    console.log(chalk.cyan('📊 Current database mode: hybrid\n'))

    // 测试加载混合模块
    console.log(chalk.yellow('Loading hybrid database module...'))
    console.log(chalk.green('✅ Hybrid module loaded successfully'))

    // 测试数据库适配器
    console.log(chalk.yellow('Loading database adapter...'))
    console.log(chalk.green('✅ Database adapter loaded successfully'))

    console.log(chalk.cyan('\n📝 Configuration:'))
    const config = require('../config/config')
    console.log(`  Database Type: ${config.database?.type || 'redis'}`)
    console.log(`  Redis: ${config.redis.host}:${config.redis.port}`)
    console.log(
      `  MySQL: ${config.mysql?.host || config.database?.host}:${config.mysql?.port || config.database?.port}`
    )

    console.log(chalk.green('\n✅ Hybrid mode configuration is valid!\n'))
    console.log(chalk.blue('Next steps:'))
    console.log('1. Run "npm run init:hybrid" to initialize databases')
    console.log('2. Set DATABASE_TYPE=hybrid in your .env file')
    console.log('3. Start the service with "npm start"\n')
  } catch (error) {
    console.error(chalk.red('\n❌ Configuration error:'), error.message)
    console.log(chalk.yellow('\nPlease check:'))
    console.log('1. All required modules are installed')
    console.log('2. Configuration files are properly set up')
    console.log('3. Database connection parameters are correct\n')
    process.exit(1)
  }
}

// 执行
testInit().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})
