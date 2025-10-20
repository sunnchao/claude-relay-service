const database = require('../models/database')
const pricingService = require('../services/pricingService')
const CostCalculator = require('./costCalculator')

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

async function updateRateLimitCounters(rateLimitInfo, usageSummary, model) {
  if (!rateLimitInfo) {
    return { totalTokens: 0, totalCost: 0 }
  }

  const inputTokens = toNumber(usageSummary.inputTokens)
  const outputTokens = toNumber(usageSummary.outputTokens)
  const cacheCreateTokens = toNumber(usageSummary.cacheCreateTokens)
  const cacheReadTokens = toNumber(usageSummary.cacheReadTokens)

  const totalTokens = inputTokens + outputTokens + cacheCreateTokens + cacheReadTokens

  if (totalTokens > 0 && rateLimitInfo.tokenCountKey) {
    await database.incrby(rateLimitInfo.tokenCountKey, Math.round(totalTokens))
  }

  let totalCost = 0
  const usagePayload = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheCreateTokens,
    cache_read_input_tokens: cacheReadTokens
  }

  try {
    const costInfo = pricingService.calculateCost(usagePayload, model)
    const { totalCost: calculatedCost } = costInfo || {}
    if (typeof calculatedCost === 'number') {
      totalCost = calculatedCost
    }
  } catch (error) {
    // 忽略此处错误，后续使用备用计算
    totalCost = 0
  }

  if (totalCost === 0) {
    try {
      const fallback = CostCalculator.calculateCost(usagePayload, model)
      const { costs } = fallback || {}
      if (costs && typeof costs.total === 'number') {
        totalCost = costs.total
      }
    } catch (error) {
      totalCost = 0
    }
  }

  if (totalCost > 0 && rateLimitInfo.costCountKey) {
    await database.incrbyfloat(rateLimitInfo.costCountKey, totalCost)
  }

  return { totalTokens, totalCost }
}

module.exports = {
  updateRateLimitCounters
}
