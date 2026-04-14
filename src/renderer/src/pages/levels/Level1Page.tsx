import React, { useState, useRef, useCallback, useEffect } from 'react'
import './Level1Page.css'
import levelBg from '../../assets/level-bg.png'
import classifierImg from '../../assets/classifier.jpg'
import tutorialInput from '../../assets/tutorial-input.png'
import targetImg from '../../assets/target.jpg'
import noTargetImg from '../../assets/no-target.png'

interface Level1PageProps {
  onBack: () => void
}

interface Point { x: number; y: number }
interface Connection { from: string; to: string }
interface SavedState { connections: Connection[]; pos: { x: number; y: number } }
interface Particle { id: number; color: string; from: string; to: string; progress: number; speed: number; done: boolean }

const SAVE_KEY = 'tutorial_saved_state'
const COINS_KEY = 'player_coins'
const TUTORIAL_REWARD_KEY = 'tutorial_reward_claimed'

const Level1Page: React.FC<Level1PageProps> = ({ onBack }) => {
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

  const savedState: SavedState | null = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') } catch { return null }
  }, [])

  const [pos, setPos] = useState(savedState?.pos ?? { x: 0, y: 0 })
  const [connections, setConnections] = useState<Connection[]>(savedState?.connections ?? [])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [noTargetProgress, setNoTargetProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const [showReward, setShowReward] = useState(false)
  const [infoModal, setInfoModal] = useState<'input' | 'classifier' | null>(null)
  const rewardClaimed = React.useRef(!!localStorage.getItem(TUTORIAL_REWARD_KEY))
  const totalRef = useRef({ red: 0, blue: 0 })
  const speedMultiplierRef = useRef(1.0)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, forceUpdate] = useState(0)

  // DOM 渲染完后强制重绘连线
  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 100)
    return () => clearTimeout(timer)
  }, [])

  const draggingClassifier = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const getDotCenter = useCallback((id: string): Point | null => {
    const el = dotRefs.current[id]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [])

  const onClassifierMouseDown = (e: React.MouseEvent) => {
    draggingClassifier.current = true
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }

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
    const rules: Record<string, string[]> = {
      'input-out': ['classifier-in'],
      'classifier-out1': ['target-in', 'no-target-in'],
      'classifier-out2': ['target-in', 'no-target-in'],
    }
    const allowed = rules[from]
    if (!allowed || !allowed.includes(id)) { setDraggingLine(null); return }
    setConnections(prev => [...prev.filter(c => c.from !== from && c.to !== id), { from, to: id }])
    setDraggingLine(null)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingClassifier.current)
      setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
    if (draggingLine)
      setDraggingLine(prev => prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null)
  }

  const onMouseUp = () => { draggingClassifier.current = false; setDraggingLine(null) }

  const handleSave = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ connections, pos }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearLines = () => setConnections([])

  // 启动测试
  const handleTest = () => {
    if (testing) return
    setTesting(true)
    setTargetProgress(0)
    setNoTargetProgress(0)
    setElapsed(0)

    // 启动计时器
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    const inputConn = connections.find(c => c.from === 'input-out')
    const out1Conn = connections.find(c => c.from === 'classifier-out1')
    const out2Conn = connections.find(c => c.from === 'classifier-out2')

    // 判断连接是否正确
    // classifier-out1 连 target-in = 正确，连 no-target-in = 错误
    // classifier-out2 连 no-target-in = 正确，连 target-in = 错误
    const out1IsCorrect = out1Conn?.to === 'target-in'
    const out2IsCorrect = out2Conn?.to === 'no-target-in'

    // 红20蓝20，各5个分类错误（75%正确率）
    // 如果连接错误，正确和错误互换
    totalRef.current = { red: 15, blue: 15 }

    let id = 0
    const particles: Particle[] = []

    // 左边：红蓝各20随机混合
    if (inputConn) {
      const inputColors = [...Array(20).fill('#ef4444'), ...Array(20).fill('#3b82f6')].sort(() => Math.random() - 0.5)
      inputColors.forEach((color, i) => {
        particles.push({ id: id++, color, from: inputConn.from, to: inputConn.to, progress: -(i * 0.1), speed: 0.003, done: false })
      })
    }

    const rightDelay = -0.5
    // out1 连线：正确时15红+5蓝，错误时5红+15蓝
    if (out1Conn) {
      const correctCount = out1IsCorrect ? 15 : 5
      const wrongCount = out1IsCorrect ? 5 : 15
      const mainColor = out1IsCorrect ? '#ef4444' : '#3b82f6'
      const wrongColor = out1IsCorrect ? '#3b82f6' : '#ef4444'
      const out1Colors = [...Array(correctCount).fill(mainColor), ...Array(wrongCount).fill(wrongColor)].sort(() => Math.random() - 0.5)
      out1Colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: out1Conn.from, to: out1Conn.to, progress: rightDelay - i * 0.15, speed: 0.003, done: false })
      })
    }
    // out2 连线：正确时15蓝+5红，错误时5蓝+15红
    if (out2Conn) {
      const correctCount = out2IsCorrect ? 15 : 5
      const wrongCount = out2IsCorrect ? 5 : 15
      const mainColor = out2IsCorrect ? '#3b82f6' : '#ef4444'
      const wrongColor = out2IsCorrect ? '#ef4444' : '#3b82f6'
      const out2Colors = [...Array(correctCount).fill(mainColor), ...Array(wrongCount).fill(wrongColor)].sort(() => Math.random() - 0.5)
      out2Colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: out2Conn.from, to: out2Conn.to, progress: rightDelay - i * 0.15, speed: 0.003, done: false })
      })
    }

    setTestParticles(particles)

    const animate = () => {
      setTestParticles(prev => {
        const next = prev.map(p => {
          const newProgress = p.progress + p.speed * speedMultiplierRef.current
          return { ...p, progress: newProgress, done: newProgress >= 1 }
        })

        // 统计正确方块到达数量，根据 progress 实时计算（progress>=0 表示已出发）
        const out1CorrectColor = out1IsCorrect ? '#ef4444' : '#3b82f6'
        const out2CorrectColor = out2IsCorrect ? '#3b82f6' : '#ef4444'

        const out1CorrectProgress = next
          .filter(p => p.from === 'classifier-out1' && p.color === out1CorrectColor && p.progress >= 0)
          .reduce((sum, p) => sum + Math.min(p.progress, 1), 0)
        const out2CorrectProgress = next
          .filter(p => p.from === 'classifier-out2' && p.color === out2CorrectColor && p.progress >= 0)
          .reduce((sum, p) => sum + Math.min(p.progress, 1), 0)

        const maxProgress1 = out1IsCorrect ? 15 : 5
        const maxProgress2 = out2IsCorrect ? 15 : 5

        setTargetProgress(Math.min(out1CorrectProgress / maxProgress1 * 0.75, 0.75))
        setNoTargetProgress(Math.min(out2CorrectProgress / maxProgress2 * 0.75, 0.75))

        // 右边两条线都完成后，左边停止
        const rightParticles = next.filter(p => p.from === 'classifier-out1' || p.from === 'classifier-out2')
        const rightDone = rightParticles.length > 0 && rightParticles.every(p => p.done)
        const final = next.map(p =>
          rightDone && p.from === 'input-out' ? { ...p, done: true } : p
        )

        if (final.every(p => p.done)) {
          setTesting(false)
          setTargetProgress(out1IsCorrect ? 0.75 : 0.25)
          setNoTargetProgress(out2IsCorrect ? 0.75 : 0.25)
          if (timerRef.current) clearInterval(timerRef.current)
          // 发放金币奖励（只能一次）
          if (!rewardClaimed.current) {
            rewardClaimed.current = true
            localStorage.setItem(TUTORIAL_REWARD_KEY, '1')
            const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + 100
            localStorage.setItem(COINS_KEY, String(newCoins))
            setCoins(newCoins)
            setShowReward(true)
            setTimeout(() => setShowReward(false), 3000)
          }
          return []
        }
        animFrameRef.current = requestAnimationFrame(animate)
        return final
      })
    }
    animFrameRef.current = requestAnimationFrame(animate)
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
  const getLineColors = (from: string, to: string): string[] => {
    if (from === 'input-out') return ['#ef4444', '#3b82f6']
    if (to === 'target-in') return ['#ef4444']
    if (to === 'no-target-in') return ['#3b82f6']
    return []
  }

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
    <div className="level1-page" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
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

      {/* 金币显示 */}
      <div className="coins-display">🪙 {coins}</div>

      {/* 奖励弹窗 */}
      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">新手任务完成！</div>
          <div className="reward-coins">+100 🪙</div>
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
          ⏱ {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* 左边 - 输入图 */}
      <div className="left-panel">
        <div className="img-with-dot">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={tutorialInput} alt="教学关卡输入" className="input-img" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('input')}>i</button>
          </div>
          <div ref={setDotRef('input-out')} className="dot dot-right"
            onMouseDown={(e) => onDotMouseDown(e, 'input-out')}
            onMouseUp={(e) => onDotMouseUp(e, 'input-out')} />
        </div>
      </div>

      {/* 分类图片列 */}
      <div className="target-panel">
        <div className="img-with-dot">
          <div ref={setDotRef('target-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="有目标" className="target-img" draggable={false} />
            {(testing || targetProgress > 0) && (
              <div className="bar-overlay">
                <span className="bar-label">{Math.round(targetProgress * 100)}%</span>
                <div className="bar-track">
                  <div className="bar-threshold" />
                  <div className="bar-fill bar-red" style={{ height: `${targetProgress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('no-target-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'no-target-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'no-target-in')} />
          <div className="img-bar-wrapper">
            <img src={noTargetImg} alt="无目标" className="target-img" draggable={false} />
            {(testing || noTargetProgress > 0) && (
              <div className="bar-overlay">
                <span className="bar-label">{Math.round(noTargetProgress * 100)}%</span>
                <div className="bar-track">
                  <div className="bar-threshold" />
                  <div className="bar-fill bar-blue" style={{ height: `${noTargetProgress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右边栏 */}
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
          <div className="classifier-wrapper"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, cursor: draggingClassifier.current ? 'grabbing' : 'grab', zIndex: 999 }}
            onMouseDown={onClassifierMouseDown}>
            <div ref={setDotRef('classifier-in')} className="dot dot-left"
              onMouseDown={(e) => onDotMouseDown(e, 'classifier-in')}
              onMouseUp={(e) => onDotMouseUp(e, 'classifier-in')} />
            <div style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
              <img src={classifierImg} alt="分类器" className="classifier-img" draggable={false} style={{ width: '100%', display: 'block' }} />
              <button className="info-btn" onClick={(e) => { e.stopPropagation(); setInfoModal('classifier') }}>i</button>
              <div ref={setDotRef('classifier-out1')} className="dot"
                style={{ position: 'absolute', right: 10, top: '35%', transform: 'translateY(-50%)' }}
                onMouseDown={(e) => onDotMouseDown(e, 'classifier-out1')}
                onMouseUp={(e) => onDotMouseUp(e, 'classifier-out1')} />
              <div ref={setDotRef('classifier-out2')} className="dot"
                style={{ position: 'absolute', right: 10, bottom: 10, transform: 'none' }}
                onMouseDown={(e) => onDotMouseDown(e, 'classifier-out2')}
                onMouseUp={(e) => onDotMouseUp(e, 'classifier-out2')} />
            </div>
          </div>
        </div>
      </div>

      {/* 说明弹窗 */}
      {infoModal && (
        <div className="info-overlay" onClick={() => setInfoModal(null)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <h3 className="info-title">
              {infoModal === 'input' ? '📊 输入数据' : '🤖 分类器'}
            </h3>
            <div className="info-columns">
              <div className="info-col">
                <div className="info-col-label simple">简易版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '这就像给AI看很多例子。你给它看很多张图片，告诉它哪些有目标、哪些没有，它就慢慢学会自己判断。'
                    : '分类器就像一个"判断机器"。数据进去，它想一想，然后告诉你答案是A还是B。连线就是告诉它数据从哪来、结果往哪送。'}
                </p>
              </div>
              <div className="info-divider" />
              <div className="info-col">
                <div className="info-col-label pro">专业版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '训练数据集（Training Dataset）是监督学习的基础。每个样本包含特征向量和标签，模型通过最小化损失函数在数据分布上学习特征映射关系。数据质量和数量直接影响模型的泛化能力。'
                    : '分类器是一种判别模型，通过学习输入特征空间到类别标签的映射函数 f: X→Y 来实现分类。训练过程通过反向传播算法迭代更新权重参数，使交叉熵损失最小化，从而提升分类准确率。'}
                </p>
              </div>
            </div>
            <button className="info-close" onClick={() => setInfoModal(null)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Level1Page
