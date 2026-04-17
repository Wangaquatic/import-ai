import React, { useState, useRef, useCallback, useEffect } from 'react'
import './Level3Page.css'
import levelBg from '../../assets/level-bg.png'
import level3Balancer from '../../assets/level3-balancer.png'
import level3Input from '../../assets/level3-input.png'
import targetImg from '../../assets/target.jpg'

interface Level3PageProps {
  onBack: () => void
}

interface Point { x: number; y: number }
interface Connection { from: string; to: string }
interface Particle { id: number; color: string; from: string; to: string; progress: number; speed: number; done: boolean }

const SAVE_KEY = 'level3_saved_state'
const COINS_KEY = 'player_coins'
const LEVEL3_REWARD_KEY = 'level3_reward_claimed'

// 均衡器位置 - 调整到更低的位置避免遮挡按钮
interface BalancerPos { x: number; y: number }
const initialBalancerPositions: Record<string, BalancerPos> = {
  'balancer1': { x: 0, y: 20 },
  'balancer2': { x: 0, y: 180 },
  'balancer3': { x: 0, y: 340 }
}

const Level3Page: React.FC<Level3PageProps> = ({ onBack }) => {
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

  const savedState = React.useMemo(() => {
    try { 
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
      return saved || { connections: [], balancerPositions: initialBalancerPositions }
    } catch { 
      return { connections: [], balancerPositions: initialBalancerPositions }
    }
  }, [])

  const [balancerPositions, setBalancerPositions] = useState<Record<string, BalancerPos>>(
    savedState.balancerPositions || initialBalancerPositions
  )
  const [connections, setConnections] = useState<Connection[]>(savedState.connections || [])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [draggingBalancer, setDraggingBalancer] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [target1Progress, setTarget1Progress] = useState(0)
  const [target2Progress, setTarget2Progress] = useState(0)
  const [target3Progress, setTarget3Progress] = useState(0)
  const [target4Progress, setTarget4Progress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const [showReward, setShowReward] = useState(false)
  const rewardClaimed = React.useRef(!!localStorage.getItem(LEVEL3_REWARD_KEY))
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

  const onBalancerMouseDown = (e: React.MouseEvent, balancerId: string) => {
    setDraggingBalancer(balancerId)
    const pos = balancerPositions[balancerId]
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    })
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
    
    // 连接规则：
    // input-out -> balancer1-in
    // balancer1-out1/out2 -> balancer2-in, balancer3-in
    // balancer2-out1/out2 -> target1-in, target2-in, target3-in, target4-in
    // balancer3-out1/out2 -> target1-in, target2-in, target3-in, target4-in
    const rules: Record<string, string[]> = {
      'input-out': ['balancer1-in'],
      'balancer1-out1': ['balancer2-in', 'balancer3-in'],
      'balancer1-out2': ['balancer2-in', 'balancer3-in'],
      'balancer2-out1': ['target1-in', 'target2-in', 'target3-in', 'target4-in'],
      'balancer2-out2': ['target1-in', 'target2-in', 'target3-in', 'target4-in'],
      'balancer3-out1': ['target1-in', 'target2-in', 'target3-in', 'target4-in'],
      'balancer3-out2': ['target1-in', 'target2-in', 'target3-in', 'target4-in'],
    }
    const allowed = rules[from]
    if (!allowed || !allowed.includes(id)) { setDraggingLine(null); return }
    setConnections(prev => [...prev.filter(c => c.from !== from && c.to !== id), { from, to: id }])
    setDraggingLine(null)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingBalancer) {
      const x = e.clientX - dragOffset.x
      const y = e.clientY - dragOffset.y
      setBalancerPositions(prev => ({
        ...prev,
        [draggingBalancer]: { x, y }
      }))
    }
    if (draggingLine)
      setDraggingLine(prev => prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null)
  }

  const onMouseUp = () => { 
    setDraggingBalancer(null)
    setDraggingLine(null) 
  }

  const handleSave = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ connections, balancerPositions }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearLines = () => setConnections([])

  // 启动测试
  const handleTest = () => {
    if (testing) return
    setTesting(true)
    setTarget1Progress(0)
    setTarget2Progress(0)
    setTarget3Progress(0)
    setTarget4Progress(0)
    setElapsed(0)

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    let id = 0
    const particles: Particle[] = []

    // 从输入到balancer1（50个红色方块）
    const inputConn = connections.find(c => c.from === 'input-out')
    if (inputConn) {
      const inputColors = Array(50).fill('#ef4444')
      inputColors.forEach((color, i) => {
        particles.push({ id: id++, color, from: inputConn.from, to: inputConn.to, progress: -(i * 0.08), speed: 0.003, done: false })
      })
    }

    // balancer1 的两个输出（各25个，平均分配）
    const b1out1 = connections.find(c => c.from === 'balancer1-out1')
    const b1out2 = connections.find(c => c.from === 'balancer1-out2')
    const delay1 = -0.5
    if (b1out1) {
      const colors = Array(25).fill('#ef4444')
      colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: b1out1.from, to: b1out1.to, progress: delay1 - i * 0.12, speed: 0.003, done: false })
      })
    }
    if (b1out2) {
      const colors = Array(25).fill('#ef4444')
      colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: b1out2.from, to: b1out2.to, progress: delay1 - i * 0.12, speed: 0.003, done: false })
      })
    }

    // balancer2 和 balancer3 的输出（各12-13个，再平均分配）
    const b2out1 = connections.find(c => c.from === 'balancer2-out1')
    const b2out2 = connections.find(c => c.from === 'balancer2-out2')
    const b3out1 = connections.find(c => c.from === 'balancer3-out1')
    const b3out2 = connections.find(c => c.from === 'balancer3-out2')
    const delay2 = -1.0

    if (b2out1) {
      const colors = Array(13).fill('#ef4444')
      colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: b2out1.from, to: b2out1.to, progress: delay2 - i * 0.15, speed: 0.003, done: false })
      })
    }
    if (b2out2) {
      const colors = Array(12).fill('#ef4444')
      colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: b2out2.from, to: b2out2.to, progress: delay2 - i * 0.15, speed: 0.003, done: false })
      })
    }
    if (b3out1) {
      const colors = Array(13).fill('#ef4444')
      colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: b3out1.from, to: b3out1.to, progress: delay2 - i * 0.15, speed: 0.003, done: false })
      })
    }
    if (b3out2) {
      const colors = Array(12).fill('#ef4444')
      colors.forEach((color, i) => {
        particles.push({ id: id++, color, from: b3out2.from, to: b3out2.to, progress: delay2 - i * 0.15, speed: 0.003, done: false })
      })
    }

    setTestParticles(particles)

    const animate = () => {
      setTestParticles(prev => {
        const next = prev.map(p => {
          const newProgress = p.progress + p.speed * speedMultiplierRef.current
          return { ...p, progress: newProgress, done: newProgress >= 1 }
        })

        // 计算到达每个目标的红色方块数量
        const target1Red = next.filter(p => p.to === 'target1-in' && p.color === '#ef4444' && p.progress >= 0)
          .reduce((sum, p) => sum + Math.min(p.progress, 1), 0)
        const target2Red = next.filter(p => p.to === 'target2-in' && p.color === '#ef4444' && p.progress >= 0)
          .reduce((sum, p) => sum + Math.min(p.progress, 1), 0)
        const target3Red = next.filter(p => p.to === 'target3-in' && p.color === '#ef4444' && p.progress >= 0)
          .reduce((sum, p) => sum + Math.min(p.progress, 1), 0)
        const target4Red = next.filter(p => p.to === 'target4-in' && p.color === '#ef4444' && p.progress >= 0)
          .reduce((sum, p) => sum + Math.min(p.progress, 1), 0)

        setTarget1Progress(Math.min(target1Red / 12.5, 1))
        setTarget2Progress(Math.min(target2Red / 12.5, 1))
        setTarget3Progress(Math.min(target3Red / 12.5, 1))
        setTarget4Progress(Math.min(target4Red / 12.5, 1))

        if (next.every(p => p.done)) {
          setTesting(false)
          if (timerRef.current) clearInterval(timerRef.current)
          
          // 计算最终准确率（目标是让四个输出各12-13个，理想是12.5个）
          const finalTarget1 = next.filter(p => p.to === 'target1-in' && p.color === '#ef4444').length
          const finalTarget2 = next.filter(p => p.to === 'target2-in' && p.color === '#ef4444').length
          const finalTarget3 = next.filter(p => p.to === 'target3-in' && p.color === '#ef4444').length
          const finalTarget4 = next.filter(p => p.to === 'target4-in' && p.color === '#ef4444').length
          
          // 计算偏差：理想情况是各12.5个
          const target1Deviation = Math.abs(finalTarget1 - 12.5)
          const target2Deviation = Math.abs(finalTarget2 - 12.5)
          const target3Deviation = Math.abs(finalTarget3 - 12.5)
          const target4Deviation = Math.abs(finalTarget4 - 12.5)
          const totalDeviation = target1Deviation + target2Deviation + target3Deviation + target4Deviation
          
          // 准确率：偏差越小越好，最大偏差是50（全部到一边）
          const accuracy = 1 - (totalDeviation / 50)
          
          setTarget1Progress(finalTarget1 / 12.5)
          setTarget2Progress(finalTarget2 / 12.5)
          setTarget3Progress(finalTarget3 / 12.5)
          setTarget4Progress(finalTarget4 / 12.5)
          
          // 如果准确率达到80%以上（偏差小于10），发放奖励
          if (accuracy >= 0.8 && !rewardClaimed.current) {
            rewardClaimed.current = true
            localStorage.setItem(LEVEL3_REWARD_KEY, '1')
            const reward = Math.floor(accuracy * 200)
            const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + reward
            localStorage.setItem(COINS_KEY, String(newCoins))
            setCoins(newCoins)
            setShowReward(true)
            setTimeout(() => setShowReward(false), 3000)
          }
          return []
        }
        animFrameRef.current = requestAnimationFrame(animate)
        return next
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
    <div className="level3-page" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
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
          <div className="reward-text">关卡完成！</div>
          <div className="reward-coins">+{Math.floor((1 - (Math.abs(next.filter(p => p.to === 'target1-in').length - 12.5) + Math.abs(next.filter(p => p.to === 'target2-in').length - 12.5) + Math.abs(next.filter(p => p.to === 'target3-in').length - 12.5) + Math.abs(next.filter(p => p.to === 'target4-in').length - 12.5)) / 50) * 200)} 🪙</div>
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
          <img src={level3Input} alt="输入数据" className="input-img" draggable={false} />
          <div ref={setDotRef('input-out')} className="dot dot-right"
            onMouseDown={(e) => onDotMouseDown(e, 'input-out')}
            onMouseUp={(e) => onDotMouseUp(e, 'input-out')} />
        </div>
      </div>

      {/* 分类图片列 - 4个输出 */}
      <div className="target-panel-4">
        <div className="img-with-dot">
          <div ref={setDotRef('target1-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target1-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target1-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标1" className="target-img-small" draggable={false} />
            {(testing || target1Progress > 0) && (
              <div className="bar-overlay">
                <span className="bar-label">{Math.round(target1Progress * 100)}%</span>
                <div className="bar-track">
                  <div className="bar-threshold" style={{ bottom: '100%' }} />
                  <div className="bar-fill bar-red" style={{ height: `${target1Progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('target2-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target2-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target2-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标2" className="target-img-small" draggable={false} />
            {(testing || target2Progress > 0) && (
              <div className="bar-overlay">
                <span className="bar-label">{Math.round(target2Progress * 100)}%</span>
                <div className="bar-track">
                  <div className="bar-threshold" style={{ bottom: '100%' }} />
                  <div className="bar-fill bar-red" style={{ height: `${target2Progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('target3-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target3-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target3-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标3" className="target-img-small" draggable={false} />
            {(testing || target3Progress > 0) && (
              <div className="bar-overlay">
                <span className="bar-label">{Math.round(target3Progress * 100)}%</span>
                <div className="bar-track">
                  <div className="bar-threshold" style={{ bottom: '100%' }} />
                  <div className="bar-fill bar-red" style={{ height: `${target3Progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('target4-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target4-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target4-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标4" className="target-img-small" draggable={false} />
            {(testing || target4Progress > 0) && (
              <div className="bar-overlay">
                <span className="bar-label">{Math.round(target4Progress * 100)}%</span>
                <div className="bar-track">
                  <div className="bar-threshold" style={{ bottom: '100%' }} />
                  <div className="bar-fill bar-red" style={{ height: `${target4Progress * 100}%` }} />
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
          {/* 均衡器1 */}
          <div 
            className="balancer-wrapper"
            style={{ 
              transform: `translate(${balancerPositions.balancer1.x}px, ${balancerPositions.balancer1.y}px)`,
              cursor: draggingBalancer === 'balancer1' ? 'grabbing' : 'grab'
            }}
            onMouseDown={(e) => onBalancerMouseDown(e, 'balancer1')}>
            <div ref={setDotRef('balancer1-in')} className="dot dot-left"
              onMouseDown={(e) => onDotMouseDown(e, 'balancer1-in')}
              onMouseUp={(e) => onDotMouseUp(e, 'balancer1-in')} />
            <div style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
              <img src={level3Balancer} alt="均衡器" className="balancer-img" draggable={false} style={{ width: '100%', display: 'block' }} />
              <div ref={setDotRef('balancer1-out1')} className="dot"
                style={{ position: 'absolute', right: 10, top: '35%', transform: 'translateY(-50%)' }}
                onMouseDown={(e) => onDotMouseDown(e, 'balancer1-out1')}
                onMouseUp={(e) => onDotMouseUp(e, 'balancer1-out1')} />
              <div ref={setDotRef('balancer1-out2')} className="dot"
                style={{ position: 'absolute', right: 10, bottom: 10, transform: 'none' }}
                onMouseDown={(e) => onDotMouseDown(e, 'balancer1-out2')}
                onMouseUp={(e) => onDotMouseUp(e, 'balancer1-out2')} />
            </div>
          </div>

          {/* 均衡器2 */}
          <div 
            className="balancer-wrapper"
            style={{ 
              transform: `translate(${balancerPositions.balancer2.x}px, ${balancerPositions.balancer2.y}px)`,
              cursor: draggingBalancer === 'balancer2' ? 'grabbing' : 'grab'
            }}
            onMouseDown={(e) => onBalancerMouseDown(e, 'balancer2')}>
            <div ref={setDotRef('balancer2-in')} className="dot dot-left"
              onMouseDown={(e) => onDotMouseDown(e, 'balancer2-in')}
              onMouseUp={(e) => onDotMouseUp(e, 'balancer2-in')} />
            <div style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
              <img src={level3Balancer} alt="均衡器" className="balancer-img" draggable={false} style={{ width: '100%', display: 'block' }} />
              <div ref={setDotRef('balancer2-out1')} className="dot"
                style={{ position: 'absolute', right: 10, top: '35%', transform: 'translateY(-50%)' }}
                onMouseDown={(e) => onDotMouseDown(e, 'balancer2-out1')}
                onMouseUp={(e) => onDotMouseUp(e, 'balancer2-out1')} />
              <div ref={setDotRef('balancer2-out2')} className="dot"
                style={{ position: 'absolute', right: 10, bottom: 10, transform: 'none' }}
                onMouseDown={(e) => onDotMouseDown(e, 'balancer2-out2')}
                onMouseUp={(e) => onDotMouseUp(e, 'balancer2-out2')} />
            </div>
          </div>

          {/* 均衡器3 */}
          <div 
            className="balancer-wrapper"
            style={{ 
              transform: `translate(${balancerPositions.balancer3.x}px, ${balancerPositions.balancer3.y}px)`,
              cursor: draggingBalancer === 'balancer3' ? 'grabbing' : 'grab'
            }}
            onMouseDown={(e) => onBalancerMouseDown(e, 'balancer3')}>
            <div ref={setDotRef('balancer3-in')} className="dot dot-left"
              onMouseDown={(e) => onDotMouseDown(e, 'balancer3-in')}
              onMouseUp={(e) => onDotMouseUp(e, 'balancer3-in')} />
            <div style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
              <img src={level3Balancer} alt="均衡器" className="balancer-img" draggable={false} style={{ width: '100%', display: 'block' }} />
              <div ref={setDotRef('balancer3-out1')} className="dot"
                style={{ position: 'absolute', right: 10, top: '35%', transform: 'translateY(-50%)' }}
                onMouseDown={(e) => onDotMouseDown(e, 'balancer3-out1')}
                onMouseUp={(e) => onDotMouseUp(e, 'balancer3-out1')} />
              <div ref={setDotRef('balancer3-out2')} className="dot"
                style={{ position: 'absolute', right: 10, bottom: 10, transform: 'none' }}
                onMouseDown={(e) => onDotMouseDown(e, 'balancer3-out2')}
                onMouseUp={(e) => onDotMouseUp(e, 'balancer3-out2')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Level3Page
