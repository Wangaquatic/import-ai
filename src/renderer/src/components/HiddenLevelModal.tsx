import React, { useState } from 'react'
import './HiddenLevelModal.css'
import AchievementUnlock from './AchievementUnlock'

interface HiddenLevelModalProps {
  onClose: () => void
  onTrain: (params: TrainingParams) => Promise<number>
  onSave: (params: TrainingParams) => void
  initialParams: TrainingParams
  isConnectionCorrect: boolean // 新增：教学关卡连接是否正确
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

const HiddenLevelModal: React.FC<HiddenLevelModalProps> = ({ onClose, onTrain, onSave, initialParams, isConnectionCorrect }) => {
  const [params, setParams] = useState<TrainingParams>(initialParams)
  const [training, setTraining] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [achievementUnlocked, setAchievementUnlocked] = useState<{name: string, desc: string, icon: string} | null>(null)

  // 右侧可拖动的板块
  const availableBlocks: DraggableBlock[] = [
    { id: 'lr-low', label: '学习率 (learning_rate): 0.001', value: '0.001', type: 'learningRate' },
    { id: 'lr-high', label: '学习率 (learning_rate): 0.1', value: '0.1', type: 'learningRate' },
    { id: 'batch-small', label: '批量大小 (batch_size): 8', value: '8', type: 'batchSize' },
    { id: 'batch-large', label: '批量大小 (batch_size): 32', value: '32', type: 'batchSize' },
    { id: 'epoch-short', label: '训练轮数 (epochs): 5', value: '5', type: 'epochs' },
    { id: 'epoch-long', label: '训练轮数 (epochs): 20', value: '20', type: 'epochs' },
    { id: 'opt-adam', label: '优化器 (optimizer): Adam', value: 'Adam', type: 'optimizer' },
    { id: 'opt-rmsprop', label: '优化器 (optimizer): RMSprop', value: 'RMSprop', type: 'optimizer' }
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
    
    onClose()
  }

  const handleTrain = async () => {
    setTraining(true)
    setAccuracy(null)
    
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
          icon: '🔬'
        })
      }, 500)
    } else {
      console.log('❌ 不满足解锁条件')
      if (result < 94.5) console.log('  - 准确率不足:', result, '< 94.5')
      if (!isConnectionCorrect) console.log('  - 连接错误')
      if (alreadyUnlocked) console.log('  - 已经解锁过了')
    }
  }

  return (
    <div className="hidden-modal-overlay" onClick={onClose}>
      <div className="hidden-modal" onClick={e => e.stopPropagation()}>
        <button className="hidden-modal-close" onClick={onClose}>×</button>
        
        <div className="hidden-modal-content">
          {/* 左侧：伪代码 */}
          <div className="pseudocode-panel">
            <div className="panel-header">
              <h3 className="panel-title">🔬 分类器核心代码</h3>
              <button className="help-btn" onClick={() => setShowHelp(true)} title="玩法说明">
                ℹ️
              </button>
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
                  {training ? '训练中...' : '🚀 测试训练'}
                </button>
                <button 
                  className="save-btn"
                  onClick={handleSave}
                >
                  💾 保存并应用
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
                    <strong>保存并应用</strong>
                    <p>找到最优参数后，点击"保存并应用"，这些参数会影响教学关卡的实际测试结果！</p>
                  </div>
                </div>

                <div className="help-divider"></div>

                <div className="help-tips">
                  <div className="help-tips-title">💡 优化提示</div>
                  <ul>
                    <li><strong>学习率</strong>：过小收敛慢，过大不稳定，0.1 较优</li>
                    <li><strong>批量大小</strong>：32 能平衡训练速度和稳定性</li>
                    <li><strong>训练轮数</strong>：20 轮能充分学习数据特征</li>
                    <li><strong>优化器</strong>：Adam 自适应学习率，效果最佳</li>
                  </ul>
                </div>

                <div className="help-goal">
                  <strong>🎯 目标：</strong>调整参数使准确率达到最高值 95%，然后应用到教学关卡中获得更高的分类正确率！
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
    </div>
  )
}

export default HiddenLevelModal
