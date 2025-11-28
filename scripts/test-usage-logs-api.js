#!/usr/bin/env node

/**
 * 测试使用日志 API 端点
 */

const axios = require('axios')

const API_BASE_URL = 'http://localhost:3000'

async function testUsageLogsAPI() {
  console.log('📊 测试使用日志 API 端点...\n')

  try {
    // 替换为实际的 API ID
    const apiId = 'your-api-id-here'

    console.log(`请求参数:`)
    console.log(`  - apiId: ${apiId}`)
    console.log(`  - limit: 50`)
    console.log(`  - offset: 0\n`)

    const response = await axios.post(`${API_BASE_URL}/api-stats/api/usage-logs`, {
      apiId,
      limit: 50,
      offset: 0
    })

    if (response.data.success) {
      console.log('✅ API 请求成功!\n')
      console.log('📋 返回数据结构:')
      console.log(`  - 记录数: ${response.data.data.records.length}`)
      console.log(`  - 总记录数: ${response.data.data.pagination.total}`)
      console.log(`  - 总费用: ${response.data.data.summary.formattedCost}`)
      console.log(`  - 总 Tokens: ${response.data.data.summary.totalTokens}\n`)

      if (response.data.data.records.length > 0) {
        console.log('📝 第一条记录示例:')
        const firstRecord = response.data.data.records[0]
        console.log(JSON.stringify(firstRecord, null, 2))
      }
    } else {
      console.error('❌ API 返回失败:', response.data)
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
    }
  }
}

// 运行测试
testUsageLogsAPI()
