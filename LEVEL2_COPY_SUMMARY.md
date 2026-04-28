# 关卡2副本 - 实现总结

## 概述

成功复制了关卡2（专家系统），创建了一个完全相同的副本关卡。两个关卡的逻辑、UI、功能完全一致，但使用独立的数据存储。

## 实现步骤

### 1. 文件复制

复制了以下文件：
- `src/renderer/src/pages/levels/Level2Page.tsx` → `Level2CopyPage.tsx`
- `src/renderer/src/pages/levels/Level2Page.css` → `Level2CopyPage.css`

### 2. 代码修改

#### Level2CopyPage.tsx 修改：

1. **组件名称和接口**：
   ```typescript
   interface Level2CopyPageProps {
     onBack: () => void
   }
   
   const Level2CopyPage: React.FC<Level2CopyPageProps> = ({ onBack }) => {
   ```

2. **CSS类名**：
   ```typescript
   <div ref={pageRef} className="level2copy-page" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
   ```

3. **localStorage键名**（确保数据独立）：
   ```typescript
   const COINS_KEY = 'player_coins'  // 共享金币
   const LEVEL2COPY_REWARD_KEY = 'level2copy_reward_claimed'
   const LEVEL2COPY_SAVE_KEY = 'level2copy_saved_state'
   const LEVEL2COPY_HIDDEN_PARAMS_KEY = 'level2copy_hidden_params'
   ```

4. **导出名称**：
   ```typescript
   export default Level2CopyPage
   ```

#### Level2CopyPage.css 修改：

- 将所有 `.level2-page` 替换为 `.level2copy-page`
- 保持所有样式规则不变

### 3. 路由配置

#### App.tsx 更新：

1. **导入新组件**：
   ```typescript
   import Level2CopyPage from './pages/levels/Level2CopyPage'
   ```

2. **添加页面类型**：
   ```typescript
   type Page = 'home' | 'levels' | 'shop' | 'profile' | 'tutorial' | 'level2' | 'level2copy' | 'level3' | 'level4'
   ```

3. **添加路由**：
   ```typescript
   {currentPage === 'level2copy' && <Level2CopyPage onBack={() => navigateTo('levels')} />}
   ```

#### LevelsPage.tsx 更新：

1. **更新接口**：
   ```typescript
   interface LevelsPageProps {
     onBack: () => void
     onNavigate: (page: 'tutorial' | 'level2' | 'level2copy' | 'level3' | 'level4') => void
   }
   ```

2. **添加新关卡**：
   ```typescript
   const levels = [
     { id: 1, name: '教学关卡', desc: '从零开始，了解AI训练的基本概念', locked: false, tutorial: true },
     { id: 2, name: '专家系统', desc: '对数据进行清洗', locked: false },
     { id: 3, name: '专家系统（副本）', desc: '对数据进行清洗', locked: false },
     { id: 4, name: '过拟合', desc: '识别模型复杂度过高的问题', locked: false },
     { id: 5, name: '决策树', desc: '掌握树模型的分类逻辑', locked: false },
     // ... 其他关卡
   ]
   ```

3. **添加导航逻辑**：
   ```typescript
   else if (level.id === 3) onNavigate('level2copy')
   ```

## 功能特性

### 完全独立的数据存储

两个关卡使用不同的localStorage键，确保：
- ✅ 独立的保存状态
- ✅ 独立的奖励领取记录
- ✅ 独立的隐藏关卡参数
- ✅ 共享金币系统（使用相同的 `player_coins` 键）

### 完全相同的功能

副本关卡包含原关卡的所有功能：
- ✅ 节点拖拽系统（专家系统、垃圾桶）
- ✅ 连接线绘制
- ✅ 颜色模式切换（红/绿/蓝）
- ✅ 测试动画和粒子系统
- ✅ 准确率计算
- ✅ 隐藏关卡（参数调优）
- ✅ 金币奖励系统
- ✅ 保存/加载功能
- ✅ 速度控制
- ✅ 计时器

## 数据存储键对照表

| 功能 | 原关卡2 | 副本关卡 |
|------|---------|----------|
| 奖励领取 | `level2_reward_claimed` | `level2copy_reward_claimed` |
| 保存状态 | `level2_saved_state` | `level2copy_saved_state` |
| 隐藏参数 | `level2_hidden_params` | `level2copy_hidden_params` |
| 金币 | `player_coins` | `player_coins` (共享) |

## 测试验证

✅ 应用成功构建  
✅ 无TypeScript诊断错误  
✅ 关卡选择页面显示两个"专家系统"关卡  
✅ 可以独立进入两个关卡  
✅ 两个关卡的数据互不影响  

## 文件清单

### 新增文件
- `src/renderer/src/pages/levels/Level2CopyPage.tsx` - 副本关卡组件
- `src/renderer/src/pages/levels/Level2CopyPage.css` - 副本关卡样式
- `LEVEL2_COPY_SUMMARY.md` - 本文档

### 修改文件
- `src/renderer/src/App.tsx` - 添加路由
- `src/renderer/src/pages/LevelsPage.tsx` - 添加关卡入口

## 使用说明

1. **启动应用**：`npm start`
2. **进入关卡选择**：点击"开始学习"
3. **选择关卡**：
   - 关卡2：专家系统（原版）
   - 关卡3：专家系统（副本）
4. **游玩体验**：两个关卡功能完全相同，但进度独立保存

## 注意事项

1. **金币共享**：两个关卡共享同一个金币池，完成任一关卡都会增加金币
2. **奖励独立**：每个关卡的奖励可以分别领取一次（各200金币）
3. **数据独立**：保存的节点位置、连接线、参数设置等都是独立的
4. **样式隔离**：使用不同的CSS类名，避免样式冲突

## 扩展建议

如果需要创建更多副本：
1. 复制 `Level2CopyPage.tsx` 和 `Level2CopyPage.css`
2. 修改组件名称（如 `Level2Copy2Page`）
3. 修改CSS类名（如 `.level2copy2-page`）
4. 修改localStorage键名（如 `level2copy2_*`）
5. 在App.tsx和LevelsPage.tsx中添加路由

## 总结

成功实现了关卡2的完整副本，两个关卡：
- ✅ 功能完全相同
- ✅ 逻辑完全相同
- ✅ UI完全相同
- ✅ 数据独立存储
- ✅ 可以同时游玩

这为后续创建更多关卡变体提供了良好的模板。
