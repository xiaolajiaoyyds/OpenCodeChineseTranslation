# OpenCode CLI 跨平台编译脚本 (PowerShell)

$ErrorActionPreference = "Stop"

$APP_NAME = "opencode-cli"
$VERSION = "8.5.0"
$OUTPUT_DIR = "dist"
$ASSETS_SRC = "../opencode-i18n"
$ASSETS_DEST = "internal/core/assets/opencode-i18n"

# 创建输出目录
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

Write-Host "`n📦 构建 $APP_NAME v$VERSION" -ForegroundColor Cyan
Write-Host ""

# 1. 准备嵌入资源
Write-Host "  → 准备汉化资源..." -ForegroundColor Yellow
if (Test-Path $ASSETS_SRC) {
    if (-not (Test-Path $ASSETS_DEST)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $ASSETS_DEST) | Out-Null
    }
    Copy-Item -Path $ASSETS_SRC -Destination $ASSETS_DEST -Recurse -Force
} else {
    Write-Warning "未找到汉化资源目录: $ASSETS_SRC"
    Write-Warning "编译将继续，但内置汉化可能为空。"
}

function Build {
    param (
        [string]$GOOS,
        [string]$GOARCH,
        [string]$EXT
    )
    
    $OUTPUT = "$OUTPUT_DIR/$APP_NAME-$GOOS-$GOARCH$EXT"
    Write-Host "  → 构建 $GOOS/$GOARCH..." -ForegroundColor Yellow
    
    $env:GOOS = $GOOS
    $env:GOARCH = $GOARCH
    
    go build -ldflags="-s -w" -o $OUTPUT .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ $OUTPUT" -ForegroundColor Green
    } else {
        Write-Host "    ✗ 构建失败" -ForegroundColor Red
    }
}

# Windows
Build -GOOS "windows" -GOARCH "amd64" -EXT ".exe"
Build -GOOS "windows" -GOARCH "arm64" -EXT ".exe"

# macOS
Build -GOOS "darwin" -GOARCH "amd64" -EXT ""
Build -GOOS "darwin" -GOARCH "arm64" -EXT ""

# Linux
Build -GOOS "linux" -GOARCH "amd64" -EXT ""
Build -GOOS "linux" -GOARCH "arm64" -EXT ""

# 清理环境变量
Remove-Item Env:\GOOS -ErrorAction SilentlyContinue
Remove-Item Env:\GOARCH -ErrorAction SilentlyContinue

# 清理资源
Write-Host "  → 清理临时资源..." -ForegroundColor Yellow
if (Test-Path $ASSETS_DEST) {
    Remove-Item -Path $ASSETS_DEST -Recurse -Force -ErrorAction SilentlyContinue
    # 尝试删除空的 assets 父目录
    $assetsParent = Split-Path $ASSETS_DEST
    if ((Get-ChildItem $assetsParent).Count -eq 0) {
        Remove-Item -Path $assetsParent -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n✓ 构建完成!" -ForegroundColor Green
Write-Host ""

# 显示构建产物
Get-ChildItem $OUTPUT_DIR | Format-Table Name, @{Label="Size"; Expression={"{0:N0} KB" -f ($_.Length / 1KB)}}
