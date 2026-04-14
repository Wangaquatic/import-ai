import React from 'react'
import './TutorialPage.css'
import levelBg from '../assets/level-bg.png'

interface Level2PageProps {
  onBack: () => void
}

const Level2Page: React.FC<Level2PageProps> = ({ onBack }) => {
  return (
    <div className="tutorial-page">
      <div className="bg-blur-layer" style={{ backgroundImage: `url(${levelBg})` }} />
      <button className="back-button" onClick={onBack}>← 返回</button>
      <div style={{ color: '#fff', fontSize: '24px', fontWeight: 700, zIndex: 10, opacity: 0.6 }}>
        第二关 - 敬请期待
      </div>
    </div>
  )
}

export default Level2Page
