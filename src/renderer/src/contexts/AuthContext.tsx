import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface User {
  id: string
  username: string
  level: number
  experience: number
  coins: number
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 从本地存储恢复登录状态
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 开始登录流程:', username)
    
    if (!username.trim() || !password.trim()) {
      return { success: false, error: '请填写所有字段' }
    }

    if (username.length < 2 || username.length > 20) {
      return { success: false, error: '用户名长度应在 2-20 个字符之间' }
    }

    if (password.length < 6) {
      return { success: false, error: '密码长度至少6个字符' }
    }

    setIsLoading(true)

    try {
      // 如果配置了 Supabase，使用云端数据库
      if (isSupabaseConfigured && supabase) {
        console.log('☁️ 使用 Supabase 云端模式')
        
        // 查找用户
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single()

        console.log('查询结果:', { existingUser, findError })

        if (findError) {
          if (findError.code === 'PGRST116') {
            return { success: false, error: '用户不存在，请先注册' }
          }
          console.error('❌ 查找用户错误:', findError)
          return { success: false, error: '登录失败，请稍后重试' }
        }

        // 验证密码（简单的明文比较，生产环境应该使用加密）
        if (existingUser.password_hash !== password) {
          console.log('❌ 密码错误')
          return { success: false, error: '密码错误' }
        }

        // 更新最后登录时间
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id)

        const userData: User = {
          id: existingUser.id,
          username: existingUser.username,
          level: existingUser.level,
          experience: existingUser.experience,
          coins: existingUser.coins,
          avatar_url: existingUser.avatar_url
        }

        console.log('✅ 登录成功，设置用户数据:', userData)
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        console.log('✅ 用户数据已保存到 localStorage')
        return { success: true }
      } else {
        console.log('💾 使用本地存储模式')
        
        // 本地模式
        const savedUsers = localStorage.getItem('users')
        const users = savedUsers ? JSON.parse(savedUsers) : {}

        if (!users[username]) {
          return { success: false, error: '用户不存在，请先注册' }
        }

        if (users[username].password !== password) {
          return { success: false, error: '密码错误' }
        }

        const userData: User = users[username].user
        console.log('✅ 登录成功，设置用户数据:', userData)
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        return { success: true }
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      return { success: false, error: '登录失败，请检查网络连接' }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('📝 开始注册流程:', username)
    
    if (!username.trim() || !password.trim()) {
      return { success: false, error: '请填写所有字段' }
    }

    if (username.length < 2 || username.length > 20) {
      return { success: false, error: '用户名长度应在 2-20 个字符之间' }
    }

    if (password.length < 6) {
      return { success: false, error: '密码长度至少6个字符' }
    }

    setIsLoading(true)

    try {
      // 如果配置了 Supabase，使用云端数据库
      if (isSupabaseConfigured && supabase) {
        console.log('☁️ 使用 Supabase 云端模式')
        
        // 检查用户名是否已存在
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .maybeSingle()

        console.log('检查用户名结果:', { existingUser, checkError })

        if (existingUser) {
          return { success: false, error: '用户名已存在' }
        }

        // 创建新用户
        console.log('准备创建新用户...')
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            username,
            password_hash: password, // 注意：生产环境应该加密
            level: 1,
            experience: 0,
            coins: 500
          })
          .select()
          .single()

        console.log('创建用户结果:', { newUser, createError })

        if (createError) {
          console.error('❌ 创建用户错误:', createError)
          return { success: false, error: `注册失败: ${createError.message}` }
        }

        if (!newUser) {
          console.error('❌ 创建用户失败：没有返回数据')
          return { success: false, error: '注册失败，请稍后重试' }
        }

        const userData: User = {
          id: newUser.id,
          username: newUser.username,
          level: newUser.level,
          experience: newUser.experience,
          coins: newUser.coins,
          avatar_url: newUser.avatar_url
        }

        console.log('✅ 注册成功，设置用户数据:', userData)
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        console.log('✅ 用户数据已保存到 localStorage')
        return { success: true }
      } else {
        console.log('💾 使用本地存储模式')
        
        // 本地模式
        const savedUsers = localStorage.getItem('users')
        const users = savedUsers ? JSON.parse(savedUsers) : {}

        if (users[username]) {
          return { success: false, error: '用户名已存在' }
        }

        const userData: User = {
          id: `local-${Date.now()}`,
          username,
          level: 1,
          experience: 0,
          coins: 500
        }

        users[username] = {
          password,
          user: userData
        }

        localStorage.setItem('users', JSON.stringify(users))
        console.log('✅ 注册成功，设置用户数据:', userData)
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        return { success: true }
      }
    } catch (error) {
      console.error('❌ Register error:', error)
      return { success: false, error: '注册失败，请检查网络连接' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    console.log('🚪 退出登录')
    setUser(null)
    localStorage.removeItem('user')
    // 不需要重新加载页面，React 会自动重新渲染
  }

  const updateUser = (updates: Partial<User>) => {
    if (!user) return

    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))

    // 如果配置了 Supabase，同步到云端
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating user:', error)
          }
        })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
