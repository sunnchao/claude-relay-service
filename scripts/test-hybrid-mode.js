#!/usr/bin/env node
/**
 * 混合数据库模式测试脚本
 * 验证Redis和MySQL同时工作是否正常
 */

const chalk = require('chalk')
const ora = require('ora')
const { v4: uuidv4 } = require('uuid')

// 设置为混合模式
process.env.DATABASE_TYPE = 'hybrid'

async function testRedisOperations(database) {
  console.log(chalk.cyan('\n🔴 Testing Redis operations...\n'))

  const tests = []
  const testSessionId = `test_session_${uuidv4()}`
  const testData = { user: 'test', timestamp: Date.now() }

  try {
    // 测试会话存储
    const spinner = ora('Testing session storage...').start()
    await database.setSession(testSessionId, testData, 10)
    const retrieved = await database.getSession(testSessionId)

    if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
      spinner.succeed('Session storage: PASSED')
      tests.push({ name: 'Session storage', status: 'passed' })
    } else {
      spinner.fail('Session storage: FAILED')
      tests.push({ name: 'Session storage', status: 'failed' })
    }

    // 清理测试数据
    await database.deleteSession(testSessionId)

    // 测试并发控制
    const spinner2 = ora('Testing concurrency control...').start()
    const testKeyId = `test_key_${uuidv4()}`
    const requestId = uuidv4()

    await database.incrConcurrency(testKeyId, requestId, 10)
    const concurrency = await database.getConcurrency(testKeyId)
    await database.decrConcurrency(testKeyId, requestId)

    if (concurrency > 0) {
      spinner2.succeed('Concurrency control: PASSED')
      tests.push({ name: 'Concurrency control', status: 'passed' })
    } else {
      spinner2.fail('Concurrency control: FAILED')
      tests.push({ name: 'Concurrency control', status: 'failed' })
    }

    // 测试缓存操作
    const spinner3 = ora('Testing cache operations...').start()
    const cacheKey = `test_cache_${uuidv4()}`
    const hashedKey = require('crypto').createHash('sha256').update(cacheKey).digest('hex')

    await database.setApiKeyHash(hashedKey, { id: cacheKey }, 10)
    const cached = await database.getApiKeyHash(hashedKey)

    if (cached?.id === cacheKey) {
      spinner3.succeed('Cache operations: PASSED')
      tests.push({ name: 'Cache operations', status: 'passed' })
    } else {
      spinner3.fail('Cache operations: FAILED')
      tests.push({ name: 'Cache operations', status: 'failed' })
    }

    await database.deleteApiKeyHash(hashedKey)
  } catch (error) {
    console.error(chalk.red('Redis test error:'), error.message)
    tests.push({ name: 'Redis operations', status: 'error', error: error.message })
  }

  return tests
}

async function testMySQLOperations(database) {
  console.log(chalk.cyan('\n🔵 Testing MySQL operations...\n'))

  const tests = []
  const testAccountId = `test_claude_${uuidv4()}`
  const testAccountData = {
    id: testAccountId,
    name: 'Test Account',
    email: 'test@example.com',
    claudeAiOauth: JSON.stringify({ test: true }),
    createdAt: new Date().toISOString()
  }

  try {
    // 测试账户存储
    const spinner = ora('Testing account storage...').start()
    await database.setClaudeAccount(testAccountId, testAccountData)
    const retrieved = await database.getClaudeAccount(testAccountId)

    if (retrieved?.name === testAccountData.name) {
      spinner.succeed('Account storage: PASSED')
      tests.push({ name: 'Account storage', status: 'passed' })
    } else {
      spinner.fail('Account storage: FAILED')
      tests.push({ name: 'Account storage', status: 'failed' })
    }

    // 清理测试数据
    await database.deleteClaudeAccount(testAccountId)

    // 测试API Key操作
    const spinner2 = ora('Testing API Key operations...').start()
    const testKeyId = `test_key_${uuidv4()}`
    const hashedKey = require('crypto').createHash('sha256').update(testKeyId).digest('hex')
    const testKeyData = {
      id: testKeyId,
      name: 'Test Key',
      key: `cr_test_${uuidv4()}`,
      hashedKey,
      dailyLimit: 1000,
      totalUsage: 0,
      createdAt: new Date().toISOString()
    }

    await database.setApiKey(testKeyId, testKeyData, hashedKey)
    const retrievedKey = await database.findApiKeyByHash(hashedKey)

    if (retrievedKey?.name === testKeyData.name) {
      spinner2.succeed('API Key operations: PASSED')
      tests.push({ name: 'API Key operations', status: 'passed' })
    } else {
      spinner2.fail('API Key operations: FAILED')
      tests.push({ name: 'API Key operations', status: 'failed' })
    }

    // 清理测试数据
    await database.deleteApiKey(testKeyId)
  } catch (error) {
    console.error(chalk.red('MySQL test error:'), error.message)
    tests.push({ name: 'MySQL operations', status: 'error', error: error.message })
  }

  return tests
}

