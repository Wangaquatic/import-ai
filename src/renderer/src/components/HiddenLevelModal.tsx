import React, { useState } from 'react'
import './HiddenLevelModal.css'
import AchievementUnlock from './AchievementUnlock'

interface HiddenLevelModalProps {
  onClose: () => void
  onTrain: (params: TrainingParams) => Promise<number>
  onSave: (params: TrainingParams) => void
  initialParams: TrainingParams
  isConnectionCorrect: boolean // 新增：教学关卡连接是否正确
  onCoinsUpdate: (newCoins: number) => void
}

export interface TrainingParams {
  learningRate: number
  batchSize: number
  epochs: number
  optimizer: string
}

interface DraggableBlock {
  id: string
  label: string
  value: string
  type: 'learningRate' | 'batchSize' | 'epochs' | 'optimizer'
}

const HiddenLevelModal: React.FC<HiddenLevelModalProps> = ({ onClose, onTrain, onSave, initialParams, isConnectionCorrect, onCoinsUpdate }) => {
  const [params, setParams] = useState<TrainingParams>(initialParams)
  const [training, setTraining] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [achievementUnlocked, setAchievementUnlocked] = useState<{name: string, desc: string, icon: string} | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [hasReached95, setHasReached95] = useState(false)
  const [displayCoins, setDisplayCoins] = useState(() => parseInt(localStorage.getItem('player_coins') || '0'))
  const [showFloatingHint, setShowFloatingHint] = useState(false)
  const [showCoinSpentNotice, setShowCoinSpentNotice] = useState(false)
  const [showAlreadyPurchased, setShowAlreadyPurchased] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasPurchasedAnswer, setHasPurchasedAnswer] = useState(() => {
    const userId = localStorage.getItem('user_id')
    return !!localStorage.getItem(`tutorial_answer_purchased_${userId}`)
  })

  // 右侧可拖动的板块
  const allBlocks: DraggableBlock[] = [
    { id: 'lr-low', label: '学习率 (learning_rate): 0.001', value: '0.001', type: 'learningRate' },
    { id: 'lr-high', label: '学习率 (learning_rate): 0.1', value: '0.1', type: 'learningRate' },
    { id: 'batch-small', label: '批量大小 (batch_size): 8', value: '8', type: 'batchSize' },
    { id: 'batch-large', label: '批量大小 (batch_size): 32', value: '32', type: 'batchSize' },
    { id: 'epoch-short', label: '训练轮数 (epochs): 5', value: '5', type: 'epochs' },
    { id: 'epoch-long', label: '训练轮数 (epochs): 20', value: '20', type: 'epochs' },
    { id: 'opt-adam', label: '优化器 (optimizer): Adam', value: 'Adam', type: 'optimizer' },
    { id: 'opt-rmsprop', label: '优化器 (optimizer): RMSprop', value: 'RMSprop', type: 'optimizer' }
  ]

  // 过滤掉已经使用的板块（当前参数值对应的板块）
  const availableBlocks = allBlocks.filter(block => {
    const currentValue = params[block.type]
    const blockValue = block.type === 'optimizer' ? block.value : parseFloat(block.value)
    return currentValue !== blockValue
  })

  // 动态生成参数提示（根据当前参数值）
  const generateHints = (): Array<{ param: string; tip: string; effect: string }> => {
    const hints: Array<{ param: string; tip: string; effect: string }> = []
    
    // 学习率提示
    if (params.learningRate < 0.1) {
      hints.push({
        param: '学习率',
        tip: '💡 试试调高学习率，就像加快学习速度，能更快地找到最优解',
        effect: '📈 调高：收敛更快，但可能不稳定\n📉 调低：更稳定，但收敛很慢'
      })
    } else {
      hints.push({
        param: '学习率',
        tip: '✅ 学习率已经很高了，保持当前设置即可',
        effect: '📈 调高：收敛更快，但可能不稳定\n📉 调低：更稳定，但收敛很慢'
      })
    }
    
    // 批量大小提示
    if (params.batchSize < 32) {
      hints.push({
        param: '批量大小',
        tip: '💡 试试调高批量大小，就像一次处理更多数据，能提高训练稳定性',
        effect: '📈 调高：训练更稳定，速度更快\n📉 调低：更新更频繁，但可能不稳定'
      })
    } else {
      hints.push({
        param: '批量大小',
        tip: '✅ 批量大小已经很高了，保持当前设置即可',
        effect: '📈 调高：训练更稳定，速度更快\n📉 调低：更新更频繁，但可能不稳定'
      })
    }
    
    // 训练轮数提示
    if (params.epochs < 20) {
      hints.push({
        param: '训练轮数',
        tip: '💡 试试调高训练轮数，就像多练习几次，能更充分地学习数据特征',
        effect: '📈 调高：学习更充分，准确率更高\n📉 调低：训练时间短，但可能欠拟合'
      })
    } else {
      hints.push({
        param: '训练轮数',
        tip: '✅ 训练轮数已经很高了，保持当前设置即可',
        effect: '📈 调高：学习更充分，准确率更高\n📉 调低：训练时间短，但可能欠拟合'
      })
    }
    
    // 优化器提示
    if (params.optimizer !== 'Adam') {
      hints.push({
        param: '优化器',
        tip: '💡 试试使用 Adam 优化器，它能自适应调整学习率，效果最佳',
        effect: '📈 Adam：自适应学习率，收敛快且稳定\n📉 RMSprop：适用于循环神经网络，但不如Adam通用'
      })
    } else {
      hints.push({
        param: '优化器',
        tip: '✅ 优化器已经是最优选择了，保持当前设置即可',
        effect: '📈 Adam：自适应学习率，收敛快且稳定\n📉 RMSprop：适用于循环神经网络，但不如Adam通用'
      })
    }
    
    return hints
  }

  const hints = generateHints()
  const currentHint = hints[hintIndex % hints.length]

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
      [targetType]: targetType === 'optimizer' ? block.value : parseFloat(block.value)
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

  const handleSave = () => {
    onSave(params)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    
    // 标记教学关卡隐藏关卡已完成
    const currentCompleted = parseInt(localStorage.getItem('hidden_levels_completed') || '0')
    const tutorialHiddenDone = localStorage.getItem('tutorial_hidden_done')
    if (!tutorialHiddenDone) {
      localStorage.setItem('tutorial_hidden_done', '1')
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

  const handleApply = () => {
    onSave(params)
    onClose()
  }

  const handleTrain = async () => {
    setTraining(true)
    setAccuracy(null)
    setShowFloatingHint(false) // 测试时先隐藏浮动提示
    
    console.log('🚀 开始训练测试...')
    console.log('📋 当前参数:', params)
    console.log('🔗 连接状态:', isConnectionCorrect)
    
    // 模拟训练过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    let result = await onTrain(params)
    console.log('📊 训练结果（原始）:', result)
    
    // 如果教学关卡连接错误，准确率应该很低（反转）
    if (!isConnectionCorrect) {
      result = 100 - result // 连接错误时，准确率反转
      console.log('⚠️ 连接错误，准确率已反转:', result)
    }
    
    setAccuracy(result)
    setTraining(false)
    
    // 检查是否达到95%
    if (result >= 94.5) {
      setHasReached95(true)
      setShowFloatingHint(false) // 达到95%后隐藏浮动提示
    } else {
      // 未达到95%，延迟显示浮动提示
      setTimeout(() => {
        setShowFloatingHint(true)
      }, 500)
    }
    
    // 调试信息
    const alreadyUnlocked = !!localStorage.getItem('achievement_param_master')
    const meetsRequirement = result >= 94.5 && isConnectionCorrect
    
    console.log('🔍 成就检查:', {
      准确率: result,
      连接正确: isConnectionCorrect,
      已解锁: alreadyUnlocked,
      满足条件: meetsRequirement,
      '准确率>=94.5': result >= 94.5,
      '连接状态': isConnectionCorrect,
      '未解锁': !alreadyUnlocked
    })
    
    // 检查是否达到最高准确率（95%）并解锁成就
    // 只有在连接正确的情况下才能解锁成就
    // 使用 >= 94.5 来处理浮点数精度问题
    if (result >= 94.5 && isConnectionCorrect && !alreadyUnlocked) {
      console.log('✅ 满足所有条件，准备解锁成就...')
      localStorage.setItem('achievement_param_master', '1')
      console.log('💾 已保存到localStorage:', localStorage.getItem('achievement_param_master'))
      console.log('🎉 成就已解锁：参数调优大师')
      // 显示成就解锁提示
      setTimeout(() => {
        console.log('🎨 显示成就解锁动画...')
        setAchievementUnlocked({
          name: '参数调优大师',
          desc: '在教学关卡隐藏关卡中达到最高正确率（95%）',
          icon: '🎛️'
        })
      }, 500)
    } else {
      console.log('❌ 不满足解锁条件')
      if (result < 94.5) console.log('  - 准确率不足:', result, '< 94.5')
      if (!isConnectionCorrect) console.log('  - 连接错误')
      if (alreadyUnlocked) console.log('  - 已经解锁过了')
    }
  }

  const handleShowNextHint = (): void => {
    setShowHint(true)
    setShowFloatingHint(false) // 点击灯泡后隐藏浮动提示
    // 每次打开时自动切换到下一个提示
    setHintIndex((prev) => (prev + 1) % 4)
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
    localStorage.setItem(`tutorial_answer_purchased_${userId}`, '1')
    setDisplayCoins(newCoins)
    setHasPurchasedAnswer(true)
    
    // 通知主关卡更新金币显示
    onCoinsUpdate(newCoins)
    
    // 自动设置最优参数
    setParams({
      learningRate: 0.1,
      batchSize: 32,
      epochs: 20,
      optimizer: 'Adam'
    })
    
    setShowHint(false)
    setShowCoinSpentNotice(true)
    setTimeout(() => setShowCoinSpentNotice(false), 2500)
  }

  return (
    <div className="hidden-modal-overlay" onClick={onClose}>
      <div className="hidden-modal" onClick={e => e.stopPropagation()}>
        <button className="hidden-modal-close" onClick={onClose}>×</button>
        
        <div className="hidden-modal-content">
          {/* 左侧：伪代码 */}
          <div className="pseudocode-panel">
            <div className="panel-header">
              <h3 className="panel-title">🎛️ 分类器核心代码</h3>
              <div className="header-buttons">
                <div className="hint-button-wrapper">
                  <button className="hint-btn" onClick={handleShowNextHint} title="优化提示">
                    💡
                  </button>
                  {/* 浮动提示箭头 - 在小灯泡旁边 */}
                  {accuracy !== null && accuracy < 94.5 && !hasReached95 && showFloatingHint && (
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
{`function trainClassifier(data):
    // 初始化模型参数
    model = createModel()
    
    // 设置训练超参数
    `}<span 
                  className={`editable-param ${dragOverTarget === 'learningRate' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'learningRate')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'learningRate')}
                  onDragLeave={handleDragLeave}
                >
                  learning_rate = {params.learningRate}  // 学习率
                </span>{`
    `}<span 
                  className={`editable-param ${dragOverTarget === 'batchSize' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'batchSize')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'batchSize')}
                  onDragLeave={handleDragLeave}
                >
                  batch_size = {params.batchSize}  // 批量大小
                </span>{`
    `}<span 
                  className={`editable-param ${dragOverTarget === 'epochs' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'epochs')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'epochs')}
                  onDragLeave={handleDragLeave}
                >
                  epochs = {params.epochs}  // 训练轮数
                </span>{`
    `}<span 
                  className={`editable-param ${dragOverTarget === 'optimizer' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'optimizer')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'optimizer')}
                  onDragLeave={handleDragLeave}
                >
                  optimizer = "{params.optimizer}"  // 优化器
                </span>{`
    
    // 训练循环
    for epoch in range(epochs):
        for batch in getBatches(data, batch_size):
            // 前向传播
            predictions = model.forward(batch)
            
            // 计算损失
            loss = crossEntropy(predictions, labels)
            
            // 反向传播
            gradients = model.backward(loss)
            
            // 更新权重
            optimizer.update(model, gradients, learning_rate)
    
    return model
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
              
              {accuracy !== null && (
                <div className={`accuracy-result ${accuracy >= 75 ? 'success' : 'warning'}`}>
                  <span className="accuracy-label">预测准确率:</span>
                  <span className="accuracy-value">{accuracy.toFixed(1)}%</span>
                  {accuracy >= 95 && isConnectionCorrect && <span className="accuracy-badge">✨ 完美!</span>}
                  {accuracy >= 75 && accuracy < 95 && <span className="accuracy-badge">👍 良好</span>}
                  {!isConnectionCorrect && <span className="accuracy-warning">⚠️ 连接错误</span>}
                </div>
              )}
            </div>
          </div>

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
                <strong>学习率</strong>: 控制参数更新步长
              </div>
              <div className="info-item">
                <strong>批量大小</strong>: 每次训练的样本数
              </div>
              <div className="info-item">
                <strong>训练轮数</strong>: 完整遍历数据集次数
              </div>
              <div className="info-item">
                <strong>优化器</strong>: 权重更新算法
              </div>
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
                    <p>从右侧拖动参数板块到左侧代码中的黄色高亮区域，修改训练参数。</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-step">2️⃣</div>
                  <div className="help-text">
                    <strong>测试训练效果</strong>
                    <p>点击"测试训练"按钮，查看当前参数组合的预测准确率。</p>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-step">3️⃣</div>
                  <div className="help-text">
                    <strong>保存和应用</strong>
                    <p>找到最优参数后，点击"保存"保存参数，点击"应用"将参数应用到教学关卡的实际测试结果！</p>
                  </div>
                </div>

                <div className="help-divider"></div>

                <div className="help-goal">
                  <strong>🎯 目标：</strong>调整参数使准确率达到最高值 95%，然后应用到教学关卡中获得更高的分类正确率！点击左上角的💡按钮可以获取优化提示。
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
              <div className="param-item">learning_rate = 0.1</div>
              <div className="param-item">batch_size = 32</div>
              <div className="param-item">epochs = 20</div>
              <div className="param-item">optimizer = "Adam"</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HiddenLevelModal
