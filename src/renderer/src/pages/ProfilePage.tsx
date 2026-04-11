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

  if (!user) {
    return null
  }

  const userStats = {
    name: user.username,
    level: user.level,
    experience: user.experience,
    coins: user.coins,
    completedLevels: 2,
    totalLevels: 8,
    achievements: [
      { id: 1, name: '初出茅庐', desc: '完成第一个关卡', unlocked: true, icon: '🎯' },
      { id: 2, name: '数据大师', desc: '完成所有数据相关关卡', unlocked: true, icon: '📊' },
      { id: 3, name: '模型专家', desc: '完成所有模型关卡', unlocked: false, icon: '🧠' },
      { id: 4, name: '完美主义者', desc: '所有关卡获得满分', unlocked: false, icon: '⭐' }
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
                className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-info">
                  <div className="achievement-name">{achievement.name}</div>
                  <div className="achievement-desc">{achievement.desc}</div>
                </div>
                {!achievement.unlocked && <div className="lock-overlay">🔒</div>}
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
