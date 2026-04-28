# 教学关卡位置互换总结

## 任务描述
将教学关卡和教学关卡（副本）的位置再次互换，恢复到原始顺序。

## 修改内容

### 1. 更新关卡列表顺序 (`src/renderer/src/pages/LevelsPage.tsx`)

**修改前：**
- 关卡1：教学关卡（副本） - Level2CopyPage
- 关卡2：专家系统 - Level2Page
- 关卡3：教学关卡 - TutorialPage

**修改后：**
- 关卡1：教学关卡 - TutorialPage
- 关卡2：专家系统 - Level2Page
- 关卡3：教学关卡（副本） - Level2CopyPage

### 2. 更新导航逻辑

修改了 `onClick` 处理函数中的路由映射：
- `level.tutorial` (关卡1) → 导航到 `'tutorial'`
- `level.id === 3` → 导航到 `'level2copy'`

## 最终关卡布局

1. **教学关卡** - TutorialPage
   - 数据键：`tutorial_*`
   - 奖励：100金币（首次通关）
   - 隐藏关卡：参数调优（可达95%准确率）
   - 成就：参数调优大师、反向工程师

2. **专家系统** - Level2Page
   - 数据键：`level2_*`
   - 奖励：150金币（首次通关）
   - 隐藏关卡：规则调优（可达100%准确率）
   - 成就：专家系统调优师

3. **教学关卡（副本）** - Level2CopyPage
   - 数据键：`level2copy_tutorial_*`
   - 奖励：100金币（首次通关）
   - 隐藏关卡：参数调优（可达95%准确率）
   - 成就：参数调优大师、反向工程师
   - 功能与教学关卡完全相同，数据独立

4. **过拟合** - Level3Page
5. **决策树** - Level4Page
6-9. 其他关卡（锁定）

## 技术细节

### 数据独立性
- 教学关卡使用 `tutorial_*` 前缀的localStorage键
- 教学关卡（副本）使用 `level2copy_tutorial_*` 前缀的localStorage键
- 两个关卡的进度、奖励、隐藏参数完全独立
- 金币系统共享，但奖励可分别领取

### 路由配置
App.tsx中的路由保持不变：
- `'tutorial'` → TutorialPage
- `'level2copy'` → Level2CopyPage
- 两个组件都有 `onNextLevel` 参数，可跳转到关卡2

## 修改文件
- `src/renderer/src/pages/LevelsPage.tsx`

## 测试建议
1. 验证关卡1点击后进入TutorialPage
2. 验证关卡3点击后进入Level2CopyPage
3. 验证两个教学关卡的数据独立（进度、奖励、隐藏参数）
4. 验证两个教学关卡都可以跳转到关卡2
5. 验证金币奖励可以分别领取（各100金币）
