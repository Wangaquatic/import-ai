import React, { useState } from 'react'
import './HomePage.css'
<<<<<<< HEAD
import backgroundImg from '../assets/background.jpg'
=======
>>>>>>> 998bde577dc37f461756e859c0b9805e8619ad2b

type Page = 'home' | 'levels' | 'shop' | 'profile'

interface HomePageProps {
  onNavigate: (page: Page) => void
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

<<<<<<< HEAD
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

=======
  return (
    <div className="home-page">
>>>>>>> 998bde577dc37f461756e859c0b9805e8619ad2b
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

<<<<<<< HEAD
      {/* Start Game 按钮 - Logo 下方 */}
      <div className="start-game-container">
        <button
          className={`game-button start-game-btn ${hoveredButton === 'levels' ? 'active' : ''}`}
=======
      {/* 导航按钮区域 */}
      <div className="nav-container">
        <button
          className={`game-button levels-btn ${hoveredButton === 'levels' ? 'active' : ''}`}
>>>>>>> 998bde577dc37f461756e859c0b9805e8619ad2b
          onClick={() => onNavigate('levels')}
          onMouseEnter={() => setHoveredButton('levels')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <div className="button-bg"></div>
          <div className="button-content">
<<<<<<< HEAD
            <span className="start-text">START GAME</span>
          </div>
          <div className="button-shine"></div>
        </button>
      </div>

      {/* 底部按钮区域 */}
      <div className="bottom-nav-container">
=======
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

>>>>>>> 998bde577dc37f461756e859c0b9805e8619ad2b
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
<<<<<<< HEAD
            </div>
=======
              <p className="btn-desc">解锁强大的工具和模型</p>
            </div>
            <div className="arrow">→</div>
>>>>>>> 998bde577dc37f461756e859c0b9805e8619ad2b
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
<<<<<<< HEAD
            </div>
=======
              <p className="btn-desc">查看你的训练成就</p>
            </div>
            <div className="arrow">→</div>
>>>>>>> 998bde577dc37f461756e859c0b9805e8619ad2b
          </div>
          <div className="button-shine"></div>
        </button>
      </div>
    </div>
  )
}

export default HomePage
