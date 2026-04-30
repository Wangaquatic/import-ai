# 如何刷新应用查看修改

## 方法1：在Electron窗口中按 Ctrl+R 或 F5
这会刷新页面，加载最新的代码。

## 方法2：打开开发者工具
1. 在Electron窗口中按 Ctrl+Shift+I 或 F12
2. 在开发者工具中按 Ctrl+R 刷新

## 方法3：完全重启
1. 关闭Electron窗口
2. 在终端按 Ctrl+C 停止开发服务器
3. 重新运行 npm run dev

## 测试修改是否生效的方法：
1. **教学关卡缩放**：按住 Ctrl + 滚动鼠标滚轮，左下角应该显示缩放百分比
2. **打开开发者工具**：按 F12，在 Console 中应该能看到 "TutorialPage zoom: 1" 的日志
3. **检查元素**：按 F12，在 Elements 中搜索 "zoom-indicator"，应该能找到这个元素
