@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════╗
echo ║     AI指令师 - 开发环境启动工具       ║
echo ╚════════════════════════════════════════╝
echo.
echo [1/3] 关闭旧进程...
taskkill /F /IM electron.exe 2>nul
if %errorlevel%==0 (
    echo       ✓ 已关闭旧的 Electron 进程
) else (
    echo       ○ 没有运行中的进程
)

echo.
echo [2/3] 清理缓存...
if exist out (
    rmdir /s /q out
    echo       ✓ 已清理 out 文件夹
)
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo       ✓ 已清理 Vite 缓存
)

echo.
echo [3/3] 启动开发环境...
echo.
echo ════════════════════════════════════════
echo  提示：窗口打开后按 Ctrl+R 可刷新界面
echo  提示：按 Ctrl+C 可停止开发服务器
echo ════════════════════════════════════════
echo.
npm run dev
