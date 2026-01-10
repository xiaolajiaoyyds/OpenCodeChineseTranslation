#!/bin/bash
# ========================================
# Codes 一键安装脚本
# 使用方式: curl -fsSL https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/scripts/install.sh | bash
# ========================================

set -e

REPO="1186258278/OpenCodeChineseTranslation"
BRANCH="main"
SCRIPT_DIR="$HOME/.codes-install"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Codes 一键安装                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 创建临时目录
rm -rf "$SCRIPT_DIR"
mkdir -p "$SCRIPT_DIR"

# 下载脚本
echo "→ 下载脚本..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/codes.sh" -o "$SCRIPT_DIR/codes.sh"
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/init-dev-env.sh" -o "$SCRIPT_DIR/init-dev-env.sh"

# 安装
echo "→ 开始安装..."
bash "$SCRIPT_DIR/codes.sh" install

# 清理
rm -rf "$SCRIPT_DIR"

echo ""
echo "✓ 安装完成!"
echo "  运行 'source ~/.bashrc' 使更改生效"
echo "  然后使用 'codes doctor' 查看状态"
