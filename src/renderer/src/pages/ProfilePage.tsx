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
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null)
  const [currentCoins, setCurrentCoins] = useState(() => 
    parseInt(localStorage.getItem('player_coins') || '0')
  )
  const [levelsCompleted, setLevelsCompleted] = useState(() => {
    let completed = 0
    if (localStorage.getItem('level1_completed')) completed++
    if (localStorage.getItem('level2_completed')) completed++
    if (localStorage.getItem('level3_completed')) completed++
    if (localStorage.getItem('level4_completed')) completed++
    return completed
  })

  // 监听localStorage变化，实时更新金币数和关卡进度
  React.useEffect(() => {
    const updateCoins = () => {
      const coins = parseInt(localStorage.getItem('player_coins') || '0')
      setCurrentCoins(coins)
    }

    const updateLevelsCompleted = () => {
      let completed = 0
      if (localStorage.getItem('level1_completed')) completed++
      if (localStorage.getItem('level2_completed')) completed++
      if (localStorage.getItem('level3_completed')) completed++
      if (localStorage.getItem('level4_completed')) completed++
      setLevelsCompleted(completed)
    }

    // 定时检查金币和关卡进度变化
    const interval = setInterval(() => {
      updateCoins()
      updateLevelsCompleted()
    }, 100)

    // 监听storage事件（跨标签页同步）
    window.addEventListener('storage', updateCoins)
    window.addEventListener('storage', updateLevelsCompleted)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', updateCoins)
      window.removeEventListener('storage', updateLevelsCompleted)
    }
  }, [])

  if (!user) {
    return null
  }

  // 计算主关卡完成情况
  function getMainLevelsCompleted(): number {
    let completed = 0
    if (localStorage.getItem('level1_completed')) completed++
    if (localStorage.getItem('level2_completed')) completed++
    if (localStorage.getItem('level3_completed')) completed++
    if (localStorage.getItem('level4_completed')) completed++
    return completed
  }

  // 计算支线任务完成情况（隐藏关卡）
  function getHiddenLevelsCompleted(): number {
    return parseInt(localStorage.getItem('hidden_levels_completed') || '0')
  }

  function checkHiddenLevelsComplete(): boolean {
    return getHiddenLevelsCompleted() >= 3
  }

  function checkAllLevelsCompleted(): boolean {
    return getMainLevelsCompleted() >= 4
  }

  function checkAllLevelsPerfect(): boolean {
    // 检查所有关卡是否都获得满分
    const level1Perfect = localStorage.getItem('level1_perfect') === 'true'
    const level2Perfect = localStorage.getItem('level2_perfect') === 'true'
    const level3Perfect = localStorage.getItem('level3_perfect') === 'true'
    const level4Perfect = localStorage.getItem('level4_perfect') === 'true'
    return level1Perfect && level2Perfect && level3Perfect && level4Perfect
  }

  // 检查成就状态并输出调试信息
  const level1Completed = !!localStorage.getItem('level1_completed')
  const paramMasterUnlocked = !!localStorage.getItem('achievement_param_master')
  const expertTunerUnlocked = !!localStorage.getItem('achievement_expert_tuner')
  const reverseEngineerUnlocked = !!localStorage.getItem('achievement_reverse_engineer')
  const hiddenExplorerUnlocked = checkHiddenLevelsComplete()
  const allLevelsCompleted = checkAllLevelsCompleted()
  const allLevelsPerfect = checkAllLevelsPerfect()
  
  console.log('📊 个人中心 - 成就状态:', {
    初出茅庐: level1Completed,
    数据大师: allLevelsCompleted,
    参数调优大师: paramMasterUnlocked,
    专家系统调优师: expertTunerUnlocked,
    反向工程师: reverseEngineerUnlocked,
    隐藏探索者: hiddenExplorerUnlocked,
    模型专家: allLevelsCompleted,
    完美主义者: allLevelsPerfect,
    主关卡完成数: getMainLevelsCompleted(),
    隐藏关卡完成数: getHiddenLevelsCompleted()
  })

  const userStats = {
    name: user.username,
    level: user.level,
    experience: user.experience,
    coins: currentCoins,
    completedLevels: levelsCompleted,
    totalLevels: 4,
    hiddenLevelsCompleted: getHiddenLevelsCompleted(),
    totalHiddenLevels: 3,
    achievements: [
      { 
        id: 1, 
        name: '初出茅庐', 
        desc: '完成第一个关卡', 
        unlocked: level1Completed, 
        iconImg: 'achievement-1.png',
        detailDesc: '完成教学关卡，迈出AI学习的第一步。',
        requirement: '完成教学关卡（第一关）'
      },
      { 
        id: 2, 
        name: '数据大师', 
        desc: '完成所有数据相关关卡', 
        unlocked: allLevelsCompleted, 
        iconImg: 'achievement-2.png',
        detailDesc: '掌握数据处理和优化的核心技能，成为数据领域的专家。',
        requirement: '完成所有主线关卡（4/4）'
      },
      { 
        id: 3, 
        name: '模型专家', 
        desc: '完成所有模型关卡', 
        unlocked: allLevelsCompleted, 
        iconImg: 'achievement-3.png',
        detailDesc: '精通各类AI模型的构建和调优，成为模型架构大师。',
        requirement: '完成所有主线关卡（4/4）'
      },
      { 
        id: 4, 
        name: '完美主义者', 
        desc: '所有关卡获得满分', 
        unlocked: allLevelsPerfect, 
        iconImg: 'achievement-4.png',
        detailDesc: '追求极致，在每个关卡都达到完美表现。',
        requirement: '所有主线关卡获得满分评价'
      },
      { 
        id: 5, 
        name: '参数调优大师', 
        desc: '在教学关卡隐藏关卡中达到最高正确率（95%）', 
        unlocked: paramMasterUnlocked, 
        iconImg: 'achievement-5.png',
        hidden: false,
        detailDesc: '精通参数调优技巧，在教学关卡的隐藏挑战中展现卓越能力。',
        requirement: '在第一关隐藏关卡中达到95%以上正确率'
      },
      { 
        id: 6, 
        name: '专家系统调优师', 
        desc: '在第二关隐藏关卡中达到完美准确率（100%）', 
        unlocked: expertTunerUnlocked, 
        iconImg: 'achievement-6.png',
        hidden: false,
        detailDesc: '完美掌握专家系统的调优方法，达到理论上的最佳表现。',
        requirement: '在第二关隐藏关卡中达到100%正确率'
      },
      { 
        id: 7, 
        name: '隐藏探索者', 
        desc: '完成所有隐藏关卡（3/3）', 
        unlocked: hiddenExplorerUnlocked, 
        iconImg: 'achievement-7.png',
        hidden: true,
        detailDesc: '发现并完成所有隐藏挑战，探索游戏的每一个角落。',
        requirement: '完成所有隐藏关卡（第1、2、4关的隐藏关卡）'
      },
      { 
        id: 8, 
        name: '反向工程师', 
        desc: '在教学关卡连接错误时达到极低准确率（≤10%）', 
        unlocked: reverseEngineerUnlocked, 
        iconImg: 'achievement-3.png',
        hidden: true,
        detailDesc: '通过反向思维，发现系统的另一面。有时候，错误也是一种学习。',
        requirement: '在教学关卡中故意连接错误，使正确率降至10%或以下'
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
        <h1 className="page-title">训练师档案</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="avatar">👨‍💻</div>
          <div className="user-info">
            <h2 className="username">{userStats.name}</h2>
            <div className="user-level">Lv.{userStats.level}</div>
          </div>
          <div className="stats-inline">
            <div className="stat-item-inline">
              <span className="stat-label">主线进度</span>
              <span className="stat-value">{userStats.completedLevels}/{userStats.totalLevels}</span>
            </div>
            <div className="stat-divider">|</div>
            <div className="stat-item-inline">
              <span className="stat-label">支线任务</span>
              <span className="stat-value">{userStats.hiddenLevelsCompleted}/{userStats.totalHiddenLevels}</span>
            </div>
            <div className="stat-divider">|</div>
            <div className="stat-item-inline">
              <span className="stat-label">当前积分</span>
              <span className="stat-value">💰 {userStats.coins}</span>
            </div>
          </div>
        </div>

        <div className="achievements-card">
          <h3 className="card-title">🏆 成就徽章</h3>
          <div className="achievements-grid">
            {userStats.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.hidden && !achievement.unlocked ? 'hidden-achievement' : ''}`}
                onClick={() => setSelectedAchievement(achievement)}
              >
                <div className="achievement-icon">
                  <img 
                    src={new URL(`../assets/${achievement.iconImg}`, import.meta.url).href} 
                    alt={achievement.name}
                    className="achievement-icon-img"
                  />
                </div>
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

      {/* 成就详情弹窗 */}
      {selectedAchievement && (
        <div className="achievement-detail-overlay" onClick={() => setSelectedAchievement(null)}>
          <div 
            className={`achievement-detail-modal ${
              selectedAchievement.unlocked 
                ? selectedAchievement.hidden 
                  ? 'hidden-unlocked' 
                  : 'unlocked' 
                : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="achievement-detail-header">
              <div className={`achievement-detail-icon ${!selectedAchievement.unlocked ? 'locked' : ''}`}>
                <img 
                  src={new URL(`../assets/${selectedAchievement.iconImg}`, import.meta.url).href} 
                  alt={selectedAchievement.name}
                />
              </div>
              <div className="achievement-detail-title">
                {selectedAchievement.hidden && !selectedAchievement.unlocked 
                  ? '???' 
                  : selectedAchievement.name}
              </div>
              <div className={`achievement-detail-status ${
                selectedAchievement.unlocked 
                  ? selectedAchievement.hidden 
                    ? 'hidden' 
                    : 'unlocked' 
                  : 'locked'
              }`}>
                {selectedAchievement.unlocked 
                  ? selectedAchievement.hidden 
                    ? '✨ 隐藏成就已解锁' 
                    : '✅ 已解锁' 
                  : '🔒 未解锁'}
              </div>
            </div>

            <div className="achievement-detail-body">
              <div className="achievement-detail-section">
                <div className="achievement-detail-label">描述</div>
                <div className="achievement-detail-text">
                  {selectedAchievement.hidden && !selectedAchievement.unlocked 
                    ? '这是一个隐藏成就，完成特定条件后解锁。' 
                    : selectedAchievement.detailDesc}
                </div>
              </div>

              <div className="achievement-detail-section">
                <div className="achievement-detail-label">解锁条件</div>
                <div className="achievement-detail-requirement">
                  {selectedAchievement.hidden && !selectedAchievement.unlocked 
                    ? '完成特定隐藏条件' 
                    : selectedAchievement.requirement}
                </div>
              </div>
            </div>

            <button className="achievement-detail-close" onClick={() => setSelectedAchievement(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
