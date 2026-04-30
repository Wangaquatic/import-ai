# 清除Electron应用缓存脚本

Write-Host "正在清除缓存..." -ForegroundColor Yellow

# 1. 停止所有Electron进程
Write-Host "1. 停止Electron进程..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*electron*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. 清除Electron应用数据缓存
Write-Host "2. 清除应用数据缓存..." -ForegroundColor Cyan
$appDataPath = "$env:APPDATA\import-ai"
if (Test-Path $appDataPath) {
    Remove-Item -Recurse -Force $appDataPath -ErrorAction SilentlyContinue
    Write-Host "   已删除: $appDataPath" -ForegroundColor Green
}

# 3. 清除本地缓存
Write-Host "3. 清除本地缓存..." -ForegroundColor Cyan
$localAppDataPath = "$env:LOCALAPPDATA\import-ai"
if (Test-Path $localAppDataPath) {
    Remove-Item -Recurse -Force $localAppDataPath -ErrorAction SilentlyContinue
    Write-Host "   已删除: $localAppDataPath" -ForegroundColor Green
}

# 4. 清除构建输出
Write-Host "4. 清除构建输出..." -ForegroundColor Cyan
@('out', 'dist', '.vite', 'node_modules/.vite') | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item -Recurse -Force $_ -ErrorAction SilentlyContinue
        Write-Host "   已删除: $_" -ForegroundColor Green
    }
}

Write-Host "`n缓存清除完成！" -ForegroundColor Green
Write-Host "现在请运行: npm run dev" -ForegroundColor Yellow
