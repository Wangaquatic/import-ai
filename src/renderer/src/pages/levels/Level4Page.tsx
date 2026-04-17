import React, { useState, useRef, useCallback, useEffect } from 'react'
import './Level4Page.css'
import levelBg from '../../assets/level-bg.png'
import classifierImg from '../../assets/classifier.jpg'
import level3Input from '../../assets/level3-input.png'
import targetImg from '../../assets/target.jpg'
import noTargetImg from '../../assets/no-target.png'

interface Level4PageProps {
  onBack: () => void
}

interface Point { x: number; y: number }
interface Connection { from: string; to: string }
interface Particle { id: number; color: string; from: string; to: string; progress: number; speed: number; done: boolean }

const SAVE_KEY = 'level4_saved_state'
const COINS_KEY = 'player_coins'
const LEVEL4_REWARD_KEY = 'level4_reward_claimed'
const MAX_NODES = 8
const TIME_LIMIT = 180 // 3分钟

const Level4Page: React.FC<Level4PageProps> = ({ onBack }) => {
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

  const [connections, setConnections] = useState<Connection[]>([])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [outputCount, setOutputCount] = useState(0)
  const [outputAccuracy, setOutputAccuracy] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [levelComplete, setLevelComplete] = useState(false)
  const [levelFailed, setLevelFailed] = useState(false)
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const [showReward, setShowReward] = useState(false)
  const [infoModal, setInfoModal] = useState<'input' | 'output' | 'classifier' | 'trash' | null>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const rewardClaimed = React.useRef(!!localStorage.getItem(LEVEL4_REWARD_KEY))
  const speedMultiplierRef = useRef(1.0)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 100)
    return () => clearTimeout(timer)
  }, [])

  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const getDotCenter = useCallback((id: string): Point | null => {
    const el = dotRefs.current[id]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [])

  const onDotMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const center = getDotCenter(id)
    if (!center) return
    setDraggingLine({ fromId: id, mouse: center })
    e.preventDefault()
  }

  const onDotMouseUp = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!draggingLine) return
    const from = draggingLine.fromId
    if (from === id) { setDraggingLine(null); return }
    
    // 检查from是否已经有连接（每个连接点只能发出一条线）
    const existingFromConnection = connections.find(c => c.from === from)
    if (existingFromConnection) {
      setDraggingLine(null)
      return
    }
    
    setConnections(prev => [...prev, { from, to: id }])
    setDraggingLine(null)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingLine)
      setDraggingLine(prev => prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null)
  }

  const onMouseUp = () => { 
    setDraggingLine(null) 
  }

  const handleSave = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ connections, nodeCount }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearLines = () => setConnections([])

  const handleTest = () => {
    if (testing) return
    setTesting(true)
    setOutputCount(0)
    setOutputAccuracy(0)
    setElapsed(0)
    setLevelComplete(false)
    setLevelFailed(false)

    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= TIME_LIMIT) {
          setTesting(false)
          setLevelFailed(true)
          if (timerRef.current) clearInterval(timerRef.current)
          return e + 1
        }
        return e + 1
      })
    }, 1000)

    // TODO: 实现测试逻辑
    setTestParticles([])
  }

  const speeds = [0.5, 1.0, 1.5, 2.0]
  const handleSpeedChange = () => {
    const idx = speeds.indexOf(speedMultiplier)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeedMultiplier(next)
    speedMultiplierRef.current = next
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const renderLines = () => connections.map((conn, i) => {
    const from = getDotCenter(conn.from)
    const to = getDotCenter(conn.to)
    if (!from || !to) return null
    return (
      <g key={i}>
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    )
  })

  const renderTestParticles = () => testParticles.map(p => {
    if (p.progress < 0 || p.done) return null
    const from = getDotCenter(p.from)
    const to = getDotCenter(p.to)
    if (!from || !to) return null
    const t = Math.min(p.progress, 1)
    const x = from.x + (to.x - from.x) * t - 4
    const y = from.y + (to.y - from.y) * t - 4
    return <rect key={p.id} x={x} y={y} width="8" height="8" fill={p.color} rx="2" opacity="0.9" />
  })

  const renderDraggingLine = () => {
    if (!draggingLine) return null
    const from = getDotCenter(draggingLine.fromId)
    if (!from) return null
    return <line x1={from.x} y1={from.y} x2={draggingLine.mouse.x} y2={draggingLine.mouse.y} stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" />
  }

  const setDotRef = (id: string) => (el: HTMLDivElement | null) => { dotRefs.current[id] = el }

  return (
    <div className="level4-page" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div className="bg-blur-layer" style={{ backgroundImage: `url(${levelBg})` }} />

      <svg style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 50 }}>
        {renderLines()}
        {renderTestParticles()}
        {renderDraggingLine()}
      </svg>

      <div className="particles-container">
        {particles.map((particle) => (
          <div key={particle.id} className={`particle ${particle.size}`}
            style={{ left: `${particle.left}%`, top: `${particle.top}%`, animationDuration: `${particle.animationDuration}s`, animationDelay: `${particle.animationDelay}s` }}>
            {particle.content}
          </div>
        ))}
      </div>

      <button className="back-button" onClick={onBack}>← 返回</button>

      {/* 节点计数器 */}
      <div className="node-counter">{nodeCount}/{MAX_NODES}</div>

      {/* 金币显示 */}
      <div className="coins-display">🪙 {coins}</div>

      {/* 奖励弹窗 */}
      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">关卡完成！</div>
          <div className="reward-coins">+300 🪙</div>
        </div>
      )}

      {/* 过关成功页面 */}
      {levelComplete && (
        <div className="success-overlay">
          <div className="success-modal">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">恭喜过关！</h2>
            <div className="success-stats">
              <div className="stat-item">
                <span className="stat-label">用时</span>
                <span className="stat-value">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">奖励</span>
                <span className="stat-value">+300 🪙</span>
              </div>
            </div>
            <button className="success-btn" onClick={onBack}>返回关卡</button>
          </div>
        </div>
      )}

      {/* 失败页面 */}
      {levelFailed && (
        <div className="success-overlay">
          <div className="fail-modal">
            <div className="fail-icon">⏰</div>
            <h2 className="fail-title">时间到！</h2>
            <p className="fail-text">未能在规定时间内完成任务</p>
            <button className="fail-btn" onClick={onBack}>返回关卡</button>
          </div>
        </div>
      )}

      {/* 说明弹窗 */}
      {infoModal && (
        <div className="info-overlay" onClick={() => setInfoModal(null)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <h3 className="info-title">
              {infoModal === 'input' ? '📊 输入数据' : infoModal === 'output' ? '🎯 输出目标' : infoModal === 'classifier' ? '🤖 分类器' : '🗑️ 垃圾桶'}
            </h3>
            <div className="info-columns">
              <div className="info-col">
                <div className="info-col-label simple">简易版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '这就像给AI看很多例子。你给它看很多张图片，告诉它哪些有目标、哪些没有，它就慢慢学会自己判断。'
                    : infoModal === 'output'
                    ? '输出目标就像是分类的结果箱。这个箱子需要收集300个正确的红色方块，准确率要达到75%才算过关。'
                    : infoModal === 'classifier'
                    ? '分类器就像一个"判断机器"。数据进去，它想一想，然后告诉你答案是A还是B。连线就是告诉它数据从哪来、结果往哪送。'
                    : '垃圾桶用来丢弃不需要的数据。有时候我们只需要某一类数据，其他的就可以扔进垃圾桶，不用管它们了。'}
                </p>
              </div>
              <div className="info-divider" />
              <div className="info-col">
                <div className="info-col-label pro">专业版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '训练数据集（Training Dataset）是监督学习的基础。每个样本包含特征向量和标签，模型通过最小化损失函数在数据分布上学习特征映射关系。数据质量和数量直接影响模型的泛化能力。'
                    : infoModal === 'output'
                    ? '输出节点是数据流的终点，用于收集和验证分类结果。本关要求输出达到300个样本且准确率为75%，以验证分类器的性能和数据流的正确性。'
                    : infoModal === 'classifier'
                    ? '分类器是一种判别模型，通过学习输入特征空间到类别标签的映射函数 f: X→Y 来实现分类。训练过程通过反向传播算法迭代更新权重参数，使交叉熵损失最小化，从而提升分类准确率。'
                    : '垃圾桶节点（Null Sink）用于丢弃不需要的数据流。在数据处理管道中，某些分支的输出可能不需要进一步处理，通过垃圾桶节点可以优雅地终止这些数据流，避免资源浪费。'}
                </p>
              </div>
            </div>
            <button className="info-close" onClick={() => setInfoModal(null)}>关闭</button>
          </div>
        </div>
      )}

      {/* 垃圾桶 */}
      <button className="trash-btn" onClick={handleClearLines} title="清除所有连线">🗑️</button>

      {/* 速度控制 */}
      <button className="speed-btn" onClick={handleSpeedChange}>
        ▶▶ {speedMultiplier.toFixed(1)}x
      </button>

      {/* 计时器 */}
      {(testing || elapsed > 0) && (
        <div className="timer-display">
          ⏱ {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')} / {Math.floor(TIME_LIMIT / 60)}:{(TIME_LIMIT % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* 左边 - 输入图 */}
      <div className="left-panel">
        <div className="img-with-dot">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={level3Input} alt="输入数据" className="input-img" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('input')}>i</button>
          </div>
          <div ref={setDotRef('input-out')} className="dot dot-right"
            onMouseDown={(e) => onDotMouseDown(e, 'input-out')}
            onMouseUp={(e) => onDotMouseUp(e, 'input-out')} />
        </div>
      </div>

      {/* 输出目标 */}
      <div className="output-panel">
        <div className="img-with-dot">
          <div ref={setDotRef('output-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'output-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'output-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="输出目标" className="output-img" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('output')}>i</button>
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(outputCount / 300) * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: outputCount >= 300 ? '#4ade80' : '#ffffff' }}>
                  {outputCount}/300
                </span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${outputAccuracy * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: outputAccuracy >= 0.75 ? '#4ade80' : '#ffffff' }}>
                  {Math.round(outputAccuracy * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右边栏 - 节点库 */}
      <div className="sidebar">
        <div className="sidebar-actions">
          <button className={`sidebar-btn test-btn ${testing ? 'testing' : ''}`} onClick={handleTest} disabled={testing}>
            {testing ? '测试中...' : '测试'}
          </button>
          <button className={`sidebar-btn save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
            {saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
        <div className="sidebar-content">
          <div className="node-library">
            <div className="node-library-title">节点库</div>
            {/* 分类器节点 */}
            <div className="library-node">
              <img src={classifierImg} alt="分类器" className="library-node-img" draggable={false} />
              <span className="library-node-label">分类器 (0/4)</span>
            </div>
            {/* 垃圾桶节点 */}
            <div className="library-node">
              <div className="trash-node-placeholder">🗑️</div>
              <span className="library-node-label">垃圾桶 (0/1)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Level4Page
