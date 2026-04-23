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
  const [connectingFrom, setConnectingFrom] = useState<{ blockId: string; type: 'yes' | 'no' | 'next' } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testParticles, setTestParticles] = useState<Particle[]>([])
  const [stats, setStats] = useState({ output1: 0, output2: 0, correct: 0, total: 0 })
  const [showResult, setShowResult] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const canvasRef = useRef<HTMLDivElement>(null)
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
      setDraggingPlacedBlock(null)
    }
  }

  const handleConnectStart = (e: React.MouseEvent, blockId: string, type: 'yes' | 'no' | 'next') => {
    e.stopPropagation()
    setConnectingFrom({ blockId, type })
  }

  const handleConnectEnd = (e: React.MouseEvent, targetBlockId: string) => {
    e.stopPropagation()
    if (!connectingFrom) return
    
    setPlacedBlocks(prev => prev.map(b => {
      if (b.id === connectingFrom.blockId) {
        return {
          ...b,
          connections: {
            ...b.connections,
            [connectingFrom.type]: targetBlockId
          }
        }
      }
      return b
    }))
    
    setConnectingFrom(null)
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
        
        <div className="level4-hidden-content">
          {/* 左侧：逻辑块库 */}
          <div className="level4-hidden-library">
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
            
            <div className="level4-hidden-hint">
              <strong>提示：</strong>
              <ul>
                <li>从"开始"连接到逻辑块</li>
                <li>条件块有"是/否"两个出口</li>
                <li>最终连接到"输出1"或"输出2"</li>
                <li>目标：准确率≥80%，负载差异≤30%</li>
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
                      onClick={(e) => handleConnectStart(e, block.id, 'next')}
                    />
                  )}
                  
                  {block.type === 'condition' && (
                    <>
                      <div 
                        className="level4-hidden-connector out yes"
                        onClick={(e) => handleConnectStart(e, block.id, 'yes')}
                        title="是"
                      >Y</div>
                      <div 
                        className="level4-hidden-connector out no"
                        onClick={(e) => handleConnectStart(e, block.id, 'no')}
                        title="否"
                      >N</div>
                    </>
                  )}
                  
                  {block.type === 'action' && (
                    <div 
                      className="level4-hidden-connector out"
                      onClick={(e) => handleConnectStart(e, block.id, 'next')}
                    />
                  )}
                  
                  {block.type === 'end' && (
                    <div 
                      className="level4-hidden-connector in"
                      onClick={(e) => handleConnectEnd(e, block.id)}
                    />
                  )}
                  
                  {(block.type === 'condition' || block.type === 'action') && (
                    <div 
                      className="level4-hidden-connector in"
                      onClick={(e) => handleConnectEnd(e, block.id)}
                    />
                  )}
                </div>
              ))}
              
              {/* 渲染连接线 */}
              <svg className="level4-hidden-connections">
                {placedBlocks.map(block => {
                  const lines: JSX.Element[] = []
                  
                  if (block.connections.yes) {
                    const target = placedBlocks.find(b => b.id === block.connections.yes)
                    if (target) {
                      lines.push(
                        <line
                          key={`${block.id}-yes`}
                          x1={block.x + 80 + 50}
                          y1={block.y + 25 + 50}
                          x2={target.x + 50}
                          y2={target.y + 40 + 50}
                          stroke="#10b981"
                          strokeWidth="3"
                          markerEnd="url(#arrowhead)"
                        />
                      )
                    }
                  }
                  
                  if (block.connections.no) {
                    const target = placedBlocks.find(b => b.id === block.connections.no)
                    if (target) {
                      lines.push(
                        <line
                          key={`${block.id}-no`}
                          x1={block.x + 80 + 50}
                          y1={block.y + 55 + 50}
                          x2={target.x + 50}
                          y2={target.y + 40 + 50}
                          stroke="#ef4444"
                          strokeWidth="3"
                          markerEnd="url(#arrowhead)"
                        />
                      )
                    }
                  }
                  
                  if (block.connections.next) {
                    const target = placedBlocks.find(b => b.id === block.connections.next)
                    if (target) {
                      lines.push(
                        <line
                          key={`${block.id}-next`}
                          x1={block.x + 80 + 50}
                          y1={block.y + 40 + 50}
                          x2={target.x + 50}
                          y2={target.y + 40 + 50}
                          stroke="#3b82f6"
                          strokeWidth="3"
                          markerEnd="url(#arrowhead)"
                        />
                      )
                    }
                  }
                  
                  return lines
                })}
                
                {/* 正在连接的预览线 */}
                {connectingFrom && canvasRef.current && (
                  <line
                    x1={placedBlocks.find(b => b.id === connectingFrom.blockId)?.x! + 80 + 50}
                    y1={placedBlocks.find(b => b.id === connectingFrom.blockId)?.y! + 40 + 50}
                    x2={placedBlocks.find(b => b.id === connectingFrom.blockId)?.x! + 80 + 50}
                    y2={placedBlocks.find(b => b.id === connectingFrom.blockId)?.y! + 40 + 50}
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                  />
                )}
                
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#666" />
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
              {connectingFrom && (
                <div className="level4-hidden-connecting-hint">
                  正在连线... 点击目标块的输入点完成连接
                </div>
              )}
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
