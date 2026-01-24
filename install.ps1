# OpenCode 汉化工具一键安装脚本 (Go CLI 版)
param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "==============================================" "Cyan"
Write-Color "   OpenCode 汉化管理工具安装脚本 (v8.5.0)   " "Cyan"
Write-Color "==============================================" "Cyan"

# 1. 检测架构
Write-Color "`n[1/4] 检测系统架构..." "Yellow"
$arch = $env:PROCESSOR_ARCHITECTURE
$targetArch = "amd64"
if ($arch -eq "ARM64") {
    $targetArch = "arm64"
}
Write-Color "架构: Windows $targetArch" "Green"

# 2. 准备安装目录
$installDir = "$env:USERPROFILE\.opencode-i18n"
$binDir = "$installDir\bin"
$exePath = "$binDir\opencode-cli.exe"
$fileName = "opencode-cli-windows-$targetArch.exe"

if (!(Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

# 3. 检查本地文件 (离线安装支持)
$localFile = Join-Path $PWD "opencode-cli-windows-$targetArch.exe"
if (Test-Path $localFile) {
    Write-Color "`n[2/4] 检测到本地安装包..." "Yellow"
    Write-Color "正在从本地安装: $localFile" "Green"
    Copy-Item -Path $localFile -Destination $exePath -Force
} else {
    # 4. 在线下载
    Write-Color "`n[2/4] 获取版本信息..." "Yellow"
    $repo = "1186258278/OpenCodeChineseTranslation"
    $tagName = "v8.5.0" # 默认版本作为后备

    if ($Version) {
        $tagName = $Version
        Write-Color "使用指定版本: $tagName" "Green"
    } else {
        try {
            $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -ErrorAction Stop
            if ($latest.tag_name) {
                $tagName = $latest.tag_name
                Write-Color "发现最新版本: $tagName" "Green"
            }
        } catch {
            Write-Color "获取最新版本失败，将使用默认版本: $tagName" "Yellow"
        }
    }
    } catch {
        Write-Color "获取最新版本失败，将尝试使用默认版本: $tagName" "Yellow"
    }

    # 尝试使用 CDN 加速下载 (jsDelivr)
    # jsDelivr 不支持直接加速 release assets，但支持 raw files
    # 对于 release assets，我们可以使用 GitHub 官方链接，但在中国可能慢
    # 这里我们优先尝试本地，如果不行则在线下载
    
    $downloadUrl = "https://github.com/$repo/releases/download/$tagName/$fileName"
    # 备用下载源 (如果将来有镜像)
    # $downloadUrl = "https://mirror.example.com/$fileName"

    Write-Color "`n[3/4] 下载管理工具..." "Yellow"
    Write-Color "地址: $downloadUrl" "Gray"
    
    try {
        # 处理文件占用 (Windows)
        if (Test-Path $exePath) {
            $timestamp = Get-Date -Format "yyyyMMddHHmmss"
            
            # 尝试清理非常旧的备份 (可选，这里先只尝试清理最近的 .old)
            if (Test-Path "$exePath.old") { Remove-Item -Force "$exePath.old" -ErrorAction SilentlyContinue }

            try {
                Rename-Item -Path $exePath -NewName "$fileName.old.$timestamp" -Force -ErrorAction Stop
                Write-Color "已备份旧版本: $fileName.old.$timestamp" "Gray"
            } catch {
                Write-Warning "无法重命名旧文件，如果文件正在运行，更新可能会失败。"
            }
        }

        Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath
        Write-Color "下载成功!" "Green"
    } catch {
        Write-Color "下载失败! 请检查网络连接或尝试手动下载。" "Red"
        Write-Color "错误信息: $_" "Red"
        Write-Color "`n手动下载提示:" "Yellow"
        Write-Color "1. 访问 https://github.com/$repo/releases" "Yellow"
        Write-Color "2. 下载 $fileName" "Yellow"
        Write-Color "3. 将文件放到此脚本同目录下" "Yellow"
        Write-Color "4. 重新运行此脚本" "Yellow"
        exit 1
    }
}

# 5. 配置环境
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
