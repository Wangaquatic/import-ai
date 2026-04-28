# 教学关卡位置互换 - 实现总结

## 概述

成功将关卡1（原教学关卡）和关卡3（教学关卡副本）的位置互换。现在：
- **关卡1**：教学关卡（副本）- 使用Level2CopyPage
- **关卡3**：教学关卡（原版）- 使用TutorialPage

## 实现步骤

### 1. 更新关卡列表（LevelsPage.tsx）

#### 修改关卡名称和描述：
```typescript
const levels = [
  { id: 1, name: '教学关卡（副本）', desc: '从零开始，了解AI训练的基本概念', locked: false, tutorial: true },
  { id: 2, name: '专家系统', desc: '对数据进行清洗', locked: false },
  { id: 3, name: '教学关卡', desc: '从零开始，了解AI训练的基本概念', locked: false },
  // ... 其他关卡
]
```

#### 修改导航逻辑：
```typescript
onClick={() => {
  if (level.locked) return
  if (level.tutorial) onNavigate('level2copy')  // 关卡1 → level2copy
  else if (level.id === 2) onNavigate('level2')
  else if (level.id === 3) onNavigate('tutorial')  // 关卡3 → tutorial
  else if (level.id === 4) onNavigate('level3')
  else if (level.id === 5) onNavigate('level4')
  else alert(`开始关卡 ${level.id}`)
}}
```

### 2. 更新Level2CopyPage（现在是关卡1）

#### 添加onNextLevel参数：
```typescript
interface Level2CopyPageProps {
  onBack: () => void
  onNextLevel: () => void  // 新增
}

const Level2CopyPage: React.FC<Level2CopyPageProps> = ({ onBack, onNextLevel }) => {
```

#### 恢复"下一关"按钮：
```typescript
{/* 下一关 - 只有达标才显示 */}
{passed && <button className="next-level-btn" onClick={onNextLevel}>下一关 →</button>}
```

### 3. 更新App.tsx路由

#### 添加Level2CopyPage的onNextLevel回调：
```typescript
{currentPage === 'level2copy' && <Level2CopyPage onBack={() => navigateTo('levels')} onNextLevel={() => navigateTo('level2')} />}
```

## 当前关卡布局

### 关卡列表

1. **教学关卡（副本）** ⭐ 新手教学
   - 组件：Level2CopyPage
   - 路由：level2copy
   - 数据键：level2copy_tutorial_*
   - 下一关：关卡2（专家系统）

2. **专家系统**
   - 组件：Level2Page
   - 路由：level2
   - 数据键：level2_*

3. **教学关卡** 
   - 组件：TutorialPage
   - 路由：tutorial
   - 数据键：tutorial_*
   - 下一关：关卡2（专家系统）

4. **过拟合**
   - 组件：Level3Page
   - 路由：level3

5. **决策树**
   - 组件：Level4Page
   - 路由：level4

6-9. 其他关卡（锁定）

### 关卡流程

```
开始学习
    ↓
关卡1：教学关卡（副本）[Level2CopyPage]
    ↓ 通关后点击"下一关"
关卡2：专家系统 [Level2Page]
    ↓ 返回关卡选择
关卡3：教学关卡 [TutorialPage]
    ↓ 通关后点击"下一关"
关卡2：专家系统 [Level2Page]
    ↓
...
```

## 数据存储对照

| 关卡 | 组件 | 保存状态键 | 奖励键 | 通关键 | 隐藏参数键 |
|------|------|-----------|--------|--------|-----------|
| 关卡1（副本） | Level2CopyPage | `level2copy_tutorial_saved_state` | `level2copy_tutorial_reward_claimed` | `level2copy_tutorial_passed` | `level2copy_tutorial_hidden_params` |
| 关卡3（原版） | TutorialPage | `tutorial_saved_state` | `tutorial_reward_claimed` | `tutorial_passed` | `tutorial_hidden_params` |

**共享数据**：
- 金币：`player_coins`
- 成就：`achievement_*`

