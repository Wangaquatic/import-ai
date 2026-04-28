import React from 'react'
import './LevelsPage.css'

interface LevelsPageProps {
  onBack: () => void
  onNavigate: (page: 'tutorial' | 'level1' | 'level2' | 'level2copy' | 'level3' | 'level4') => void
}

const levels = [
  { id: 1, name: '教学关卡', desc: '识别模型复杂度过高的问题', locked: false },
  { id: 2, name: '专家系统', desc: '对数据进行清洗', locked: false },
  { id: 3, name: '负载均衡', desc: '学习数据分流和负载均衡的基本概念', locked: false },
  { id: 4, name: '决策树', desc: '掌握树模型的分类逻辑', locked: false },
  { id: 5, name: '随机森林', desc: '理解集成学习的威力', locked: true },
  { id: 6, name: '神经网络', desc: '了解多层神经元的传递', locked: true },
  { id: 7, name: '特征工程', desc: '学习构造有意义的特征', locked: true },
  { id: 8, name: '超参数调优', desc: '体验参数对模型的影响', locked: true }
]

const LevelsPage: React.FC<LevelsPageProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="levels-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="page-title">📚 关卡挑战</h1>
      </div>

      <div className="levels-grid">
        {levels.map((level) => (
          <div
            key={level.id}
            className={`level-card ${level.locked ? 'locked' : ''}`}
            onClick={() => {
              if (level.locked) return
              if (level.id === 1) onNavigate('level2copy')
              else if (level.id === 2) onNavigate('level2')
              else if (level.id === 3) onNavigate('level3')
              else if (level.id === 4) onNavigate('level4')
              else alert(`开始关卡 ${level.id}`)
            }}
          >
            <div className="level-number">关卡 {level.id}</div>
            <h3 className="level-name">{level.name}</h3>
            <p className="level-desc">{level.desc}</p>
            {level.locked && <div className="lock-icon">🔒</div>}
            {!level.locked && <div className="play-icon">▶️</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default LevelsPage
