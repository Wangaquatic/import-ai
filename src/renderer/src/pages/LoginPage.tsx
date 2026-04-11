import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证输入
    if (!username.trim() || !password.trim()) {
      setError('请填写所有字段')
      return
    }

    if (isRegister && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少6个字符')
      return
    }

    setIsLoading(true)

    try {
      let result
      if (isRegister) {
        console.log('开始注册:', username)
        result = await register(username, password)
        console.log('注册结果:', result)
      } else {
        console.log('开始登录:', username)
        result = await login(username, password)
        console.log('登录结果:', result)
      }

      if (!result.success) {
        setError(result.error || '操作失败')
        setIsLoading(false)
      } else {
        console.log('登录/注册成功，应该会自动跳转')
      }
    } catch (error) {
      console.error('提交错误:', error)
      setError('操作失败，请重试')
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="login-page">
      {/* 动态背景 */}
      <div className="login-bg">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* 登录卡片 */}
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">
            <span className="import-text">import</span>
            <span className="ai-text">ai</span>
          </h1>
          <p className="login-subtitle">
            {isRegister ? '创建你的训练师账号' : '欢迎回来，训练师'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              用户名
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              密码
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="输入密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                确认密码
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !username.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                <span>{isRegister ? '注册中...' : '登录中...'}</span>
              </>
            ) : (
              <>
                <span>{isRegister ? '注册账号' : '登录游戏'}</span>
                <span className="arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button className="toggle-mode-button" onClick={toggleMode} disabled={isLoading}>
            {isRegister ? '已有账号？点击登录' : '没有账号？点击注册'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
