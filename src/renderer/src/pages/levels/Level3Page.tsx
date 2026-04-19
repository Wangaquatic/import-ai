import React, { useState, useRef, useEffect, useCallback } from 'react'
import './Level3Page.css'
import levelBg from '../../assets/level-bg.png'
import level3Input from '../../assets/level3-input.png'
import targetImg from '../../assets/target.jpg'
import balancerImg from '../../assets/level3-balancer.png'

interface Level3PageProps {
  onBack: () => void
  onNextLevel?: () => void
}

interface Point { x: number; y: number }
interface Connection { from: string; to: string }
interface PlacedNode {
  id: string
  type: 'balancer'
  pos: Point
  capacity: {
    input: number
    output1: number
    output2: number
  }
}
interface Particle {
  id: number
  color: string
  from: string
  to: string
  progress: number
  speed: number
  done: boolean
}

const COINS_KEY = 'player_coins'
const LEVEL3_REWARD_KEY = 'level3_reward_claimed'
const LEVEL3_PASSED_KEY = 'level3_passed' // 新增：记录是否通过第三关

const Level3Page: React.FC<Level3PageProps> = ({ onBack, onNextLevel }) => {
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const rewardClaimed = React.useRef(!!localStorage.getItem(LEVEL3_REWARD_KEY))
  const [levelPassed, setLevelPassed] = useState(() => !!localStorage.getItem(LEVEL3_PASSED_KEY))
  
  // 调试：打印初始状态
  useEffect(() => {
    console.log('Level3 初始化:', {
      coins,
      rewardClaimed: rewardClaimed.current,
      localStorageKey: localStorage.getItem(LEVEL3_REWARD_KEY)
    })
    
    // 开发模式：按Ctrl+R重置奖励状态
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        localStorage.removeItem(LEVEL3_REWARD_KEY)
        rewardClaimed.current = false
        console.log('✅ Level3 奖励状态已重置')
        alert('Level3 奖励状态已重置，可以重新测试')
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
  const [infoModal, setInfoModal] = useState<'input' | 'output' | 'balancer' | null>(null)
  const [placedNodes, setPlacedNodes] = useState<PlacedNode[]>([])
  const [draggingNode, setDraggingNode] = useState<{ type: 'balancer'; mouseX: number; mouseY: number } | null>(null)
  const [draggingPlacedNode, setDraggingPlacedNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [targetProgress, setTargetProgress] = useState<number[]>([0, 0, 0, 0])
  const [targetAccuracy, setTargetAccuracy] = useState<number[]>([0, 0, 0, 0])
  const [elapsed, setElapsed] = useState(0)
  const [showVictory, setShowVictory] = useState(false)
  const [showReward, setShowReward] = useState(false)
  
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [, forceUpdate] = useState(0)
  const pageRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nodeStateRef = useRef<Record<string, { queue: number[]; processing: boolean; nextOutput: 1 | 2 }>>({})

  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const setDotRef = (id: string) => (el: HTMLDivElement | null) => {
    dotRefs.current[id] = el
  }

  const getDotCenter = useCallback((id: string): Point | null => {
    const el = dotRefs.current[id]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [])

  const onDotMouseDown = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation()
    const center = getDotCenter(id)
    if (!center) return
    setDraggingLine({ fromId: id, mouse: center })
    e.preventDefault()
  }

  const onDotMouseUp = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation()
    if (!draggingLine) return
    const from = draggingLine.fromId
    if (from === id) {
      setDraggingLine(null)
      return
    }

    // 定义连接规则
    const fromParts = from.split('-')
    const toParts = id.split('-')
    
    // input-out 只能连到节点的 -in 或 target-in
    // 节点的 -out1/-out2 只能连到其他节点的 -in 或 target-in
    // 每个输出点只能发出一条线，但每个输入点可以接收多条线
    if (from === 'input-out' && (id.endsWith('-in') || toParts[0].startsWith('target'))) {
      setConnections(prev => [...prev.filter(c => c.from !== from), { from, to: id }])
    } else if (fromParts[fromParts.length - 1].startsWith('out') && (id.endsWith('-in') || toParts[0].startsWith('target'))) {
      setConnections(prev => [...prev.filter(c => c.from !== from), { from, to: id }])
    }
    
    setDraggingLine(null)
  }

  const handleDeleteConnection = (index: number, e: React.MouseEvent) => {
    const clickX = e.clientX
    const clickY = e.clientY
    const conn = connections[index]
    
    // 获取连接线两端点的位置
    const from = getDotCenter(conn.from)
    const to = getDotCenter(conn.to)
    if (!from || !to) return
    
    // 计算点击位置到两端点的距离
    const distToFrom = Math.sqrt(Math.pow(clickX - from.x, 2) + Math.pow(clickY - from.y, 2))
    const distToTo = Math.sqrt(Math.pow(clickX - to.x, 2) + Math.pow(clickY - to.y, 2))
    
    // 如果点击位置距离任一端点小于30px，则不删除（保护连接点附近区域）
    if (distToFrom < 30 || distToTo < 30) {
      return
    }
    
    setConnections(prev => prev.filter((_, i) => i !== index))
  }

  const renderLines = (): JSX.Element[] => {
    return connections.map((conn, i) => {
      const from = getDotCenter(conn.from)
      const to = getDotCenter(conn.to)
      if (!from || !to) return <g key={i} />
      return (
        <g key={i}>
          {/* 透明的粗线用于点击检测 */}
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="transparent"
            strokeWidth="12"
            strokeLinecap="round"
            style={{ 
              cursor: 'pointer', 
              pointerEvents: draggingLine ? 'none' : 'stroke'  // 拖动时禁用点击
            }}
            onClick={(e) => handleDeleteConnection(i, e)}
          />
          {/* 可见的细线 */}
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#4ade80"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      )
    })
  }

  const renderDraggingLine = (): JSX.Element | null => {
    if (!draggingLine) return null
    const from = getDotCenter(draggingLine.fromId)
    if (!from) return null
    return (
      <line
        x1={from.x}
        y1={from.y}
        x2={draggingLine.mouse.x}
        y2={draggingLine.mouse.y}
        stroke="#4ade80"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 3"
      />
    )
  }

  const handleNodeDragStart = (e: React.MouseEvent, nodeType: 'balancer') => {
    if (placedNodes.length >= 3) return
    e.preventDefault()
    setDraggingNode({ type: nodeType, mouseX: e.clientX, mouseY: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (draggingNode) {
      setDraggingNode({ ...draggingNode, mouseX: e.clientX, mouseY: e.clientY })
    } else if (draggingPlacedNode && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - draggingPlacedNode.offsetX
      const y = e.clientY - rect.top - draggingPlacedNode.offsetY
      
      setPlacedNodes(prev => prev.map(n => 
        n.id === draggingPlacedNode.nodeId ? { ...n, pos: { x, y } } : n
      ))

      // 检查是否在删除区域（右侧边栏）
      if (sidebarRef.current) {
        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        const isOver = e.clientX >= sidebarRect.left
        setIsOverDeleteZone(isOver)
      }
    } else if (draggingLine) {
      setDraggingLine(prev => prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null)
    }
  }

  const handleMouseUp = (e: React.MouseEvent): void => {
    if (draggingNode && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // 侧边栏宽度300px，左侧面板160px
      if (x > 160 && x < rect.width - 300 && y > 0 && y < rect.height) {
        if (placedNodes.length < 3) {
          const newNode: PlacedNode = {
            id: `balancer-${Date.now()}`,
            type: draggingNode.type,
            pos: { x, y },
            capacity: { input: 0, output1: 0, output2: 0 }
          }
          setPlacedNodes([...placedNodes, newNode])
        }
      }
      setDraggingNode(null)
    } else if (draggingPlacedNode) {
      // 检查是否在删除区域
      if (isOverDeleteZone) {
        setPlacedNodes(prev => prev.filter(n => n.id !== draggingPlacedNode.nodeId))
      }
      setDraggingPlacedNode(null)
      setIsOverDeleteZone(false)
    } else if (draggingLine) {
      setDraggingLine(null)
    }
  }

  const handlePlacedNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const node = placedNodes.find(n => n.id === nodeId)
    if (!node || !pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - node.pos.x
    const offsetY = e.clientY - rect.top - node.pos.y
    
    setDraggingPlacedNode({ nodeId, offsetX, offsetY })
  }

  const handleDeleteNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPlacedNodes(prev => prev.filter(n => n.id !== nodeId))
  }

  const handleTest = () => {
    if (testing) return
    setTesting(true)
    setTargetProgress([0, 0, 0, 0])
    setTargetAccuracy([0, 0, 0, 0])
    setElapsed(0)
    
    // 初始化节点状态
    const nodeStates: Record<string, { queue: number[]; processing: boolean; nextOutput: 1 | 2 }> = {}
    placedNodes.forEach(node => {
      nodeStates[node.id] = { queue: [], processing: false, nextOutput: 1 }
    })
    nodeStateRef.current = nodeStates
    
    // 初始化目标统计
    const targetStats = {
      0: { total: 0, correct: 0 },
      1: { total: 0, correct: 0 },
      2: { total: 0, correct: 0 },
      3: { total: 0, correct: 0 }
    }
    
    // 启动计时器
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    
    // 创建50个红色方块
    const particles: Particle[] = []
    let particleId = 0
    
    // 从input-out开始的连接
    const inputConn = connections.find(c => c.from === 'input-out')
    if (inputConn) {
      for (let i = 0; i < 50; i++) {
        particles.push({
          id: particleId++,
          color: '#ef4444',
          from: inputConn.from,
          to: inputConn.to,
          progress: -(i * 0.08), // 间隔发送
          speed: 0.003,
          done: false
        })
      }
    }
    
    setTestParticles(particles)
    
    // 动画循环
    const animate = () => {
      setTestParticles(prev => {
        const next = [...prev]
        let hasChanges = false
        
        // 更新所有粒子
        for (let i = 0; i < next.length; i++) {
          const p = next[i]
          if (p.done) continue
          
          // 移动粒子
          if (p.progress < 1) {
            p.progress += p.speed
            hasChanges = true
          }
          
          // 粒子到达终点
          if (p.progress >= 1 && !p.done) {
            p.done = true
            hasChanges = true
            
            // 检查是否到达目标
            const targetMatch = p.to.match(/^target(\d+)-in$/)
            if (targetMatch) {
              const targetIdx = parseInt(targetMatch[1]) - 1
              
              // 更新统计
              targetStats[targetIdx].total++
              if (p.color === '#ef4444') {
                targetStats[targetIdx].correct++
              }
              
              // 更新进度
              setTargetProgress(prev => {
                const newProgress = [...prev]
                newProgress[targetIdx] = targetStats[targetIdx].total
                return newProgress
              })
              
              // 更新准确率
              setTargetAccuracy(prev => {
                const newAccuracy = [...prev]
                const stats = targetStats[targetIdx]
                newAccuracy[targetIdx] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                return newAccuracy
              })
              
              // 实时检查通关条件：所有4个目标都有至少8个方块且准确率100%
              const allTargetsComplete = Object.values(targetStats).every(s => s.total >= 8 && (s.correct / s.total) === 1)
              
              if (allTargetsComplete) {
                console.log('Level3 通关！', { 
                  rewardClaimed: rewardClaimed.current,
                  targetStats 
                })
                
                // 立即停止测试
                if (timerRef.current) {
                  clearInterval(timerRef.current)
                  timerRef.current = null
                }
                
                // 先更新状态
                setTesting(false)
                
                // 发放金币奖励
                // 注释掉"只能一次"的检查，用于测试
                // if (!rewardClaimed.current) {
                  if (!rewardClaimed.current) {
                    rewardClaimed.current = true
                    localStorage.setItem(LEVEL3_REWARD_KEY, '1')
                    const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + 150
                    localStorage.setItem(COINS_KEY, String(newCoins))
                    setCoins(newCoins)
                  }
                  
                  // 标记关卡已通过
                  if (!levelPassed) {
                    localStorage.setItem(LEVEL3_PASSED_KEY, '1')
                    setLevelPassed(true)
                  }
                  
                  console.log('Level3 显示奖励弹窗')
                  
                  // 使用setTimeout确保状态更新后再显示奖励
                  setTimeout(() => {
                    setShowVictory(true)
                    setShowReward(true)
                    console.log('Level3 奖励状态已设置')
                    setTimeout(() => setShowReward(false), 3000)
                  }, 100)
                // }
                
                // 标记所有粒子为完成，并返回空数组
                return []
              }
            } else if (p.to.endsWith('-in')) {
              // 到达节点输入
              const nodeId = p.to.replace('-in', '')
              const nodeState = nodeStateRef.current[nodeId]
              
              if (nodeState) {
                nodeState.queue.push(p.id)
                
                // 如果节点未在处理，开始处理
                if (!nodeState.processing && nodeState.queue.length > 0) {
                  nodeState.processing = true
                  
                  // 平衡器延迟10ms
                  setTimeout(() => {
                    if (nodeState.queue.length > 0) {
                      nodeState.queue.shift()
                      
                      // 轮询输出
                      const outputNum = nodeState.nextOutput
                      nodeState.nextOutput = outputNum === 1 ? 2 : 1
                      
                      // 找到输出连接
                      const outputConn = connections.find(c => c.from === `${nodeId}-out${outputNum}`)
                      if (outputConn) {
                        setTestParticles(current => [
                          ...current,
                          {
                            id: particleId++,
                            color: '#ef4444',
                            from: outputConn.from,
                            to: outputConn.to,
                            progress: 0,
                            speed: 0.003,
                            done: false
                          }
                        ])
                      }
                      
                      nodeState.processing = false
                      
                      // 继续处理队列
                      if (nodeState.queue.length > 0) {
                        setTimeout(() => animate(), 0)
                      }
                    }
                  }, 10)
                }
              }
            }
          }
        }
        
        // 检查是否全部完成或超时
        const allParticlesDone = next.every(p => p.done)
        const allQueuesEmpty = Object.values(nodeStateRef.current).every(s => s.queue.length === 0 && !s.processing)
        
        if ((allParticlesDone && allQueuesEmpty) || elapsed >= 40) {
          setTesting(false)
          if (timerRef.current) clearInterval(timerRef.current)
          
          // 检查是否超时
          if (elapsed >= 40) {
            alert('超时失败！')
          } else {
            // 所有粒子完成但未通关（通关成功已在实时检查中处理）
            const allTargetsComplete = Object.values(targetStats).every(s => s.total >= 8 && (s.correct / s.total) === 1)
            if (!allTargetsComplete) {
              alert('未达到通关条件！')
            }
          }
          
          return next
        }
        
        // 只有在没有通关的情况下才继续动画
        if (next.length > 0 && (hasChanges || !allParticlesDone || !allQueuesEmpty)) {
          animFrameRef.current = requestAnimationFrame(animate)
        }
        
        return next
      })
    }
    
    animFrameRef.current = requestAnimationFrame(animate)
  }

  const renderTestParticles = () => {
    return testParticles.map(p => {
      if (p.progress < 0 || p.done) return null
      const from = getDotCenter(p.from)
      const to = getDotCenter(p.to)
      if (!from || !to) return null
      const t = Math.min(Math.max(p.progress, 0), 1)
      const x = from.x + (to.x - from.x) * t - 4
      const y = from.y + (to.y - from.y) * t - 4
      return <rect key={p.id} x={x} y={y} width="8" height="8" fill={p.color} rx="2" opacity="0.9" />
    })
  }

  const particles = React.useMemo(() => {
    const binaries = ['0', '1', '01', '10', '001', '101', '110', '011', '100', '111']
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
    <div 
      ref={pageRef}
      className="level3-page" 
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: draggingNode || draggingPlacedNode ? 'grabbing' : 'default' }}
    >
      <div className="bg-blur-layer" style={{ backgroundImage: `url(${levelBg})` }} />
      
      {/* SVG overlay for lines */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 50
        }}
      >
        {renderLines()}
        {renderTestParticles()}
        {renderDraggingLine()}
      </svg>
      
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

      <button className="back-button" onClick={onBack}>← 返回</button>
      
      <div className="node-counter">{placedNodes.length}/3</div>
      <div className="coins-display">🪙 {coins}</div>

      {/* 奖励弹窗 */}
      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">第三关完成！</div>
          <div className="reward-coins">+150 🪙</div>
        </div>
      )}

      {/* 下一关按钮 - 通关后一直显示 */}
      {levelPassed && onNextLevel && (
        <button className="next-level-btn" onClick={onNextLevel}>
          下一关 →
        </button>
      )}

      {/* 计时器 */}
      {(testing || elapsed > 0) && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '350px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          zIndex: 100
        }}>
          ⏱ {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')} / 00:40
        </div>
      )}

      <div className="left-panel">
        <div className="img-with-dot">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={level3Input} alt="输入数据" className="input-img" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('input')}>i</button>
          </div>
          <div
            ref={setDotRef('input-out')}
            className="dot dot-right"
            onMouseDown={(e) => onDotMouseDown(e, 'input-out')}
            onMouseUp={(e) => onDotMouseUp(e, 'input-out')}
          />
        </div>
      </div>

      <div className="target-panel-4">
        <div className="img-with-dot">
          <div
            ref={setDotRef('target1-in')}
            className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target1-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target1-in')}
          />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标1" className="target-img-small" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('output')}>i</button>
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(targetProgress[0] / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small">{targetProgress[0]}/8</span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${targetAccuracy[0]}%` }} />
                </div>
                <span className="bar-value-small">{targetAccuracy[0].toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="img-with-dot">
          <div
            ref={setDotRef('target2-in')}
            className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target2-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target2-in')}
          />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标2" className="target-img-small" draggable={false} />
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(targetProgress[1] / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small">{targetProgress[1]}/8</span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${targetAccuracy[1]}%` }} />
                </div>
                <span className="bar-value-small">{targetAccuracy[1].toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="img-with-dot">
          <div
            ref={setDotRef('target3-in')}
            className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target3-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target3-in')}
          />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标3" className="target-img-small" draggable={false} />
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(targetProgress[2] / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small">{targetProgress[2]}/8</span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${targetAccuracy[2]}%` }} />
                </div>
                <span className="bar-value-small">{targetAccuracy[2].toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="img-with-dot">
          <div
            ref={setDotRef('target4-in')}
            className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'target4-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'target4-in')}
          />
          <div className="img-bar-wrapper">
            <img src={targetImg} alt="目标4" className="target-img-small" draggable={false} />
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(targetProgress[3] / 8) * 100}%` }} />
                </div>
                <span className="bar-value-small">{targetProgress[3]}/8</span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${targetAccuracy[3]}%` }} />
                </div>
                <span className="bar-value-small">{targetAccuracy[3].toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 已放置的节点 */}
      {placedNodes.map(node => (
        <div
          key={node.id}
          className="placed-node"
          style={{
            position: 'absolute',
            left: node.pos.x,
            top: node.pos.y,
            transform: 'translate(-50%, -50%)',
            cursor: 'grab',
            zIndex: 10,
            transition: draggingPlacedNode?.nodeId === node.id ? 'none' : 'transform 0.1s ease'
          }}
          onMouseDown={(e) => handlePlacedNodeMouseDown(node.id, e)}
          onDoubleClick={(e) => handleDeleteNode(node.id, e)}
        >
          {/* 输入连接点 */}
          <div
            ref={setDotRef(`${node.id}-in`)}
            className="dot dot-left"
            style={{
              position: 'absolute',
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20
            }}
            onMouseDown={(e) => onDotMouseDown(e, `${node.id}-in`)}
            onMouseUp={(e) => onDotMouseUp(e, `${node.id}-in`)}
          />

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
              src={balancerImg} 
              alt="平衡器" 
              style={{ width: '120px', borderRadius: '8px', userSelect: 'none', pointerEvents: 'none' }} 
              draggable={false} 
            />
            
            {/* 说明按钮 */}
            <button
              className="info-btn"
              style={{ position: 'absolute', top: '5px', left: '5px' }}
              onClick={(e) => {
                e.stopPropagation()
                setInfoModal('balancer')
              }}
            >
              i
            </button>

            {/* 容量显示 */}
            <div style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              color: '#fff',
              fontWeight: 'bold',
              pointerEvents: 'none'
            }}>
              {node.capacity.input}/{node.capacity.output1 + node.capacity.output2}
            </div>

            {/* 进度条 */}
            {(node.capacity.input > 0 || node.capacity.output1 > 0 || node.capacity.output2 > 0) && (
              <div style={{
                position: 'absolute',
                bottom: '5px',
                left: '5px',
                right: '5px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
                pointerEvents: 'none'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(to right, #4ade80, #22c55e)',
                  width: `${Math.min((node.capacity.output1 + node.capacity.output2) / Math.max(node.capacity.input, 1) * 100, 100)}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>

          {/* 输出连接点1 (上) - 对齐图片上的绿点 */}
          <div
            ref={setDotRef(`${node.id}-out1`)}
            className="dot dot-right"
            style={{
              position: 'absolute',
              right: '-8px',
              top: '38%',
              transform: 'translateY(-50%)',
              zIndex: 20
            }}
            onMouseDown={(e) => onDotMouseDown(e, `${node.id}-out1`)}
            onMouseUp={(e) => onDotMouseUp(e, `${node.id}-out1`)}
          />

          {/* 输出连接点2 (下) - 对齐图片上的绿点 */}
          <div
            ref={setDotRef(`${node.id}-out2`)}
            className="dot dot-right"
            style={{
              position: 'absolute',
              right: '-8px',
              top: '80%',
              transform: 'translateY(-50%)',
              zIndex: 20
            }}
            onMouseDown={(e) => onDotMouseDown(e, `${node.id}-out2`)}
            onMouseUp={(e) => onDotMouseUp(e, `${node.id}-out2`)}
          />
        </div>
      ))}

      {/* 拖动预览 */}
      {draggingNode && pageRef.current && (
        <div
          style={{
            position: 'fixed',
            left: draggingNode.mouseX,
            top: draggingNode.mouseY,
            transform: 'translate(-50%, -50%)',
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <img src={balancerImg} alt="平衡器" style={{ width: '120px', borderRadius: '8px', userSelect: 'none' }} draggable={false} />
        </div>
      )}

      <div 
        ref={sidebarRef}
        className="sidebar"
        style={{
          backgroundColor: isOverDeleteZone ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
          transition: 'background-color 0.2s ease'
        }}
      >
        <div className="sidebar-actions">
          <button className="sidebar-btn test-btn" onClick={handleTest} disabled={testing}>
            {testing ? '测试中...' : '测试'}
          </button>
          <button className="sidebar-btn save-btn">保存</button>
        </div>
        <div className="sidebar-content">
          <div className="node-library">
            <div className="node-library-title">节点库</div>
            <div 
              className="library-node"
              onMouseDown={(e) => handleNodeDragStart(e, 'balancer')}
              style={{ opacity: placedNodes.length >= 3 ? 0.5 : 1, cursor: placedNodes.length >= 3 ? 'not-allowed' : 'grab' }}
            >
              <img src={balancerImg} alt="平衡器" className="library-node-img" draggable={false} />
              <span className="library-node-label">平衡器 ({placedNodes.length}/3)</span>
            </div>
          </div>
        </div>
      </div>

      {infoModal && (
        <div className="info-overlay" onClick={() => setInfoModal(null)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <h3 className="info-title">
              {infoModal === 'input' ? '📊 输入数据' : infoModal === 'output' ? '🎯 输出目标' : '⚖️ 平衡器'}
            </h3>
            <div className="info-columns">
              <div className="info-col">
                <div className="info-col-label simple">简易版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '这是输入的数据流，包含50个红色方块。你需要使用均衡器将它们平均分配到4个输出目标。'
                    : infoModal === 'output'
                    ? '输出目标需要收集8个红色方块，准确率要达到100%。所有4个输出都达标才能过关。'
                    : '平衡器有1个输入和2个输出。它会把收到的数据平均分配到两个输出端口，实现负载均衡。'}
                </p>
              </div>
              <div className="info-divider" />
              <div className="info-col">
                <div className="info-col-label pro">专业版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '输入流包含50个同质数据单元。通过负载均衡器的合理配置，实现数据的均匀分发，确保每个输出节点获得相等的数据量。'
                    : infoModal === 'output'
                    ? '每个输出节点要求接收8个数据单元（占总量的1/4），准确率100%。这验证了负载均衡算法的正确性和数据分发的均匀性。'
                    : '负载均衡器（Load Balancer）实现1:2的数据分流。采用轮询算法（Round-Robin），将输入流量均匀分配到两个输出通道，处理延迟0.01秒。这是分布式系统中的核心组件。'}
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

export default Level3Page
