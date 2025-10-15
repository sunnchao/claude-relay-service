/**
 * 客户端请求转发路由
 * Client Request Relay Routes
 */

const express = require('express')
const router = express.Router()

// Claude消息接口
router.post('/messages', async (req, res, next) => {
  try {
    // TODO: 实现Claude消息转发逻辑
    res.status(501).json({
      message: 'Claude messages relay endpoint coming soon'
    })
  } catch (error) {
    next(error)
  }
})

// Codex补全接口
router.post('/completions', async (req, res, next) => {
  try {
    // TODO: 实现Codex补全转发逻辑
    res.status(501).json({
      message: 'Codex completions relay endpoint coming soon'
    })
  } catch (error) {
    next(error)
  }
})

// 获取可用模型
router.get('/models', async (req, res, next) => {
  try {
    // TODO: 返回可用的AI模型列表
    res.json({
      models: [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          description: 'Most capable Claude model',
          available: true
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          description: 'Balanced performance and cost',
          available: true
        },
        {
          id: 'claude-3-haiku',
          name: 'Claude 3 Haiku',
          description: 'Fast and cost-effective',
          available: true
        }
      ]
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
