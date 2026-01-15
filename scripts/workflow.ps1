# OpenCode 汉化版 - 完整工作流脚本
# 流程: 更新源码 → 恢复纯净 → 应用汉化 → 编译 → 打包

param(
    [switch]$SkipUpdate = $false,
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

# 获取脚本所在目录
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_DIR = Split-Path -Parent $SCRIPT_DIR

# 导入模块
. Join-Path $SCRIPT_DIR "opencode\init.ps1"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Get-OpencodeDir {
    return Join-Path $PROJECT_DIR "opencode-zh-CN"
}

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ========== 步骤 1: 检查环境 ==========
Write-Step "步骤 1: 检查编译环境"

$MISSING = @()

if (-not (Test-Command "bun")) { $MISSING += "Bun" }
if (-not (Test-Command "node")) { $MISSING += "Node.js" }
if (-not (Test-Command "git")) { $MISSING += "Git" }

if ($MISSING.Count -gt 0) {
    Write-Host "❌ 缺少必要工具: $($MISSING -join ', ')" -ForegroundColor Red
    Write-Host "请运行 'codes install' 安装" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ 编译环境检查通过" -ForegroundColor Green
Write-Host "  Bun: $(bun --version)" -ForegroundColor Gray
Write-Host "  Node: $(node --version)" -ForegroundColor Gray
Write-Host "  Git: $(git --version)" -ForegroundColor Gray

# ========== 步骤 2: 更新源码 ==========
if (-not $SkipUpdate) {
    Write-Step "步骤 2: 更新 OpenCode 源码"

    $OPencode_DIR = Get-OpencodeDir

    if (-not (Test-Path $OPencode_DIR)) {
        Write-Host "克隆 OpenCode 源码..." -ForegroundColor Cyan
        git clone --depth 1 https://github.com/anomalyco/opencode.git $OPencode_DIR
    } else {
        Write-Host "拉取最新源码..." -ForegroundColor Cyan
        Push-Location $OPencode_DIR
        git fetch origin
        git reset --hard origin/main
        Pop-Location
    }

    Write-Host "✓ 源码更新完成" -ForegroundColor Green
} else {
    Write-Host "⊘ 跳过源码更新" -ForegroundColor DarkGray
}

# ========== 步骤 3: 恢复纯净 ==========
Write-Step "步骤 3: 恢复源码到纯净状态"

$OPencode_DIR = Get-OpencodeDir
Push-Location $OPencode_DIR
git restore --worktree --source=HEAD -- . 2>$null
git clean -fd 2>$null
Pop-Location

Write-Host "✓ 源码已恢复到纯净状态" -ForegroundColor Green

# ========== 步骤 4: 应用汉化 ==========
Write-Step "步骤 4: 应用汉化配置"

$I18N_SCRIPT = Join-Path $PROJECT_DIR "scripts\opencode-linux\lib\i18n.js"
if (-not (Test-Path $I18N_SCRIPT)) {
    Write-Host "❌ 汉化脚本不存在: $I18N_SCRIPT" -ForegroundColor Red
    exit 1
}

# 使用 Node.js 运行汉化脚本
$RESULT = node $I18N_SCRIPT 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 汉化应用成功" -ForegroundColor Green
    Write-Host $RESULT -ForegroundColor DarkGray
} else {
    Write-Host "❌ 汉化应用失败" -ForegroundColor Red
    Write-Host $RESULT -ForegroundColor Red
    exit 1
}

# ========== 步骤 5: 编译构建 ==========
if (-not $SkipBuild) {
    Write-Step "步骤 5: 编译构建"

    # 使用 Node.js 脚本进行编译（绕过 PowerShell bun wrapper 问题）
    $BUILD_SCRIPT = Join-Path $SCRIPT_DIR "build-windows.js"

    if (-not (Test-Path $BUILD_SCRIPT)) {
        Write-Host "❌ 构建脚本不存在: $BUILD_SCRIPT" -ForegroundColor Red
        exit 1
    }

    & node $BUILD_SCRIPT
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 编译失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⊘ 跳过编译" -ForegroundColor DarkGray
}

# ========== 步骤 6: 打包 Release ==========
Write-Step "步骤 6: 打包 Release"

$RELEASE_SCRIPT = Join-Path $SCRIPT_DIR "release.ps1"
if (Test-Path $RELEASE_SCRIPT) {
    & $RELEASE_SCRIPT
} else {
    Write-Host "❌ 打包脚本不存在: $RELEASE_SCRIPT" -ForegroundColor Red
    exit 1
}

# ========== 步骤 7: 部署到本地环境 ==========
Write-Step "步骤 7: 部署到本地环境"

# 检查是否在 Git Bash 环境中
$IS_GIT_BASH = $env:TERM -eq "xterm-256color" -or $env:MSYSTEM -ne ""

# 部署目录：优先使用项目本地 bin 目录
$BIN_DIR = Join-Path $PROJECT_DIR "bin"
if (-not (Test-Path $BIN_DIR)) {
    New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null
}

$BINARY_SRC = Join-Path $OPencode_DIR "packages\opencode\dist\opencode-windows-x64\bin\opencode.exe"

if (Test-Path $BINARY_SRC) {
    # 复制到项目 bin 目录
    $BINARY_DST = Join-Path $BIN_DIR "opencode.exe"
    Copy-Item -Path $BINARY_SRC -Destination $BINARY_DST -Force
    $SIZE = [math]::Round((Get-Item $BINARY_DST).Length / 1MB, 2)
    Write-Host "✓ 已部署到项目 bin 目录 (${SIZE} MB)" -ForegroundColor Green
    Write-Host "  路径: $BINARY_DST" -ForegroundColor Gray

    # 添加到 PATH 的提示
    $CURRENT_PATH = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($CURRENT_PATH -notlike "*$BIN_DIR*") {
        Write-Host ""
        Write-Host "⚠️  需要将 bin 目录添加到 PATH:" -ForegroundColor Yellow
        Write-Host "  $BIN_DIR" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "或在 PowerShell 中运行:" -ForegroundColor Yellow
        Write-Host "  `$env:Path += `";$BIN_DIR`"" -ForegroundColor White
    } else {
        Write-Host "✓ bin 目录已在 PATH 中" -ForegroundColor Green
        Write-Host "  运行 'opencode.exe' 或 'opencode' 即可启动" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Windows 二进制不存在，跳过部署" -ForegroundColor Yellow
}

# ========== 完成 ==========
Write-Step "工作流完成！"

Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 测试: opencode" -ForegroundColor White
Write-Host "  2. 上传到 Releases: releases/ 目录" -ForegroundColor White
Write-Host "  3. GitHub: https://github.com/1186258278/OpenCodeChineseTranslation/releases" -ForegroundColor White
Write-Host ""
