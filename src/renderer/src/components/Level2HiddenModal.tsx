import React, { useState } from 'react'
import './Level2HiddenModal.css'
import AchievementUnlock from './AchievementUnlock'

interface Level2HiddenModalProps {
  onClose: () => void
  onTrain: (params: ExpertSystemParams) => Promise<number>
  onSave: (params: ExpertSystemParams) => void
  initialParams: ExpertSystemParams
  currentColorMode: 'red' | 'green' | 'blue'
  onCoinsUpdate: (newCoins: number) => void
}

export interface ExpertSystemParams {
  confidenceThreshold: number  // 置信度阈值：0.5(低), 0.7(中), 0.9(高)
  ruleWeight: number          // 规则权重：0.3(低), 0.5(中), 0.8(高)
  filterStrength: number      // 过滤强度：0.4(低), 0.7(中), 0.95(高)
}

interface DraggableBlock {
  id: string
  label: string
  value: string
  type: 'confidenceThreshold' | 'ruleWeight' | 'filterStrength'
}

const Level2HiddenModal: React.FC<Level2HiddenModalProps> = ({ 
  onClose, 
  onTrain, 
  onSave, 
  initialParams,
  currentColorMode,
  onCoinsUpdate
}) => {
  const [params, setParams] = useState<ExpertSystemParams>(initialParams)
  const [training, setTraining] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [achievementUnlocked, setAchievementUnlocked] = useState<{name: string, desc: string, icon: string} | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [hasReached100, setHasReached100] = useState(false)
  const [displayCoins, setDisplayCoins] = useState(() => parseInt(localStorage.getItem('player_coins') || '0'))
  const [saved, setSaved] = useState(false)
  const [showFloatingHint, setShowFloatingHint] = useState(false)
  const [showCoinSpentNotice, setShowCoinSpentNotice] = useState(false)
  const [showAlreadyPurchased, setShowAlreadyPurchased] = useState(false)
  const [hasPurchasedAnswer, setHasPurchasedAnswer] = useState(() => {
    const userId = localStorage.getItem('user_id')
    return !!localStorage.getItem(`level2_answer_purchased_${userId}`)
  })

  // 动态生成参数提示（根据当前参数值）
  const generateHints = (): Array<{ param: string; tip: string; effect: string }> => {
    const hints = []
    
    // 置信度阈值提示
    if (params.confidenceThreshold < 0.9) {
      hints.push({
        param: '置信度阈值',
        tip: '💡 试试调高置信度阈值，就像给系统戴上高清眼镜，能更准确地识别数据',
        effect: '📈 调高：识别更准确，但可能漏掉一些边缘数据\n📉 调低：能识别更多数据，但准确性会下降'
      })
    } else {
      hints.push({
        param: '置信度阈值',
        tip: '✅ 置信度阈值已经很高了，保持当前设置即可',
        effect: '📈 调高：识别更准确，但可能漏掉一些边缘数据\n📉 调低：能识别更多数据，但准确性会下降'
      })
    }
    
    // 规则权重提示
    if (params.ruleWeight < 0.8) {
      hints.push({
        param: '规则权重',
        tip: '💡 试试调高规则权重，就像给专家更多话语权，让规则发挥更大作用',
        effect: '📈 调高：系统更相信规则，判断更稳定\n📉 调低：规则影响变小，系统更灵活但可能不稳定'
      })
    } else {
      hints.push({
        param: '规则权重',
        tip: '✅ 规则权重已经很高了，保持当前设置即可',
        effect: '📈 调高：系统更相信规则，判断更稳定\n📉 调低：规则影响变小，系统更灵活但可能不稳定'
      })
    }
    
    // 过滤强度提示
    if (params.filterStrength < 0.95) {
      hints.push({
        param: '过滤强度',
        tip: '💡 试试调高过滤强度，就像设置严格的质检标准，只保留最可靠的结果',
        effect: '📈 调高：结果更可靠，但数量会减少\n📉 调低：能得到更多结果，但质量参差不齐'
      })
    } else {
      hints.push({
        param: '过滤强度',
        tip: '✅ 过滤强度已经很高了，保持当前设置即可',
        effect: '📈 调高：结果更可靠，但数量会减少\n📉 调低：能得到更多结果，但质量参差不齐'
      })
    }
    
    return hints
  }

  const hints = generateHints()
  const currentHint = hints[hintIndex % hints.length]

  // 右侧可拖动的板块（每个参数3个选项）
  const availableBlocks: DraggableBlock[] = [
    { id: 'conf-low', label: '置信度阈值: 0.5', value: '0.5', type: 'confidenceThreshold' },
    { id: 'conf-mid', label: '置信度阈值: 0.7', value: '0.7', type: 'confidenceThreshold' },
    { id: 'conf-high', label: '置信度阈值: 0.9', value: '0.9', type: 'confidenceThreshold' },
    { id: 'weight-low', label: '规则权重: 0.3', value: '0.3', type: 'ruleWeight' },
    { id: 'weight-mid', label: '规则权重: 0.5', value: '0.5', type: 'ruleWeight' },
    { id: 'weight-high', label: '规则权重: 0.8', value: '0.8', type: 'ruleWeight' },
    { id: 'filter-low', label: '过滤强度: 0.4', value: '0.4', type: 'filterStrength' },
    { id: 'filter-mid', label: '过滤强度: 0.7', value: '0.7', type: 'filterStrength' },
    { id: 'filter-high', label: '过滤强度: 0.95', value: '0.95', type: 'filterStrength' }
  ]

  const handleDragStart = (e: React.DragEvent, block: DraggableBlock) => {
    e.dataTransfer.setData('block', JSON.stringify(block))
  }

  const handleDrop = (e: React.DragEvent, targetType: string) => {
    e.preventDefault()
    setDragOverTarget(null)
    const blockData = e.dataTransfer.getData('block')
    if (!blockData) return

    const block: DraggableBlock = JSON.parse(blockData)
    if (block.type !== targetType) return

    setParams(prev => ({
      ...prev,
      [targetType]: parseFloat(block.value)
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent, targetType: string) => {
    e.preventDefault()
    setDragOverTarget(targetType)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverTarget(null)
  }

  const handleSave = (): void => {
    onSave(params)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    
    // 标记第二关隐藏关卡已完成
    const currentCompleted = parseInt(localStorage.getItem('hidden_levels_completed') || '0')
    const level2HiddenDone = localStorage.getItem('level2_hidden_done')
    if (!level2HiddenDone) {
      localStorage.setItem('level2_hidden_done', '1')
      const newCompleted = currentCompleted + 1
      localStorage.setItem('hidden_levels_completed', String(newCompleted))
      
      // 检查是否完成所有隐藏关卡（3个）
      if (newCompleted >= 3 && !localStorage.getItem('achievement_hidden_explorer')) {
        localStorage.setItem('achievement_hidden_explorer', '1')
        setTimeout(() => {
          setAchievementUnlocked({
            name: '隐藏探索者',
            desc: '完成所有隐藏关卡（3/3）',
            icon: '🕵️'
          })
        }, 500)
      }
    }
  }

  const handleApply = (): void => {
    onSave(params)
    onClose()
  }

  const handleTrain = async () => {
    setTraining(true)
    setAccuracy(null)
    setShowFloatingHint(false) // 测试时先隐藏浮动提示
    
    console.log('🚀 开始专家系统训练测试...')
    console.log('📋 当前参数:', params)
    console.log('🎨 当前颜色模式:', currentColorMode)
    
    // 模拟训练过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const result = await onTrain(params)
    console.log('📊 训练结果:', result)
    
    setAccuracy(result)
    setTraining(false)
    
    // 检查是否达到100%
    if (result >= 99.5) {
      setHasReached100(true)
      setShowFloatingHint(false) // 达到100%后隐藏浮动提示
    } else {
      // 未达到100%，延迟显示浮动提示
      setTimeout(() => {
        setShowFloatingHint(true)
      }, 500)
    }
    
    // 检查是否达到最高准确率（100%）并解锁成就
    const alreadyUnlocked = !!localStorage.getItem('achievement_expert_tuner')
    
    if (result >= 99.5 && !alreadyUnlocked) {
      console.log('✅ 达到完美准确率，解锁成就...')
      localStorage.setItem('achievement_expert_tuner', '1')
      setTimeout(() => {
        setAchievementUnlocked({
          name: '专家系统调优师',
          desc: '在第二关隐藏关卡中达到完美准确率（100%）',
          icon: '⚙️'
        })
      }, 500)
    }
  }

  const handleShowNextHint = (): void => {
    setShowHint(true)
    setShowFloatingHint(false) // 点击灯泡后隐藏浮动提示
    // 每次打开时自动切换到下一个提示
    setHintIndex((prev) => (prev + 1) % 3)
  }

  const handleShowAnswer = (): void => {
    // 检查是否已经购买过
    if (hasPurchasedAnswer) {
      setShowHint(false)
      setShowAlreadyPurchased(true)
      setTimeout(() => setShowAlreadyPurchased(false), 3000)
      return
    }
    
    // 检查金币是否足够
    const currentCoins = parseInt(localStorage.getItem('player_coins') || '0')
    if (currentCoins < 50) {
      alert('金币不足！需要 50 金币')
      setShowHint(false)
      return
    }
    
    // 扣除金币
    const newCoins = currentCoins - 50
    const userId = localStorage.getItem('user_id')
    localStorage.setItem('player_coins', String(newCoins))
    localStorage.setItem(`level2_answer_purchased_${userId}`, '1')
    setDisplayCoins(newCoins)
    setHasPurchasedAnswer(true)
    
    // 通知主关卡更新金币显示
    onCoinsUpdate(newCoins)
    
    // 自动设置最优参数
    setParams({
      confidenceThreshold: 0.9,
      ruleWeight: 0.8,
      filterStrength: 0.95
    })
    
    setShowHint(false)
    setShowCoinSpentNotice(true)
    setTimeout(() => setShowCoinSpentNotice(false), 2500)
  }

  return (
    <div className="hidden-modal-overlay" onClick={onClose}>
      <div className="hidden-modal level2-hidden" onClick={e => e.stopPropagation()}>
        <button className="hidden-modal-close" onClick={onClose}>×</button>
        
        <div className="hidden-modal-content">
          {/* 左侧：伪代码 */}
          <div className="pseudocode-panel">
            <div className="panel-header">
              <h3 className="panel-title">⚙️ 专家系统核心代码</h3>
              <div className="header-buttons">
                <div className="hint-button-wrapper">
                  <button className="hint-btn" onClick={handleShowNextHint} title="优化提示">
                    💡
                  </button>
                  {/* 浮动提示箭头 - 在小灯泡旁边 */}
                  {accuracy !== null && accuracy < 99.5 && !hasReached100 && showFloatingHint && (
                    <div className="floating-hint-arrow-beside" onClick={handleShowNextHint}>
                      <div className="arrow-bubble">
                        <span className="bubble-emoji">💡</span>
                        <span className="bubble-text">点我提高正确率！</span>
                      </div>
                    </div>
                  )}
                </div>
                <button className="help-btn" onClick={() => setShowHelp(true)} title="玩法说明">
                  ℹ️
                </button>
              </div>
            </div>
            <div className="pseudocode-container">
              <pre className="pseudocode">
{`function expertSystemClassify(data) {
    // 步骤1：加载知识库
    loadKnowledgeBase()
    
    // 步骤2：设置参数
    `}<span 
                  className={`editable-param ${dragOverTarget === 'confidenceThreshold' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'confidenceThreshold')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'confidenceThreshold')}
                  onDragLeave={handleDragLeave}
                >
                  confidence = {params.confidenceThreshold}
                </span>{` // 置信度（判断严格度）
    `}<span 
                  className={`editable-param ${dragOverTarget === 'ruleWeight' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'ruleWeight')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'ruleWeight')}
                  onDragLeave={handleDragLeave}
                >
                  ruleWeight = {params.ruleWeight}
                </span>{` // 规则权重（重要性）
    `}<span 
                  className={`editable-param ${dragOverTarget === 'filterStrength' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'filterStrength')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'filterStrength')}
                  onDragLeave={handleDragLeave}
                >
                  filterStrength = {params.filterStrength}
                </span>{` // 过滤强度（筛选严格度）
    
    // 步骤3：分类处理
    for each item in data {
        features = extractFeatures(item)  // 提取特征
        matches = matchRules(features)     // 匹配规则
        
        if (matches.score >= confidence) {
            result = applyRules(matches, ruleWeight)  // 应用规则
            
            if (result.reliability >= filterStrength) {
                output(result)  // 输出结果
            } else {
                markAsUncertain(item)  // 标记不确定
            }
        }
    }
    
    // 步骤4：返回结果
    return classificationResults
}
`}</pre>
            </div>
            
            <div className="train-section">
              <div className="button-row">
                <button 
                  className={`train-btn ${training ? 'training' : ''}`}
                  onClick={handleTrain}
                  disabled={training}
                >
                  {training ? '测试中...' : '🚀 测试系统'}
                </button>
                <button 
                  className={`save-btn ${saved ? 'saved' : ''}`}
                  onClick={handleSave}
                >
                  {saved ? '✓ 已保存' : '💾 保存'}
                </button>
                <button 
                  className="apply-btn"
                  onClick={handleApply}
                >
                  ✅ 应用
                </button>
              </div>
              
              <div className="result-container">
                {accuracy !== null && (
                  <div className={`accuracy-result ${accuracy >= 90 ? 'success' : 'warning'}`}>
                    <span className="accuracy-label">分类准确率:</span>
                    <span className="accuracy-value">{accuracy.toFixed(1)}%</span>
                    {accuracy >= 100 && <span className="accuracy-badge">✨ 完美!</span>}
                    {accuracy >= 90 && accuracy < 100 && (
                      <span className="accuracy-badge">👍 优秀</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 优化提示弹窗 */}
          {showHint && (
            <div className="hint-overlay" onClick={() => setShowHint(false)}>
              <div className="hint-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hint-icon">💡</div>
                <div className="hint-coins">🪙 {displayCoins}</div>
                <h3 className="hint-title">{currentHint.param}</h3>
                <div className="hint-content">
                  <div className="hint-tip">
                    <strong>💡 优化建议：</strong>
                    <p>{currentHint.tip}</p>
                  </div>
                  <div className="hint-effect">
                    <strong>📊 参数效果：</strong>
                    <p>{currentHint.effect}</p>
                  </div>
                </div>
                <div className="hint-buttons">
                  <button className="hint-answer-btn" onClick={handleShowAnswer}>
                    🪙 花费50金币查看终极答案
                  </button>
                  <button className="hint-close" onClick={() => setShowHint(false)}>
                    知道了
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 右侧：可拖动板块 */}
          <div className="blocks-panel">
            <h3 className="panel-title">🎛️ 参数调整</h3>
            <div className="blocks-hint">拖动板块到左侧代码中修改参数</div>
            
            <div className="blocks-grid">
              {availableBlocks.map(block => (
                <div
                  key={block.id}
                  className="draggable-block"
                  draggable
                  onDragStart={(e) => handleDragStart(e, block)}
                >
                  {block.label}
                </div>
              ))}
            </div>

            <div className="blocks-info">
              <div className="info-item">
                <strong>置信度阈值</strong>: 规则匹配的最低置信度
              </div>
              <div className="info-item">
                <strong>规则权重</strong>: 规则重要性系数
              </div>
              <div className="info-item">
                <strong>过滤强度</strong>: 结果过滤的严格程度
              </div>
            </div>
          </div>
        </div>

        {/* 玩法说明弹窗 */}
        {showHelp && (
          <div className="help-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-modal" onClick={e => e.stopPropagation()}>
              <h3 className="help-title">🎮 隐藏关卡玩法说明</h3>
              
              <div className="help-content">
                <div className="help-section">
                  <div className="help-step">1️⃣</div>
                  <div className="help-text">
                    <strong>拖动参数板块</strong>
                    <p>从右侧拖动参数板块到左侧代码中的黄色高亮区域，修改专家系统参数。</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-step">2️⃣</div>
                  <div className="help-text">
                    <strong>测试系统效果</strong>
                    <p>点击"测试系统"按钮，查看当前参数组合的分类准确率。</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-step">3️⃣</div>
                  <div className="help-text">
                    <strong>保存和应用</strong>
                    <p>找到最优参数后，点击"保存"保存参数，点击"应用"将参数应用到第二关的实际测试结果！</p>
                  </div>
                </div>

                <div className="help-divider"></div>

                <div className="help-goal">
                  <strong>🎯 目标：</strong>调整参数使准确率达到 100%，然后应用到第二关中获得完美的分类效果！点击左上角的💡按钮可以获取优化提示。
                </div>
              </div>

              <button className="help-close" onClick={() => setShowHelp(false)}>
                知道了
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 成就解锁提示 */}
      {achievementUnlocked && (
        <AchievementUnlock
          name={achievementUnlocked.name}
          desc={achievementUnlocked.desc}
          icon={achievementUnlocked.icon}
          onClose={() => setAchievementUnlocked(null)}
        />
      )}
      
      {/* 金币消费提示 */}
      {showCoinSpentNotice && (
        <div className="coin-spent-notice">
          <div className="coin-spent-content">
            <div className="coin-spent-icon">✨</div>
            <div className="coin-spent-text">已花费 50 金币</div>
            <div className="coin-spent-subtext">最优参数已自动设置</div>
          </div>
        </div>
      )}
      
      {/* 已购买提示 */}
      {showAlreadyPurchased && (
        <div className="coin-spent-notice">
          <div className="coin-spent-content">
            <div className="coin-spent-icon">📋</div>
            <div className="coin-spent-text">已购买过最优参数</div>
            <div className="purchased-params">
              <div className="param-item">confidence = 0.9</div>
              <div className="param-item">ruleWeight = 0.8</div>
              <div className="param-item">filterStrength = 0.95</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Level2HiddenModal
