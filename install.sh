#!/bin/bash

# OpenCode 汉化工具一键安装脚本 (Go CLI 版)
# 无需 Node.js/Bun 依赖

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}   OpenCode 汉化管理工具安装脚本 (v8.1)   ${NC}"
echo -e "${CYAN}==============================================${NC}"

# 1. 检测系统架构
echo -e "\n${YELLOW}[1/4] 检测系统架构...${NC}"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

if [ "$ARCH" == "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" == "aarch64" ] || [ "$ARCH" == "arm64" ]; then
    ARCH="arm64"
else
    echo -e "${RED}不支持的架构: $ARCH${NC}"
    exit 1
fi

if [ "$OS" != "linux" ] && [ "$OS" != "darwin" ]; then
    echo -e "${RED}不支持的操作系统: $OS${NC}"
    exit 1
fi

echo -e "系统: $OS $ARCH"

# 2. 获取最新版本
echo -e "\n${YELLOW}[2/4] 获取最新版本信息...${NC}"
REPO="1186258278/OpenCodeChineseTranslation"
TAG_NAME="v8.1.0" # 默认版本

if command -v curl >/dev/null 2>&1; then
    LATEST_JSON=$(curl -s --max-time 5 "https://api.github.com/repos/$REPO/releases/latest" || echo "")
    if [ -n "$LATEST_JSON" ]; then
        REMOTE_TAG=$(echo "$LATEST_JSON" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        if [ -n "$REMOTE_TAG" ]; then
            TAG_NAME="$REMOTE_TAG"
        fi
    fi
fi

echo -e "最新版本: ${GREEN}${TAG_NAME}${NC}"

# 3. 下载
echo -e "\n${YELLOW}[3/4] 下载管理工具...${NC}"

INSTALL_DIR="$HOME/.opencode-i18n"
BIN_DIR="$INSTALL_DIR/bin"
EXE_PATH="$BIN_DIR/opencode-cli"
FILE_NAME="opencode-cli-$OS-$ARCH"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG_NAME/$FILE_NAME"

# Gitee 镜像 (可选)
# DOWNLOAD_URL="https://ghproxy.com/$DOWNLOAD_URL"

echo -e "地址: $DOWNLOAD_URL"

mkdir -p "$BIN_DIR"

if curl -L --progress-bar -o "$EXE_PATH" "$DOWNLOAD_URL"; then
    chmod +x "$EXE_PATH"
    echo -e "${GREEN}下载成功!${NC}"
else
    echo -e "${RED}下载失败! 请检查网络连接。${NC}"
    exit 1
fi

# 4. 配置环境
echo -e "\n${YELLOW}[4/4] 配置环境变量...${NC}"

SHELL_CONFIG=""
case "$SHELL" in
    */zsh) SHELL_CONFIG="$HOME/.zshrc" ;;
    */bash) SHELL_CONFIG="$HOME/.bashrc" ;;
    *) SHELL_CONFIG="$HOME/.profile" ;;
esac

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo -e "\n# OpenCode CLI" >> "$SHELL_CONFIG"
    echo -e "export PATH=\"\$PATH:$BIN_DIR\"" >> "$SHELL_CONFIG"
    echo -e "${GREEN}已将 $BIN_DIR 添加到 $SHELL_CONFIG${NC}"
    echo -e "${YELLOW}请执行 source $SHELL_CONFIG 或重启终端使配置生效${NC}"
else
    echo -e "${GREEN}环境变量已配置${NC}"
fi

echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   安装完成!   ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "\n请重启终端，然后运行以下命令启动:"
echo -e "  ${CYAN}opencode-cli interactive${NC}"
