/**
 * 客户端加密工具
 * Client-side Encryption Utilities
 */

const crypto = require('crypto')

// 获取或生成RSA密钥对
let rsaKeyPair = null

/**
 * 生成RSA密钥对
 */
const generateRSAKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  rsaKeyPair = { publicKey, privateKey }
  return rsaKeyPair
}

/**
 * 获取RSA公钥
 */
const getPublicKey = () => {
  if (!rsaKeyPair) {
    generateRSAKeyPair()
  }
  return rsaKeyPair.publicKey
}

/**
 * 获取RSA私钥
 */
const getPrivateKey = () => {
  if (!rsaKeyPair) {
    generateRSAKeyPair()
  }
  return rsaKeyPair.privateKey
}

/**
 * 使用RSA私钥解密密码
 */
const decryptPassword = (encryptedPassword) => {
  try {
    const privateKey = getPrivateKey()
    const buffer = Buffer.from(encryptedPassword, 'base64')
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    )
    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error('Failed to decrypt password')
  }
}

/**
 * 生成AES密钥和IV
 */
const generateAESKey = () => ({
  key: crypto.randomBytes(32), // 256-bit key
  iv: crypto.randomBytes(16) // 128-bit IV
})

/**
 * 使用AES加密数据
 */
const encryptWithAES = (data, key, iv) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return encrypted
}

/**
 * 使用AES解密数据
 */
const decryptWithAES = (encryptedData, key, iv) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * 混合加密方案：用于大数据
 * 1. 生成AES密钥
 * 2. 使用AES加密数据
 * 3. 使用RSA公钥加密AES密钥
 */
const hybridEncrypt = (data, publicKeyPem) => {
  const { key, iv } = generateAESKey()

  // AES加密数据
  const encryptedData = encryptWithAES(data, key, iv)

  // RSA加密AES密钥
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    key
  )

  return {
    encryptedData,
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64')
  }
}

/**
 * 混合解密方案
 */
const hybridDecrypt = (encryptedData, encryptedKey, ivBase64) => {
  const privateKey = getPrivateKey()

  // RSA解密AES密钥
  const key = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedKey, 'base64')
  )

  const iv = Buffer.from(ivBase64, 'base64')

  // AES解密数据
  return decryptWithAES(encryptedData, key, iv)
}

/**
 * 生成一次性令牌（用于防止重放攻击）
 */
const nonceStore = new Map()

const generateNonce = () => {
  const nonce = crypto.randomBytes(32).toString('hex')
  const now = Date.now()

  // 存储生成的nonce，标记为未使用
  nonceStore.set(nonce, {
    timestamp: now,
    used: false
  })

  // 清理过期的nonce
  const maxAge = 5 * 60 * 1000 // 5分钟有效期
  for (const [key, data] of nonceStore.entries()) {
    if (now - data.timestamp > maxAge) {
      nonceStore.delete(key)
    }
  }

  return nonce
}

/**
 * 验证一次性令牌
 */
const verifyNonce = (nonce, maxAge = 5 * 60 * 1000) => {
  // 5分钟有效期
  if (!nonce) {
    return false
  }

  const now = Date.now()

  // 清理过期的nonce
  for (const [key, data] of nonceStore.entries()) {
    if (now - data.timestamp > maxAge) {
      nonceStore.delete(key)
    }
  }

  // 检查nonce是否存在且未使用
  const nonceData = nonceStore.get(nonce)
  if (!nonceData) {
    return false // nonce不存在
  }

  if (nonceData.used) {
    return false // nonce已被使用
  }

  // 检查是否过期
  if (now - nonceData.timestamp > maxAge) {
    nonceStore.delete(nonce)
    return false // nonce已过期
  }

  // 标记为已使用
  nonceData.used = true
  nonceStore.set(nonce, nonceData)
  return true
}

// 初始化RSA密钥对
generateRSAKeyPair()

module.exports = {
  getPublicKey,
  decryptPassword,
  generateAESKey,
  encryptWithAES,
  decryptWithAES,
  hybridEncrypt,
  hybridDecrypt,
  generateNonce,
  verifyNonce
}
