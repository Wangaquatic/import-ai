# 成就调试指南

## 问题排查

### 如果"参数调优大师"成就没有解锁：

1. **打开浏览器控制台**（F12）

2. **检查当前状态**：
   ```javascript
   // 查看localStorage中的成就状态
   console.log('成就状态:', localStorage.getItem('achievement_param_master'))
   
   // 查看隐藏参数
   console.log('隐藏参数:', localStorage.getItem('tutorial_hidden_params'))
   ```

3. **测试步骤**：
   - 确保教学关卡的节点连接正确：
     - classifier-out1 → target-in
     - classifier-out2 → no-target-in
   - 打开隐藏关卡（左下角🔬按钮）
   - 设置最优参数：
     - 学习率：0.1
     - 批量大小：32
     - 训练轮数：20
     - 优化器：Adam
   - 点击"测试训练"
   - 查看控制台输出的调试信息

4. **查看调试日志**：
   控制台会显示：
   ```
   🔍 成就检查: {
     准确率: 95,
     连接正确: true,
     已解锁: false,
     满足条件: true
   }
   🎉 成就已解锁：参数调优大师
   ```

5. **手动解锁（测试用）**：
   ```javascript
   // 在控制台执行
   localStorage.setItem('achievement_param_master', '1')
   
   // 刷新个人中心页面查看
   ```

6. **重置成就（重新测试）**：
   ```javascript
   // 在控制台执行
   achievementDebug.resetAllAchievements()
   ```

## 常见问题

### Q: 准确率达到95%但没解锁？
A: 检查以下几点：
- 教学关卡的节点是否连接正确（控制台会显示"连接正确: true"）
- 是否已经解锁过（控制台会显示"已解锁: true"）
- 准确率是否真的 >= 94.5（控制台会显示实际数值）

### Q: 个人中心看不到成就？
A: 
- 刷新页面或重新进入个人中心
- 查看控制台的"📊 个人中心 - 成就状态"日志
- 确认localStorage中有对应的键值

### Q: 成就解锁提示没出现？
A: 
- 检查是否已经解锁过（只会提示一次）
- 查看控制台是否有错误信息
- 确认AchievementUnlock组件是否正常渲染

## 快速测试命令

在浏览器控制台执行：

```javascript
// 1. 查看所有成就状态
achievementDebug.checkStatus()

// 2. 手动解锁参数调优大师
achievementDebug.unlockParamMaster()

// 3. 手动解锁隐藏探索者
achievementDebug.unlockHiddenExplorer()

// 4. 重置所有成就
achievementDebug.resetAllAchievements()

// 5. 查看localStorage
console.log('所有成就数据:', {
  参数调优大师: localStorage.getItem('achievement_param_master'),
  隐藏探索者: localStorage.getItem('achievement_hidden_explorer'),
  隐藏关卡完成: localStorage.getItem('hidden_levels_completed'),
  教学隐藏完成: localStorage.getItem('tutorial_hidden_done')
})
```

## 预期行为

### 正确流程：
1. 教学关卡连接正确
2. 打开隐藏关卡
3. 设置最优参数
4. 点击"测试训练"
5. 看到准确率 95%
6. 控制台显示"🎉 成就已解锁"
7. 右上角弹出成就解锁动画
8. 进入个人中心可以看到成就已解锁

### 如果连接错误：
1. 准确率会反转（95% → 5%）
2. 显示"⚠️ 连接错误"警告
3. 不会解锁成就
