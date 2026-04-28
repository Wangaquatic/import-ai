# 关卡缩放功能应用指南

## 已完成的关卡
- ✅ Level1 (第一关)
- ✅ Level2 (第二关)

## 待应用的关卡
- ⏳ Level3 (第三关)
- ⏳ Level4 (第四关)
- ⏳ TutorialPage (教学关卡)

## 应用步骤

### 1. 导入 useZoom Hook

在文件顶部添加导入：

```tsx
import { useZoom } from '../../hooks/useZoom'
```

### 2. 在组件中使用 Hook

在组件函数内部，状态定义后添加：

```tsx
// 缩放功能
const { zoom, resetZoom } = useZoom(0.5, 2.0, 0.1)
```

### 3. 添加缩放变化时更新连接线的 Effect

```tsx
// 缩放变化时更新连接线
useEffect(() => {
  forceUpdate(n => n + 1)
}, [zoom])
```

### 4. 给需要缩放的元素添加 transform 样式

需要缩放的元素包括：
- 输入图片区域 (`.left-panel`, `.input-area`)
- 输出图片区域 (`.target-panel`, `.output-area`)
- 可拖拽的节点 (`.classifier-wrapper`, `.classifier-node`, `.trash-node`)

添加样式：
```tsx
style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
```

对于已有 transform 的元素（如可拖拽节点），需要合并：
```tsx
style={{ 
  transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
  transformOrigin: 'center center'
}}
```

### 5. 添加缩放指示器 UI

在返回按钮和金币显示后添加：

```tsx
{/* 缩放指示器 */}
<div className="zoom-indicator">
  <span>🔍 {Math.round(zoom * 100)}%</span>
  {zoom !== 1.0 && (
    <button className="zoom-reset-btn" onClick={resetZoom}>
      重置
    </button>
  )}
</div>
```

## 注意事项

1. **不要缩放 SVG 连接线容器**：连接线会自动跟随节点位置，不需要单独缩放
2. **不要缩放 UI 元素**：按钮、工具栏、计时器等保持原始大小
3. **transformOrigin 很重要**：设置为 `center center` 确保从中心缩放
4. **合并 transform**：如果元素已有 transform（如 translate），需要合并而不是覆盖

## 示例：Level3Page 应用

```tsx
// 1. 导入
import { useZoom } from '../../hooks/useZoom'

// 2. 使用 Hook
const { zoom, resetZoom } = useZoom(0.5, 2.0, 0.1)

// 3. 添加 Effect
useEffect(() => {
  forceUpdate(n => n + 1)
}, [zoom])

// 4. 应用到元素
<div className="left-panel" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
  {/* 输入图片 */}
</div>

<div className="target-panel-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
  {/* 输出图片 */}
</div>

// 5. 添加指示器
<div className="zoom-indicator">
  <span>🔍 {Math.round(zoom * 100)}%</span>
  {zoom !== 1.0 && (
    <button className="zoom-reset-btn" onClick={resetZoom}>
      重置
    </button>
  )}
</div>
```

## 使用方法

用户使用 **Ctrl + 鼠标滚轮** 来缩放：
- 向上滚动：放大 (最大 200%)
- 向下滚动：缩小 (最小 50%)
- 点击"重置"按钮：恢复到 100%

## 样式已在 LevelBase.css 中定义

缩放指示器的样式已经在基础样式文件中定义，无需额外添加 CSS。