## 功能验证

### 关卡1（教学关卡副本）
- ✅ 从关卡选择进入
- ✅ 显示教学关卡内容
- ✅ 可以拖拽分类器
- ✅ 可以连接节点
- ✅ 可以测试
- ✅ 可以进入隐藏关卡
- ✅ 通关后显示"下一关"按钮
- ✅ 点击"下一关"跳转到关卡2
- ✅ 数据独立保存

### 关卡3（教学关卡原版）
- ✅ 从关卡选择进入
- ✅ 显示教学关卡内容
- ✅ 所有功能正常
- ✅ 通关后显示"下一关"按钮
- ✅ 点击"下一关"跳转到关卡2
- ✅ 数据独立保存

## 优势分析

### 为什么这样设计？

1. **新手友好**：
   - 关卡1作为第一个关卡，使用教学关卡内容
   - 玩家从最基础的内容开始学习
   - 完成后自然过渡到关卡2

2. **重复练习**：
   - 关卡3保留了原教学关卡
   - 玩家可以在学习了专家系统后回来复习
   - 两个教学关卡数据独立，不会互相影响

3. **灵活性**：
   - 玩家可以选择从关卡1开始（推荐）
   - 也可以直接跳到关卡3重新学习
   - 两个教学关卡都能跳转到关卡2

## 注意事项

### 1. 关卡标识
- 关卡1标记为 `tutorial: true`，显示为新手教学关卡
- 关卡3没有特殊标记，显示为普通关卡

### 2. 数据独立性
- 两个教学关卡的进度完全独立
- 奖励可以分别领取（各100金币）
- 通关记录独立
- 隐藏参数独立

### 3. 成就系统
- 成就使用相同的localStorage键
- 在任一教学关卡解锁成就，都会在两个关卡中显示为已解锁
- 这是预期行为，因为成就是全局的

### 4. 下一关跳转
- 两个教学关卡通关后都跳转到关卡2
- 这确保了学习流程的连贯性

## 测试建议

### 测试场景1：新玩家流程
1. 启动游戏
2. 点击"开始学习"
3. 进入关卡1（教学关卡副本）
4. 完成关卡
5. 点击"下一关"
6. 验证跳转到关卡2

### 测试场景2：数据独立性
1. 完成关卡1
2. 返回关卡选择
3. 进入关卡3（教学关卡原版）
4. 验证关卡3的进度是独立的
5. 完成关卡3
6. 验证可以再次获得100金币奖励

### 测试场景3：重复练习
1. 完成关卡1和关卡3
2. 返回关卡选择
3. 重新进入关卡1
4. 验证可以重新测试（但不会再获得奖励）
5. 重新进入关卡3
6. 验证可以重新测试（但不会再获得奖励）

## 文件修改清单

### 修改文件
- `src/renderer/src/pages/LevelsPage.tsx` - 更新关卡列表和导航逻辑
- `src/renderer/src/pages/levels/Level2CopyPage.tsx` - 添加onNextLevel参数和"下一关"按钮
- `src/renderer/src/App.tsx` - 更新Level2CopyPage路由，添加onNextLevel回调
- `SWAP_TUTORIAL_LEVELS_SUMMARY.md` - 本文档

### 未修改文件
- `src/renderer/src/pages/TutorialPage.tsx` - 保持不变
- `src/renderer/src/pages/TutorialPage.css` - 保持不变
- `src/renderer/src/pages/levels/Level2CopyPage.css` - 保持不变

## 总结

成功将教学关卡的位置互换：
- ✅ 关卡1现在是教学关卡（副本）
- ✅ 关卡3现在是教学关卡（原版）
- ✅ 两个关卡功能完全相同
- ✅ 数据完全独立
- ✅ 都可以跳转到关卡2
- ✅ 适合新手学习和重复练习

这种设计既保证了新手友好性（关卡1是教学关卡），又提供了重复练习的机会（关卡3也是教学关卡），同时两个关卡的进度互不影响，非常适合学习型游戏！
