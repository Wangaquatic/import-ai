import React, { useState, useRef, useCallback, useEffect } from 'react'
import './LevelBase.css'
import './Level2Page.css'
import level2Input from '../../assets/level2-input.jpg'
import level2Output from '../../assets/level2-output2.jpg'
import level2Expert from '../../assets/level2-expert.jpg'
import Level2HiddenModal, { type ExpertSystemParams } from '../../components/Level2HiddenModal'
import { useZoom } from '../../hooks/useZoom'

interface Level2PageProps {
  onBack: () => void
  onNextLevel?: () => void
  onPrevLevel?: () => void
  onShop?: () => void
}

interface Point {
  x: number
  y: number
}

interface Connection {
  from: string
  to: string
}

interface Particle {
  id: number
  color: 'red' | 'green' | 'blue'
  from: string
  to: string
  progress: number
  speed: number
  done: boolean
}

interface PlacedNode {
  id: string
  type: 'classifier' | 'trash'
  pos: Point
}

interface DraggingNodeState {
  type: 'classifier' | 'trash'
  mouseX: number
  mouseY: number
}

const COINS_KEY = 'player_coins'
const LEVEL2_REWARD_KEY = 'level2_reward_claimed'
const LEVEL2_SAVE_KEY = 'level2_saved_state'
const LEVEL2_HIDDEN_PARAMS_KEY = 'level2_hidden_params'

