# 反向工程师成就 - 开发文档

## 成就信息

**名称**：反向工程师 🔄  
**类型**：隐藏成就  
**解锁条件**：在教学关卡连接错误时达到极低准确率（≤10%）

## 解锁方式

### 步骤 1：故意连接错误
在教学关卡中，将分类器的输出节点故意连接错误：
- ❌ `classifier-out1` → `no-target-in`（红色方块到无目标）
- ❌ `classifier-out2` → `target-in`（蓝色方块到有目标）

正确的连接应该是：
- ✅ `classifier-out1` → `target-in`（红色方块到有目标）
- ✅ `classifier-out2` → `no-target-in`（蓝色方块到无目标）

### 步骤 2：运行测试
点击右侧边栏的"测试"按钮，观察准确率变化。

### 步骤 3：达到最低准确率
当连接错误时，准确率会反转：
- 正确连接时：75% - 95%（取决于隐藏参数）
- 错误连接时：5% - 25%（准确率反转）

当最终准确率 ≤ 10% 时，成就自动解锁。

## 技术实现

### 1. 准确率计算逻辑

在 `TutorialPage.tsx` 的 `handleTest` 函数中：

```typescript
// 判断连接是否正确
const out1IsCorrect = out1Conn?.to === 'target-in'
const out2IsCorrect = out2Conn?.to === 'no-target-in'

// 根据隐藏参数调整准确率
const accuracyBonus = calculateAccuracyBonus()
const baseCorrectRatio = 0.75 + accuracyBonus // 基础75%，可通过隐藏参数提升
const baseWrongRatio = 1 - baseCorrectRatio   // 错误时反转

// 连接正确时使用 baseCorrectRatio，错误时使用 baseWrongRatio
```

### 2. 成就解锁检测

在测试完成时检测：

```typescript
// 检查反向工程师成就（连接错误且准确率≤10%）
const isConnectionWrong = !out1IsCorrect || !out2IsCorrect
const finalAccuracy = Math.max(
  out1IsCorrect ? baseCorrectRatio : baseWrongRatio,
  out2IsCorrect ? baseCorrectRatio : baseWrongRatio
)

if (isConnectionWrong && finalAccuracy <= 0.10) {
  const achievementKey = 'achievement_reverse_engineer'
  if (!localStorage.getItem(achievementKey)) {
    localStorage.setItem(achievementKey, '1')
    
    // 触发成就解锁动画
    const event = new CustomEvent('achievement-unlocked', {
      detail: {
        name: '反向工程师',
        desc: '在连接错误时达到极低准确率（≤10%）',
        icon: 'achievement-8.png'
      }
    })
    window.dispatchEvent(event)
  }
}
```

### 3. 个人中心显示

在 `ProfilePage.tsx` 中添加成就：

```typescript
const reverseEngineerUnlocked = !!localStorage.getItem('achievement_reverse_engineer')

achievements: [
  // ... 其他成就
  { 
    id: 8, 
    name: '反向工程师', 
    desc: '在教学关卡连接错误时达到极低准确率（≤10%）', 
    unlocked: reverseEngineerUnlocked, 
    iconImg: 'achievement-3.png',
    hidden: true
  }
]
```

## 调试工具

在浏览器控制台中使用以下命令：

```javascript
// 查看成就状态
achievementDebug.checkStatus()

// 直接解锁反向工程师成就
achievementDebug.unlockReverseEngineer()

// 重置所有成就
achievementDebug.resetAllAchievements()
```

## 数据存储

- **localStorage key**: `achievement_reverse_engineer`
- **值**: `'1'` 表示已解锁

## 测试步骤

1. 启动应用并登录
2. 进入教学关卡
3. 从右侧边栏拖出分类器节点
4. 将分类器连接到输入节点
5. **故意将输出连接错误**：
   - 上方输出点连到"无目标"
   - 下方输出点连到"有目标"
6. 点击"测试"按钮
7. 观察准确率柱状图，应该显示很低的准确率（≤10%）
8. 测试完成后，成就应该自动解锁
9. 前往个人中心查看成就列表，应该能看到"反向工程师"成就已解锁

## 注意事项

1. **隐藏成就特性**：
   - 未解锁时显示为 "???"
   - 描述显示为 "完成特定条件解锁"
   - 图标模糊显示
   - 解锁后显示"隐藏"徽章

2. **准确率影响因素**：
   - 基础准确率：75%
   - 隐藏参数加成：最高 +20%（达到95%）
   - 连接错误时反转：95% → 5%，75% → 25%

3. **成就只能解锁一次**：
   - 使用 localStorage 检查是否已解锁
   - 已解锁的成就不会重复触发动画

## 相关文件

- `src/renderer/src/pages/TutorialPage.tsx` - 成就解锁逻辑
- `src/renderer/src/pages/ProfilePage.tsx` - 成就显示
- `src/renderer/src/utils/achievementDebug.ts` - 调试工具
- `ACHIEVEMENTS.md` - 成就系统文档

## 更新日志

- **2024-XX-XX**: 添加反向工程师成就
  - 在教学关卡连接错误时达到≤10%准确率解锁
  - 添加成就解锁检测逻辑
  - 更新个人中心显示
  - 添加调试工具支持
