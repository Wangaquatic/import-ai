import React, { useEffect, useState } from 'react'
import './AchievementUnlock.css'

interface AchievementUnlockProps {
  name: string
  desc: string
  icon: string
  onClose: () => void
}

const AchievementUnlock: React.FC<AchievementUnlockProps> = ({ name, desc, icon, onClose }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 延迟显示动画
    setTimeout(() => setVisible(true), 100)
    
    // 5秒后自动关闭
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`achievement-unlock ${visible ? 'visible' : ''}`}>
      <div className="achievement-unlock-content">
        <div className="achievement-unlock-header">
          <span className="achievement-unlock-trophy">🏆</span>
          <span className="achievement-unlock-title">成就解锁！</span>
        </div>
        <div className="achievement-unlock-body">
          <div className="achievement-unlock-icon">{icon}</div>
          <div className="achievement-unlock-info">
            <div className="achievement-unlock-name">{name}</div>
            <div className="achievement-unlock-desc">{desc}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AchievementUnlock
