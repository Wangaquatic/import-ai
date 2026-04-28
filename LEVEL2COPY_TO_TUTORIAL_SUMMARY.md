# 关卡3替换为教学关卡 - 实现总结

## 概述

成功将关卡3（原专家系统副本）完全替换为教学关卡的内容。现在关卡3和教学关卡的功能、UI、玩法完全相同，但使用独立的数据存储。

## 实现步骤

### 1. 文件替换

直接用教学关卡的文件覆盖Level2CopyPage：
```bash
Copy-Item "src/renderer/src/pages/TutorialPage.tsx" "src/renderer/src/pages/levels/Level2CopyPage.tsx" -Force
Copy-Item "src/renderer/src/pages/TutorialPage.css" "src/renderer/src/pages/levels/Level2CopyPage.css" -Force
```

### 2. 代码修改

#### Level2CopyPage.tsx 修改：

1. **组件名称和接口**：
   ```typescript
   interface Level2CopyPageProps {
     onBack: () => void
     // 移除了 onNextLevel，因为这是副本关卡
   }
   
   const Level2CopyPage: React.FC<Level2CopyPageProps> = ({ onBack }) => {
   ```

2. **导入路径调整**：
   ```typescript
   import './Level2CopyPage.css'
   import levelBg from '../../assets/level-bg.png'
   import classifierImg from '../../assets/classifier.jpg'
   // ... 其他资源路径从 '../' 改为 '../../'
   ```

3. **CSS类名**：
   ```typescript
   <div ref={pageRef} className="level2copy-tutorial-page" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
   ```

4. **localStorage键名**（确保数据独立）：
   ```typescript
   const SAVE_KEY = 'level2copy_tutorial_saved_state'
   const COINS_KEY = 'player_coins'  // 共享金币
   const TUTORIAL_REWARD_KEY = 'level2copy_tutorial_reward_claimed'
   const TUTORIAL_PASSED_KEY = 'level2copy_tutorial_passed'
   const HIDDEN_PARAMS_KEY = 'level2copy_tutorial_hidden_params'
   ```

5. **移除"下一关"按钮**：
   ```typescript
   {/* {passed && <button className="next-level-btn" onClick={onNextLevel}>下一关 →</button>} */}
   ```

6. **导出名称**：
   ```typescript
   export default Level2CopyPage
   ```

#### Level2CopyPage.css 修改：

- 将所有 `.tutorial-page` 替换为 `.level2copy-tutorial-page`
- 保持所有样式规则不变

### 3. 关卡列表更新

在 `LevelsPage.tsx` 中，关卡3的名称和描述：
```typescript
{ id: 3, name: '专家系统（副本）', desc: '对数据进行清洗', locked: false }
```

建议改为：
```typescript
{ id: 3, name: '教学关卡（副本）', desc: '从零开始，了解AI训练的基本概念', locked: false }
```

## 功能特性

### 完全独立的数据存储

两个教学关卡使用不同的localStorage键，确保：
- ✅ 独立的保存状态
- ✅ 独立的奖励领取记录
- ✅ 独立的通关记录
- ✅ 独立的隐藏关卡参数
- ✅ 共享金币系统（使用相同的 `player_coins` 键）

### 完全相同的功能

副本关卡包含原教学关卡的所有功能：
- ✅ 分类器拖拽系统（从节点库拖出）
- ✅ 连接线绘制
- ✅ 测试动画和粒子系统
- ✅ 准确率计算（75%通关线）
- ✅ 隐藏关卡（参数调优）
  - 学习率调整
  - 批量大小调整
  - 训练轮数调整
  - 优化器选择
- ✅ 金币奖励（100金币）
- ✅ 保存/加载功能
- ✅ 速度控制（0.5x - 2.0x）
- ✅ 计时器
- ✅ 信息按钮（简易版/专业版说明）
- ✅ 测试结果弹窗
- ✅ 成就系统支持
  - 参数调优大师（95%准确率）
  - 反向工程师（连接错误≤10%）

### 与原教学关卡的区别

唯一的区别：
- ❌ **没有"下一关"按钮**（因为这是副本关卡，不在主线流程中）
- ✅ 其他功能完全相同

## 数据存储键对照表

| 功能 | 原教学关卡 | 副本教学关卡 |
|------|-----------|-------------|
| 保存状态 | `tutorial_saved_state` | `level2copy_tutorial_saved_state` |
| 奖励领取 | `tutorial_reward_claimed` | `level2copy_tutorial_reward_claimed` |
| 通关记录 | `tutorial_passed` | `level2copy_tutorial_passed` |
| 隐藏参数 | `tutorial_hidden_params` | `level2copy_tutorial_hidden_params` |
| 金币 | `player_coins` | `player_coins` (共享) |

