#!/bin/bash
# ========================================
# Codes 一键安装脚本
# 使用方式: curl -fsSL https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/scripts/install.sh | bash
# ========================================

set -e

REPO="1186258278/OpenCodeChineseTranslation"
BRANCH="main"
LIB_DIR="/usr/local/lib/codes"
BIN_DIR="/usr/local/bin"

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
echo "║     Codes 一键安装                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 创建库目录
echo "→ 创建安装目录..."
$SUDO_CMD mkdir -p "$LIB_DIR"

# 下载脚本
echo "→ 下载 codes.sh..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/codes.sh" -o "$LIB_DIR/codes.sh"
$SUDO_CMD chmod +x "$LIB_DIR/codes.sh"

# 创建 wrapper 脚本
echo "→ 创建 codes 命令..."
cat << 'EOF' | $SUDO_CMD tee "$BIN_DIR/codes" > /dev/null
#!/bin/bash
SCRIPT_DIR="/usr/local/lib/codes"
bash "$SCRIPT_DIR/codes.sh" "$@"
EOF

$SUDO_CMD chmod +x "$BIN_DIR/codes"

# 添加到 .bashrc (如果需要)
if ! grep -q "codes/lib" ~/.bashrc 2>/dev/null; then
    # 不需要添加，codes 是独立命令
    :
fi

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
