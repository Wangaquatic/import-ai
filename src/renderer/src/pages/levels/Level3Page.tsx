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
interface Particle { 
  id: number
  color: string
  path: string[] // 完整路径：['input-out', 'balancer1-in', 'balancer1-out1', 'target1-in']
  currentSegment: number // 当前在哪个线段
  progress: number // 当前线段的进度 0-1
  speed: number
  waitingAt: string | null // 正在等待的节点ID
  waitTime: number // 已等待时间
  done: boolean
}
interface BalancerNode {
  id: string
  x: number
  y: number
}

const SAVE_KEY = 'level3_saved_state'
const COINS_KEY = 'player_coins'
const LEVEL3_REWARD_KEY = 'level3_reward_claimed'
const MAX_NODES = 3
const MAX_BALANCERS = 3
const BALANCER_DELAY = 0.01 // 均衡器时延：0.01秒

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

  const [balancerNodes, setBalancerNodes] = useState<BalancerNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [draggingNode, setDraggingNode] = useState<{ nodeId: string; offset: Point } | null>(null)
  const [draggingFromLibrary, setDraggingFromLibrary] = useState<{ type: 'balancer'; offset: Point; startX: number; startY: number } | null>(null)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [target1Count, setTarget1Count] = useState(0)
  const [target2Count, setTarget2Count] = useState(0)
  const [target3Count, setTarget3Count] = useState(0)
  const [target4Count, setTarget4Count] = useState(0)
  const [target1Accuracy, setTarget1Accuracy] = useState(0)
  const [target2Accuracy, setTarget2Accuracy] = useState(0)
  const [target3Accuracy, setTarget3Accuracy] = useState(0)
  const [target4Accuracy, setTarget4Accuracy] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [levelComplete, setLevelComplete] = useState(false)
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const [showReward, setShowReward] = useState(false)
  const [infoModal, setInfoModal] = useState<'input' | 'output' | 'balancer' | null>(null)
  const rewardClaimed = React.useRef(!!localStorage.getItem(LEVEL3_REWARD_KEY))
  const speedMultiplierRef = useRef(1.0)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextBalancerId = useRef(1)
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

  // 从节点库开始拖拽
  const onLibraryNodeMouseDown = (e: React.MouseEvent, type: 'balancer') => {
    if (balancerNodes.length >= MAX_BALANCERS) return
    if (balancerNodes.length >= MAX_NODES) return
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDraggingFromLibrary({
      type,
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      startX: e.clientX,
      startY: e.clientY
    })
    e.preventDefault()
    e.stopPropagation()
  }

  // 拖拽已存在的节点
  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = balancerNodes.find(n => n.id === nodeId)
    if (!node) return
    
    setDraggingNode({
      nodeId,
      offset: { x: e.clientX - node.x, y: e.clientY - node.y }
    })
    e.preventDefault()
  }

  const onDotMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const center = getDotCenter(id)
    if (!center) return
    
    // 检查该连接点是否已经发出连线
    const existingConnection = connections.find(c => c.from === id)
    if (existingConnection) return
    
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
    if (draggingFromLibrary) {
      // 更新拖拽预览位置
      setDraggingFromLibrary(prev => prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null)
    } else if (draggingNode) {
      const newX = e.clientX - draggingNode.offset.x
      const newY = e.clientY - draggingNode.offset.y
      setBalancerNodes(prev => prev.map(node =>
        node.id === draggingNode.nodeId ? { ...node, x: newX, y: newY } : node
      ))
    } else if (draggingLine) {
      setDraggingLine(prev => prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null)
    }
  }

  const onMouseUp = (e: React.MouseEvent) => {
    if (draggingFromLibrary) {
      // 在画布上创建新节点
      const x = e.clientX - draggingFromLibrary.offset.x
      const y = e.clientY - draggingFromLibrary.offset.y
      
      // 检查是否在有效区域（不在右侧边栏）
      if (x < window.innerWidth - 300 && x > 160) {
        const newNode: BalancerNode = {
          id: `balancer${nextBalancerId.current++}`,
          x,
          y
        }
        setBalancerNodes(prev => [...prev, newNode])
      }
      setDraggingFromLibrary(null)
    } else {
      setDraggingNode(null)
      setDraggingLine(null)
    }
  }

  const handleSave = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ connections, balancerNodes }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearLines = () => setConnections([])

  const handleTest = () => {
    if (testing) return
    setTesting(true)
    setTarget1Count(0)
    setTarget2Count(0)
    setTarget3Count(0)
    setTarget4Count(0)
    setTarget1Accuracy(0)
    setTarget2Accuracy(0)
    setTarget3Accuracy(0)
    setTarget4Accuracy(0)
    setElapsed(0)
    setLevelComplete(false)

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    // 构建完整路径：包括节点的输入和输出
    // 路径格式：['input-out', 'balancer1-in', 'balancer1-out1', 'target1-in']
    const buildFullPaths = (start: string): string[][] => {
      const allPaths: string[][] = []
      
      const explore = (currentOut: string, path: string[]) => {
        // 查找从当前输出点连接到哪里
        const conn = connections.find(c => c.from === currentOut)
        if (!conn) return
        
        const targetIn = conn.to
        const newPath = [...path, targetIn]
        
        // 如果到达最终输出
        if (targetIn.startsWith('target') && targetIn.endsWith('-in')) {
          allPaths.push(newPath)
          return
        }
        
        // 如果到达节点输入端，需要找到该节点的所有输出端
        if (targetIn.endsWith('-in')) {
          const nodeId = targetIn.replace('-in', '')
          // 查找该节点的所有输出
          const outputs = connections.filter(c => c.from.startsWith(nodeId + '-out'))
          outputs.forEach(outConn => {
            explore(outConn.from, [...newPath, outConn.from])
          })
        }
      }
      
      explore(start, [start])
      return allPaths
    }

    const allPaths = buildFullPaths('input-out')
    
    if (allPaths.length === 0) {
      setTesting(false)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    // 创建50个红色方块
    const particles: Particle[] = []
    const colors = Array(50).fill('#ef4444')
    
    colors.forEach((color, i) => {
      const path = allPaths[Math.floor(Math.random() * allPaths.length)]
      particles.push({
        id: i,
        color,
        path,
        currentSegment: 0,
        progress: -(i * 0.05),
        speed: 0.01,
        waitingAt: null,
        waitTime: 0,
        done: false
      })
    })

    setTestParticles(particles)

    const animate = () => {
      setTestParticles(prev => {
        const next = prev.map(p => {
          if (p.done) return p
          
          // 如果正在节点内等待
          if (p.waitingAt) {
            const newWaitTime = p.waitTime + 0.016 * speedMultiplierRef.current
            if (newWaitTime >= BALANCER_DELAY) {
              // 等待结束，从节点输出端出来
              // currentSegment指向节点的-in，下一个应该是节点的-out
              return {
                ...p,
                waitingAt: null,
                waitTime: 0,
                currentSegment: p.currentSegment + 1,
                progress: 0
              }
            }
            return { ...p, waitTime: newWaitTime }
          }
          
          // 还没开始
          if (p.progress < 0) {
            return { ...p, progress: p.progress + p.speed * speedMultiplierRef.current }
          }
          
          // 正常移动
          const newProgress = p.progress + p.speed * speedMultiplierRef.current
          
          if (newProgress >= 1) {
            // 到达当前线段终点
            const currentTo = p.path[p.currentSegment + 1]
            
            if (!currentTo) {
              return { ...p, done: true, progress: 1 }
            }
            
            // 检查到达的节点类型
            if (currentTo.includes('balancer') && currentTo.endsWith('-in')) {
              // 到达均衡器输入端，开始等待
              return {
                ...p,
                progress: 1,
                waitingAt: currentTo,
                waitTime: 0,
                currentSegment: p.currentSegment + 1
              }
            } else if (currentTo.startsWith('target') && currentTo.endsWith('-in')) {
              // 到达输出流
              return { ...p, done: true, progress: 1, currentSegment: p.currentSegment + 1 }
            } else {
              // 其他情况（如节点输出端），直接进入下一段
              return {
                ...p,
                currentSegment: p.currentSegment + 1,
                progress: 0
              }
            }
          }
          
          return { ...p, progress: newProgress }
        })

        // 统计到达各个目标的方块
        const target1Done = next.filter(p => {
          if (!p.done) return false
          const lastNode = p.path[p.currentSegment]
          return lastNode === 'target1-in'
        })
        const target2Done = next.filter(p => {
          if (!p.done) return false
          const lastNode = p.path[p.currentSegment]
          return lastNode === 'target2-in'
        })
        const target3Done = next.filter(p => {
          if (!p.done) return false
          const lastNode = p.path[p.currentSegment]
          return lastNode === 'target3-in'
        })
        const target4Done = next.filter(p => {
          if (!p.done) return false
          const lastNode = p.path[p.currentSegment]
          return lastNode === 'target4-in'
        })

        setTarget1Count(target1Done.length)
        setTarget2Count(target2Done.length)
        setTarget3Count(target3Done.length)
        setTarget4Count(target4Done.length)

        setTarget1Accuracy(target1Done.length > 0 ? target1Done.filter(p => p.color === '#ef4444').length / target1Done.length : 0)
        setTarget2Accuracy(target2Done.length > 0 ? target2Done.filter(p => p.color === '#ef4444').length / target2Done.length : 0)
        setTarget3Accuracy(target3Done.length > 0 ? target3Done.filter(p => p.color === '#ef4444').length / target3Done.length : 0)
        setTarget4Accuracy(target4Done.length > 0 ? target4Done.filter(p => p.color === '#ef4444').length / target4Done.length : 0)

        // 检查是否过关
        const target1Complete = target1Done.length >= 8 && target1Done.filter(p => p.color === '#ef4444').length === target1Done.length
        const target2Complete = target2Done.length >= 8 && target2Done.filter(p => p.color === '#ef4444').length === target2Done.length
        const target3Complete = target3Done.length >= 8 && target3Done.filter(p => p.color === '#ef4444').length === target3Done.length
        const target4Complete = target4Done.length >= 8 && target4Done.filter(p => p.color === '#ef4444').length === target4Done.length

        if (target1Complete && target2Complete && target3Complete && target4Complete) {
          setTesting(false)
          setLevelComplete(true)
          if (timerRef.current) clearInterval(timerRef.current)
          
          if (!rewardClaimed.current) {
            rewardClaimed.current = true
            localStorage.setItem(LEVEL3_REWARD_KEY, '1')
            const reward = 200
            const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + reward
            localStorage.setItem(COINS_KEY, String(newCoins))
            setCoins(newCoins)
            setShowReward(true)
            setTimeout(() => setShowReward(false), 3000)
          }
          return []
        }

        if (next.every(p => p.done)) {
          setTesting(false)
          if (timerRef.current) clearInterval(timerRef.current)
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
    if (p.waitingAt) return null // 等待中不显示
    
    // 获取当前线段的起点和终点
    const fromId = p.path[p.currentSegment]
    const toId = p.path[p.currentSegment + 1]
    
    if (!fromId || !toId) return null
    
    const from = getDotCenter(fromId)
    const to = getDotCenter(toId)
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

      {/* 节点计数器 */}
      <div className="node-counter">{balancerNodes.length}/{MAX_NODES}</div>

      {/* 金币显示 */}
      <div className="coins-display">🪙 {coins}</div>

      {/* 奖励弹窗 */}
      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">关卡完成！</div>
          <div className="reward-coins">+200 🪙</div>
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
                <span className="stat-value">+200 🪙</span>
              </div>
            </div>
            <button className="success-btn" onClick={onBack}>返回关卡</button>
          </div>
        </div>
      )}

      {/* 说明弹窗 */}
      {infoModal && (
        <div className="info-overlay" onClick={() => setInfoModal(null)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <h3 className="info-title">
              {infoModal === 'input' ? '📊 输入数据' : infoModal === 'output' ? '🎯 输出目标' : '⚖️ 均衡器'}
            </h3>
            <div className="info-columns">
              <div className="info-col">
                <div className="info-col-label simple">简易版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '这就像给AI看很多例子。你给它看很多张图片，告诉它哪些有目标、哪些没有，它就慢慢学会自己判断。'
                    : infoModal === 'output'
                    ? '输出目标就像是分类的结果箱。每个箱子需要收集8个正确的红色方块，准确率要达到100%才算过关。'
                    : '均衡器就像一个"平分器"。它把进来的数据平均分成两份，从两个出口送出去。就像把一堆苹果平均分给两个人。'}
                </p>
              </div>
              <div className="info-divider" />
              <div className="info-col">
                <div className="info-col-label pro">专业版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '训练数据集（Training Dataset）是监督学习的基础。每个样本包含特征向量和标签，模型通过最小化损失函数在数据分布上学习特征映射关系。数据质量和数量直接影响模型的泛化能力。'
                    : infoModal === 'output'
                    ? '输出节点是数据流的终点，用于收集和验证分类结果。本关要求每个输出达到指定数量（8个样本）且准确率为100%，以验证数据流的均衡分配是否正确。'
                    : '均衡器（Load Balancer）是一种数据分配节点，实现1:1的流量分配策略。它将输入流按顺序或随机方式均匀分配到两个输出通道，确保负载均衡，常用于并行处理和分布式系统中。'}
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
          ⏱ {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
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

      {/* 分类图片列 - 4个输出 */}
      <div className="target-panel-4">
        <div className="img-with-dot">
          <div ref={setDotRef('target1-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target1-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target1-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标1" className="target-img-small" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('output')}>i</button>
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(target1Count / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target1Count >= 8 ? '#4ade80' : '#ffffff' }}>
                  {target1Count}/8
                </span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${target1Accuracy * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target1Accuracy >= 1 ? '#4ade80' : '#ffffff' }}>
                  {Math.round(target1Accuracy * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('target2-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target2-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target2-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标2" className="target-img-small" draggable={false} />
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(target2Count / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target2Count >= 8 ? '#4ade80' : '#ffffff' }}>
                  {target2Count}/8
                </span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${target2Accuracy * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target2Accuracy >= 1 ? '#4ade80' : '#ffffff' }}>
                  {Math.round(target2Accuracy * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('target3-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target3-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target3-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标3" className="target-img-small" draggable={false} />
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(target3Count / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target3Count >= 8 ? '#4ade80' : '#ffffff' }}>
                  {target3Count}/8
                </span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${target3Accuracy * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target3Accuracy >= 1 ? '#4ade80' : '#ffffff' }}>
                  {Math.round(target3Accuracy * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="img-with-dot">
          <div ref={setDotRef('target4-in')} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target4-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target4-in')} />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标4" className="target-img-small" draggable={false} />
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(target4Count / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target4Count >= 8 ? '#4ade80' : '#ffffff' }}>
                  {target4Count}/8
                </span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${target4Accuracy * 100}%` }} />
                </div>
                <span className="bar-value-small" style={{ color: target4Accuracy >= 1 ? '#4ade80' : '#ffffff' }}>
                  {Math.round(target4Accuracy * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 画布上的均衡器节点 */}
      {balancerNodes.map(node => (
        <div
          key={node.id}
          className="canvas-balancer"
          style={{ left: node.x, top: node.y }}
          onMouseDown={(e) => onNodeMouseDown(e, node.id)}
        >
          <div ref={setDotRef(`${node.id}-in`)} className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, `${node.id}-in`)}
            onMouseUp={(e) => onDotMouseUp(e, `${node.id}-in`)} />
          <div style={{ position: 'relative', width: '180px' }}>
            <img src={level3Balancer} alt="均衡器" className="balancer-img" draggable={false} style={{ width: '100%', display: 'block' }} />
            <button className="info-btn" onClick={(e) => { e.stopPropagation(); setInfoModal('balancer') }}>i</button>
            <div ref={setDotRef(`${node.id}-out1`)} className="dot"
              style={{ position: 'absolute', right: 10, top: '35%', transform: 'translateY(-50%)' }}
              onMouseDown={(e) => onDotMouseDown(e, `${node.id}-out1`)}
              onMouseUp={(e) => onDotMouseUp(e, `${node.id}-out1`)} />
            <div ref={setDotRef(`${node.id}-out2`)} className="dot"
              style={{ position: 'absolute', right: 10, bottom: 10, transform: 'none' }}
              onMouseDown={(e) => onDotMouseDown(e, `${node.id}-out2`)}
              onMouseUp={(e) => onDotMouseUp(e, `${node.id}-out2`)} />
          </div>
        </div>
      ))}

      {/* 正在拖拽的节点预览 */}
      {draggingFromLibrary && (
        <div
          className="canvas-balancer dragging-preview"
          style={{
            left: draggingFromLibrary.startX - draggingFromLibrary.offset.x,
            top: draggingFromLibrary.startY - draggingFromLibrary.offset.y,
            opacity: 0.7,
            pointerEvents: 'none'
          }}
        >
          <img src={level3Balancer} alt="均衡器" className="balancer-img" draggable={false} style={{ width: '180px' }} />
        </div>
      )}

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
            {/* 均衡器节点 */}
            <div 
              className="library-node"
              onMouseDown={(e) => onLibraryNodeMouseDown(e, 'balancer')}
            >
              <img src={level3Balancer} alt="均衡器" className="library-node-img" draggable={false} />
              <span className="library-node-label">均衡器 ({balancerNodes.length}/{MAX_BALANCERS})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Level3Page
