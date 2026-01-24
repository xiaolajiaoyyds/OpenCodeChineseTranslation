# OpenCode 发版脚本 (PowerShell)
# 用法: .\release.ps1 -Version 8.5.0 -Message "发布说明"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$Message = "Release v$Version"
)

# 验证版本格式 (x.y.z)
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "❌ 版本号格式错误! 请使用 x.y.z 格式 (例如 8.5.0)"
    exit 1
}

$FullVersion = "v$Version"
Write-Host "`n🚀 开始准备发布 $FullVersion ..." -ForegroundColor Cyan

# 1. 更新版本文件
function Update-FileContent {
    param ($Path, $Regex, $Replacement, $Description)
    Write-Host "  → 更新 $Description ($Path)..." -ForegroundColor Yellow
    if (Test-Path $Path) {
        (Get-Content $Path) -replace $Regex, $Replacement | Set-Content $Path
    } else {
        Write-Warning "    ⚠️ 文件不存在: $Path"
    }
}

# 1.1 cli-go/internal/core/version.go
Update-FileContent `
    -Path "cli-go/internal/core/version.go" `
    -Regex 'VERSION = ".*?"' `
    -Replacement "VERSION = `"$Version`"" `
    -Description "CLI 版本常量"

# 1.2 install.ps1
Update-FileContent `
    -Path "install.ps1" `
    -Regex 'v\d+\.\d+\.\d+' `
    -Replacement "$FullVersion" `
    -Description "PowerShell 安装脚本"

# 1.3 install.sh
Update-FileContent `
    -Path "install.sh" `
    -Regex 'v\d+\.\d+\.\d+' `
    -Replacement "$FullVersion" `
    -Description "Shell 安装脚本"

# 1.4 cli-go/build.sh
Update-FileContent `
    -Path "cli-go/build.sh" `
    -Regex 'VERSION=".*?"' `
    -Replacement "VERSION=`"$Version`"" `
    -Description "Build Shell 脚本"

# 1.5 cli-go/build.ps1
Update-FileContent `
    -Path "cli-go/build.ps1" `
    -Regex '\$VERSION = ".*?"' `
    -Replacement "`$VERSION = `"$Version`"" `
    -Description "Build PowerShell 脚本"

Write-Host "`n✅ 版本号更新完成!" -ForegroundColor Green

# 2. 交互式确认
Write-Host "`n即将执行 Git 操作:" -ForegroundColor Cyan
Write-Host "  1. git add ."
Write-Host "  2. git commit -m `"chore: release $FullVersion`""
Write-Host "  3. git tag $FullVersion -m `"$Message`""
Write-Host "  4. git push origin main --tags"

$confirmation = Read-Host "`n确认执行? [Y/n]"
if ($confirmation -match "^[Yy]") {
    try {
        Write-Host "`n📦 执行 Git 提交..." -ForegroundColor Yellow
        git add .
        git commit -m "chore: release $FullVersion"
        
        Write-Host "🏷️ 打 Tag..." -ForegroundColor Yellow
        git tag -a $FullVersion -m "$Message"
        
        Write-Host "⬆️ 推送代码和 Tags..." -ForegroundColor Yellow
        git push origin main --tags
        
        Write-Host "`n🎉 发布流程触发成功! 请检查 GitHub Actions 状态。" -ForegroundColor Green
    } catch {
        Write-Error "❌ Git 操作失败: $_"
        exit 1
    }
} else {
    Write-Host "操作已取消。" -ForegroundColor Yellow
}

