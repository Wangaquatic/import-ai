import React, { useState, useRef, useEffect, useCallback } from 'react'
import './Level4Page.css'
import levelBg from '../../assets/level-bg.png'
import level4Input from '../../assets/level4-output.png'
import targetImg from '../../assets/target.jpg'
import balancerImg from '../../assets/level3-balancer.png'
import classifierImg from '../../assets/classifier.jpg'
import trashImg from '../../assets/trash.png'
import Level4HiddenModal from '../../components/Level4HiddenModal'

interface Level4PageProps {
  onBack: () => void
  onNextLevel?: () => void
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
}

const COINS_KEY = 'player_coins'
const LEVEL4_REWARD_KEY = 'level4_reward_claimed'
const LEVEL4_PASSED_KEY = 'level4_passed' // 新增：记录是否通过第四关

const Level4Page: React.FC<Level4PageProps> = ({ onBack, onNextLevel }) => {
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const rewardClaimed = React.useRef(!!localStorage.getItem(LEVEL4_REWARD_KEY))
  const [levelPassed, setLevelPassed] = useState(() => !!localStorage.getItem(LEVEL4_PASSED_KEY))
  const [showHiddenLevel, setShowHiddenLevel] = useState(false)
  
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
  const [infoModal, setInfoModal] = useState<'input' | 'output' | 'balancer' | 'classifier' | 'trash' | null>(null)
  const [placedNodes, setPlacedNodes] = useState<PlacedNode[]>([])
  const [draggingNode, setDraggingNode] = useState<{ type: 'balancer' | 'classifier' | 'trash'; mouseX: number; mouseY: number } | null>(null)
  const [draggingPlacedNode, setDraggingPlacedNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
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
    // input-out 只能连到节点的 -in 或 output-in
    // 节点的 -out1/-out2 只能连到其他节点的 -in 或 output-in
    // 每个输出点只能发出一条线，但每个输入点可以接收多条线
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

  const renderLines = () => {
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

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingNode && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // 侧边栏宽度300px，左侧面板160px
      if (x > 160 && x < rect.width - 300 && y > 0 && y < rect.height) {
        if (getTotalNodes() < 8 && getNodeCount(draggingNode.type) < getNodeLimit(draggingNode.type)) {
          const newNode: PlacedNode = {
            id: `${draggingNode.type}-${Date.now()}`,
            type: draggingNode.type,
            pos: { x, y },
            maxCapacity: draggingNode.type === 'trash' ? 10 : 5, // 垃圾桶容量10，其他5
            currentLoad: 0
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

  const handleSpeedChange = () => {
    const speeds = [1.0, 2.0, 3.0]
    const idx = speeds.indexOf(speedMultiplier)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeedMultiplier(next)
    speedMultiplierRef.current = next
  }

  const handleClearAll = () => {
    if (testing) return // 测试中不允许清除
    setPlacedNodes([])
    setConnections([])
  }

  const handleTest = () => {
    if (testing) {
      // 停止测试
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
    
    // 开始测试
    setTesting(true)
    setTargetCount(0)
    setTargetAccuracy(0)
    setElapsed(0)
    
    // 初始化节点状态
    const nodeStates: Record<string, { queue: Array<{id: number, color: string}>; processing: boolean; nextOutput: 1 | 2 }> = {}
    placedNodes.forEach(node => {
      nodeStates[node.id] = { queue: [], processing: false, nextOutput: 1 }
    })
    nodeStateRef.current = nodeStates
    
    // 启动计时器（显示真实经过的秒数）
    elapsedRef.current = 0
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
    
    // 创建500红+500蓝方块
    const particles: Particle[] = []
    particleIdRef.current = 0
    const colors = [...Array(500).fill('#ef4444'), ...Array(500).fill('#3b82f6')]
    // 随机打乱
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]]
    }
    
    // 保存颜色数组到ref供后续使用
    colorQueueRef.current = { colors, index: 0 }
    
    // 从input-out开始的连接
    const inputConn = connections.find(c => c.from === 'input-out')
    if (inputConn) {
      // 初始只创建前15个粒子，间隔发送
      for (let i = 0; i < Math.min(15, colors.length); i++) {
        particles.push({
          id: particleIdRef.current++,
          color: colors[i],
          from: inputConn.from,
          to: inputConn.to,
          progress: -(i * 0.15), // 较大的间隔
          speed: 0.004, // 基础速度，不预乘倍速
          done: false
        })
      }
      colorQueueRef.current.index = Math.min(15, colors.length)
    }
    
    setTestParticles(particles)
    
    // 使用ref来跟踪统计数据，避免闭包问题
    const statsRef = { redCount: 0, totalCount: 0 }
    
    // 动画循环
    const animate = () => {
      setTestParticles(prev => {
        const next = [...prev]
        let hasChanges = false
        
        // 检查是否需要从输入流补充新粒子
        const inputConn = connections.find(c => c.from === 'input-out')
        if (inputConn && colorQueueRef.current.index < colorQueueRef.current.colors.length) {
          // 检查当前从input-out出发且未完成的粒子数量
          const inputParticles = next.filter(p => p.from === 'input-out' && !p.done && p.progress < 1)
          // 如果少于8个，补充新粒子（一次只补充1-2个，保持稳定流速）
          if (inputParticles.length < 8) {
            const toAdd = Math.min(2, colorQueueRef.current.colors.length - colorQueueRef.current.index)
            for (let i = 0; i < toAdd; i++) {
              next.push({
                id: particleIdRef.current++,
                color: colorQueueRef.current.colors[colorQueueRef.current.index++],
                from: inputConn.from,
                to: inputConn.to,
                progress: -0.2, // 从较远的位置开始
                speed: 0.004, // 基础速度，不预乘倍速
                done: false
              })
            }
            hasChanges = true
          }
        }
        
        // 更新所有粒子
        for (let i = 0; i < next.length; i++) {
          const p = next[i]
          if (p.done) continue
          
          // 检查粒子是否被阻塞
          let isBlocked = false
          if (p.progress >= 0.95 && p.progress < 1 && p.to.endsWith('-in')) {
            const nodeId = p.to.replace('-in', '')
            const nodeState = nodeStateRef.current[nodeId]
            const node = placedNodes.find(n => n.id === nodeId)
            if (node && nodeState && node.type !== 'trash') {
              // 如果节点队列已满，粒子保持阻塞
              if (nodeState.queue.length >= node.maxCapacity) {
                isBlocked = true
              }
            }
          }
          
          // 移动粒子（使用当前倍速）
          if (p.progress < 1 && !isBlocked) {
            p.progress += p.speed * speedMultiplierRef.current
            hasChanges = true
          }
          
          // 粒子到达终点
          if (p.progress >= 1 && !p.done) {
            p.done = true
            hasChanges = true
            
            // 检查是否到达输出目标
            if (p.to === 'output-in') {
              statsRef.totalCount++
              if (p.color === '#ef4444') statsRef.redCount++
              setTargetCount(statsRef.totalCount)
              setTargetAccuracy(statsRef.totalCount > 0 ? (statsRef.redCount / statsRef.totalCount) * 100 : 0)
              
              // 实时检查通关条件：100个方块，75%准确率
              const accuracy = statsRef.totalCount > 0 ? statsRef.redCount / statsRef.totalCount : 0
              
              if (statsRef.totalCount >= 100 && accuracy >= 0.75) {
                console.log('Level4 通关！', { 
                  totalCount: statsRef.totalCount,
                  redCount: statsRef.redCount,
                  accuracy,
                  rewardClaimed: rewardClaimed.current
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
                    localStorage.setItem(LEVEL4_REWARD_KEY, '1')
                    const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + 300
                    localStorage.setItem(COINS_KEY, String(newCoins))
                    setCoins(newCoins)
                  }
                  
                  // 标记关卡已通过
                  if (!levelPassed) {
                    localStorage.setItem(LEVEL4_PASSED_KEY, '1')
                    setLevelPassed(true)
                  }
                  
                  console.log('Level4 显示奖励弹窗')
                  
                  // 使用setTimeout确保状态更新后再显示奖励
                  setTimeout(() => {
                    setShowVictory(true)
                    setShowReward(true)
                    console.log('Level4 奖励状态已设置')
                    setTimeout(() => setShowReward(false), 3000)
                  }, 100)
                // }
                
                // 返回空数组停止所有粒子
                return []
              }
            } else if (p.to.endsWith('-in')) {
              // 到达节点输入
              const nodeId = p.to.replace('-in', '')
              const node = placedNodes.find(n => n.id === nodeId)
              const nodeState = nodeStateRef.current[nodeId]
              
              if (node && nodeState) {
                // 垃圾桶直接丢弃
                if (node.type === 'trash') {
                  continue
                }
                
                // 检查节点容量，如果已满则不添加
                if (nodeState.queue.length < node.maxCapacity) {
                  nodeState.queue.push({ id: p.id, color: p.color })
                  
                  // 更新节点负载显示
                  setPlacedNodes(prev => prev.map(n => 
                    n.id === nodeId ? { ...n, currentLoad: nodeState.queue.length } : n
                  ))
                  
                  // 如果节点未在处理，开始处理
                  if (!nodeState.processing && nodeState.queue.length > 0) {
                    nodeState.processing = true
                    
                    // 分类器延迟500ms，平衡器延迟10ms
                    const delay = node.type === 'classifier' ? 500 : 10
                    
                    const processQueue = () => {
                      if (nodeState.queue.length > 0) {
                        const item = nodeState.queue.shift()!
                        
                        // 更新节点负载显示
                        setPlacedNodes(prev => prev.map(n => 
                          n.id === nodeId ? { ...n, currentLoad: nodeState.queue.length } : n
                        ))
                        
                        let outputNum: 1 | 2
                        if (node.type === 'classifier') {
                          // 分类器：红色走output1，蓝色走output2
                          outputNum = item.color === '#ef4444' ? 1 : 2
                        } else {
                          // 平衡器：轮询
                          outputNum = nodeState.nextOutput
                          nodeState.nextOutput = outputNum === 1 ? 2 : 1
                        }
                        
                        // 找到输出连接
                        const outputConn = connections.find(c => c.from === `${nodeId}-out${outputNum}`)
                        if (outputConn) {
                          setTestParticles(current => [
                            ...current,
                            {
                              id: particleIdRef.current++,
                              color: item.color,
                              from: outputConn.from,
                              to: outputConn.to,
                              progress: 0,
                              speed: 0.004, // 基础速度，不预乘倍速
                              done: false
                            }
                          ])
                        }
                        
                        // 继续处理队列中的下一个
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
                  // 节点已满，粒子被阻塞，保持在输入端
                  p.progress = 0.95 // 停在输入端附近，不标记为done
                  hasChanges = true
                }
              }
            }
          }
        }
        
        // 检查是否全部完成或超时（时间限制根据倍速调整：倍速越大，时限越小）
        // elapsed是真实秒数，elapsed * speedMultiplier 是加速后的等效时间
        const timeLimit = 180
        const effectiveElapsed = elapsedRef.current * speedMultiplierRef.current
        const allParticlesDone = next.every(p => p.done)
        const allQueuesEmpty = Object.values(nodeStateRef.current).every(s => s.queue.length === 0 && !s.processing)
        
        if ((allParticlesDone && allQueuesEmpty) || effectiveElapsed >= timeLimit) {
          setTesting(false)
          if (timerRef.current) clearInterval(timerRef.current)
          
          // 检查是否超时
          if (effectiveElapsed >= timeLimit) {
            setShowTimeout(true)
          } else {
            // 所有粒子完成但未通关（通关成功已在实时检查中处理）
            if (statsRef.totalCount < 100 || statsRef.redCount / statsRef.totalCount < 0.75) {
              setShowTimeout(true)
            }
          }
          
          return next
        }
        
        // 继续动画循环
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
      className="level4-page"
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
      
      {/* 隐藏关卡按钮 - 左下角 */}
      <button className="hidden-level-btn" onClick={() => setShowHiddenLevel(true)} title="隐藏关卡">
        🔬
      </button>
      
      <div className="node-counter">{getTotalNodes()}/8</div>
      <div className="coins-display">💰 {coins}</div>

      {/* 速度控制按钮 */}
      <button className="speed-btn" onClick={handleSpeedChange}>
        ▶▶ {speedMultiplier.toFixed(1)}x
      </button>

      {/* 清除按钮 */}
      <button 
        className="clear-all-btn" 
        onClick={handleClearAll}
        disabled={testing}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: levelPassed && onNextLevel ? '200px' : '30px', // 如果有下一关按钮，则向左移动
          padding: '12px 24px',
          background: testing ? 'rgba(100, 100, 100, 0.5)' : 'rgba(239, 68, 68, 0.9)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: testing ? 'not-allowed' : 'pointer',
          zIndex: 100,
          transition: 'all 0.2s ease',
          opacity: testing ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!testing) {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (!testing) {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
            e.currentTarget.style.transform = 'scale(1)'
          }
        }}
      >
        🗑️ 清除全部
      </button>

      {/* 超时弹窗 */}
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

      {/* 奖励弹窗 */}
      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">第四关完成！</div>
          <div className="reward-coins">+300 🪙</div>
        </div>
      )}

      {/* 下一关按钮 - 通关后一直显示 */}
      {console.log('Level4 按钮渲染检查:', { levelPassed, onNextLevel: !!onNextLevel, shouldShow: levelPassed && !!onNextLevel })}
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
          ⏱ {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')} / {Math.floor(180 / speedMultiplier / 60).toString().padStart(2, '0')}:{Math.floor(180 / speedMultiplier % 60).toString().padStart(2, '0')}
        </div>
      )}

      <div className="left-panel">
        <div className="img-with-dot">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={level4Input} alt="输入图片" className="input-img" draggable={false} />
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

      <div className="output-panel">
        <div className="img-with-dot">
          <div
            ref={setDotRef('output-in')}
            className="dot dot-left"
            onMouseDown={(e) => onDotMouseDown(e, 'output-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'output-in')}
          />
          <div className="img-bar-wrapper">
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
              src={getNodeImage(node.type)} 
              alt={node.type} 
              style={{ width: '160px', borderRadius: '8px', userSelect: 'none', pointerEvents: 'none' }} 
              draggable={false} 
            />

            {/* 说明按钮 */}
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

            {/* 处理时间显示 */}
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

            {/* 进度条 - 横向显示在中间靠右 */}
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

          {/* 输出连接点 - 只有balancer和classifier有输出 */}
          {node.type !== 'trash' && (
            <>
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
            </>
          )}
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
          <button className="sidebar-btn save-btn">保存</button>
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
      
      {/* 隐藏关卡弹窗 */}
      {showHiddenLevel && (
        <Level4HiddenModal onClose={() => setShowHiddenLevel(false)} />
      )}
    </div>
  )
}

export default Level4Page
