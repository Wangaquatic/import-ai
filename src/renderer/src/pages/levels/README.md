# 关卡样式继承系统

## 概述

所有关卡现在共享一个基础样式文件 `LevelBase.css`，通过类继承的方式统一样式，减少代码重复。

## 使用方法

### 1. 在 TSX 文件中导入基础样式

```tsx
import './LevelBase.css'
import './Level2Page.css'  // 关卡特定样式
```

### 2. 在根元素上添加 `level-base` 类

```tsx
<div className="level-base level2-page">
  {/* 关卡内容 */}
</div>
```

## 基础样式包含的内容

`LevelBase.css` 包含所有关卡共享的样式：

- 页面容器和背景渐变
- 网格背景效果
- 粒子动画容器
- 返回按钮
- 金币显示
- 节点计数器
- 速度控制按钮
- 计时器
- 垃圾桶按钮
- 左侧输入面板
- 右侧工具栏
- 连接点样式
- 奖励弹窗
- 信息按钮和弹窗
- **固定尺寸的图片容器**（防止窗口最大化时图片变大）

## 关键特性：固定图片尺寸

基础样式中的 `.input-image-container` 和 `.output-image-container` 设置了固定的宽高：

```css
.level-base .input-image-container {
  position: relative;
  width: 200px;
  height: 150px;
}

.level-base .input-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}
```

这确保了无论窗口如何缩放，图片大小都保持一致。

## 关卡特定样式

每个关卡的 CSS 文件（如 `Level2Page.css`）只需要包含：

1. 关卡特有的布局调整
2. 特殊组件样式
3. 对基础样式的覆盖（如果需要）

## 示例：第二关

```tsx
// Level2Page.tsx
import './LevelBase.css'
import './Level2Page.css'

return (
  <div className="level-base level2-page">
    {/* 继承基础样式，添加关卡特定功能 */}
  </div>
)
```

```css
/* Level2Page.css */
/* 继承自 LevelBase.css 的基础样式 */
/* 使用 level-base 类来应用通用样式 */

.level2-page {
  /* 只定义第二关特有的样式 */
}

/* 覆盖基础样式（如果需要） */
.level2-page .input-area {
  left: 180px;  /* 调整位置 */
}
```

## 优势

1. **代码复用**：共享样式只需维护一份
2. **一致性**：所有关卡视觉效果统一
3. **易维护**：修改基础样式会自动应用到所有关卡
4. **灵活性**：每个关卡仍可自定义特殊样式
5. **固定尺寸**：窗口最大化时图片大小不变

## 迁移现有关卡

要将现有关卡迁移到新系统：

1. 在 TSX 文件顶部导入 `LevelBase.css`
2. 在根 div 添加 `level-base` 类
3. 从关卡特定 CSS 中删除与 `LevelBase.css` 重复的样式
4. 测试确保样式正常工作
