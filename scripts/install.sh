#!/bin/bash
# ========================================
# Codes 一键安装脚本 v1.1
# 使用方式: curl -fsSL https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/scripts/install.sh | bash
# ========================================

set -e

REPO="1186258278/OpenCodeChineseTranslation"
BRANCH="main"
REPO_GITEE="QtCodeCreators/OpenCodeChineseTranslation"
LIB_DIR="/usr/local/lib/codes"
BIN_DIR="/usr/local/bin"
EXPECTED_VERSION="1.1.0"

# 智能 sudo
SUDO_CMD=""
if [ "$(id -u)" != "0" ]; then
    if command -v sudo &> /dev/null; then
        SUDO_CMD="sudo"
    else
        echo "错误: 需要 root 权限"
        echo "请运行: sudo bash $0"
        exit 1
    fi
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Codes 一键安装 v1.1                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 清理旧版本（解决缓存问题）
echo "→ 清理旧版本..."
$SUDO_CMD rm -rf "$LIB_DIR"
$SUDO_CMD rm -f "$BIN_DIR/codes"

# 创建库目录
echo "→ 创建安装目录..."
$SUDO_CMD mkdir -p "$LIB_DIR"

# 下载脚本（GitHub 失败则尝试 Gitee）
echo "→ 下载 codes.sh..."

# GitHub 源
GITHUB_URL="https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/codes/codes.sh"
# Gitee 备用源
GITEE_URL="https://gitee.com/$REPO_GITEE/raw/main/scripts/codes/codes.sh"

downloaded=false
download_source=""

if curl -fsSL --max-time 10 "$GITHUB_URL" -o "$LIB_DIR/codes.sh" 2>/dev/null; then
    echo "  ✓ 从 GitHub 下载成功"
    downloaded=true
    download_source="GitHub"
elif curl -fsSL --max-time 10 "$GITEE_URL" -o "$LIB_DIR/codes.sh" 2>/dev/null; then
    echo "  ✓ 从 Gitee 下载成功（备用源）"
    downloaded=true
    download_source="Gitee"
else
    # 尝试 wget
    if command -v wget &> /dev/null; then
        if wget -q --timeout=10 -O "$LIB_DIR/codes.sh" "$GITHUB_URL" 2>/dev/null; then
            echo "  ✓ 从 GitHub 下载成功 (wget)"
            downloaded=true
            download_source="GitHub"
        elif wget -q --timeout=10 -O "$LIB_DIR/codes.sh" "$GITEE_URL" 2>/dev/null; then
            echo "  ✓ 从 Gitee 下载成功 (wget备用源)"
            downloaded=true
            download_source="Gitee"
        fi
    fi
fi

if [ "$downloaded" = false ]; then
    echo "  ✗ 下载失败，请检查网络"
    echo ""
    echo "手动下载链接:"
    echo "  GitHub: $GITHUB_URL"
    echo "  Gitee:  $GITEE_URL"
    exit 1
fi

$SUDO_CMD chmod +x "$LIB_DIR/codes.sh"

# 验证版本号
echo "→ 验证版本..."
DOWNLOAD_VERSION=$($SUDO_CMD grep '^VERSION=' "$LIB_DIR/codes.sh" 2>/dev/null | head -1 | cut -d'"' -f2)
if [ -z "$DOWNLOAD_VERSION" ]; then
    echo "  ⚠ 警告: 无法检测版本号"
elif [ "$DOWNLOAD_VERSION" != "$EXPECTED_VERSION" ]; then
    echo "  ⚠ 警告: 下载版本 ($DOWNLOAD_VERSION) 与预期版本 ($EXPECTED_VERSION) 不一致"
    echo "  如果遇到问题，请手动清理后重试:"
    echo "    sudo rm -rf /usr/local/lib/codes /usr/local/bin/codes"
    echo "    然后重新运行此安装命令"
else
    echo "  ✓ 版本正确: v$DOWNLOAD_VERSION"
fi

# 创建 wrapper 脚本
echo "→ 创建 codes 命令..."
cat << 'EOF' | $SUDO_CMD tee "$BIN_DIR/codes" > /dev/null
#!/bin/bash
SCRIPT_DIR="/usr/local/lib/codes"
bash "$SCRIPT_DIR/codes.sh" "$@"
EOF

$SUDO_CMD chmod +x "$BIN_DIR/codes"

echo ""
echo "✓ 安装完成!"
echo ""
echo "使用方法:"
echo "  codes doctor       # 环境诊断"
echo "  codes install      # 安装组件"
echo "  codes install 1    # 只安装 Node.js"
echo "  codes node lts     # 切换到 LTS"
echo "  codes --help       # 更多帮助"
echo ""
