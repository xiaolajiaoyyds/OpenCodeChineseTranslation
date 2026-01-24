#!/bin/bash
# OpenCode CLI 跨平台编译脚本

set -e

APP_NAME="opencode-cli"
VERSION="8.5.0"
ASSETS_SRC="../opencode-i18n"
ASSETS_DEST="internal/core/assets/opencode-i18n"

# 输出目录
OUTPUT_DIR="dist"
mkdir -p "$OUTPUT_DIR"

echo "📦 构建 $APP_NAME v$VERSION"
echo ""

# 1. 准备嵌入资源
echo "  → 准备汉化资源..."
if [ -d "$ASSETS_SRC" ]; then
    mkdir -p "$(dirname "$ASSETS_DEST")"
    cp -r "$ASSETS_SRC" "$ASSETS_DEST"
else
    echo "⚠️ 警告: 未找到汉化资源目录: $ASSETS_SRC"
fi

# 构建函数
build() {
    local GOOS=$1
    local GOARCH=$2
    local EXT=$3
    local OUTPUT="${OUTPUT_DIR}/${APP_NAME}-${GOOS}-${GOARCH}${EXT}"
    
    echo "  → 构建 ${GOOS}/${GOARCH}..."
    GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="-s -w" -o "$OUTPUT" .
    echo "    ✓ $OUTPUT"
}

# Windows
build windows amd64 .exe
build windows arm64 .exe

# macOS
build darwin amd64 ""
build darwin arm64 ""

# Linux
build linux amd64 ""
build linux arm64 ""

# 清理资源
echo "  → 清理临时资源..."
if [ -d "$ASSETS_DEST" ]; then
    rm -rf "$ASSETS_DEST"
    # 尝试删除空的 assets 目录
    rmdir "$(dirname "$ASSETS_DEST")" 2>/dev/null || true
fi

echo ""
echo "✓ 构建完成!"
echo ""
ls -lh "$OUTPUT_DIR"
