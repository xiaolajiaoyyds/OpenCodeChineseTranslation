# OpenCode 汉化工具一键安装脚本 (Go CLI 版)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "==============================================" "Cyan"
Write-Color "   OpenCode 汉化管理工具安装脚本 (v8.1)   " "Cyan"
Write-Color "==============================================" "Cyan"

# 1. 检测架构
Write-Color "`n[1/4] 检测系统架构..." "Yellow"
$arch = $env:PROCESSOR_ARCHITECTURE
$targetArch = "amd64"
if ($arch -eq "ARM64") {
    $targetArch = "arm64"
}
Write-Color "架构: Windows $targetArch" "Green"

# 2. 获取最新版本
Write-Color "`n[2/4] 获取最新版本信息..." "Yellow"
$repo = "1186258278/OpenCodeChineseTranslation"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"
$tagName = "v8.1.0" # 默认版本

try {
    $latest = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 5
    $tagName = $latest.tag_name
    Write-Color "最新版本: $tagName" "Green"
} catch {
    Write-Color "无法连接 GitHub API，使用默认版本 $tagName" "Gray"
}

# 3. 下载
$installDir = "$env:USERPROFILE\.opencode-i18n"
$binDir = "$installDir\bin"
$exePath = "$binDir\opencode-cli.exe"
$fileName = "opencode-cli-windows-$targetArch.exe"
$downloadUrl = "https://github.com/$repo/releases/download/$tagName/$fileName"

# 如果在中国，可以使用镜像 (可选)
# $downloadUrl = "https://ghproxy.com/$downloadUrl"

Write-Color "`n[3/4] 下载管理工具..." "Yellow"
Write-Color "地址: $downloadUrl" "Gray"

if (!(Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath
    Write-Color "下载成功!" "Green"
} catch {
    Write-Color "下载失败! 请检查网络连接。" "Red"
    Write-Color "错误信息: $_" "Red"
    exit 1
}

# 4. 配置环境
Write-Color "`n[4/4] 配置环境变量..." "Yellow"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$binDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
    Write-Color "已将 $binDir 添加到用户 PATH" "Green"
} else {
    Write-Color "环境变量已配置" "Green"
}

Write-Color "`n==============================================" "Green"
Write-Color "   安装完成!   " "Green"
Write-Color "==============================================" "Green"
Write-Color "`n请重启终端，然后运行以下命令启动:" "Gray"
Write-Color "  opencode-cli interactive" "Cyan"
