import React, { useState, useRef, useCallback } from 'react'
import './Level4HiddenModal.css'

interface Level4HiddenModalProps {
  onClose: () => void
}

type BlockType = 'start' | 'condition' | 'action' | 'end'
type ConditionType = 'checkRed' | 'checkBlue' | 'queueCompare' | 'random'
type ActionType = 'output1' | 'output2' | 'counter'

interface LogicBlock {
  id: string
  type: BlockType
  conditionType?: ConditionType
  actionType?: ActionType
  x: number
  y: number
  connections: {
    yes?: string  // 用于条件块的"是"分支
    no?: string   // 用于条件块的"否"分支
    next?: string // 用于动作块的下一步
  }
}

interface Particle {
  id: number
  color: string
  currentBlockId: string
  progress: number
}

const Level4HiddenModal: React.FC<Level4HiddenModalProps> = ({ onClose }) => {
  const [placedBlocks, setPlacedBlocks] = useState<LogicBlock[]>([
    { id: 'start', type: 'start', x: 150, y: 50, connections: {} },
    { id: 'end1', type: 'end', x: 400, y: 300, connections: {} },
    { id: 'end2', type: 'end', x: 400, y: 450, connections: {} }
  ])
  const [draggingBlock, setDraggingBlock] = useState<{ type: BlockType; conditionType?: ConditionType; actionType?: ActionType; mouseX: number; mouseY: number } | null>(null)
  const [draggingPlacedBlock, setDraggingPlacedBlock] = useState<{ blockId: string; offsetX: number; offsetY: number } | null>(null)
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<{ blockId: string; type: 'yes' | 'no' | 'next' } | null>(null)
  const [draggingLine, setDraggingLine] = useState<{ fromBlockId: string; fromType: 'yes' | 'no' | 'next'; mouseX: number; mouseY: number } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [stats, setStats] = useState({ output1: 0, output2: 0, correct: 0, total: 0 })
  const [showResult, setShowResult] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [guideStep, setGuideStep] = useState(0)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const libraryRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)

  const getBlockColor = (block: LogicBlock): string => {
    if (block.type === 'start') return '#10b981'
    if (block.type === 'end') return '#ef4444'
    if (block.type === 'condition') return '#f59e0b'
    if (block.type === 'action') return '#3b82f6'
    return '#6b7280'
  }

  const getBlockLabel = (block: LogicBlock): string => {
    if (block.type === 'start') return '开始'
    if (block.type === 'end') return '输出'
    if (block.type === 'condition') {
      switch (block.conditionType) {
        case 'checkRed': return '颜色==红?'
        case 'checkBlue': return '颜色==蓝?'
        case 'queueCompare': return '队列1<队列2?'
        case 'random': return '随机50%?'
        default: return '条件'
      }
    }
    if (block.type === 'action') {
      switch (block.actionType) {
        case 'output1': return '→输出1'
        case 'output2': return '→输出2'
        case 'counter': return '计数器+1'
        default: return '动作'
      }
    }
    return ''
  }

  const handleLibraryBlockMouseDown = (e: React.MouseEvent, type: BlockType, conditionType?: ConditionType, actionType?: ActionType) => {
    e.preventDefault()
    setDraggingBlock({ type, conditionType, actionType, mouseX: e.clientX, mouseY: e.clientY })
  }

  const handlePlacedBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const block = placedBlocks.find(b => b.id === blockId)
    if (!block || block.type === 'start' || block.type === 'end') return
    
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - block.x
    const offsetY = e.clientY - rect.top - block.y
    
    setDraggingPlacedBlock({ blockId, offsetX, offsetY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingBlock) {
      setDraggingBlock({ ...draggingBlock, mouseX: e.clientX, mouseY: e.clientY })
    } else if (draggingPlacedBlock && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - draggingPlacedBlock.offsetX
      const y = e.clientY - rect.top - draggingPlacedBlock.offsetY
      
      setPlacedBlocks(prev => prev.map(b => 
        b.id === draggingPlacedBlock.blockId ? { ...b, x, y } : b
      ))
      
      // 检查是否在删除区域（左侧栏）
      if (libraryRef.current) {
        const libraryRect = libraryRef.current.getBoundingClientRect()
        const isOver = e.clientX <= libraryRect.right && e.clientY >= libraryRect.top && e.clientY <= libraryRect.bottom
        setIsOverDeleteZone(isOver)
      }
    } else if (draggingLine) {
      setDraggingLine({ ...draggingLine, mouseX: e.clientX, mouseY: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingBlock && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
        const newBlock: LogicBlock = {
          id: `block-${Date.now()}`,
          type: draggingBlock.type,
          conditionType: draggingBlock.conditionType,
          actionType: draggingBlock.actionType,
          x,
          y,
          connections: {}
        }
        setPlacedBlocks([...placedBlocks, newBlock])
      }
      setDraggingBlock(null)
    } else if (draggingPlacedBlock) {
      // 检查是否在删除区域
      if (isOverDeleteZone) {
        handleDeleteBlock(draggingPlacedBlock.blockId)
      }
      setDraggingPlacedBlock(null)
      setIsOverDeleteZone(false)
    } else if (draggingLine) {
      setDraggingLine(null)
    }
  }

  const handleConnectStart = (e: React.MouseEvent, blockId: string, type: 'yes' | 'no' | 'next') => {
    e.stopPropagation()
    setDraggingLine({ fromBlockId: blockId, fromType: type, mouseX: e.clientX, mouseY: e.clientY })
  }

  const handleConnectEnd = (e: React.MouseEvent, targetBlockId: string) => {
    e.stopPropagation()
    if (!draggingLine) return
    
    // 不能连接到自己
    if (draggingLine.fromBlockId === targetBlockId) {
      setDraggingLine(null)
      return
    }
    
    setPlacedBlocks(prev => prev.map(b => {
      if (b.id === draggingLine.fromBlockId) {
        return {
          ...b,
          connections: {
            ...b.connections,
            [draggingLine.fromType]: targetBlockId
          }
        }
      }
      return b
    }))
    
    setDraggingLine(null)
  }

  const handleDeleteBlock = (blockId: string) => {
    // 不能删除开始和结束节点
    const block = placedBlocks.find(b => b.id === blockId)
    if (!block || block.type === 'start' || block.type === 'end') return
    
    // 删除块并清除所有指向它的连接
    setPlacedBlocks(prev => {
      const filtered = prev.filter(b => b.id !== blockId)
      return filtered.map(b => ({
        ...b,
        connections: {
          yes: b.connections.yes === blockId ? undefined : b.connections.yes,
          no: b.connections.no === blockId ? undefined : b.connections.no,
          next: b.connections.next === blockId ? undefined : b.connections.next
        }
      }))
    })
  }
  
  const handleDeleteConnection = (blockId: string, connectionType: 'yes' | 'no' | 'next', e: React.MouseEvent) => {
    e.stopPropagation()
    setPlacedBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          connections: {
            ...b.connections,
            [connectionType]: undefined
          }
        }
      }
      return b
    }))
  }

  const handleTest = () => {
    if (testing) return
    
    setTesting(true)
    setStats({ output1: 0, output2: 0, correct: 0, total: 0 })
    setShowResult(false)
    
    // 创建测试数据：10红10蓝
    const colors = [...Array(10).fill('#ef4444'), ...Array(10).fill('#3b82f6')].sort(() => Math.random() - 0.5)
    
    const particles: Particle[] = colors.map((color, i) => ({
      id: i,
      color,
      currentBlockId: 'start',
      progress: 0
    }))
    
    setTestParticles(particles)
    
    const statsRef = { output1: 0, output2: 0, correct: 0, total: 0 }
    const counterRef = { value: 0 }
    const queueRef = { queue1: 0, queue2: 0 }
    
    // 模拟执行逻辑
    const executeLogic = (particle: Particle): string | null => {
      const block = placedBlocks.find(b => b.id === particle.currentBlockId)
      if (!block) return null
      
      if (block.type === 'start') {
        return block.connections.next || block.connections.yes || null
      }
      
      if (block.type === 'end') {
        // 到达输出节点
        const endIndex = block.id === 'end1' ? 1 : 2
        if (endIndex === 1) {
          statsRef.output1++
          queueRef.queue1++
          if (particle.color === '#ef4444') statsRef.correct++
        } else {
          statsRef.output2++
          queueRef.queue2++
          if (particle.color === '#3b82f6') statsRef.correct++
        }
        statsRef.total++
        return null
      }
      
      if (block.type === 'condition') {
        let result = false
        switch (block.conditionType) {
          case 'checkRed':
            result = particle.color === '#ef4444'
            break
          case 'checkBlue':
            result = particle.color === '#3b82f6'
            break
          case 'queueCompare':
            result = queueRef.queue1 < queueRef.queue2
            break
          case 'random':
            result = Math.random() < 0.5
            break
        }
        return result ? block.connections.yes || null : block.connections.no || null
      }
      
      if (block.type === 'action') {
        switch (block.actionType) {
          case 'counter':
            counterRef.value++
            break
          case 'output1':
            return 'end1'
          case 'output2':
            return 'end2'
        }
        return block.connections.next || null
      }
      
      return null
    }
    
    // 逐个处理粒子
    let currentIndex = 0
    const processNext = () => {
      if (currentIndex >= particles.length) {
        // 所有粒子处理完成
        setTesting(false)
        setStats(statsRef)
        setShowResult(true)
        
        // 判断是否成功：准确率>=80%，负载差异<=30%
        const accuracy = statsRef.total > 0 ? statsRef.correct / statsRef.total : 0
        const loadDiff = Math.abs(statsRef.output1 - statsRef.output2) / statsRef.total
        const isSuccess = accuracy >= 0.8 && loadDiff <= 0.3
        setSuccess(isSuccess)
        
        return
      }
      
      const particle = particles[currentIndex]
      let currentBlockId = particle.currentBlockId
      let steps = 0
      const maxSteps = 50 // 防止无限循环
      
      while (currentBlockId && steps < maxSteps) {
        const nextBlockId = executeLogic({ ...particle, currentBlockId })
        if (!nextBlockId) break
        currentBlockId = nextBlockId
        steps++
      }
      
      currentIndex++
      setTimeout(processNext, 100)
    }
    
    processNext()
  }

  const handleReset = () => {
    setPlacedBlocks([
      { id: 'start', type: 'start', x: 150, y: 50, connections: {} },
      { id: 'end1', type: 'end', x: 400, y: 300, connections: {} },
      { id: 'end2', type: 'end', x: 400, y: 450, connections: {} }
    ])
    setStats({ output1: 0, output2: 0, correct: 0, total: 0 })
    setShowResult(false)
  }

  return (
    <div className="level4-hidden-overlay" onClick={onClose}>
      <div className="level4-hidden-modal" onClick={e => e.stopPropagation()} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <button className="level4-hidden-close" onClick={onClose}>×</button>
        
        <div className="level4-hidden-header">
          <h2>🔬 隐藏关卡：构建智能路由器</h2>
          <p>拖动逻辑块构建一个能正确分类红蓝方块并平衡负载的路由器</p>
        </div>
        
        {/* 引导提示 */}
        {showGuide && (
          <div className="level4-hidden-guide-overlay">
            <div className="level4-hidden-guide-content">
              {guideStep === 0 && (
                <>
                  <div className="level4-hidden-guide-icon">💡</div>
                  <h3>欢迎来到隐藏关卡！</h3>
                  <p>在这里，你需要使用逻辑块构建一个智能路由器</p>
                  <ul>
                    <li>从左侧拖动逻辑块到画布</li>
                    <li>点击节点的连接点，拖动到另一个节点完成连接</li>
                    <li>点击连接线可以删除连接</li>
                    <li>将节点拖回左侧栏可以删除节点</li>
                  </ul>
                  <button className="level4-hidden-guide-btn" onClick={() => setGuideStep(1)}>
                    下一步 →
                  </button>
                </>
              )}
              {guideStep === 1 && (
                <>
                  <div className="level4-hidden-guide-icon">🎯</div>
                  <h3>通关目标</h3>
                  <p>构建一个路由器，使其满足以下条件：</p>
                  <ul>
                    <li><strong>准确率 ≥ 80%</strong>：红色方块到输出1，蓝色方块到输出2</li>
                    <li><strong>负载差异 ≤ 30%</strong>：两个输出的数量要相对平衡</li>
                  </ul>
                  <p className="level4-hidden-guide-hint">
                    💡 提示：使用"颜色==红?"条件块可以判断方块颜色
                  </p>
                  <button className="level4-hidden-guide-btn" onClick={() => setShowGuide(false)}>
                    开始挑战！
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="level4-hidden-content">
          {/* 左侧：逻辑块库 */}
          <div 
            ref={libraryRef}
            className={`level4-hidden-library ${isOverDeleteZone ? 'delete-zone' : ''}`}
          >
            <h3>逻辑块库</h3>
            
            <div className="level4-hidden-category">
              <div className="level4-hidden-category-title">条件块</div>
              <div 
                className="level4-hidden-lib-block condition"
                onMouseDown={(e) => handleLibraryBlockMouseDown(e, 'condition', 'checkRed')}
              >
                <div className="level4-hidden-block-icon">◆</div>
                <div className="level4-hidden-block-text">颜色==红?</div>
              </div>
              <div 
                className="level4-hidden-lib-block condition"
                onMouseDown={(e) => handleLibraryBlockMouseDown(e, 'condition', 'checkBlue')}
              >
                <div className="level4-hidden-block-icon">◆</div>
                <div className="level4-hidden-block-text">颜色==蓝?</div>
              </div>
              <div 
                className="level4-hidden-lib-block condition"
                onMouseDown={(e) => handleLibraryBlockMouseDown(e, 'condition', 'queueCompare')}
              >
                <div className="level4-hidden-block-icon">◆</div>
                <div className="level4-hidden-block-text">队列1&lt;队列2?</div>
              </div>
            </div>
            
            <div className="level4-hidden-category">
              <div className="level4-hidden-category-title">动作块</div>
              <div 
                className="level4-hidden-lib-block action"
                onMouseDown={(e) => handleLibraryBlockMouseDown(e, 'action', undefined, 'output1')}
              >
                <div className="level4-hidden-block-icon">▭</div>
                <div className="level4-hidden-block-text">→输出1</div>
              </div>
              <div 
                className="level4-hidden-lib-block action"
                onMouseDown={(e) => handleLibraryBlockMouseDown(e, 'action', undefined, 'output2')}
              >
                <div className="level4-hidden-block-icon">▭</div>
                <div className="level4-hidden-block-text">→输出2</div>
              </div>
            </div>
            
            {isOverDeleteZone && (
              <div className="level4-hidden-delete-hint">
                🗑️ 松开鼠标删除节点
              </div>
            )}
            
            <div className="level4-hidden-hint">
              <strong>操作提示：</strong>
              <ul>
                <li>拖动节点到画布放置</li>
                <li>点击连接点拖动连线</li>
                <li>点击连线可删除</li>
                <li>拖回左侧栏删除节点</li>
              </ul>
            </div>
          </div>
          
          {/* 中间：画布 */}
          <div className="level4-hidden-canvas-wrapper">
            <div ref={canvasRef} className="level4-hidden-canvas">
              {/* 渲染已放置的块 */}
              {placedBlocks.map(block => (
                <div
                  key={block.id}
                  className={`level4-hidden-placed-block ${block.type}`}
                  style={{
                    left: block.x,
                    top: block.y,
                    background: getBlockColor(block),
                    cursor: (block.type === 'start' || block.type === 'end') ? 'default' : 'move'
                  }}
                  onMouseDown={(e) => handlePlacedBlockMouseDown(e, block.id)}
                  onDoubleClick={() => handleDeleteBlock(block.id)}
                >
                  <div className="level4-hidden-block-label">{getBlockLabel(block)}</div>
                  
                  {/* 连接点 */}
                  {block.type === 'start' && (
                    <div 
                      className="level4-hidden-connector out"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleConnectStart(e, block.id, 'next')
                      }}
                    />
                  )}
                  
                  {block.type === 'condition' && (
                    <>
                      <div 
                        className="level4-hidden-connector out yes"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleConnectStart(e, block.id, 'yes')
                        }}
                        title="是"
                      >Y</div>
                      <div 
                        className="level4-hidden-connector out no"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleConnectStart(e, block.id, 'no')
                        }}
                        title="否"
                      >N</div>
                    </>
                  )}
                  
                  {block.type === 'action' && (
                    <div 
                      className="level4-hidden-connector out"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleConnectStart(e, block.id, 'next')
                      }}
                    />
                  )}
                  
                  {block.type === 'end' && (
                    <div 
                      className="level4-hidden-connector in"
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        handleConnectEnd(e, block.id)
                      }}
                    />
                  )}
                  
                  {(block.type === 'condition' || block.type === 'action') && (
                    <div 
                      className="level4-hidden-connector in"
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        handleConnectEnd(e, block.id)
                      }}
                    />
                  )}
                </div>
              ))}
              
              {/* 渲染连接线 */}
              <svg className="level4-hidden-connections">
                {placedBlocks.map(block => {
                  const lines: JSX.Element[] = []
                  
                  // SVG有inset: -50px，所以需要在所有坐标上加50px偏移
                  const svgOffset = 50
                  
                  // 节点尺寸：80x80
                  // 连接点尺寸：20x20
                  // in点：left: -10px (中心在0), top: 50% (40px), translateY(-50%) (-10px) = 中心在 (0, 30)
                  // out点：right: -10px (中心在80), top: 50% (40px), translateY(-50%) (-10px) = 中心在 (80, 30)
                  // yes点：right: -10px (中心在80), top: 25% (20px), translateY(-50%) (-10px) = 中心在 (80, 10)
                  // no点：right: -10px (中心在80), top: 75% (60px), translateY(-50%) (-10px) = 中心在 (80, 50)
                  
                  if (block.connections.yes) {
                    const target = placedBlocks.find(b => b.id === block.connections.yes)
                    if (target) {
                      const fromX = block.x + 80 + svgOffset
                      const fromY = block.y + 10 + svgOffset
                      const toX = target.x + 0 + svgOffset
                      const toY = target.y + 30 + svgOffset
                      
                      lines.push(
                        <g key={`${block.id}-yes`}>
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke="transparent"
                            strokeWidth="12"
                            strokeLinecap="round"
                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                            onClick={(e) => handleDeleteConnection(block.id, 'yes', e)}
                          />
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead-green)"
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      )
                    }
                  }
                  
                  if (block.connections.no) {
                    const target = placedBlocks.find(b => b.id === block.connections.no)
                    if (target) {
                      const fromX = block.x + 80 + svgOffset
                      const fromY = block.y + 50 + svgOffset
                      const toX = target.x + 0 + svgOffset
                      const toY = target.y + 30 + svgOffset
                      
                      lines.push(
                        <g key={`${block.id}-no`}>
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke="transparent"
                            strokeWidth="12"
                            strokeLinecap="round"
                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                            onClick={(e) => handleDeleteConnection(block.id, 'no', e)}
                          />
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead-red)"
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      )
                    }
                  }
                  
                  if (block.connections.next) {
                    const target = placedBlocks.find(b => b.id === block.connections.next)
                    if (target) {
                      const fromX = block.x + 80 + svgOffset
                      const fromY = block.y + 30 + svgOffset
                      const toX = target.x + 0 + svgOffset
                      const toY = target.y + 30 + svgOffset
                      
                      lines.push(
                        <g key={`${block.id}-next`}>
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke="transparent"
                            strokeWidth="12"
                            strokeLinecap="round"
                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                            onClick={(e) => handleDeleteConnection(block.id, 'next', e)}
                          />
                          <line
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
                            y2={toY}
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead-blue)"
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      )
                    }
                  }
                  
                  return lines
                })}
                
                {/* 正在拖动的连接线预览 */}
                {draggingLine && (
                  (() => {
                    const fromBlock = placedBlocks.find(b => b.id === draggingLine.fromBlockId)
                    if (!fromBlock) return null
                    
                    const svgOffset = 50
                    let fromX = fromBlock.x + 80 + svgOffset
                    let fromY = fromBlock.y + 30 + svgOffset
                    
                    if (draggingLine.fromType === 'yes') {
                      fromY = fromBlock.y + 10 + svgOffset
                    } else if (draggingLine.fromType === 'no') {
                      fromY = fromBlock.y + 50 + svgOffset
                    }
                    
                    if (!canvasRef.current) return null
                    const rect = canvasRef.current.getBoundingClientRect()
                    const toX = draggingLine.mouseX - rect.left + svgOffset
                    const toY = draggingLine.mouseY - rect.top + svgOffset
                    
                    return (
                      <line
                        x1={fromX}
                        y1={fromY}
                        x2={toX}
                        y2={toY}
                        stroke="#4ade80"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="6 3"
                        style={{ pointerEvents: 'none' }}
                      />
                    )
                  })()
                )}
                
                <defs>
                  <marker
                    id="arrowhead-green"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                  </marker>
                  <marker
                    id="arrowhead-red"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                  </marker>
                  <marker
                    id="arrowhead-blue"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                </defs>
              </svg>
            </div>
            
            <div className="level4-hidden-canvas-controls">
              <button className="level4-hidden-btn test" onClick={handleTest} disabled={testing}>
                {testing ? '测试中...' : '🧪 测试'}
              </button>
              <button className="level4-hidden-btn reset" onClick={handleReset}>
                🔄 重置
              </button>
              <button className="level4-hidden-btn guide" onClick={() => { setShowGuide(true); setGuideStep(0); }}>
                💡 查看引导
              </button>
            </div>
          </div>
          
          {/* 右侧：测试结果 */}
          <div className="level4-hidden-results">
            <h3>测试结果</h3>
            
            {showResult ? (
              <div className={`level4-hidden-result-panel ${success ? 'success' : 'fail'}`}>
                <div className="level4-hidden-result-icon">
                  {success ? '✅' : '❌'}
                </div>
                <div className="level4-hidden-result-title">
                  {success ? '通关成功！' : '未达标'}
                </div>
                
                <div className="level4-hidden-stats">
                  <div className="level4-hidden-stat-item">
                    <span className="level4-hidden-stat-label">输出1：</span>
                    <span className="level4-hidden-stat-value">{stats.output1}</span>
                  </div>
                  <div className="level4-hidden-stat-item">
                    <span className="level4-hidden-stat-label">输出2：</span>
                    <span className="level4-hidden-stat-value">{stats.output2}</span>
                  </div>
                  <div className="level4-hidden-stat-item">
                    <span className="level4-hidden-stat-label">准确率：</span>
                    <span className="level4-hidden-stat-value">
                      {stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="level4-hidden-stat-item">
                    <span className="level4-hidden-stat-label">负载差异：</span>
                    <span className="level4-hidden-stat-value">
                      {stats.total > 0 ? ((Math.abs(stats.output1 - stats.output2) / stats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
                
                {success && (
                  <div className="level4-hidden-success-msg">
                    恭喜！你成功构建了一个智能路由器！
                  </div>
                )}
              </div>
            ) : (
              <div className="level4-hidden-result-placeholder">
                点击"测试"按钮查看结果
              </div>
            )}
          </div>
        </div>
        
        {/* 拖动预览 */}
        {draggingBlock && (
          <div
            className={`level4-hidden-drag-preview ${draggingBlock.type}`}
            style={{
              left: draggingBlock.mouseX,
              top: draggingBlock.mouseY,
              background: draggingBlock.type === 'condition' ? '#f59e0b' : '#3b82f6'
            }}
          >
            {draggingBlock.type === 'condition' ? '◆' : '▭'}
          </div>
        )}
      </div>
    </div>
  )
}

export default Level4HiddenModal