const Level2Page: React.FC<Level2PageProps> = ({ onBack, onNextLevel, onPrevLevel, onShop }) => {
  // 漂浮的二进制数字背景
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

  // 从localStorage加载保存的状态
  const loadSavedState = useCallback(() => {
    try {
      const saved = localStorage.getItem(LEVEL2_SAVE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        // 确保所有节点都有有效的pos属性
        if (data.placedNodes) {
          data.placedNodes = data.placedNodes.map((node: PlacedNode) => {
            if (!node.pos || typeof node.pos.x !== 'number' || typeof node.pos.y !== 'number') {
              // 如果pos无效，使用默认位置
              return {
                ...node,
                pos: node.type === 'classifier' ? { x: 400, y: 200 } : { x: 400, y: 350 }
              }
            }
            return node
          })
        }
        return data
      }
    } catch (error) {
      console.error('Failed to load saved state:', error)
    }
    return null
  }, [])

  const savedState = loadSavedState()

  const [classifierPos, setClassifierPos] = useState(savedState?.classifierPos || { x: 400, y: 200 })
  const [trashPos, setTrashPos] = useState(savedState?.trashPos || { x: 400, y: 350 })
  const [connections, setConnections] = useState<Connection[]>(savedState?.connections || [])
  const [draggingLine, setDraggingLine] = useState<{ fromId: string; mouse: Point } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [correctRate, setCorrectRate] = useState(0)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem(COINS_KEY) || '0'))
  const [showReward, setShowReward] = useState(false)
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null)
  const [passed, setPassed] = useState(() => !!localStorage.getItem(LEVEL2_PASSED_KEY))
  const everPassed = useRef(!!localStorage.getItem(LEVEL2_PASSED_KEY))
  const [selectedColors, setSelectedColors] = useState(savedState?.selectedColors || { red: true, green: false, blue: true })
  const [placedNodes, setPlacedNodes] = useState<PlacedNode[]>(savedState?.placedNodes || [])
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [currentColorMode, setCurrentColorMode] = useState<'red' | 'green' | 'blue'>(savedState?.currentColorMode || 'red')
  const [saved, setSaved] = useState(false)
  const [draggingFromLibrary, setDraggingFromLibrary] = useState<DraggingNodeState | null>(null)
  const [draggingPlacedNode, setDraggingPlacedNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [showHiddenLevel, setShowHiddenLevel] = useState(false)
  const [showResetNotice, setShowResetNotice] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showTutorial, setShowTutorial] = useState(true) // 每次进入都显示教程
  const [tutorialStep, setTutorialStep] = useState(0)
  
  // 缩放功能
  const { zoom, resetZoom } = useZoom(0.5, 2.0, 0.1)
  
  const [hiddenParams, setHiddenParams] = useState<ExpertSystemParams>(() => {
    try {
      const saved = localStorage.getItem(LEVEL2_HIDDEN_PARAMS_KEY)
      return saved ? JSON.parse(saved) : {
        confidenceThreshold: 0.7,
        ruleWeight: 0.5,
        filterStrength: 0.7
      }
    } catch {
      return {
        confidenceThreshold: 0.7,
        ruleWeight: 0.5,
        filterStrength: 0.7
      }
    }
  })

  const rewardClaimed = useRef(!!localStorage.getItem(LEVEL2_REWARD_KEY))
  const speedMultiplierRef = useRef(1.0)
  const animFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const draggingNode = useRef<string | null>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const pageRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [, forceUpdate] = useState(0)

  // DOM 渲染完后强制重绘连线
  useEffect(() => {
    const timer = setTimeout(() => forceUpdate(n => n + 1), 100)
    return () => clearTimeout(timer)
  }, [])

  // 教程动画序列
  useEffect(() => {
    if (!showTutorial) return
    
    const timers: NodeJS.Timeout[] = []
    
    // 步骤1: 显示数据流和问题 (1秒后)
    timers.push(setTimeout(() => setTutorialStep(1), 500))
    
    // 步骤2: 显示混乱的数据 (3秒后)
    timers.push(setTimeout(() => setTutorialStep(2), 2500))
    
    // 步骤3: 显示专家系统解决方案 (5秒后)
    timers.push(setTimeout(() => setTutorialStep(3), 5000))
    
    return () => timers.forEach(t => clearTimeout(t))
  }, [showTutorial])
  
  const handleCloseTutorial = () => {
    setShowTutorial(false)
  }

  // 监听窗口大小变化，更新连接线（但不在初始化时触发）
  useEffect(() => {
    let isInitial = true
    
    const handleResize = () => {
      if (isInitial) {
        isInitial = false
        return
      }
      forceUpdate(n => n + 1)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 缩放变化时更新连接线
  useEffect(() => {
    forceUpdate(n => n + 1)
  }, [zoom])

  const getDotCenter = useCallback((id: string): Point | null => {
    const el = dotRefs.current[id]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [])



  const onDotMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      const center = getDotCenter(id)
      if (!center) return
      setDraggingLine({ fromId: id, mouse: center })
      e.preventDefault()
    },
    [getDotCenter]
  )

  const onDotMouseUp = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (!draggingLine) return
      const from = draggingLine.fromId
      if (from === id) {
        setDraggingLine(null)
        return
      }

      const rules: Record<string, string[]> = {
        'input-out': ['classifier-in'],
        'classifier-red': ['output-in', 'trash-in'],
        'classifier-green': ['output-in', 'trash-in'],
        'classifier-blue': ['output-in', 'trash-in']
      }

      const allowed = rules[from]
      if (!allowed || !allowed.includes(id)) {
        setDraggingLine(null)
        return
      }

      setConnections((prev) => [
        ...prev.filter((c) => c.from !== from && c.to !== id),
        { from, to: id }
      ])
      setDraggingLine(null)
    },
    [draggingLine]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingNode.current === 'classifier') {
        setClassifierPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
      } else if (draggingNode.current === 'trash') {
        setTrashPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
      }
      if (draggingLine) {
        setDraggingLine((prev) =>
          prev ? { ...prev, mouse: { x: e.clientX, y: e.clientY } } : null
        )
      }
      if (draggingFromLibrary) {
        // 只更新拖拽状态，不更新节点位置（因为节点还没添加）
        setDraggingFromLibrary({ ...draggingFromLibrary, mouseX: e.clientX, mouseY: e.clientY })
      }
      if (draggingPlacedNode && pageRef.current) {
        const rect = pageRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - draggingPlacedNode.offsetX
        const y = e.clientY - rect.top - draggingPlacedNode.offsetY
        
        // 更新placedNodes中的位置
        setPlacedNodes(prev => prev.map(n => 
          n.id === draggingPlacedNode.nodeId ? { ...n, pos: { x, y } } : n
        ))
      }
    },
    [draggingLine, draggingFromLibrary, draggingPlacedNode]
  )

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingFromLibrary && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // 检查是否在有效区域（不在侧边栏内）
      if (sidebarRef.current) {
        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        if (e.clientX < sidebarRect.left && mouseX > 0 && mouseY > 0 && mouseY < rect.height) {
          const nodeType = draggingFromLibrary.type
          const existingNode = placedNodes.find((n) => n.type === nodeType)
          
          if (!existingNode) {
            // 在鼠标位置添加节点
            const newNode: PlacedNode = {
              id: nodeType,
              type: nodeType,
              pos: { x: mouseX, y: mouseY }
            }
            setPlacedNodes([...placedNodes, newNode])
          }
        }
      }
      setDraggingFromLibrary(null)
    } else if (draggingPlacedNode) {
      // 检查是否拖回侧边栏删除
      if (sidebarRef.current) {
        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        if (e.clientX >= sidebarRect.left) {
          // 删除节点
          const nodeId = draggingPlacedNode.nodeId
          setPlacedNodes(prev => prev.filter(n => n.id !== nodeId))
          
          // 删除与该节点相关的所有连接线
          setConnections(prev => prev.filter(conn => {
            if (nodeId === 'classifier') {
              return !conn.from.startsWith('classifier-') && !conn.to.startsWith('classifier-')
            } else if (nodeId === 'trash') {
              return !conn.from.startsWith('trash-') && !conn.to.startsWith('trash-')
            }
            return true
          }))
        }
      }
      setDraggingPlacedNode(null)
    }
    
    draggingNode.current = null
    setDraggingLine(null)
  }, [draggingFromLibrary, draggingPlacedNode, placedNodes])

  const handleLibraryNodeDragStart = (e: React.MouseEvent, nodeType: 'classifier' | 'trash') => {
    const existingNode = placedNodes.find(n => n.type === nodeType)
    if (existingNode) return // 已经放置过，不能再拖
    
    e.preventDefault()
    setDraggingFromLibrary({ type: nodeType, mouseX: e.clientX, mouseY: e.clientY })
  }

  const handlePlacedNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const node = placedNodes.find(n => n.id === nodeId)
    if (!node || !pageRef.current) return

    const rect = pageRef.current.getBoundingClientRect()
    
    // 计算鼠标相对于节点的偏移
    const offsetX = e.clientX - rect.left - node.pos.x
    const offsetY = e.clientY - rect.top - node.pos.y
    
    setDraggingPlacedNode({ nodeId, offsetX, offsetY })
  }

  const cycleColorMode = (): void => {
    const modes: Array<'red' | 'green' | 'blue'> = ['red', 'green', 'blue']
    const currentIndex = modes.indexOf(currentColorMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setCurrentColorMode(nextMode)
    
    // 更新选中的颜色
    switch (nextMode) {
      case 'red':
        setSelectedColors({ red: true, green: false, blue: false })
        break
      case 'green':
        setSelectedColors({ red: false, green: true, blue: false })
        break
      case 'blue':
        setSelectedColors({ red: false, green: false, blue: true })
        break
    }
  }

  const getColorModeDisplay = (): { text: string; color: string } => {
    switch (currentColorMode) {
      case 'red':
        return { text: '红', color: '#ef4444' }
      case 'green':
        return { text: '绿', color: '#22c55e' }
      case 'blue':
        return { text: '蓝', color: '#3b82f6' }
    }
  }

  const speeds = [0.5, 1.0, 1.5, 2.0]
  const handleSpeedChange = (): void => {
    const idx = speeds.indexOf(speedMultiplier)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeedMultiplier(next)
    speedMultiplierRef.current = next
  }

  const handleHiddenTrain = async (params: ExpertSystemParams): Promise<number> => {
    // 检查是否为最优参数组合
    if (params.confidenceThreshold === 0.9 && 
        params.ruleWeight === 0.8 && 
        params.filterStrength === 0.95) {
      return 100 // 最优参数固定返回100%
    }
    
    // 模拟专家系统训练，根据参数计算准确率
    let multiplier = 0.7 // 基础70%
    
    // 置信度阈值影响（最优0.9）
    if (params.confidenceThreshold === 0.9) {
      multiplier += 0.1
    } else if (params.confidenceThreshold === 0.7) {
      multiplier += 0.05
    } else if (params.confidenceThreshold === 0.5) {
      multiplier += 0.025
    }
    
    // 规则权重影响（最优0.8）
    if (params.ruleWeight === 0.8) {
      multiplier += 0.1
    } else if (params.ruleWeight === 0.5) {
      multiplier += 0.05
    } else if (params.ruleWeight === 0.3) {
      multiplier += 0.025
    }
    
    // 过滤强度影响（最优0.95）
    if (params.filterStrength === 0.95) {
      multiplier += 0.1
    } else if (params.filterStrength === 0.7) {
      multiplier += 0.05
    } else if (params.filterStrength === 0.4) {
      multiplier += 0.025
    }
    
    // 转换为百分比，限制在70%到100%之间
    const accuracy = Math.min(Math.max(multiplier * 100, 70), 100)
    
    // 添加一些随机波动（±1%）
    const finalAccuracy = accuracy + (Math.random() * 2 - 1)
    
    return Math.min(Math.max(finalAccuracy, 70), 100)
  }

  const handleHiddenSave = (params: ExpertSystemParams): void => {
    setHiddenParams(params)
    localStorage.setItem(LEVEL2_HIDDEN_PARAMS_KEY, JSON.stringify(params))
  }

  // 根据隐藏参数计算准确率系数（与隐藏关卡测试结果一致）
  const calculateAccuracyMultiplier = useCallback((): number => {
    // 检查是否为最优参数组合
    if (hiddenParams.confidenceThreshold === 0.9 && 
        hiddenParams.ruleWeight === 0.8 && 
        hiddenParams.filterStrength === 0.95) {
      return 1.0 // 最优参数固定返回100%
    }
    
    // 基础准确率系数为 0.7（70%）
    let multiplier = 0.7
    
    // 置信度阈值影响（最优0.9）
    if (hiddenParams.confidenceThreshold === 0.9) {
      multiplier += 0.1
    } else if (hiddenParams.confidenceThreshold === 0.7) {
      multiplier += 0.05
    } else if (hiddenParams.confidenceThreshold === 0.5) {
      multiplier += 0.025
    }
    
    // 规则权重影响（最优0.8）
    if (hiddenParams.ruleWeight === 0.8) {
      multiplier += 0.1
    } else if (hiddenParams.ruleWeight === 0.5) {
      multiplier += 0.05
    } else if (hiddenParams.ruleWeight === 0.3) {
      multiplier += 0.025
    }
    
    // 过滤强度影响（最优0.95）
    if (hiddenParams.filterStrength === 0.95) {
      multiplier += 0.1
    } else if (hiddenParams.filterStrength === 0.7) {
      multiplier += 0.05
    } else if (hiddenParams.filterStrength === 0.4) {
      multiplier += 0.025
    }
    
    // 限制在0.7到1.0之间
    return Math.min(Math.max(multiplier, 0.7), 1.0)
  }, [hiddenParams])

  const handleClearLines = (): void => {
    setConnections([])
    setTestParticles([])
    setCorrectRate(0)
    setTrainingProgress(0)
  }

  const handleSave = (): void => {
    const saveData = {
      connections,
      classifierPos,
      trashPos,
      currentColorMode,
      selectedColors,
      placedNodes,
      timestamp: Date.now()
    }
    localStorage.setItem(LEVEL2_SAVE_KEY, JSON.stringify(saveData))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = (): void => {
    // 清除保存的状态
    localStorage.removeItem(LEVEL2_SAVE_KEY)
    // 重置所有状态
    setPlacedNodes([])
    setConnections([])
    setTestParticles([])
    setCorrectRate(0)
    setTrainingProgress(0)
    setElapsed(0)
    setTesting(false)
    setCurrentColorMode('red')
    setSelectedColors({ red: true, green: false, blue: false })
    // 显示重置提示
    setShowResetNotice(true)
    setTimeout(() => setShowResetNotice(false), 2000)
  }

  const handleClearAll = (): void => {
    if (testing) return // 测试中不允许清除
    setPlacedNodes([])
    setConnections([])
    setTestParticles([])
  }

  const handleTest = useCallback(() => {
    if (testing) return
    setTesting(true)
    setCorrectRate(0)
    setTrainingProgress(0)
    setElapsed(0)

    // 启动计时器
    if (timerRef.current) clearInterval(timerRef.current)
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    const colors: ('red' | 'green' | 'blue')[] = [
      ...Array(10).fill('red'),
      ...Array(10).fill('green'),
      ...Array(10).fill('blue')
    ].sort(() => Math.random() - 0.5)

    const inputConn = connections.find((c) => c.from === 'input-out')
    if (!inputConn) {
      setTesting(false)
      return
    }

    let id = 0
    const particles: Particle[] = []

    colors.forEach((color, i) => {
      particles.push({
        id: id++,
        color,
        from: inputConn.from,
        to: inputConn.to,
        progress: -(i * 0.1),
        speed: 0.003,
        done: false
      })
    })

    const redConn = connections.find((c) => c.from === 'classifier-red')
    const greenConn = connections.find((c) => c.from === 'classifier-green')
    const outputDelay = -1.5 // 输出延迟，让粒子有时间通过分类器

    // 根据当前颜色模式决定输出
    // 上方输出点：输出当前选中的颜色
    // 下方输出点：输出其他两种颜色
    const topColor = currentColorMode // 当前选中的颜色
    const bottomColors = ['red', 'green', 'blue'].filter((c) => c !== currentColorMode) as ('red' | 'green' | 'blue')[]

    if (redConn) {
      // 上方输出点：只输出当前选中的颜色
      // 保持与输入粒子相同的时序
      colors.forEach((color, i) => {
        if (color === topColor) {
          particles.push({
            id: id++,
            color,
            from: redConn.from,
            to: redConn.to,
            progress: outputDelay - (i * 0.1),
            speed: 0.003,
            done: false
          })
        }
      })
    }

    if (greenConn) {
      // 下方输出点：输出其他两种颜色
      // 保持与输入粒子相同的时序
      colors.forEach((color, i) => {
        if (bottomColors.includes(color as 'red' | 'green' | 'blue')) {
          particles.push({
            id: id++,
            color,
            from: greenConn.from,
            to: greenConn.to,
            progress: outputDelay - (i * 0.1),
            speed: 0.003,
            done: false
          })
        }
      })
    }

    setTestParticles(particles)

    const animate = (): void => {
      setTestParticles((prev) => {
        const next = prev.map((p) => ({
          ...p,
          progress: p.progress + p.speed * speedMultiplierRef.current,
          done: p.progress + p.speed * speedMultiplierRef.current >= 1
        }))

        // 计算进度：只统计到达输出节点的粒子
        const outputParticles = next.filter((p) => p.to === 'output-in')
        const outputCompletedParticles = outputParticles.filter((p) => p.done).length
        
        // 只有当输出节点有粒子时才更新进度
        if (outputParticles.length > 0) {
          setTrainingProgress(outputCompletedParticles / outputParticles.length)
        }

        // 只在输出节点有数据流入时才计算正确率
        // 过滤出已经到达输出节点且进度超过20%的粒子（稍微延迟一下正确率增长）
        const activeOutputParticles = outputParticles.filter((p) => p.progress > 0.8)
        
        if (activeOutputParticles.length > 0) {
          const correctOutputs = activeOutputParticles.filter((p) => p.color === 'red' || p.color === 'blue').length
          
          // 基础正确率 = 正确颜色数量 / 20（总共应该有20个正确的）
          const baseCorrectRate = correctOutputs / 20
          
          // 应用隐藏参数的影响
          const accuracyMultiplier = calculateAccuracyMultiplier()
          const currentCorrectRate = baseCorrectRate * accuracyMultiplier
          
          setCorrectRate(currentCorrectRate)
        }

        if (next.every((p) => p.done)) {
          setTesting(false)
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }

          // 获取最终正确率用于奖励判断
          const finalOutputParticles = next.filter((p) => p.to === 'output-in')
          const finalCorrectOutputs = finalOutputParticles.filter((p) => p.color === 'red' || p.color === 'blue').length
          const finalBaseCorrectRate = finalCorrectOutputs / 20
          const finalAccuracyMultiplier = calculateAccuracyMultiplier()
          const finalCorrectRate = finalBaseCorrectRate * finalAccuracyMultiplier

          // 判断是否通过（正确率≥85%）
          const isPass = finalCorrectRate >= 0.85

          // 已通关过：不再弹任何结果弹窗
          if (!everPassed.current) {
            if (isPass) {
              everPassed.current = true
              localStorage.setItem(LEVEL2_PASSED_KEY, '1')
              localStorage.setItem('level2_completed', '1')
              setPassed(true)
              setTestResult('pass')
            } else {
              setTestResult('fail')
            }
          } else {
            // 已通关过，静默更新 passed 状态
            if (isPass) setPassed(true)
          }

          // 发放金币奖励（只能一次）
          if (finalCorrectRate >= 1.0 && !rewardClaimed.current) {
            rewardClaimed.current = true
            localStorage.setItem(LEVEL2_REWARD_KEY, '1')
            const reward = 200
            const newCoins = parseInt(localStorage.getItem(COINS_KEY) || '0') + reward
            localStorage.setItem(COINS_KEY, String(newCoins))
            setCoins(newCoins)
            setShowReward(true)
            setTimeout(() => setShowReward(false), 3000)
          }
          
          // 不要清空粒子，让它们保持显示
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
          }
          return next
        }

        if (animFrameRef.current) {
          animFrameRef.current = requestAnimationFrame(animate)
        }
        return next
      })
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [testing, connections, currentColorMode, calculateAccuracyMultiplier])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const renderLines = (): React.ReactNode =>
    connections.map((conn, i) => {
      const from = getDotCenter(conn.from)
      const to = getDotCenter(conn.to)
      if (!from || !to) return null
      return (
        <g key={i}>
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#4ade80"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )
    })

  const renderTestParticles = (): React.ReactNode =>
    testParticles.map((p) => {
      if (p.progress < 0 || p.done) return null
      const from = getDotCenter(p.from)
      const to = getDotCenter(p.to)
      if (!from || !to) return null
      const t = Math.min(p.progress, 1)
      const x = from.x + (to.x - from.x) * t - 4
      const y = from.y + (to.y - from.y) * t - 4
      const colorMap = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6' }
      return (
        <rect
          key={p.id}
          x={x}
          y={y}
          width="8"
          height="8"
          fill={colorMap[p.color]}
          rx="2"
          opacity="0.9"
        />
      )
    })

  const renderDraggingLine = (): React.ReactNode => {
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

  const setDotRef = (id: string) => (el: HTMLDivElement | null) => {
    dotRefs.current[id] = el
  }

  return (
    <div ref={pageRef} className="level-base level2-page" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {/* 漂浮的二进制数字背景 */}
      <div className="particles-container">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`particle ${p.size}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.animationDuration}s`,
              animationDelay: `${p.animationDelay}s`
            }}
          >
            {p.content}
          </div>
        ))}
      </div>

      <svg className="connections-svg">
        {renderLines()}
        {renderTestParticles()}
        {renderDraggingLine()}
      </svg>

      <button className="back-button" onClick={onBack}>← 返回</button>
      <div className="node-counter">{placedNodes.length}/2</div>
      <div className="coins-display">🪙 {coins}</div>

      {/* 商店按钮 */}
      {onShop && (
        <button className="shop-button" onClick={onShop} title="商店">
          🛒
        </button>
      )}

      {/* 缩放指示器 */}
      <div className="zoom-indicator">
        <span>🔍 {Math.round(zoom * 100)}%</span>
        {zoom !== 1.0 && (
          <button className="zoom-reset-btn" onClick={resetZoom}>
            重置
          </button>
        )}
      </div>

      {showReward && (
        <div className="reward-popup">
          <div className="reward-icon">🎉</div>
          <div className="reward-text">分类器掌握！</div>
          <div className="reward-coins">+200 🪙</div>
        </div>
      )}

      <div ref={sidebarRef} className="left-toolbar">
        <div className="toolbar-actions">
          <button className="toolbar-btn test-btn" onClick={handleTest} disabled={testing}>
            {testing ? '测试中...' : '测试'}
          </button>
          <button className={`toolbar-btn save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
            {saved ? '已保存 ✓' : '保存'}
          </button>
          <button className="toolbar-btn reset-btn" onClick={handleReset} title="重置关卡">
            🔄
          </button>
        </div>
        <div className="toolbar-content">
          <div className="toolbar-title">节点库</div>
          <div 
            className={`toolbar-node ${placedNodes.find(n => n.type === 'classifier') ? 'disabled' : ''}`}
            onMouseDown={(e) => handleLibraryNodeDragStart(e, 'classifier')}
          >
            <img src={level2Expert} alt="专家系统" className="toolbar-node-img" draggable={false} />
            <span className="toolbar-node-label">
              专家系统 ({placedNodes.find(n => n.type === 'classifier') ? '0/1' : '1/1'})
            </span>
          </div>
          <div 
            className={`toolbar-node ${placedNodes.find(n => n.type === 'trash') ? 'disabled' : ''}`}
            onMouseDown={(e) => handleLibraryNodeDragStart(e, 'trash')}
          >
            <div className="toolbar-trash-icon">🗑️</div>
            <span className="toolbar-node-label">
              垃圾桶 ({placedNodes.find(n => n.type === 'trash') ? '0/1' : '1/1'})
            </span>
          </div>
        </div>
      </div>

      <div className="input-area" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
        <div className="input-image-container">
          <img src={level2Input} alt="输入数据" className="input-image" draggable={false} />
          <div
            ref={setDotRef('input-out')}
            className="connection-dot output-dot"
            onMouseDown={(e) => onDotMouseDown(e, 'input-out')}
            onMouseUp={(e) => onDotMouseUp(e, 'input-out')}
          />
        </div>
      </div>

      <div className="output-area" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
        <div className="output-image-container">
          <div
            ref={setDotRef('output-in')}
            className="connection-dot input-dot"
            onMouseDown={(e) => onDotMouseDown(e, 'output-in')}
            onMouseUp={(e) => onDotMouseUp(e, 'output-in')}
          />
          <img src={level2Output} alt="输出结果" className="output-image" draggable={false} />
          {(testing || correctRate > 0 || trainingProgress > 0) && (
            <div className="target-bars">
              <div className="target-bar-item">
                <span className="bar-label-small">正确率</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-blue" style={{ height: `${correctRate * 100}%` }} />
                </div>
                <span className="bar-value-small">{Math.round(correctRate * 100)}%</span>
              </div>
              <div className="target-bar-item">
                <span className="bar-label-small">进度</span>
                <div className="bar-track-small">
                  <div className="bar-fill-small bar-green" style={{ height: `${trainingProgress * 100}%` }} />
                </div>
                <span className="bar-value-small">{Math.round(trainingProgress * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="classifier-node"
        style={{ 
          transform: `translate(${placedNodes.find(n => n.type === 'classifier')?.pos.x ?? 400}px, ${placedNodes.find(n => n.type === 'classifier')?.pos.y ?? 200}px) scale(${zoom})`,
          transformOrigin: 'center center',
          display: placedNodes.find(n => n.type === 'classifier') ? 'block' : 'none'
        }}
        onMouseDown={(e) => handlePlacedNodeMouseDown('classifier', e)}
      >
        <div
          ref={setDotRef('classifier-in')}
          className="connection-dot input-dot"
          onMouseDown={(e) => onDotMouseDown(e, 'classifier-in')}
          onMouseUp={(e) => onDotMouseUp(e, 'classifier-in')}
        />
        <img src={level2Expert} alt="分类器" className="classifier-image" draggable={false} />
        <button
          className="color-mode-btn"
          onClick={(e) => {
            e.stopPropagation()
            cycleColorMode()
          }}
          style={{
            background: getColorModeDisplay().color
          }}
        >
          {getColorModeDisplay().text}
        </button>
        <div
          ref={setDotRef('classifier-red')}
          className="connection-dot output-dot red-dot"
          onMouseDown={(e) => onDotMouseDown(e, 'classifier-red')}
          onMouseUp={(e) => onDotMouseUp(e, 'classifier-red')}
          title="输出"
        />
        <div
          ref={setDotRef('classifier-green')}
          className="connection-dot output-dot green-dot"
          onMouseDown={(e) => onDotMouseDown(e, 'classifier-green')}
          onMouseUp={(e) => onDotMouseUp(e, 'classifier-green')}
          title="输出"
        />
      </div>

      <div
        className="trash-node"
        style={{ 
          transform: `translate(${placedNodes.find(n => n.type === 'trash')?.pos.x ?? 400}px, ${placedNodes.find(n => n.type === 'trash')?.pos.y ?? 350}px) scale(${zoom})`,
          transformOrigin: 'center center',
          display: placedNodes.find(n => n.type === 'trash') ? 'block' : 'none'
        }}
        onMouseDown={(e) => handlePlacedNodeMouseDown('trash', e)}
      >
        <div
          ref={setDotRef('trash-in')}
          className="connection-dot input-dot"
          onMouseDown={(e) => onDotMouseDown(e, 'trash-in')}
          onMouseUp={(e) => onDotMouseUp(e, 'trash-in')}
        />
        <div className="trash-icon">🗑️</div>
      </div>

      {/* 拖拽预览 */}
      {draggingFromLibrary && (
        <div
          style={{
            position: 'fixed',
            left: draggingFromLibrary.mouseX,
            top: draggingFromLibrary.mouseY,
            transform: 'translate(-50%, -50%)',
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {draggingFromLibrary.type === 'classifier' ? (
            <img src={level2Expert} alt="专家系统" style={{ width: '120px', height: 'auto', borderRadius: '8px' }} draggable={false} />
          ) : (
            <div style={{ fontSize: '48px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', borderRadius: '50%' }}>🗑️</div>
          )}
        </div>
      )}

      {/* 清除按钮 - 统一样式，右下角 */}
      <button 
        className="clear-all-btn" 
        onClick={handleClearAll}
        disabled={testing}
        title="清除所有节点和连接"
      >
        🗑️
      </button>

      {/* 上一关按钮 */}
      {onPrevLevel && (
        <button className="prev-level-btn" onClick={onPrevLevel}>
          上一关
        </button>
      )}

      {/* 下一关按钮 */}
      {onNextLevel && (
        <button className="next-level-btn" onClick={onNextLevel}>
          下一关
        </button>
      )}

      <button className="speed-btn" onClick={handleSpeedChange}>
        ▶▶ {speedMultiplier.toFixed(1)}x
      </button>

      {/* 计时器 */}
      {testing && (
        <div className="timer-display">
          {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* 隐藏关卡按钮 */}
      <button 
        className="hidden-level-btn" 
        onClick={() => setShowHiddenLevel(true)} 
        title="隐藏关卡"
        disabled={testing}
      >
        🎛️
      </button>

      {/* 隐藏关卡模态框 */}
      {showHiddenLevel && (
        <Level2HiddenModal
          onClose={() => setShowHiddenLevel(false)}
          onTrain={handleHiddenTrain}
          onSave={handleHiddenSave}
          initialParams={hiddenParams}
          currentColorMode={currentColorMode}
          onCoinsUpdate={setCoins}
        />
      )}

      {/* 教程引导 */}
      {showTutorial && (
        <div className="level2-tutorial-overlay">
          <div className="level2-tutorial-content">
            {/* 步骤1: 显示数据流和问题 */}
            {tutorialStep >= 1 && tutorialStep < 3 && (
              <>
                <div className="level2-tutorial-data-stream">
                  <div className="level2-tutorial-data red">🔴</div>
                  <div className="level2-tutorial-data green">🟢</div>
                  <div className="level2-tutorial-data blue">🔵</div>
                  <div className="level2-tutorial-data red">🔴</div>
                  <div className="level2-tutorial-data green">🟢</div>
                </div>
                
                {/* 步骤2: 显示混乱的数据 */}
                {tutorialStep >= 2 && (
                  <div className="level2-tutorial-problem">
                    <div className="level2-tutorial-x-mark">✗</div>
                    <div className="level2-tutorial-text">
                      数据混乱，需要清洗和分类...
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* 步骤3: 显示专家系统解决方案 */}
            {tutorialStep >= 3 && (
              <div className="level2-tutorial-solution">
                <div className="level2-tutorial-expert-icon">
                  <img src={level2Expert} alt="专家系统" style={{ width: '100px', borderRadius: '8px' }} />
                </div>
                <div className="level2-tutorial-solution-text">
                  使用<span className="level2-tutorial-highlight">专家系统</span>进行数据清洗！
                </div>
                <div className="level2-tutorial-desc">
                  专家系统可以根据规则过滤和分类数据，<br/>
                  将有用的数据传递给输出，无用的数据丢弃到垃圾桶
                </div>
                <button className="level2-tutorial-btn" onClick={handleCloseTutorial}>
                  我明白了
                </button>
              </div>
            )}
          </div>
          
          {/* Skip按钮 */}
          <button className="level2-tutorial-skip-btn" onClick={handleCloseTutorial}>
            Skip
          </button>
        </div>
      )}

      {/* 测试结果弹窗 */}
      {testResult && (
        <div className="info-overlay" onClick={() => setTestResult(null)}>
          <div className="info-modal result-modal" onClick={e => e.stopPropagation()}>
            {testResult === 'pass' ? (
              <>
                <div className="result-icon">✅</div>
                <div className="result-title">测试通过！</div>
                <div className="result-text">
                  恭喜你成功完成了专家系统关卡！<br/>
                  正确率达到85%以上，数据清洗效果优秀！
                </div>
              </>
            ) : (
              <>
                <div className="result-icon">❌</div>
                <div className="result-title">测试未通过</div>
                <div className="result-text">
                  正确率未达到85%，请检查连接和参数设置。<br/>
                  提示：确保专家系统正确连接，并调整隐藏参数。
                </div>
              </>
            )}
            <button className="info-close" onClick={() => setTestResult(null)}>
              {testResult === 'pass' ? '太棒了！' : '再试一次'}
            </button>
          </div>
        </div>
      )}

      {/* 重置提示 */}
      {showResetNotice && (
        <div className="reset-notice">
          <div className="reset-icon">🔄</div>
          <div className="reset-text">关卡已重置</div>
        </div>
      )}
    </div>
  )
}

export default Level2Page
