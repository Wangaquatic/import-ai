import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import './ProfilePage.css'

interface ProfilePageProps {
  onBack: () => void
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [currentCoins, setCurrentCoins] = useState(() => 
    parseInt(localStorage.getItem('player_coins') || '0')
  )

  // 监听localStorage变化，实时更新金币数
  React.useEffect(() => {
    const updateCoins = () => {
      const coins = parseInt(localStorage.getItem('player_coins') || '0')
      setCurrentCoins(coins)
    }

    // 定时检查金币变化
    const interval = setInterval(updateCoins, 100)

    // 监听storage事件（跨标签页同步）
    window.addEventListener('storage', updateCoins)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', updateCoins)
    }
  }, [])

  if (!user) {
    return null
  }

  function checkHiddenLevelsComplete(): boolean {
    const completed = parseInt(localStorage.getItem('hidden_levels_completed') || '0')
    return completed >= 3
  }

  // 检查成就状态并输出调试信息
  const paramMasterUnlocked = !!localStorage.getItem('achievement_param_master')
  const expertTunerUnlocked = !!localStorage.getItem('achievement_expert_tuner')
  const hiddenExplorerUnlocked = checkHiddenLevelsComplete()
  
  console.log('📊 个人中心 - 成就状态:', {
    参数调优大师: paramMasterUnlocked,
    专家系统调优师: expertTunerUnlocked,
    隐藏探索者: hiddenExplorerUnlocked,
    隐藏关卡完成数: localStorage.getItem('hidden_levels_completed')
  })

  const userStats = {
    name: user.username,
    level: user.level,
    experience: user.experience,
    coins: currentCoins, // 使用实时更新的金币数
    completedLevels: 2,
    totalLevels: 8,
    achievements: [
      { id: 1, name: '初出茅庐', desc: '完成第一个关卡', unlocked: true, icon: '🎯' },
      { id: 2, name: '数据大师', desc: '完成所有数据相关关卡', unlocked: true, icon: '📊' },
      { id: 3, name: '模型专家', desc: '完成所有模型关卡', unlocked: false, icon: '🧠' },
      { id: 4, name: '完美主义者', desc: '所有关卡获得满分', unlocked: false, icon: '⭐' },
      { 
        id: 5, 
        name: '参数调优大师', 
        desc: '在教学关卡隐藏关卡中达到最高正确率（95%）', 
        unlocked: paramMasterUnlocked, 
        icon: '🔬',
        hidden: false
      },
      { 
        id: 6, 
        name: '专家系统调优师', 
        desc: '在第二关隐藏关卡中达到完美准确率（100%）', 
        unlocked: expertTunerUnlocked, 
        icon: '⚙️',
        hidden: false
      },
      { 
        id: 7, 
        name: '隐藏探索者', 
        desc: '完成所有隐藏关卡（3/3）', 
        unlocked: hiddenExplorerUnlocked, 
        icon: '🕵️',
        hidden: true
      }
    ]
  }

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false)
    logout()
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="page-title">👤 个人中心</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="avatar">👨‍💻</div>
          <h2 className="username">{userStats.name}</h2>
          <div className="user-level">等级 {userStats.level}</div>
        </div>

        <div className="stats-card">
          <h3 className="card-title">📈 学习进度</h3>
          <div className="stat-item">
            <span className="stat-label">经验值</span>
            <span className="stat-value">{userStats.experience} XP</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">完成关卡</span>
            <span className="stat-value">
              {userStats.completedLevels} / {userStats.totalLevels}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(userStats.completedLevels / userStats.totalLevels) * 100}%` }}
            ></div>
          </div>
          <div className="stat-item">
            <span className="stat-label">当前积分</span>
            <span className="stat-value">💰 {userStats.coins}</span>
          </div>
        </div>

        <div className="achievements-card">
          <h3 className="card-title">🏆 成就徽章</h3>
          <div className="achievements-grid">
            {userStats.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.hidden && !achievement.unlocked ? 'hidden-achievement' : ''}`}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-info">
                  <div className="achievement-name">
                    {achievement.hidden && !achievement.unlocked ? '???' : achievement.name}
                  </div>
                  <div className="achievement-desc">
                    {achievement.hidden && !achievement.unlocked ? '完成特定条件解锁' : achievement.desc}
                  </div>
                </div>
                {!achievement.unlocked && <div className="lock-overlay">🔒</div>}
                {achievement.unlocked && achievement.hidden && (
                  <div className="hidden-badge">隐藏</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="actions-card">
          <button className="logout-button" onClick={handleLogoutClick}>
            🚪 退出登录
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="退出登录"
        message="确定要退出登录吗？退出后需要重新登录才能继续学习。"
        confirmText="退出"
        cancelText="取消"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </div>
  )
}

export default ProfilePage
