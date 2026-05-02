import React, { useState, useRef, useEffect, useCallback } from 'react'
import './LevelBase.css'
import './Level4Page.css'
import levelBg from '../../assets/level-bg.png'
import level4Input from '../../assets/level4-output.png'
import targetImg from '../../assets/target.jpg'
import balancerImg from '../../assets/level3-balancer.png'
import classifierImg from '../../assets/classifier.jpg'
import trashImg from '../../assets/trash.png'
import Level4HiddenModal from '../../components/Level4HiddenModal'
import { useZoom } from '../../hooks/useZoom'

interface Level4PageProps {
  onBack: () => void
  onNextLevel?: () => void
  onPrevLevel?: () => void
  onShop?: () => void
}

interface Point { x: number; y: number }
interface Connection { from: string; to: string }
interface PlacedNode {
  id: string
  type: 'balancer' | 'classifier' | 'trash'
  pos: Point
  maxCapacity: number // 最大容量
  currentLoad: number // 当前负载
}
interface Particle {
  id: number
  color: string
  from: string
  to: string
  progress: number
  speed: number
  done: boolean
  passedClassifier: boolean // 修改：新增标记
}

const COINS_KEY = 'player_coins'
const LEVEL4_REWARD_KEY = 'level4_reward_claimed'
const LEVEL4_PASSED_KEY = 'level4_passed'
const LEVEL4_SAVE_KEY = 'level4_saved_state'

