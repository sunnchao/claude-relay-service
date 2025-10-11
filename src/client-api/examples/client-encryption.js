/**
 * 客户端密码加密示例
 * Client-side Password Encryption Example
 * 
 * 此文件展示如何在前端（浏览器或Node.js客户端）加密密码
 * This file demonstrates how to encrypt passwords on the frontend (browser or Node.js client)
 */

// 浏览器环境示例 (Browser Environment Example)
// =====================================================

/**
 * 获取RSA公钥和nonce
 */
async function getPublicKey() {
  const response = await fetch('/api/client/auth/public-key')
  const data = await response.json()
  return {
    publicKey: data.publicKey,
    nonce: data.nonce
  }
}

/**
 * 使用RSA公钥加密密码（浏览器环境）
 */
async function encryptPasswordBrowser(password, publicKeyPem) {
  // 将PEM格式转换为ArrayBuffer
  const publicKey = await importRSAPublicKey(publicKeyPem)
  
  // 加密密码
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    publicKey,
    passwordBuffer
  )
  
  // 转换为Base64
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

/**
 * 导入RSA公钥（浏览器环境）
 */
async function importRSAPublicKey(pem) {
  // 移除PEM头尾
  const pemHeader = '-----BEGIN PUBLIC KEY-----'
  const pemFooter = '-----END PUBLIC KEY-----'
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')
  
  // Base64解码
  const binaryString = atob(pemContents)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  // 导入密钥
  return await window.crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['encrypt']
  )
}

/**
 * 注册示例（浏览器环境）
 */
async function registerUser(email, username, password, confirmPassword) {
  try {
    // 1. 获取公钥和nonce
    const { publicKey, nonce } = await getPublicKey()
    
    // 2. 加密密码
    const encryptedPassword = await encryptPasswordBrowser(password, publicKey)
    const encryptedConfirmPassword = await encryptPasswordBrowser(confirmPassword, publicKey)
    
    // 3. 发送注册请求
    const response = await fetch('/api/client/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        username,
        encryptedPassword,
        encryptedConfirmPassword,
        nonce
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('Registration successful:', result)
      // 保存token
      localStorage.setItem('token', result.token)
      localStorage.setItem('refreshToken', result.refreshToken)
    } else {
      console.error('Registration failed:', result)
    }
    
    return result
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

/**
 * 登录示例（浏览器环境）
 */
async function loginUser(email, password) {
  try {
    // 1. 获取公钥和nonce
    const { publicKey, nonce } = await getPublicKey()
    
    // 2. 加密密码
    const encryptedPassword = await encryptPasswordBrowser(password, publicKey)
    
    // 3. 发送登录请求
    const response = await fetch('/api/client/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        encryptedPassword,
        nonce
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('Login successful:', result)
      // 保存token
      localStorage.setItem('token', result.token)
      localStorage.setItem('refreshToken', result.refreshToken)
    } else {
      console.error('Login failed:', result)
    }
    
    return result
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Node.js环境示例 (Node.js Environment Example)
// =====================================================

const crypto = require('crypto')
const axios = require('axios')

/**
 * 使用RSA公钥加密密码（Node.js环境）
 */
function encryptPasswordNode(password, publicKeyPem) {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(password)
  )
  
  return encrypted.toString('base64')
}

/**
 * 注册示例（Node.js环境）
 */
async function registerUserNode(baseURL, email, username, password, confirmPassword) {
  try {
    // 1. 获取公钥和nonce
    const keyResponse = await axios.get(`${baseURL}/api/client/auth/public-key`)
    const { publicKey, nonce } = keyResponse.data
    
    // 2. 加密密码
    const encryptedPassword = encryptPasswordNode(password, publicKey)
    const encryptedConfirmPassword = encryptPasswordNode(confirmPassword, publicKey)
    
    // 3. 发送注册请求
    const response = await axios.post(`${baseURL}/api/client/auth/register`, {
      email,
      username,
      encryptedPassword,
      encryptedConfirmPassword,
      nonce
    })
    
    console.log('Registration successful:', response.data)
    return response.data
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message)
    throw error
  }
}

/**
 * 登录示例（Node.js环境）
 */
async function loginUserNode(baseURL, email, password) {
  try {
    // 1. 获取公钥和nonce
    const keyResponse = await axios.get(`${baseURL}/api/client/auth/public-key`)
    const { publicKey, nonce } = keyResponse.data
    
    // 2. 加密密码
    const encryptedPassword = encryptPasswordNode(password, publicKey)
    
    // 3. 发送登录请求
    const response = await axios.post(`${baseURL}/api/client/auth/login`, {
      email,
      encryptedPassword,
      nonce
    })
    
    console.log('Login successful:', response.data)
    return response.data
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message)
    throw error
  }
}

// React示例组件 (React Example Component)
// =====================================================

/*
import React, { useState } from 'react';
import axios from 'axios';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 获取公钥和nonce
      const { data: keyData } = await axios.get('/api/client/auth/public-key');
      
      // 加密密码
      const encryptedPassword = await encryptPasswordBrowser(password, keyData.publicKey);
      
      // 发送登录请求
      const { data } = await axios.post('/api/client/auth/login', {
        email,
        encryptedPassword,
        nonce: keyData.nonce
      });
      
      // 保存token
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      // 跳转或更新状态
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
*/

// Vue.js示例 (Vue.js Example)
// =====================================================

/*
<template>
  <form @submit.prevent="handleLogin">
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      required
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      required
    />
    <div v-if="error" class="error">{{ error }}</div>
    <button type="submit" :disabled="loading">
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: ''
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.error = '';

      try {
        // 获取公钥和nonce
        const keyResponse = await this.$http.get('/api/client/auth/public-key');
        const { publicKey, nonce } = keyResponse.data;
        
        // 加密密码
        const encryptedPassword = await this.encryptPassword(this.password, publicKey);
        
        // 发送登录请求
        const response = await this.$http.post('/api/client/auth/login', {
          email: this.email,
          encryptedPassword,
          nonce
        });
        
        // 保存token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        // 跳转
        this.$router.push('/dashboard');
      } catch (err) {
        this.error = err.response?.data?.message || 'Login failed';
      } finally {
        this.loading = false;
      }
    },
    
    async encryptPassword(password, publicKey) {
      // 实现密码加密逻辑
      return await encryptPasswordBrowser(password, publicKey);
    }
  }
};
</script>
*/

// 导出模块
module.exports = {
  // 浏览器环境
  browser: {
    getPublicKey,
    encryptPasswordBrowser,
    registerUser,
    loginUser
  },
  // Node.js环境
  node: {
    encryptPasswordNode,
    registerUserNode,
    loginUserNode
  }
}