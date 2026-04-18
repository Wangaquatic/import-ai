import React, { useState } from 'react'
import './Level2HiddenModal.css'
import AchievementUnlock from './AchievementUnlock'

interface Level2HiddenModalProps {
  onClose: () => void
  onTrain: (params: ExpertSystemParams) => Promise<number>
  onSave: (params: ExpertSystemParams) => void
  initialParams: ExpertSystemParams
  currentColorMode: 'red' | 'green' | 'blue'
}

export interface ExpertSystemParams {
  confidenceThreshold: number
  ruleWeight: number
  filterStrength: number
  decisionMode: string
}

interface DraggableBlock {
  id: string
  label: string
  value: string
  type: 'confidenceThreshold' | 'ruleWeight' | 'filterStrength' | 'decisionMode'
}

const Level2HiddenModal: React.FC<Level2HiddenModalProps> = ({ 
  onClose, 
  onTrain, 
  onSave, 
  initialParams,
  currentColorMode 
}) => {
  const [params, setParams] = useState<ExpertSystemParams>(initialParams)
  const [training, setTraining] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [achievementUnlocked, setAchievementUnlocked] = useState<{name: string, desc: string, icon: string} | null>(null)

  // 右侧可拖动的板块
  const availableBlocks: DraggableBlock[] = [
    { id: 'conf-low', label: '置信度阈值: 0.5', value: '0.5', type: 'confidenceThreshold' },
    { id: 'conf-high', label: '置信度阈值: 0.9', value: '0.9', type: 'confidenceThreshold' },
    { id: 'weight-low', label: '规则权重: 0.3', value: '0.3', type: 'ruleWeight' },
    { id: 'weight-high', label: '规则权重: 0.8', value: '0.8', type: 'ruleWeight' },
    { id: 'filter-weak', label: '过滤强度: 0.4', value: '0.4', type: 'filterStrength' },
    { id: 'filter-strong', label: '过滤强度: 0.95', value: '0.95', type: 'filterStrength' },
    { id: 'mode-strict', label: '决策模式: Strict', value: 'Strict', type: 'decisionMode' },
    { id: 'mode-balanced', label: '决策模式: Balanced', value: 'Balanced', type: 'decisionMode' }
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
      [targetType]: targetType === 'decisionMode' ? block.value : parseFloat(block.value)
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
    
    onClose()
  }

  const handleTrain = async () => {
    setTraining(true)
    setAccuracy(null)
    
    console.log('🚀 开始专家系统训练测试...')
    console.log('📋 当前参数:', params)
    console.log('🎨 当前颜色模式:', currentColorMode)
    
    // 模拟训练过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const result = await onTrain(params)
    console.log('📊 训练结果:', result)
    
    setAccuracy(result)
    setTraining(false)
    
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

  return (
    <div className="hidden-modal-overlay" onClick={onClose}>
      <div className="hidden-modal level2-hidden" onClick={e => e.stopPropagation()}>
        <button className="hidden-modal-close" onClick={onClose}>×</button>
        
        <div className="hidden-modal-content">
          {/* 左侧：伪代码 */}
          <div className="pseudocode-panel">
            <div className="panel-header">
              <h3 className="panel-title">⚙️ 专家系统核心代码</h3>
              <button className="help-btn" onClick={() => setShowHelp(true)} title="玩法说明">
                ℹ️
              </button>
            </div>
            <div className="pseudocode-container">
              <pre className="pseudocode">
{`function expertSystemClassify(data):
    // 初始化专家系统
    rules = loadKnowledgeBase()
    
    // 设置系统参数
    `}<span 
                  className={`editable-param ${dragOverTarget === 'confidenceThreshold' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'confidenceThreshold')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'confidenceThreshold')}
                  onDragLeave={handleDragLeave}
                >
                  confidence_threshold = {params.confidenceThreshold}
                </span>{`
    `}<span 
                  className={`editable-param ${dragOverTarget === 'ruleWeight' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'ruleWeight')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'ruleWeight')}
                  onDragLeave={handleDragLeave}
                >
                  rule_weight = {params.ruleWeight}
                </span>{`
    `}<span 
                  className={`editable-param ${dragOverTarget === 'filterStrength' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'filterStrength')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'filterStrength')}
                  onDragLeave={handleDragLeave}
                >
                  filter_strength = {params.filterStrength}
                </span>{`
    `}<span 
                  className={`editable-param ${dragOverTarget === 'decisionMode' ? 'drag-over' : ''}`}
                  onDrop={(e) => handleDrop(e, 'decisionMode')}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, 'decisionMode')}
                  onDragLeave={handleDragLeave}
                >
                  decision_mode = "{params.decisionMode}"
                </span>{`
    
    // 分类循环
    results = []
    for item in data:
        // 特征提取
        features = extractFeatures(item)
        
        // 规则匹配
        matched_rules = []
        for rule in rules:
            confidence = rule.match(features)
            if confidence >= confidence_threshold:
                matched_rules.append({
                    rule: rule,
                    confidence: confidence * rule_weight
                })
        
        // 决策推理
        if decision_mode == "Strict":
            decision = strictDecision(matched_rules)
        else:
            decision = balancedDecision(matched_rules)
        
        // 应用过滤器
        if decision.confidence >= filter_strength:
            results.append(decision.category)
        else:
            results.append("uncertain")
    
    return results
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
                  className="save-btn"
                  onClick={handleSave}
                >
                  💾 保存并应用
                </button>
              </div>
              
              {accuracy !== null && (
                <div className={`accuracy-result ${accuracy >= 90 ? 'success' : 'warning'}`}>
                  <span className="accuracy-label">分类准确率:</span>
                  <span className="accuracy-value">{accuracy.toFixed(1)}%</span>
                  {accuracy >= 100 && <span className="accuracy-badge">✨ 完美!</span>}
                  {accuracy >= 90 && accuracy < 100 && <span className="accuracy-badge">👍 优秀</span>}
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
                <strong>置信度阈值</strong>: 规则匹配的最低置信度
              </div>
              <div className="info-item">
                <strong>规则权重</strong>: 规则重要性系数
              </div>
              <div className="info-item">
                <strong>过滤强度</strong>: 结果过滤的严格程度
              </div>
              <div className="info-item">
                <strong>决策模式</strong>: 推理决策的策略
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
                    <strong>保存并应用</strong>
                    <p>找到最优参数后，点击"保存并应用"，这些参数会影响第二关的实际测试结果！</p>
                  </div>
                </div>

                <div className="help-divider"></div>

                <div className="help-tips">
                  <div className="help-tips-title">💡 优化提示</div>
                  <ul>
                    <li><strong>置信度阈值</strong>：0.9 能确保高质量的规则匹配</li>
                    <li><strong>规则权重</strong>：0.8 能充分发挥规则的作用</li>
                    <li><strong>过滤强度</strong>：0.95 能过滤掉不确定的结果</li>
                    <li><strong>决策模式</strong>：Balanced 能平衡准确率和召回率</li>
                  </ul>
                </div>

                <div className="help-goal">
                  <strong>🎯 目标：</strong>调整参数使准确率达到 100%，然后应用到第二关中获得完美的分类效果！
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

export default Level2HiddenModal