## 关卡内容

### 主关卡玩法

1. **输入节点**：40张混合图片（红色和蓝色方块各20张）
2. **分类器节点**：从右侧节点库拖出，有2个输出点
3. **目标节点**：
   - 有目标（上方）：应接收红色方块
   - 无目标（下方）：应接收蓝色方块
4. **通关条件**：正确率≥75% 且连接正确

### 隐藏关卡玩法

点击左下角 🔬 按钮进入隐藏关卡：
- **左侧**：分类器核心代码（伪代码）
- **右侧**：可拖动的参数板块
- **参数**：
  - 学习率：0.001 / 0.01 / 0.1（最优）
  - 批量大小：8 / 16 / 32（最优）
  - 训练轮数：5 / 10 / 20（最优）
  - 优化器：SGD / RMSprop / Adam（最优）
- **最高准确率**：95%（最优参数组合）
- **最低准确率**：60%（最差参数组合）

### 准确率计算

- **基础准确率**：75%
- **参数加成**：
  - 学习率 = 0.1：+4%
  - 批量大小 = 32：+4%
  - 训练轮数 = 20：+4%
  - 优化器 = Adam：+8%
- **最优组合**：75% + 20% = 95%
- **连接错误**：准确率反转（95% → 5%）

### 成就系统

可解锁的成就：
1. **参数调优大师** 🔬：隐藏关卡达到95%准确率
2. **反向工程师** 🔄：连接错误时达到≤10%准确率

## 测试验证

✅ 应用成功构建  
✅ 无TypeScript诊断错误  
✅ 关卡选择页面显示关卡3  
✅ 可以独立进入关卡3  
✅ 关卡3显示教学关卡的所有内容  
✅ 数据存储独立，不影响原教学关卡  

## 文件清单

### 修改文件
- `src/renderer/src/pages/levels/Level2CopyPage.tsx` - 完全替换为教学关卡内容
- `src/renderer/src/pages/levels/Level2CopyPage.css` - 完全替换为教学关卡样式
- `LEVEL2COPY_TO_TUTORIAL_SUMMARY.md` - 本文档

### 相关文件
- `src/renderer/src/App.tsx` - 路由配置（已有）
- `src/renderer/src/pages/LevelsPage.tsx` - 关卡列表（已有）

## 使用说明

1. **启动应用**：`npm start`
2. **进入关卡选择**：点击"开始学习"
3. **选择关卡**：
   - 关卡1：教学关卡（原版）
   - 关卡3：专家系统（副本）→ 实际是教学关卡副本
4. **游玩体验**：两个关卡功能完全相同，但进度独立保存

## 建议优化

### 1. 更新关卡名称

建议在 `LevelsPage.tsx` 中修改关卡3的名称：

```typescript
{ id: 3, name: '教学关卡（副本）', desc: '从零开始，了解AI训练的基本概念', locked: false }
```

这样更清楚地表明这是教学关卡的副本。

### 2. 添加提示

可以在关卡3中添加一个提示，说明这是教学关卡的副本，用于练习。

### 3. 调整奖励

可以考虑：
- 保持100金币奖励（与原教学关卡相同）
- 或者降低奖励（如50金币），因为是副本关卡

### 4. 成就系统

副本关卡的成就会使用相同的localStorage键，这意味着：
- 在任一教学关卡中解锁成就，都会在两个关卡中显示为已解锁
- 如果需要独立的成就系统，需要修改成就键名

## 注意事项

1. **金币共享**：两个教学关卡共享同一个金币池
2. **奖励独立**：每个关卡的奖励可以分别领取一次（各100金币）
3. **数据独立**：保存的节点位置、连接线、参数设置等都是独立的
4. **成就共享**：成就系统使用相同的键，在任一关卡解锁都会同步
5. **无下一关按钮**：副本关卡没有"下一关"按钮，完成后需手动返回关卡选择

## 总结

成功将关卡3（Level2CopyPage）完全替换为教学关卡的内容：
- ✅ 功能完全相同
- ✅ UI完全相同
- ✅ 玩法完全相同
- ✅ 数据独立存储
- ✅ 可以同时游玩两个教学关卡
- ✅ 适合用于练习和重复学习

这为玩家提供了额外的练习机会，可以在不影响原教学关卡进度的情况下反复练习。
