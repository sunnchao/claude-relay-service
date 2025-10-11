/**
 * 测试客户端API登录
 * Test Client API Login
 */

const axios = require('axios')

const API_BASE = 'http://localhost:8080/client/auth'

async function testLogin() {
  try {
    console.log('📡 Testing Client API Login...\n')

    // Step 1: 获取公钥和nonce
    console.log('1️⃣ Getting public key and nonce...')
    const keyResponse = await axios.get(`${API_BASE}/public-key`)
    const { publicKey, nonce } = keyResponse.data
    console.log('✅ Got public key and nonce')
    console.log('   Nonce:', `${nonce.substring(0, 20)}...`)

    // Step 2: 测试明文密码登录（向后兼容）
    console.log('\n2️⃣ Testing plain password login (backward compatibility)...')
    try {
      const loginResponse = await axios.post(`${API_BASE}/login`, {
        email: 'test@example.com',
        password: 'password123' // 明文密码
      })

      console.log('✅ Login successful!')
      console.log('   Token:', `${loginResponse.data.token.substring(0, 20)}...`)
      console.log('   User:', loginResponse.data.user)
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message)
    }

    // Step 3: 测试加密密码登录
    console.log('\n3️⃣ Testing encrypted password login...')
    console.log('   Note: This requires a client that can encrypt with RSA')
    console.log('   See src/client-api/examples/client-encryption.js for implementation')

    // 如果你有Node.js crypto模块，可以这样加密：
    const crypto = require('crypto')
    const password = 'password123'

    try {
      const encryptedPassword = crypto
        .publicEncrypt(
          {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          Buffer.from(password)
        )
        .toString('base64')

      const encryptedLoginResponse = await axios.post(`${API_BASE}/login`, {
        email: 'test@example.com',
        encryptedPassword,
        nonce
      })

      console.log('✅ Encrypted login successful!')
      console.log('   Token:', `${encryptedLoginResponse.data.token.substring(0, 20)}...`)
    } catch (error) {
      console.log('❌ Encrypted login failed:', error.response?.data || error.message)
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('   Response:', error.response.data)
    }
  }
}

// 运行测试
testLogin()
