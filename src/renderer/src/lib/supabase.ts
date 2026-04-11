import { createClient } from '@supabase/supabase-js'

// 从环境变量获取 Supabase 配置
// 如果没有配置，使用模拟模式
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// 检查是否配置了 Supabase
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// 创建 Supabase 客户端（如果已配置）
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string | null
          avatar_url: string | null
          level: number
          experience: number
          coins: number
          created_at: string
          last_login: string
        }
        Insert: {
          id?: string
          username: string
          email?: string | null
          avatar_url?: string | null
          level?: number
          experience?: number
          coins?: number
          created_at?: string
          last_login?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          avatar_url?: string | null
          level?: number
          experience?: number
          coins?: number
          created_at?: string
          last_login?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          level_id: number
          completed: boolean
          stars: number
          best_score: number
          completed_at: string | null
          attempts: number
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          requirement_type: string
          requirement_value: number
          reward_coins: number
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          unlocked_at: string
          progress: number
        }
      }
    }
  }
}
