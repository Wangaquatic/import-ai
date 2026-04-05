import React, { useState } from 'react'
import './HomePage.css'

type Page = 'home' | 'levels' | 'shop' | 'profile'

interface HomePageProps {
  onNavigate: (page: Page) => void
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  return (
    <div className="home-page">
      {/* 动态背景装饰 */}
      <div className="bg-decoration">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* Logo 和标题区域 */}
      <div className="home-header">
        <h1 className="brand-name">
          <span className="import-text">import</span>
          <span className="ai-highlight">ai</span>
        </h1>
        <div className="subtitle-decoration">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>

      {/* 导航按钮区域 */}
      <div className="nav-container">
        <button
          className={`game-button levels-btn ${hoveredButton === 'levels' ? 'active' : ''}`}
          onClick={() => onNavigate('levels')}
          onMouseEnter={() => setHoveredButton('levels')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <div className="button-bg"></div>
          <div className="button-content">
            <div className="icon-wrapper">
              <span className="icon">🎯</span>
              <div className="icon-glow"></div>
            </div>
            <div className="text-wrapper">
              <h3 className="btn-title">关卡挑战</h3>
              <p className="btn-desc">8个训练任务等你挑战</p>
            </div>
            <div className="arrow">→</div>
          </div>
          <div className="button-shine"></div>
        </button>

        <button
          className={`game-button shop-btn ${hoveredButton === 'shop' ? 'active' : ''}`}
          onClick={() => onNavigate('shop')}
          onMouseEnter={() => setHoveredButton('shop')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <div className="button-bg"></div>
          <div className="button-content">
            <div className="icon-wrapper">
              <span className="icon">🛒</span>
              <div className="icon-glow"></div>
            </div>
            <div className="text-wrapper">
              <h3 className="btn-title">商店</h3>
              <p className="btn-desc">解锁强大的工具和模型</p>
            </div>
            <div className="arrow">→</div>
          </div>
          <div className="button-shine"></div>
        </button>

        <button
          className={`game-button profile-btn ${hoveredButton === 'profile' ? 'active' : ''}`}
          onClick={() => onNavigate('profile')}
          onMouseEnter={() => setHoveredButton('profile')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <div className="button-bg"></div>
          <div className="button-content">
            <div className="icon-wrapper">
              <span className="icon">👨‍💻</span>
              <div className="icon-glow"></div>
            </div>
            <div className="text-wrapper">
              <h3 className="btn-title">训练师档案</h3>
              <p className="btn-desc">查看你的训练成就</p>
            </div>
            <div className="arrow">→</div>
          </div>
          <div className="button-shine"></div>
        </button>
      </div>
    </div>
  )
}

export default HomePage