async function testHybridOperations(database) {
  console.log(chalk.cyan('\n🔄 Testing hybrid operations...\n'))

  const tests = []

  try {
    // 测试缓存同步
    const spinner = ora('Testing cache synchronization...').start()
    const testKeyId = `hybrid_test_${uuidv4()}`
    const hashedKey = require('crypto').createHash('sha256').update(testKeyId).digest('hex')
    const testKeyData = {
      id: testKeyId,
      name: 'Hybrid Test Key',
      key: `cr_hybrid_${uuidv4()}`,
      hashedKey,
      dailyLimit: 5000,
      totalUsage: 0,
      createdAt: new Date().toISOString()
    }

    // 写入MySQL并验证Redis缓存
    await database.setApiKey(testKeyId, testKeyData, hashedKey)

    // 第一次获取（从MySQL并缓存到Redis）
    const firstGet = await database.getApiKey(testKeyId)

    // 第二次获取（应该从Redis缓存）
    const secondGet = await database.getApiKey(testKeyId)

    if (firstGet?.name === testKeyData.name && secondGet?.name === testKeyData.name) {
      spinner.succeed('Cache synchronization: PASSED')
      tests.push({ name: 'Cache synchronization', status: 'passed' })
    } else {
      spinner.fail('Cache synchronization: FAILED')
      tests.push({ name: 'Cache synchronization', status: 'failed' })
    }

    // 清理测试数据
    await database.deleteApiKey(testKeyId)

    // 测试实时统计
    const spinner2 = ora('Testing real-time statistics...').start()
    const statsKeyId = `stats_test_${uuidv4()}`

    await database.incrementTokenUsage(statsKeyId, 'claude-3-opus', 100, 50)
    const stats = await database.getUsageStats(statsKeyId)

    if (stats && stats.tokens) {
      spinner2.succeed('Real-time statistics: PASSED')
      tests.push({ name: 'Real-time statistics', status: 'passed' })
    } else {
      spinner2.fail('Real-time statistics: FAILED')
      tests.push({ name: 'Real-time statistics', status: 'failed' })
    }
  } catch (error) {
    console.error(chalk.red('Hybrid test error:'), error.message)
    tests.push({ name: 'Hybrid operations', status: 'error', error: error.message })
  }

  return tests
}

async function runTests() {
  console.log(chalk.blue.bold('\n🧪 Hybrid Database Mode Test Suite\n'))

  const spinner = ora('Initializing hybrid database...').start()

  try {
    // 连接数据库
    const database = require('../src/models/database')
    await database.connect()
    spinner.succeed('Hybrid database connected')

    // 运行测试
    const redisTests = await testRedisOperations(database)
    const mysqlTests = await testMySQLOperations(database)
    const hybridTests = await testHybridOperations(database)

    // 汇总结果
    const allTests = [...redisTests, ...mysqlTests, ...hybridTests]
    const passed = allTests.filter((t) => t.status === 'passed').length
    const failed = allTests.filter((t) => t.status === 'failed').length
    const errors = allTests.filter((t) => t.status === 'error').length

    // 显示结果
    console.log(chalk.blue('\n📊 Test Results Summary\n'))
    console.log(chalk.green(`  ✅ Passed: ${passed}`))
    console.log(chalk.red(`  ❌ Failed: ${failed}`))
    console.log(chalk.yellow(`  ⚠️  Errors: ${errors}`))
    console.log(chalk.cyan(`  📝 Total:  ${allTests.length}`))

    // 详细结果
    if (failed > 0 || errors > 0) {
      console.log(chalk.yellow('\n⚠️ Failed/Error Tests:'))
      allTests
        .filter((t) => t.status !== 'passed')
        .forEach((test) => {
          const icon = test.status === 'error' ? '⚠️' : '❌'
          console.log(`  ${icon} ${test.name}`)
          if (test.error) {
            console.log(chalk.red(`     Error: ${test.error}`))
          }
        })
    }

    // 断开连接
    await database.disconnect()

    // 结论
    if (failed === 0 && errors === 0) {
      console.log(chalk.green('\n✅ All tests passed! Hybrid mode is working correctly.\n'))
      process.exit(0)
    } else {
      console.log(chalk.red('\n❌ Some tests failed. Please check the configuration.\n'))
      process.exit(1)
    }
  } catch (error) {
    spinner.fail('Test suite failed')
    console.error(chalk.red('\nFatal error:'), error.message)
    process.exit(1)
  }
}

// 主函数
async function main() {
  try {
    await runTests()
  } catch (error) {
    console.error(chalk.red('Test execution failed:'), error)
    process.exit(1)
  }
}

// 执行
if (require.main === module) {
  main()
}

module.exports = { runTests }
