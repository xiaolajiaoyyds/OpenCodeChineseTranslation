#!/bin/bash

# OpenCode 汉化工具一键安装脚本
# 支持 macOS 和 Linux

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}   OpenCode 汉化管理工具一键安装脚本   ${NC}"
echo -e "${CYAN}==============================================${NC}"

# 1. 检查依赖
echo -e "\n${YELLOW}[1/5] 检查环境依赖...${NC}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}错误: 未找到命令 '$1'。请先安装它。${NC}"
        exit 1
    fi
}

check_cmd curl
check_cmd unzip
check_cmd node
check_cmd npm

# 检查 Bun (可选)
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}提示: 未检测到 Bun。虽然不是必须的，但推荐安装以获得更快的构建速度。${NC}"
    echo -e "      安装命令: curl -fsSL https://bun.sh/install | bash"
fi

# 2. 获取最新版本
echo -e "\n${YELLOW}[2/5] 获取最新版本信息...${NC}"
REPO="1186258278/OpenCodeChineseTranslation"
LATEST_RELEASE=$(curl -s "https://api.github.com/repos/$REPO/releases/latest")
TAG_NAME=$(echo "$LATEST_RELEASE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$TAG_NAME" ]; then
    echo -e "${RED}错误: 无法获取最新版本信息。${NC}"
    exit 1
fi

echo -e "最新版本: ${GREEN}${TAG_NAME}${NC}"

# 3. 下载
INSTALL_DIR="$HOME/.opencode-i18n"
ZIP_URL="https://github.com/$REPO/releases/download/$TAG_NAME/opencode-i18n-tool-$TAG_NAME.zip"
TEMP_ZIP="/tmp/opencode-i18n.zip"

echo -e "\n${YELLOW}[3/5] 下载汉化工具...${NC}"
echo -e "下载地址: $ZIP_URL"

if curl -L -o "$TEMP_ZIP" "$ZIP_URL"; then
    echo -e "${GREEN}下载成功!${NC}"
else
    echo -e "${RED}下载失败! 请检查网络连接。${NC}"
    exit 1
fi

# 4. 解压安装
echo -e "\n${YELLOW}[4/5] 安装到 $INSTALL_DIR ...${NC}"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "清理旧版本..."
    rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"
unzip -q "$TEMP_ZIP" -d "$INSTALL_DIR"
rm "$TEMP_ZIP"

# 5. 安装依赖
echo -e "\n${YELLOW}[5/5] 安装项目依赖...${NC}"
cd "$INSTALL_DIR/scripts"
npm install --production

# 链接全局命令 (需要 sudo)
echo -e "\n${YELLOW}正在创建全局命令 'opencodenpm'...${NC}"
if [ -w "/usr/local/bin" ]; then
    ln -sf "$INSTALL_DIR/scripts/bin/opencodenpm" "/usr/local/bin/opencodenpm"
else
    echo -e "${YELLOW}需要管理员权限来创建全局链接:${NC}"
    sudo ln -sf "$INSTALL_DIR/scripts/bin/opencodenpm" "/usr/local/bin/opencodenpm"
fi

echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   安装完成!   ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "\n请直接在终端运行以下命令启动:"
echo -e "  ${CYAN}opencodenpm${NC}"
echo -e "\n如有问题，请访问 GitHub 提交 Issue。"