const Level4Page: React.FC<Level4PageProps> = ({ onBack, onNextLevel, onPrevLevel, onShop }) => {
  // 从localStorage加载保存的状态
  const loadSavedState = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(LEVEL4_SAVE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load saved state:', error)
    }
    return null
  }, [])

  const savedState = loadSavedState()

  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const rewardClaimed = React.useRef(!!localStorage.getItem(LEVEL4_REWARD_KEY))
  const [levelPassed, setLevelPassed] = useState(() => !!localStorage.getItem(LEVEL4_PASSED_KEY))
  const [showHiddenLevel, setShowHiddenLevel] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true) // 每次进入都显示
  const [tutorialStep, setTutorialStep] = useState(0)
  
  // 调试：打印初始状态
  useEffect(() => {
    console.log('Level4 初始化:', {
      coins,
      rewardClaimed: rewardClaimed.current,
      levelPassed: levelPassed,
      rewardKey: localStorage.getItem(LEVEL4_REWARD_KEY),
      passedKey: localStorage.getItem(LEVEL4_PASSED_KEY),
      onNextLevel: !!onNextLevel
    })
    
    // 开发模式：按Ctrl+R重置奖励状态
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        localStorage.removeItem(LEVEL4_REWARD_KEY)
        rewardClaimed.current = false
        console.log('✅ Level4 奖励状态已重置')
        alert('Level4 奖励状态已重置，可以重新测试')
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
  
  // 教程动画序列
  useEffect(() => {
    if (!showTutorial) return
    
    const timers: NodeJS.Timeout[] = []
    
    // 步骤1: 显示单个分类器处理数据流 (0.5秒后)
    timers.push(setTimeout(() => setTutorialStep(1), 500))
    
    // 步骤2: 显示慢速标记 (3秒后)
    timers.push(setTimeout(() => setTutorialStep(2), 3000))
    
    // 步骤3: 显示问号和提示 (5秒后)
    timers.push(setTimeout(() => setTutorialStep(3), 5000))
    
    // 步骤4: 显示均衡器+多分类器解决方案 (7.5秒后)
    timers.push(setTimeout(() => setTutorialStep(4), 7500))
    
    return () => timers.forEach(t => clearTimeout(t))
  }, [showTutorial])
  
  const handleCloseTutorial = () => {
    setShowTutorial(false)
  }
  const [infoModal, setInfoModal] = useState<'input' | 'output' | 'balancer' | 'classifier' | 'trash' | null>(null)
  const [placedNodes, setPlacedNodes] = useState<PlacedNode[]>(savedState?.placedNodes || [])
  const [draggingNode, setDraggingNode] = useState<{ type: 'balancer' | 'classifier' | 'trash'; mouseX: number; mouseY: number } | null>(null)
  const [draggingPlacedNode, setDraggingPlacedNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)
  const [connections, setConnections] = useState<Connection[]>(savedState?.connections || [])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [targetCount, setTargetCount] = useState(0)
  const [targetAccuracy, setTargetAccuracy] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [showVictory, setShowVictory] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [showTimeout, setShowTimeout] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showResetNotice, setShowResetNotice] = useState(false)
  
  // 缩放功能
  const { zoom, resetZoom } = useZoom(0.5, 2.0, 0.1)
  
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [, forceUpdate] = useState(0)
  const pageRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nodeStateRef = useRef<Record<string, { queue: Array<{id: number, color: string}>; processing: boolean; nextOutput: 1 | 2 }>>({})
  const speedMultiplierRef = useRef(1.0)
  const elapsedRef = useRef(0)
  const colorQueueRef = useRef<{ colors: string[]; index: number }>({ colors: [], index: 0 })
  const particleIdRef = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 100)
    return () => clearTimeout(timer)
  }, [])

  // 缩放变化时更新连接线
  useEffect(() => {
    forceUpdate(n => n + 1)
  }, [zoom])

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
    if (from === 'input-out' && id.endsWith('-in')) {
      setConnections(prev => [...prev.filter(c => c.from !== from), { from, to: id }])
    } else if (from.endsWith('-out1') || from.endsWith('-out2')) {
      if (id.endsWith('-in')) {
        setConnections(prev => [...prev.filter(c => c.from !== from), { from, to: id }])
      }
    }
    
    setDraggingLine(null)
  }

  const handleDeleteConnection = (index: number, e: React.MouseEvent) => {
    const clickX = e.clientX
    const clickY = e.clientY
    const conn = connections[index]
    
    const from = getDotCenter(conn.from)
    const to = getDotCenter(conn.to)
    if (!from || !to) return
    
    const distToFrom = Math.sqrt(Math.pow(clickX - from.x, 2) + Math.pow(clickY - from.y, 2))
    const distToTo = Math.sqrt(Math.pow(clickX - to.x, 2) + Math.pow(clickY - to.y, 2))
    
    if (distToFrom < 30 || distToTo < 30) {
      return
    }
    
    setConnections(prev => prev.filter((_, i) => i !== index))
  }

  const renderLines = () => {
    return connections.map((conn, i) => {
      const from = getDotCenter(conn.from)
      const to = getDotCenter(conn.to)
      if (!from || !to) return <g key={i} />
      return (
        <g key={i}>
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
              pointerEvents: draggingLine ? 'none' : 'stroke'
            }}
            onClick={(e) => handleDeleteConnection(i, e)}
          />
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

  const renderDraggingLine = () => {
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

  const getNodeLimit = (type: 'balancer' | 'classifier' | 'trash') => {
    if (type === 'balancer') return 10
    if (type === 'classifier') return 4
    return 1
  }

  const getNodeCount = (type: 'balancer' | 'classifier' | 'trash') => {
    return placedNodes.filter(n => n.type === type).length
  }

  const getTotalNodes = () => placedNodes.length

  const handleNodeDragStart = (e: React.MouseEvent, nodeType: 'balancer' | 'classifier' | 'trash') => {
    if (getTotalNodes() >= 8) return
    if (getNodeCount(nodeType) >= getNodeLimit(nodeType)) return
    e.preventDefault()
    setDraggingNode({ type: nodeType, mouseX: e.clientX, mouseY: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNode) {
      setDraggingNode({ ...draggingNode, mouseX: e.clientX, mouseY: e.clientY })
    } else if (draggingPlacedNode && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - draggingPlacedNode.offsetX
      const y = e.clientY - rect.top - draggingPlacedNode.offsetY
      
      setPlacedNodes(prev => prev.map(n => 
        n.id === draggingPlacedNode.nodeId ? { ...n, pos: { x, y } } : n
      ))

      if (sidebarRef.current) {
        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        const isOver = e.clientX >= sidebarRect.left
        setIsOverDeleteZone(isOver)
      }
    } else if (draggingLine) {
      setDraggingLine(prev => prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingNode && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      if (x > 160 && x < rect.width - 300 && y > 0 && y < rect.height) {
        if (getTotalNodes() < 8 && getNodeCount(draggingNode.type) < getNodeLimit(draggingNode.type)) {
          const newNode: PlacedNode = {
            id: `${draggingNode.type}-${Date.now()}`,
            type: draggingNode.type,
            pos: { x, y },
            maxCapacity: draggingNode.type === 'trash' ? 10 : 5,
            currentLoad: 0
          }
          setPlacedNodes([...placedNodes, newNode])
        }
      }
      setDraggingNode(null)
    } else if (draggingPlacedNode) {
      if (isOverDeleteZone) {
        const nodeId = draggingPlacedNode.nodeId
        setPlacedNodes(prev => prev.filter(n => n.id !== nodeId))
        setConnections(prev => prev.filter(conn => 
          !conn.from.startsWith(nodeId) && !conn.to.startsWith(nodeId)
        ))
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
    setConnections(prev => prev.filter(conn => 
      !conn.from.startsWith(nodeId) && !conn.to.startsWith(nodeId)
    ))
  }

  const handleSpeedChange = () => {
    const speeds = [1.0, 2.0, 3.0]
    const idx = speeds.indexOf(speedMultiplier)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeedMultiplier(next)
    speedMultiplierRef.current = next
  }

  const handleClearAll = () => {
    if (testing) return
    setPlacedNodes([])
    setConnections([])
  }

  const handleSave = (): void => {
    const saveData = {
      connections,
      placedNodes,
      timestamp: Date.now()
    }
    localStorage.setItem(LEVEL4_SAVE_KEY, JSON.stringify(saveData))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = (): void => {
    localStorage.removeItem(LEVEL4_SAVE_KEY)
    setPlacedNodes([])
    setConnections([])
    setTestParticles([])
    setElapsed(0)
    setTesting(false)
    setSaved(false)
    setShowResetNotice(true)
    setTimeout(() => setShowResetNotice(false), 2000)
  }

  const handleTest = () => {
    if (testing) {
      setTesting(false)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setTestParticles([])
      return
    }
    
    setTesting(true)
    setTargetCount(0)
    setTargetAccuracy(0)
    setElapsed(0)
    
    const nodeStates: Record<string, { queue: Array<{id: number, color: string}>; processing: boolean; nextOutput: 1 | 2 }> = {}
    placedNodes.forEach(node => {
      nodeStates[node.id] = { queue: [], processing: false, nextOutput: 1 }
    })
    nodeStateRef.current = nodeStates
    
    elapsedRef.current = 0
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
    
    const particles: Particle[] = []
    particleIdRef.current = 0
    const colors = [...Array(500).fill('#ef4444'), ...Array(500).fill('#3b82f6')]
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]]
    }
    
    colorQueueRef.current = { colors, index: 0 }
    
    const inputConn = connections.find(c => c.from === 'input-out')
    if (inputConn) {
      for (let i = 0; i < Math.min(15, colors.length); i++) {
        particles.push({
          id: particleIdRef.current++,
          color: colors[i],
          from: inputConn.from,
          to: inputConn.to,
          progress: -(i * 0.15),
          speed: 0.004,
          done: false,
          passedClassifier: false // 修改：默认未经过分类器
        })
      }
      colorQueueRef.current.index = Math.min(15, colors.length)
    }
    
    setTestParticles(particles)
    
    const statsRef = { redCount: 0, totalCount: 0 }
    
    const animate = () => {
      setTestParticles(prev => {
        const next = [...prev]
        let hasChanges = false
        
        const inputConn = connections.find(c => c.from === 'input-out')
        if (inputConn && colorQueueRef.current.index < colorQueueRef.current.colors.length) {
          const inputParticles = next.filter(p => p.from === 'input-out' && !p.done && p.progress < 1)
          if (inputParticles.length < 8) {
            const toAdd = Math.min(2, colorQueueRef.current.colors.length - colorQueueRef.current.index)
            for (let i = 0; i < toAdd; i++) {
              next.push({
                id: particleIdRef.current++,
                color: colorQueueRef.current.colors[colorQueueRef.current.index++],
                from: inputConn.from,
                to: inputConn.to,
                progress: -0.2,
                speed: 0.004,
                done: false,
                passedClassifier: false // 修改：默认未经过分类器
              })
            }
            hasChanges = true
          }
        }
        
        for (let i = 0; i < next.length; i++) {
          const p = next[i]
          if (p.done) continue
          
          let isBlocked = false
          if (p.progress >= 0.95 && p.progress < 1 && p.to.endsWith('-in')) {
            const nodeId = p.to.replace('-in', '')
            const nodeState = nodeStateRef.current[nodeId]
            const node = placedNodes.find(n => n.id === nodeId)
            if (node && nodeState && node.type !== 'trash') {
              if (nodeState.queue.length >= node.maxCapacity) {
                isBlocked = true
              }
            }
          }
          
          if (p.progress < 1 && !isBlocked) {
            p.progress += p.speed * speedMultiplierRef.current
            hasChanges = true
          }
          
          if (p.progress >= 1 && !p.done) {
            p.done = true
            hasChanges = true
            
            if (p.to === 'output-in') {
              statsRef.totalCount++
              // 修改：只统计红色且经过分类器的
              if (p.color === '#ef4444' && p.passedClassifier) {
                statsRef.redCount++
              }
              setTargetCount(statsRef.totalCount)
              setTargetAccuracy(statsRef.totalCount > 0 ? (statsRef.redCount / statsRef.totalCount) * 100 : 0)
              
              const accuracy = statsRef.totalCount > 0 ? statsRef.redCount / statsRef.totalCount : 0
              
              if (statsRef.totalCount >= 100 && accuracy >= 0.75) {
                console.log('Level4 通关！', { 
                  totalCount: statsRef.totalCount,
                  redCount: statsRef.redCount,
                  accuracy,
                  rewardClaimed: rewardClaimed.current
                })
                
                if (timerRef.current) {
                  clearInterval(timerRef.current)
                  timerRef.current = null
                }
                
                setTesting(false)
                
                if (!rewardClaimed.current) {
                  rewardClaimed.current = true
                  localStorage.setItem(LEVEL4_REWARD_KEY, '1')
                  const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + 300
                  localStorage.setItem(COINS_KEY, String(newCoins))
                  setCoins(newCoins)
                }
                
                if (!levelPassed) {
                  localStorage.setItem(LEVEL4_PASSED_KEY, '1')
                  setLevelPassed(true)
                }
                
                console.log('Level4 显示奖励弹窗')
                
                setTimeout(() => {
                  setShowVictory(true)
                  setShowReward(true)
                  console.log('Level4 奖励状态已设置')
                  setTimeout(() => setShowReward(false), 3000)
                }, 100)
                
                return []
              }
            } else if (p.to.endsWith('-in')) {
              const nodeId = p.to.replace('-in', '')
              const node = placedNodes.find(n => n.id === nodeId)
              const nodeState = nodeStateRef.current[nodeId]
              
              if (node && nodeState) {
                if (node.type === 'trash') {
                  continue
                }
                
                if (nodeState.queue.length < node.maxCapacity) {
                  nodeState.queue.push({ id: p.id, color: p.color })
                  
                  setPlacedNodes(prev => prev.map(n => 
                    n.id === nodeId ? { ...n, currentLoad: nodeState.queue.length } : n
                  ))
                  
                  if (!nodeState.processing && nodeState.queue.length > 0) {
                    nodeState.processing = true
                    
                    const delay = node.type === 'classifier' ? 500 : 10
                    
                    const processQueue = () => {
                      if (nodeState.queue.length > 0) {
                        const item = nodeState.queue.shift()!
                        
                        setPlacedNodes(prev => prev.map(n => 
                          n.id === nodeId ? { ...n, currentLoad: nodeState.queue.length } : n
                        ))
                        
                        let outputNum: 1 | 2
                        if (node.type === 'classifier') {
                          outputNum = item.color === '#ef4444' ? 1 : 2
                        } else {
                          outputNum = nodeState.nextOutput
                          nodeState.nextOutput = outputNum === 1 ? 2 : 1
                        }
                        
                        const outputConn = connections.find(c => c.from === `${nodeId}-out${outputNum}`)
                        if (outputConn) {
                          // 修改：判断是否通过分类器的红色通道
                          let newPassedClassifier = false
                          if (node.type === 'classifier' && outputNum === 1 && item.color === '#ef4444') {
                            newPassedClassifier = true
                          }
                          
                          setTestParticles(current => [
                            ...current,
                            {
                              id: particleIdRef.current++,
                              color: item.color,
                              from: outputConn.from,
                              to: outputConn.to,
                              progress: 0,
                              speed: 0.004,
                              done: false,
                              passedClassifier: newPassedClassifier
                            }
                          ])
                        }
                        
                        if (nodeState.queue.length > 0) {
                          setTimeout(processQueue, delay)
                        } else {
                          nodeState.processing = false
                        }
                      } else {
                        nodeState.processing = false
                      }
                    }
                    
                    setTimeout(processQueue, delay)
                  }
                } else {
                  p.progress = 0.95
                  hasChanges = true
                }
              }
            }
          }
        }
        
        const timeLimit = 180
        const effectiveElapsed = elapsedRef.current * speedMultiplierRef.current
        const allParticlesDone = next.every(p => p.done)
        const allQueuesEmpty = Object.values(nodeStateRef.current).every(s => s.queue.length === 0 && !s.processing)
        
        if ((allParticlesDone && allQueuesEmpty) || effectiveElapsed >= timeLimit) {
          setTesting(false)
          if (timerRef.current) clearInterval(timerRef.current)
          
          if (effectiveElapsed >= timeLimit) {
            setShowTimeout(true)
          } else {
            if (statsRef.totalCount < 100 || statsRef.redCount / statsRef.totalCount < 0.75) {
              setShowTimeout(true)
            }
          }
          
          return next
        }
        
        animFrameRef.current = requestAnimationFrame(animate)
        
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

  const getNodeImage = (type: 'balancer' | 'classifier' | 'trash') => {
    if (type === 'balancer') return balancerImg
    if (type === 'classifier') return classifierImg
    return trashImg
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
      className="level-base level4-page"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: draggingNode || draggingPlacedNode ? 'grabbing' : 'default' }}
    >
      <div className="bg-blur-layer" style={{ backgroundImage: `url(${levelBg})` }} />
      
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
      
      <button className="hidden-level-btn" onClick={() => setShowHiddenLevel(true)} title="隐藏关卡">
        🎛️
      </button>
      
      <div className="node-counter">{getTotalNodes()}/8</div>
      <div className="coins-display">💰 {coins}</div>

      {onShop && (
        <button className="shop-button" onClick={onShop} title="商店">
          🛒
        </button>
      )}

      <div className="zoom-indicator">
        <span>🔍 {Math.round(zoom * 100)}%</span>
        {zoom !== 1.0 && (
          <button className="zoom-reset-btn" onClick={resetZoom}>
            重置
          </button>
        )}
      </div>

      {/* 修改：移除独立的clear-all-btn，改在侧边栏 */}
      <button 
        className="clear-all-btn" 
        onClick={handleClearAll}
        disabled={testing}
        title="清除所有节点和连接"
        style={{ display: 'none' }} // 临时隐藏，如有需要可删除此行
      >
        🗑️
      </button>

      {onPrevLevel && (
        <button className="prev-level-btn" onClick={onPrevLevel}>
          上一关
        </button>
      )}

      {onNextLevel && (
        <button className="next-level-btn" onClick={onNextLevel}>
          下一关
        </button>
      )}

      <button className="speed-btn" onClick={handleSpeedChange}>
        ▶▶ {speedMultiplier.toFixed(1)}x
      </button>

      {showTimeout && (
        <div className="timeout-overlay" onClick={() => setShowTimeout(false)}>
          <div className="timeout-modal" onClick={e => e.stopPropagation()}>
            <div className="timeout-icon">⏰</div>
            <div className="timeout-title">超时了</div>
            <div className="timeout-text">请重新尝试</div>
            <button className="timeout-btn" onClick={() => setShowTimeout(false)}>
              确定
            </button>
          </div>
        </div>
      )}

      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">第四关完成！</div>
          <div className="reward-coins">+300 🪙</div>
        </div>
      )}

      <div className="left-panel">
        <div className="img-with-dot">
          <div style={{ position: 'relative', display: 'inline-block', transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
            <img src={level4Input} alt="输入图片" className="input-img" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('input')}>i</button>
            <div
              ref={setDotRef('input-out')}
              className="dot dot-right"
              style={{ zIndex: 999 }} // 修改：提高层级防止被弹窗遮挡
              onMouseDown={(e) => onDotMouseDown(e, 'input-out')}
              onMouseUp={(e) => onDotMouseUp(e, 'input-out')}
            />
          </div>
        </div>
      </div>

      <div className="output-panel">
        <div className="img-with-dot">
          <div className="img-bar-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
            <div
              ref={setDotRef('output-in')}
              className="dot dot-left"
              style={{ zIndex: 999 }} // 修改：提高层级防止被弹窗遮挡
              onMouseDown={(e) => onDotMouseDown(e, 'output-in')}
              onMouseUp={(e) => onDotMouseUp(e, 'output-in')}
            />
            <img src={targetImg} alt="输出目标" className="output-img" draggable={false} />
            <button className="info-btn" onClick={() => setInfoModal('output')}>i</button>
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">数量</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${(targetCount / 100) * 100}%` }} />
                </div>
                <span className="bar-value-small">{targetCount}/100</span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">准确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${targetAccuracy}%` }} />
                </div>
                <span className="bar-value-small">{targetAccuracy.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {placedNodes.map(node => (
        <div
          key={node.id}
          className="placed-node"
          style={{
            position: 'absolute',
            left: node.pos.x,
            top: node.pos.y,
            transform: `translate(-50%, -50%) scale(${zoom})`,
            cursor: 'grab',
            zIndex: 10,
            transition: draggingPlacedNode?.nodeId === node.id ? 'none' : 'transform 0.1s ease'
          }}
          onMouseDown={(e) => handlePlacedNodeMouseDown(node.id, e)}
          onDoubleClick={(e) => handleDeleteNode(node.id, e)}
        >
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
              src={getNodeImage(node.type)} 
              alt={node.type} 
              style={{ width: '160px', borderRadius: '8px', userSelect: 'none', pointerEvents: 'none' }} 
              draggable={false} 
            />

            <button
              className="info-btn"
              style={{ position: 'absolute', top: '5px', left: '5px' }}
              onClick={(e) => {
                e.stopPropagation()
                setInfoModal(node.type)
              }}
            >
              i
            </button>

            <div style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              color: '#fbbf24',
              fontWeight: 'bold',
              pointerEvents: 'none'
            }}>
              {node.type === 'classifier' ? '0.5s' : node.type === 'balancer' ? '10ms' : '-'}
            </div>

            {testing && (
              <div style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                overflow: 'hidden',
                pointerEvents: 'none'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(node.currentLoad / node.maxCapacity) * 100}%`,
                  background: node.currentLoad >= node.maxCapacity 
                    ? 'linear-gradient(to right, #ef4444, #fca5a5)' 
                    : node.type === 'classifier'
                    ? 'linear-gradient(to right, #60a5fa, #93c5fd)'
                    : node.type === 'trash'
                    ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
                    : 'linear-gradient(to right, #4ade80, #86efac)',
                  transition: 'width 0.2s ease',
                  borderRadius: '4px'
                }} />
              </div>
            )}
          </div>

          {node.type !== 'trash' && (
            <>
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
            </>
          )}
        </div>
      ))}

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
          <img 
            src={getNodeImage(draggingNode.type)} 
            alt={draggingNode.type} 
            style={{ width: '160px', borderRadius: '8px', userSelect: 'none' }} 
            draggable={false} 
          />
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
          <button 
            className={`sidebar-btn test-btn ${testing ? 'testing' : ''}`} 
            onClick={handleTest}
          >
            {testing ? '停止' : '测试'}
          </button>
          <button className={`sidebar-btn save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
            {saved ? '已保存 ✓' : '保存'}
          </button>
          <button className="sidebar-btn reset-btn" onClick={handleReset} title="重置关卡">
            🔄
          </button>
        </div>
        <div className="sidebar-content">
          <div className="node-library">
            <div className="node-library-title">节点库</div>
            <div 
              className="library-node"
              onMouseDown={(e) => handleNodeDragStart(e, 'balancer')}
              style={{ 
                opacity: (getTotalNodes() >= 8 || getNodeCount('balancer') >= 10) ? 0.5 : 1, 
                cursor: (getTotalNodes() >= 8 || getNodeCount('balancer') >= 10) ? 'not-allowed' : 'grab' 
              }}
            >
              <img src={balancerImg} alt="平衡器" className="library-node-img" draggable={false} />
              <span className="library-node-label">平衡器 ({getNodeCount('balancer')}/10)</span>
            </div>
            <div 
              className="library-node"
              onMouseDown={(e) => handleNodeDragStart(e, 'classifier')}
              style={{ 
                opacity: (getTotalNodes() >= 8 || getNodeCount('classifier') >= 4) ? 0.5 : 1, 
                cursor: (getTotalNodes() >= 8 || getNodeCount('classifier') >= 4) ? 'not-allowed' : 'grab' 
              }}
            >
              <img src={classifierImg} alt="分类器" className="library-node-img" draggable={false} />
              <span className="library-node-label">分类器 ({getNodeCount('classifier')}/4)</span>
            </div>
            <div 
              className="library-node"
              onMouseDown={(e) => handleNodeDragStart(e, 'trash')}
              style={{ 
                opacity: (getTotalNodes() >= 8 || getNodeCount('trash') >= 1) ? 0.5 : 1, 
                cursor: (getTotalNodes() >= 8 || getNodeCount('trash') >= 1) ? 'not-allowed' : 'grab' 
              }}
            >
              <img src={trashImg} alt="垃圾桶" className="library-node-img" draggable={false} />
              <span className="library-node-label">垃圾桶 ({getNodeCount('trash')}/1)</span>
            </div>
          </div>
        </div>
      </div>

      {infoModal && (
        <div className="info-overlay" onClick={() => setInfoModal(null)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <h3 className="info-title">
              {infoModal === 'input' 
                ? '📊 输入数据' 
                : infoModal === 'output' 
                ? '🎯 输出目标' 
                : infoModal === 'balancer'
                ? '⚖️ 平衡器'
                : infoModal === 'classifier'
                ? '🔍 分类器'
                : '🗑️ 垃圾桶'}
            </h3>
            <div className="info-columns">
              <div className="info-col">
                <div className="info-col-label simple">简易版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '这次输入包含500个红色方块和500个蓝色方块。你需要用分类器把红色方块筛选出来，然后送到目标。'
                    : infoModal === 'output'
                    ? '输出目标需要收集100个方块，准确率要达到75%以上（至少75个红色方块）。在3分钟内完成即可获胜。'
                    : infoModal === 'balancer'
                    ? '平衡器有1个输入和2个输出。它会把收到的数据平均分配到两个输出端口，实现负载均衡。'
                    : infoModal === 'classifier'
                    ? '分类器有1个输入和2个输出。它会根据颜色分类：红色方块从上面输出，蓝色方块从下面输出。'
                    : '垃圾桶只有1个输入，没有输出。所有进入垃圾桶的数据都会被丢弃，用于过滤不需要的数据。'}
                </p>
              </div>
              <div className="info-divider" />
              <div className="info-col">
                <div className="info-col-label pro">专业版</div>
                <p className="info-desc">
                  {infoModal === 'input'
                    ? '输入流包含1000个数据包（500红+500蓝）。你需要设计一个高效的分类和平衡网络来筛选红色包并达到目标节点数量限制和时间限制。'
                    : infoModal === 'output'
                    ? '输出节点需要收集100个数据包，准确率≥75%。这是一个平衡吞吐量和准确性的挑战。你有180秒和最多8个节点的限制。'
                    : infoModal === 'balancer'
                    ? '负载均衡器（Load Balancer）实现1:2的数据分流。采用轮询算法（Round-Robin），将输入流量均匀分配到两个输出通道，处理延迟0.01秒。'
                    : infoModal === 'classifier'
                    ? '分类器（Classifier）基于特征属性进行数据分流。使用条件判断逻辑，将红色数据包路由到输出1，蓝色数据包路由到输出2，处理延迟0.1秒。这是数据过滤和路由的核心组件。'
                    : '垃圾桶（Trash）是数据终结节点。接收所有输入但不产生输出，用于丢弃不符合条件的数据包。在数据清洗和过滤场景中，这是必要的组件。'}
                </p>
              </div>
            </div>
            <button className="info-close" onClick={() => setInfoModal(null)}>关闭</button>
          </div>
        </div>
      )}
      
      {showHiddenLevel && (
        <Level4HiddenModal onClose={() => setShowHiddenLevel(false)} />
      )}
      
      {showTutorial && (
        <div className="level4-tutorial-overlay">
          <div className="level4-tutorial-content">
            {tutorialStep >= 1 && tutorialStep < 3 && (
              <div className="level4-tutorial-single-classifier">
                <div className="level4-tutorial-input-stream">
                  <div className="level4-tutorial-particle-flow">
                    <div className="level4-tutorial-particle red" style={{ animationDelay: '0s' }} />
                    <div className="level4-tutorial-particle blue" style={{ animationDelay: '0.5s' }} />
                    <div className="level4-tutorial-particle red" style={{ animationDelay: '1s' }} />
                    <div className="level4-tutorial-particle blue" style={{ animationDelay: '1.5s' }} />
                    <div className="level4-tutorial-particle red" style={{ animationDelay: '2s' }} />
                    <div className="level4-tutorial-particle blue" style={{ animationDelay: '2.5s' }} />
                  </div>
                </div>
                
                <div className="level4-tutorial-classifier-box">
                  分类器
                  {tutorialStep >= 2 && (
                    <div className="level4-tutorial-slow-mark">🐌</div>
                  )}
                </div>
                
                <div className="level4-tutorial-output-stream" />
              </div>
            )}
            
            {tutorialStep === 3 && (
              <div className="level4-tutorial-hint">
                <div className="level4-tutorial-question">?</div>
                <div className="level4-tutorial-text">
                  只用一个分类器进行分类太慢了...<br />
                  如何加快处理速度？
                </div>
              </div>
            )}
            
            {tutorialStep >= 4 && (
              <div className="level4-tutorial-solution">
                <div className="level4-tutorial-parallel-system">
                  <div className="level4-tutorial-balancer-icon">
                    均衡器
                  </div>
                  
                  <div className="level4-tutorial-arrow">→</div>
                  
                  <div className="level4-tutorial-classifiers">
                    <div className="level4-tutorial-mini-classifier">分类器1</div>
                    <div className="level4-tutorial-mini-classifier">分类器2</div>
                  </div>
                </div>
                
                <div className="level4-tutorial-solution-text">
                  使用<span className="level4-tutorial-highlight">均衡器</span>将数据流分配到<br />
                  多个<span className="level4-tutorial-highlight">分类器</span>同时处理！
                </div>
                
                <button className="level4-tutorial-btn" onClick={handleCloseTutorial}>
                  我明白了
                </button>
              </div>
            )}
          </div>
          
          <button className="level4-tutorial-skip-btn" onClick={handleCloseTutorial}>
            Skip
          </button>
        </div>
      )}

      {showResetNotice && (
        <div className="reset-notice">
          <div className="reset-icon">🔄</div>
          <div className="reset-text">关卡已重置</div>
        </div>
      )}
    </div>
  )
}

export default Level4Page