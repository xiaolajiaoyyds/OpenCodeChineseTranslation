# OpenCode 汉化工具一键安装脚本 (Windows)

$ErrorActionPreference = "Stop"

# 颜色输出
function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "==============================================" "Cyan"
Write-Color "   OpenCode 汉化管理工具一键安装脚本   " "Cyan"
Write-Color "==============================================" "Cyan"

# 1. 检查依赖
Write-Color "`n[1/5] 检查环境依赖..." "Yellow"

function Check-Command($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Color "错误: 未找到命令 '$cmd'。请先安装它。" "Red"
        exit 1
    }
}

Check-Command "node"
Check-Command "npm"

if (-not (Get-Command "bun" -ErrorAction SilentlyContinue)) {
    Write-Color "提示: 未检测到 Bun。虽然不是必须的，但推荐安装以获得更快的构建速度。" "Yellow"
    Write-Color "      安装命令: powershell -c 'irm bun.sh/install.ps1 | iex'" "Gray"
}

# 2. 获取最新版本
Write-Color "`n[2/5] 获取最新版本信息..." "Yellow"
$repo = "1186258278/OpenCodeChineseTranslation"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $latest = Invoke-RestMethod -Uri $apiUrl
    $tagName = $latest.tag_name
    Write-Color "最新版本: $tagName" "Green"
} catch {
    Write-Color "错误: 无法获取最新版本信息。请检查网络连接。" "Red"
    exit 1
}

# 3. 下载
$installDir = "$HOME\.opencode-i18n"
$zipUrl = "https://github.com/$repo/releases/download/$tagName/opencode-i18n-tool-$tagName.zip"
$tempZip = "$env:TEMP\opencode-i18n.zip"

Write-Color "`n[3/5] 下载汉化工具..." "Yellow"
Write-Color "下载地址: $zipUrl" "Gray"

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip
    Write-Color "下载成功!" "Green"
} catch {
    Write-Color "下载失败! 请检查网络连接。" "Red"
    exit 1
}

# 4. 解压安装
Write-Color "`n[4/5] 安装到 $installDir ..." "Yellow"

if (Test-Path $installDir) {
    Write-Color "清理旧版本..." "Gray"
    Remove-Item -Path $installDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
Remove-Item $tempZip

# 5. 安装依赖
Write-Color "`n[5/5] 安装项目依赖..." "Yellow"
Set-Location "$installDir\scripts"
npm install --production

# 链接全局命令
Write-Color "`n正在创建全局命令 'opencodenpm'..." "Yellow"
npm link

Write-Color "`n==============================================" "Green"
Write-Color "   安装完成!   " "Green"
Write-Color "==============================================" "Green"
Write-Color "`n请直接在终端运行以下命令启动:" "Gray"
Write-Color "  opencodenpm" "Cyan"
Write-Color "`n如有问题，请访问 GitHub 提交 Issue。" "Gray"
