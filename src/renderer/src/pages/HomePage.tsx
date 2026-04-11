import React, { useState } from 'react'
import './HomePage.css'
import backgroundImg from '../assets/background.jpg'
import logoImg from '../assets/logo.png'

type Page = 'home' | 'levels' | 'shop' | 'profile'

interface HomePageProps {
  onNavigate: (page: Page) => void
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  // 生成粒子数据
  const particles = React.useMemo(() => {
    const binaries = ['0', '1', '01', '10', '001', '101', '110', '011', '100', '111', '0101', '1010', '1100', '0011']
    
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      content: binaries[Math.floor(Math.random() * binaries.length)],
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDuration: 20 + Math.random() * 30,
      animationDelay: -(Math.random() * 50),
      size: Math.random() > 0.7 ? 'medium' : 'small'
    }))
  }, [])

  return (
    <div className="home-page" style={{ backgroundImage: `url(${backgroundImg})` }}>
      {/* 动态粒子效果 */}
      <div className="particles-container">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`particle ${particle.size}`}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDuration: `${particle.animationDuration}s`,
              animationDelay: `${particle.animationDelay}s`
            }}
          >
            {particle.content}
          </div>
        ))}
      </div>

      {/* 动态背景装饰 */}
      <div className="bg-decoration">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* Logo 和标题区域 */}
      <div className="home-header">
        <img src={logoImg} alt="import ai" className="logo-image" />
        <div className="subtitle-decoration">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>

      {/* Start Game 按钮 - Logo 下方 */}
      <div className="start-game-container">
        <button
          className={`game-button start-game-btn ${hoveredButton === 'levels' ? 'active' : ''}`}
          onClick={() => onNavigate('levels')}
          onMouseEnter={() => setHoveredButton('levels')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <div className="button-bg"></div>
          <div className="button-content">
            <span className="start-text">START GAME</span>
          </div>
          <div className="button-shine"></div>
        </button>
      </div>

      {/* 底部按钮区域 */}
      <div className="bottom-nav-container">
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
            </div>
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
            </div>
          </div>
          <div className="button-shine"></div>
        </button>
      </div>
    </div>
  )
}

export default HomePage
