#!/bin/bash
# ========================================
# Codes - 开发环境智能管理工具 v2.0
# 全局命令: codes
# 功能: 环境诊断 / 组件管理 / 工具安装 / 汉化配置
# ========================================

VERSION="2.0.0"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
DARK_GRAY='\033[0;90m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m'

# 获取脚本目录和资源路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 多路径查找资源文件
find_resource() {
    local name=$1
    local paths=(
        "$SCRIPT_DIR/$name"           # 同目录
        "/usr/local/lib/codes/$name"  # 全局安装目录
        "$HOME/.codes/$name"          # 用户目录
        "/tmp/codes/$name"            # 临时目录
    )

    for path in "${paths[@]}"; do
        if [ -f "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    return 1
}

# 国内镜像
NPM_REGISTRY="https://registry.npmmirror.com"
NVM_INSTALL_SCRIPT="https://ghp.ci/https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh"

# 更新检查配置
UPDATE_CHECK_FILE="$HOME/.codes/update_check"
UPDATE_CHECK_INTERVAL=7  # 天数
REPO_URL="https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main"
REPO_URL_GITEE="https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation/raw/main"

# ==================== 工具函数 ====================
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     Codes - 开发环境管理工具 v${VERSION}                       ║${NC}"
    echo -e "${CYAN}║     环境诊断 • 组件管理 • 快捷启动                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_separator() {
    echo -e "${DARK_GRAY}────────────────────────────────────────────────────────${NC}"
}

# 智能 sudo
SUDO_CMD=""
if [ "$(id -u)" = "0" ]; then
    SUDO_CMD=""
elif command -v sudo &> /dev/null; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# 命令检测
has_cmd() {
    command -v "$1" &> /dev/null && return 0

    # 检查 nvm 路径
    if [ -x "$HOME/.nvm/versions/node/*/bin/$1" ] 2>/dev/null; then
        export PATH="$HOME/.nvm/versions/node/*/bin:$PATH"
        return 0
    fi

    # 检查 bun 路径
    if [ "$1" = "bun" ] && [ -x "$HOME/.bun/bin/bun" ] 2>/dev/null; then
        export PATH="$HOME/.bun/bin:$PATH"
        return 0
    fi

    local common_paths=("/usr/local/bin" "/usr/bin" "$HOME/.local/bin")
    for path in "${common_paths[@]}"; do
        [ -x "$path/$1" ] && return 0
    done

    return 1
}

# 获取版本
get_ver() {
    if has_cmd "$1"; then
        "$1" --version 2>&1 | head -n 1 | awk '{print $NF}' || echo "unknown"
    else
        echo "not installed"
    fi
}

# 获取包管理器
get_pm() {
    if has_cmd dnf; then echo "dnf"
    elif has_cmd yum; then echo "yum"
    elif has_cmd apt-get; then echo "apt"
    elif has_cmd brew; then echo "brew"
    elif has_cmd pacman; then echo "pacman"
    else echo ""; fi
}

# 加载 nvm
load_nvm() {
    if [ -d "$HOME/.nvm" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        \. "$NVM_DIR/nvm.sh"

        if [ -d "$NVM_DIR/versions/node" ]; then
            local latest_node=$(ls -1 "$NVM_DIR/versions/node" 2>/dev/null | sort -V | tail -1)
            if [ -n "$latest_node" ] && [ -d "$NVM_DIR/versions/node/$latest_node/bin" ]; then
                export PATH="$NVM_DIR/versions/node/$latest_node/bin:$PATH"
            fi
        fi
        return 0
    fi
    return 1
}

# 加载 bun
load_bun() {
    if [ -d "$HOME/.bun/bin" ]; then
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        return 0
    fi
    return 1
}

# 自动加载 npm 全局 bin 目录到 PATH
load_npm() {
    # 如果 npm 命令可用
    if command -v npm &> /dev/null; then
        local npm_bin="$(npm config get prefix 2>/dev/null)/bin"
        if [ -n "$npm_bin" ] && [ -d "$npm_bin" ]; then
            # 检查是否已在 PATH 中
            if [[ ":$PATH:" != *":$npm_bin:"* ]]; then
                export PATH="$npm_bin:$PATH"
            fi
            return 0
        fi
    fi
    return 1
}

# 自动刷新环境（每次启动时调用）
refresh_env() {
    load_nvm
    load_bun
    load_npm
}

# ==================== 版本检测与更新 ====================
# 检查是否需要检查更新
should_check_update() {
    local current_time=$(date +%s)
    local interval_seconds=$((UPDATE_CHECK_INTERVAL * 24 * 60 * 60))

    if [ ! -f "$UPDATE_CHECK_FILE" ]; then
        return 0  # 首次运行，需要检查
    fi

    local last_check=$(cat "$UPDATE_CHECK_FILE" 2>/dev/null || echo "0")
    local elapsed=$((current_time - last_check))

    [ $elapsed -ge $interval_seconds ]
}

# 记录检查时间
record_check_time() {
    local current_time=$(date +%s)
    mkdir -p "$(dirname "$UPDATE_CHECK_FILE")"
    echo "$current_time" > "$UPDATE_CHECK_FILE"
}

# 获取远程最新版本
get_remote_version() {
    # 先尝试 GitHub
    local remote_version=$(curl -fsSL --max-time 5 "$REPO_URL/scripts/codes/codes.sh" 2>/dev/null | grep '^VERSION="' | head -1 | cut -d'"' -f2)

    # 失败则尝试 Gitee
    if [ -z "$remote_version" ]; then
        remote_version=$(curl -fsSL --max-time 5 "$REPO_URL_GITEE/scripts/codes/codes.sh" 2>/dev/null | grep '^VERSION="' | head -1 | cut -d'"' -f2)
    fi

    echo "$remote_version"
}

# 版本比较
version_compare() {
    local current=$1
    local remote=$2

    # 移除 'v' 前缀
    current="${current#v}"
    remote="${remote#v}"

    [ "$current" != "$remote" ]
}

# 检查更新
check_update() {
    local silent=${1:-false}

    if ! should_check_update && [ "$silent" = "true" ]; then
        return 0
    fi

    local remote_version=$(get_remote_version)

    if [ -z "$remote_version" ]; then
        [ "$silent" = "false" ] && print_color "${YELLOW}" "  ⚠ 无法获取远程版本信息"
        return 1
    fi

    if version_compare "$VERSION" "$remote_version"; then
        print_color "${CYAN}" "  ═══════════════════════════════════════"
        print_color "${YELLOW}" "  🎉 发现新版本: v${remote_version}"
        print_color "${DARK_GRAY}" "     当前版本: v${VERSION}"
        print_color "${CYAN}" "  ═══════════════════════════════════════"
        echo ""
        print_color "${CYAN}" "  更新方法:"
        print_color "${WHITE}" "    codes update       # 自动更新"
        print_color "${WHITE}" "    codes check-update  # 手动检查更新"
        echo ""
        record_check_time
        return 0
    fi

    [ "$silent" = "false" ] && print_color "${GREEN}" "  ✓ 已是最新版本 v${VERSION}"
    record_check_time
    return 1
}

# 自更新
cmd_update() {
    print_header
    print_color "${YELLOW}" "       更新 Codes"
    print_separator
    echo ""

    local remote_version=$(get_remote_version)

    if [ -z "$remote_version" ]; then
        print_color "${RED}" "  ✗ 无法获取远程版本信息"
        print_color "${DARK_GRAY}" "  请检查网络连接"
        return 1
    fi

    print_color "${CYAN}" "  当前版本: ${WHITE}v${VERSION}${NC}"
    print_color "${CYAN}" "  远程版本: ${WHITE}v${remote_version}${NC}"
    echo ""

    if ! version_compare "$VERSION" "$remote_version"; then
        print_color "${GREEN}" "  ✓ 已是最新版本"
        return 0
    fi

    print_color "${YELLOW}" "  → 开始更新..."
    echo ""

    local install_dir="/usr/local/lib/codes"
    local backup_dir="/tmp/codes_backup_$(date +%s)"

    # 备份当前版本
    print_color "${DARK_GRAY}" "  备份当前版本..."
    $SUDO_CMD mkdir -p "$backup_dir"
    $SUDO_CMD cp -a "$install_dir"/* "$backup_dir/" 2>/dev/null

    # 下载新版本
    print_color "${DARK_GRAY}" "  下载新版本..."
    local new_script="/tmp/codes_new.sh"

    if curl -fsSL --max-time 30 "$REPO_URL/scripts/codes/codes.sh" -o "$new_script" 2>/dev/null; then
        : # 成功
    elif curl -fsSL --max-time 30 "$REPO_URL_GITEE/scripts/codes/codes.sh" -o "$new_script" 2>/dev/null; then
        : # 成功（Gitee）
    else
        print_color "${RED}" "  ✗ 下载失败"
        return 1
    fi

    # 验证下载的版本
    local downloaded_version=$(grep '^VERSION="' "$new_script" 2>/dev/null | head -1 | cut -d'"' -f2)
    if [ "$downloaded_version" != "$remote_version" ]; then
        print_color "${RED}" "  ✗ 版本验证失败"
        rm -f "$new_script"
        return 1
    fi

    # 安装新版本
    print_color "${DARK_GRAY}" "  安装新版本..."
    $SUDO_CMD mkdir -p "$install_dir"
    $SUDO_CMD cp "$new_script" "$install_dir/codes.sh"
    $SUDO_CMD chmod +x "$install_dir/codes.sh"

    # 创建 wrapper
    $SUDO_CMD tee /usr/local/bin/codes > /dev/null << 'EOF'
#!/bin/bash
SCRIPT_DIR="/usr/local/lib/codes"
bash "$SCRIPT_DIR/codes.sh" "$@"
EOF
    $SUDO_CMD chmod +x /usr/local/bin/codes

    rm -f "$new_script"

    print_color "${GREEN}" "  ✓ 更新成功! v${VERSION} → v${remote_version}"
    echo ""
    print_color "${YELLOW}" "  请运行以下命令使更新生效:"
    print_color "${WHITE}" "    hash -r && codes --version"
    echo ""

    # 清理备份
    rm -rf "$backup_dir"
    record_check_time

    return 0
}

# 手动检查更新命令
cmd_check_update() {
    print_header
    print_color "${YELLOW}" "       检查更新"
    print_separator
    echo ""

    print_color "${CYAN}" "  当前版本: ${WHITE}v${VERSION}${NC}"
    echo ""

    local remote_version=$(get_remote_version)

    if [ -z "$remote_version" ]; then
        print_color "${RED}" "  ✗ 无法获取远程版本信息"
        return 1
    fi

    print_color "${CYAN}" "  远程版本: ${WHITE}v${remote_version}${NC}"
    echo ""

    if version_compare "$VERSION" "$remote_version"; then
        print_color "${YELLOW}" "  ✓ 有新版本可用!"
        echo ""
        print_color "${WHITE}" "  运行 ${CYAN}codes update${WHITE} 来更新"
    else
        print_color "${GREEN}" "  ✓ 已是最新版本"
    fi

    echo ""
    record_check_time
}

# ==================== 环境诊断 ====================
show_status() {
    local tool_name=$1
    local cmd_name=$2
    local required=$3

    if has_cmd "$cmd_name"; then
        local version=$(get_ver "$cmd_name")
        echo -e "  ${GREEN}[✓]${NC} $tool_name: ${WHITE}$version${NC}"
    elif [ "$required" = "yes" ]; then
        echo -e "  ${RED}[✗]${NC} $tool_name: ${YELLOW}未安装${NC}"
    else
        echo -e "  ${DARK_GRAY}[⊙]${NC} $tool_name: ${DARK_GRAY}未安装（可选）${NC}"
    fi
}

cmd_doctor() {
    print_header
    print_color "${YELLOW}" "       环境诊断"
    print_separator
    echo ""

    print_color "${CYAN}" "核心工具:"
    show_status "Node.js" "node" "yes"
    show_status "npm" "npm" "yes"
    show_status "Bun" "bun" "no"
    echo ""

    print_color "${CYAN}" "开发工具:"
    show_status "Git" "git" "yes"
    show_status "Python3" "python3" "no"
    echo ""

    print_color "${CYAN}" "AI 工具:"
    # 检查 coding-helper 是否在 npm bin 目录
    local npm_bin=$(npm config get prefix 2>/dev/null)/bin
    if has_cmd chelper || has_cmd coding-helper || { [ -n "$npm_bin" ] && [ -f "$npm_bin/coding-helper" ]; }; then
        echo -e "  ${GREEN}[✓]${NC} coding-helper: ${WHITE}已安装${NC}"
    else
        echo -e "  ${DARK_GRAY}[⊙]${NC} coding-helper: ${DARK_GRAY}未安装（可选）${NC}"
    fi
    echo ""

    # 显示环境变量
    print_color "${CYAN}" "环境变量:"
    [ -n "$NVM_DIR" ] && echo -e "  ${GREEN}[✓]${NC} NVM_DIR=$NVM_DIR" || echo -e "  ${DARK_GRAY}[⊙]${NC} NVM_DIR 未设置"
    [ -n "$BUN_INSTALL" ] && echo -e "  ${GREEN}[✓]${NC} BUN_INSTALL=$BUN_INSTALL" || echo -e "  ${DARK_GRAY}[⊙]${NC} BUN_INSTALL 未设置"
    echo ""

    print_separator
    print_color "${CYAN}" "快捷命令:"
    echo -e "  ${DARK_GRAY}codes install [编号]${NC} - 安装组件（可指定编号）"
    echo -e "  ${DARK_GRAY}codes upgrade${NC}       - 升级已安装的工具"
    echo -e "  ${DARK_GRAY}codes node <ver>${NC}    - 切换 Node.js 版本"
    echo -e "  ${DARK_GRAY}codes helper${NC}        - 启动 coding-helper"
    echo ""
}

# ==================== 安装函数 ====================

# 安装 nvm
install_nvm() {
    print_color "${CYAN}" "[1/5] 安装 nvm..."

    if [ -d "$HOME/.nvm" ]; then
        print_color "${YELLOW}" "  ⊙ nvm 已安装"
        return 0
    fi

    print_color "${DARK_GRAY}" "  下载安装脚本..."
    if command -v curl &> /dev/null; then
        curl -o- "$NVM_INSTALL_SCRIPT" | bash 2>/dev/null
    elif command -v wget &> /dev/null; then
        wget -qO- "$NVM_INSTALL_SCRIPT" | bash 2>/dev/null
    else
        print_color "${RED}" "  ✗ 需要 curl 或 wget"
        return 1
    fi

    # 加载 nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    if [ -d "$NVM_DIR" ]; then
        print_color "${GREEN}" "  ✓ nvm 安装成功"
        return 0
    else
        print_color "${RED}" "  ✗ nvm 安装失败"
        return 1
    fi
}

# 安装 Node.js
install_nodejs() {
    print_color "${CYAN}" "[2/5] 安装 Node.js..."

    if has_cmd node; then
        local version=$(get_ver node)
        print_color "${YELLOW}" "  ⊙ Node.js 已安装: $version"
        return 0
    fi

    # 先安装 nvm
    if ! [ -d "$HOME/.nvm" ]; then
        install_nvm || return 1
    fi

    load_nvm

    # 使用 nvm 安装 LTS
    print_color "${DARK_GRAY}" "  安装 Node.js LTS..."
    nvm install --lts 2>/dev/null
    nvm alias default lts/* 2>/dev/null

    load_nvm

    if has_cmd node; then
        local version=$(node -v)
        print_color "${GREEN}" "  ✓ Node.js 安装成功: $version"

        # 配置 npm 镜像
        npm config set registry $NPM_REGISTRY 2>/dev/null
        print_color "${DARK_GRAY}" "  ✓ npm 已配置国内镜像"
        return 0
    else
        print_color "${RED}" "  ✗ Node.js 安装失败"
        return 1
    fi
}

# 安装 Bun
install_bun() {
    print_color "${CYAN}" "[3/5] 安装 Bun..."

    if has_cmd bun; then
        local version=$(get_ver bun)
        print_color "${YELLOW}" "  ⊙ Bun 已安装: $version"
        return 0
    fi

    print_color "${DARK_GRAY}" "  使用官方安装脚本..."
    if command -v curl &> /dev/null; then
        curl -fsSL https://bun.sh/install | bash 2>/dev/null
    elif command -v wget &> /dev/null; then
        wget -qO- https://bun.sh/install | bash 2>/dev/null
    fi

    load_bun

    if has_cmd bun; then
        local version=$(bun --version)
        print_color "${GREEN}" "  ✓ Bun 安装成功: $version"
        return 0
    else
        print_color "${YELLOW}" "  ⊙ Bun 安装跳过（网络问题）"
        return 1
    fi
}

# 安装 Git
install_git() {
    print_color "${CYAN}" "[4/5] 安装 Git..."

    if has_cmd git; then
        local version=$(get_ver git)
        print_color "${YELLOW}" "  ⊙ Git 已安装: $version"
        return 0
    fi

    local pm=$(get_pm)
    if [ -n "$pm" ]; then
        print_color "${DARK_GRAY}" "  使用 $pm 安装..."
        case $pm in
            apt)
                $SUDO_CMD apt-get update -qq 2>/dev/null
                $SUDO_CMD apt-get install -y git 2>/dev/null
                ;;
            yum|dnf)
                $SUDO_CMD $pm install -y git 2>/dev/null
                ;;
            brew)
                brew install git 2>/dev/null
                ;;
            pacman)
                $SUDO_CMD pacman -S --noconfirm git 2>/dev/null
                ;;
        esac
    fi

    if has_cmd git; then
        print_color "${GREEN}" "  ✓ Git 安装成功"
        return 0
    else
        print_color "${RED}" "  ✗ Git 安装失败"
        return 1
    fi
}

# 安装 Python
install_python() {
    print_color "${CYAN}" "[5/5] 安装 Python..."

    if has_cmd python3 || has_cmd python; then
        local version=$(get_ver python3)
        print_color "${YELLOW}" "  ⊙ Python 已安装: $version"
        return 0
    fi

    local pm=$(get_pm)
    if [ -n "$pm" ]; then
        print_color "${DARK_GRAY}" "  使用 $pm 安装..."
        case $pm in
            apt)
                $SUDO_CMD apt-get update -qq 2>/dev/null
                $SUDO_CMD apt-get install -y python3 python3-pip 2>/dev/null
                ;;
            yum|dnf)
                $SUDO_CMD $pm install -y python3 python3-pip 2>/dev/null
                ;;
            brew)
                brew install python3 2>/dev/null
                ;;
            pacman)
                $SUDO_CMD pacman -S --noconfirm python python-pip 2>/dev/null
                ;;
        esac
    fi

    if has_cmd python3; then
        print_color "${GREEN}" "  ✓ Python 安装成功"
        return 0
    else
        print_color "${YELLOW}" "  ⊙ Python 安装跳过"
        return 1
    fi
}

# 安装 coding-helper
install_coding_helper() {
    print_color "${CYAN}" "安装 @z_ai/coding-helper..."

    if ! has_cmd npm; then
        print_color "${YELLOW}" "  npm 未找到，尝试先安装 Node.js..."
        install_nodejs
    fi

    if ! has_cmd npm; then
        print_color "${RED}" "  ✗ 需要先安装 npm"
        return 1
    fi

    # 获取 npm 全局 bin 目录 (npm bin -g 已废弃)
    local npm_bin="$(npm config get prefix 2>/dev/null)/bin"

    # 检查是否已安装
    if [ -n "$npm_bin" ] && { [ -f "$npm_bin/coding-helper" ] || [ -f "$npm_bin/chelper" ]; }; then
        print_color "${YELLOW}" "  ⊙ coding-helper 已安装"
        print_color "${DARK_GRAY}" "  ! 请运行: export PATH=\"$npm_bin:\$PATH\""
        return 0
    fi

    print_color "${DARK_GRAY}" "  使用国内镜像安装..."
    npm install -g @z_ai/coding-helper --registry=$NPM_REGISTRY 2>/dev/null

    # 重新获取 npm bin 路径
    npm_bin="$(npm config get prefix 2>/dev/null)/bin"

    if [ -n "$npm_bin" ] && { [ -f "$npm_bin/coding-helper" ] || [ -f "$npm_bin/chelper" ]; }; then
        print_color "${GREEN}" "  ✓ coding-helper 安装成功"
        print_color "${YELLOW}" "  ! 请运行: export PATH=\"$npm_bin:\$PATH\""
        return 0
    fi

    # 备用：官方源
    print_color "${YELLOW}" "  尝试官方源..."
    npm install -g @z_ai/coding-helper 2>/dev/null

    # 重新获取 npm bin 路径
    npm_bin="$(npm config get prefix 2>/dev/null)/bin"

    if [ -n "$npm_bin" ] && { [ -f "$npm_bin/coding-helper" ] || [ -f "$npm_bin/chelper" ]; }; then
        print_color "${GREEN}" "  ✓ coding-helper 安装成功"
        print_color "${YELLOW}" "  ! 请运行: export PATH=\"$npm_bin:\$PATH\""
        return 0
    fi

    print_color "${YELLOW}" "  ⊙ coding-helper 安装跳过（包不存在或网络问题）"
    print_color "${DARK_GRAY}" "  ! 或使用 npx 方式: npx @z_ai/coding-helper"
    return 1
}

# 组件列表
declare -a COMPONENTS=(
    "1:Node.js:install_nodejs:node"
    "2:Bun:install_bun:bun"
    "3:Git:install_git:git"
    "4:Python:install_python:python3"
    "5:nvm:install_nvm:nvm"
    "6:coding-helper:install_coding_helper:chelper"
)

# 解析组件
parse_component() {
    local num=$1
    for comp in "${COMPONENTS[@]}"; do
        local id="${comp%%:*}"
        if [ "$id" = "$num" ]; then
            local rest="${comp#*:}"
            local name="${rest%%:*}"
            rest="${rest#*:}"
            local func="${rest%%:*}"
            echo "$func|$name"
            return 0
        fi
    done
    return 1
}

# ==================== UI 工具函数 ====================
show_progress() {
    local current=$1
    local total=$2
    local width=40
    local percent=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    printf "\r${CYAN}[${NC}"
    printf "${GREEN}%${filled}s${NC}" "" | tr ' ' '='
    printf "${DARK_GRAY}%${empty}s${NC}" "" | tr ' ' ' '
    printf "${CYAN}]${NC} ${YELLOW}%d%%${NC}" "$percent"
}

confirm_action() {
    local prompt=$1
    local default=${2:-"n"}

    print_color "${YELLOW}" "  $prompt"
    echo -e " ${DARK_GRAY}[y/N]${NC} " | tr -d '\n'
    read -r response

    if [[ -z "$response" ]]; then
        [[ "$default" =~ ^[Yy] ]]
    else
        [[ "$response" =~ ^[Yy] ]]
    fi
}

show_spinner() {
    local pid=$1
    local message=$2
    local delay=0.1
    local spinstr='|/-\'
    local temp

    while kill -0 $pid 2>/dev/null; do
        temp=${spinstr#?}
        printf " ${CYAN}%c${NC} %s" "$spinstr" "$message"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\r"
    done
    printf "\r"
}

# ==================== ClaudeCode 安装 ====================
install_claudecode() {
    print_header
    print_color "${CYAN}" "       安装 Claude Code"
    print_separator
    echo ""

    # 检查是否已安装
    if has_cmd claude; then
        local version=$(claude --version 2>/dev/null || echo "未知")
        print_color "${GREEN}" "  ✓ Claude Code 已安装: v$version"
        echo ""
        if confirm_action "是否重新安装？"; then
            print_color "${YELLOW}" "  正在卸载旧版本..."
            npm uninstall -g @anthropic-ai/claude-code 2>/dev/null
        else
            return 0
        fi
    fi

    # 确保 npm 可用
    if ! has_cmd npm; then
        print_color "${RED}" "  ✗ 需要先安装 Node.js"
        echo ""
        if confirm_action "是否现在安装 Node.js？"; then
            install_nodejs
        else
            return 1
        fi
    fi

    # 获取 npm bin 路径
    local npm_bin="$(npm config get prefix 2>/dev/null)/bin"

    print_color "${CYAN}" "  正在安装 Claude Code..."
    echo ""

    # 使用国内镜像
    npm install -g @anthropic-ai/claude-code --registry=$NPM_REGISTRY 2>/dev/null &

    show_spinner $! "安装中..."

    wait

    # 验证安装
    if [ -n "$npm_bin" ] && [ -x "$npm_bin/claude" ]; then
        print_color "${GREEN}" "  ✓ Claude Code 安装成功！"
        print_color "${YELLOW}" "  ! 请运行: export PATH=\"$npm_bin:\$PATH\""
        echo ""
        print_color "${CYAN}" "  使用方法:"
        echo "    claude chat              # 启动对话"
        echo "    claude --help            # 查看帮助"
    else
        print_color "${YELLOW}" "  ⊙ 安装完成，请刷新环境变量后验证"
    fi
    echo ""
}

# ==================== OpenCode 安装 ====================
install_opencode() {
    print_header
    print_color "${CYAN}" "       安装 OpenCode 汉化版"
    print_separator
    echo ""

    # 检查是否已安装
    if has_cmd opencode; then
        print_color "${GREEN}" "  ✓ OpenCode 已安装"
        echo ""
        if confirm_action "是否更新汉化配置？"; then
            install_opencode_i18n
            return 0
        else
            return 0
        fi
    fi

    # 检查 Node.js
    if ! has_cmd node; then
        print_color "${RED}" "  ✗ 需要先安装 Node.js"
        if confirm_action "是否现在安装 Node.js？"; then
            install_nodejs
        else
            return 1
        fi
    fi

    print_color "${CYAN}" "  正在克隆 OpenCode 源码..."
    echo ""

    local opencode_dir="$HOME/opencode-zh-CN"

    if [ -d "$opencode_dir" ]; then
        print_color "${YELLOW}" "  ⊙ 目录已存在，正在更新..."
        (cd "$opencode_dir" && git pull --rebase 2>/dev/null)
    else
        (git clone https://github.com/anomalyco/opencode.git "$opencode_dir" 2>/dev/null) &

        local pid=$!
        show_spinner $pid "克隆中..."
        wait $pid
    fi

    if [ -d "$opencode_dir" ]; then
        print_color "${GREEN}" "  ✓ OpenCode 源码准备完成"
        print_color "${YELLOW}" "  ! 目录: $opencode_dir"
        echo ""
        print_color "${CYAN}" "  下一步:"
        echo "    cd $opencode_dir"
        echo "    npm install"
        echo "    npm run build"
        echo "    npm run start"
    else
        print_color "${RED}" "  ✗ 克隆失败，请检查网络连接"
        return 1
    fi
    echo ""
}

# ==================== OpenCode 汉化脚本安装 ====================
install_opencode_i18n() {
    print_header
    print_color "${CYAN}" "       安装 OpenCode 汉化管理工具"
    print_separator
    echo ""

    # 确定项目目录
    local project_dir="$PWD"
    if [ ! -d "$project_dir/opencode-i18n" ] && [ -d "$PWD/../../opencode-i18n" ]; then
        project_dir="$(cd "$PWD/../.." && pwd)"
    fi

    print_color "${CYAN}" "  项目目录: $project_dir"
    echo ""

    # 检查是否已有汉化脚本
    if [ -f "$project_dir/scripts/opencode/opencode.ps1" ]; then
        print_color "${GREEN}" "  ✓ 汉化脚本已存在"
        echo ""
        print_color "${CYAN}" "  使用方法:"
        echo "    cd $project_dir"
        echo "    ./scripts/opencode/opencode.ps1    # Windows/PowerShell"
        echo "    或运行: opencodecmd                  # 全局命令"
        return 0
    fi

    # 下载汉化脚本
    print_color "${CYAN}" "  正在下载汉化脚本..."
    echo ""

    local scripts_dir="$project_dir/scripts"
    local opencode_dir="$scripts_dir/opencode"

    mkdir -p "$opencode_dir" 2>/dev/null

    # 从 GitHub 下载
    local base_url="https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/scripts/opencode"

    curl -fsSL "$base_url/opencode.ps1" -o "$opencode_dir/opencode.ps1" 2>/dev/null
    curl -fsSL "$base_url/init.ps1" -o "$opencode_dir/init.ps1" 2>/dev/null

    if [ -f "$opencode_dir/opencode.ps1" ]; then
        print_color "${GREEN}" "  ✓ 汉化脚本安装成功！"
        echo ""
        print_color "${CYAN}}" "  使用方法:"
        echo "    cd $project_dir"
        echo "    pwsh ./scripts/opencode/opencode.ps1"
        echo ""
        print_color "${YELLOW}" "  Windows 全局命令（添加到 $PROFILE）:"
        echo '    function opencodecmd { & "C:\Data\PC\OpenCode\scripts\opencode\opencode.ps1" @Args }'
    else
        print_color "${RED}" "  ✗ 下载失败，请检查网络"
        return 1
    fi
    echo ""
}

# ==================== 组件管理 ====================
cmd_install() {
    local target_num=$1

    print_header
    print_color "${YELLOW}" "       安装组件"
    print_separator
    echo ""

    # 加载环境
    load_nvm
    load_bun

    if [ -n "$target_num" ]; then
        # 指定编号安装
        local result
        if result=$(parse_component "$target_num"); then
            local func="${result%%|*}"
            local name="${result##*|}"
            print_color "${CYAN}" "安装 $name..."
            echo ""
            $func
            echo ""
        else
            print_color "${RED}" "  ✗ 无效编号: $target_num"
            echo ""
            print_color "${CYAN}" "可用编号:"
            for comp in "${COMPONENTS[@]}"; do
                local id="${comp%%:*}"
                local rest="${comp#*:}"
                local name="${rest%%:*}"
                echo -e "  ${GREEN}[$id]${NC} $name"
            done
            echo ""
            print_color "${YELLOW}" "用法: codes install [编号]"
            echo "示例: codes install 1  # 安装 Node.js"
            echo ""
        fi
        return 0
    fi

    # 检查需要安装的组件
    local need_install=()

    ! has_cmd node && need_install+=("1")
    ! has_cmd bun && need_install+=("2")
    ! has_cmd git && need_install+=("3")
    ! has_cmd python3 && need_install+=("4")

    if [ ${#need_install[@]} -eq 0 ]; then
        print_color "${GREEN}" "  ✓ 所有核心组件已安装"
        echo ""
        read -p "是否要安装 coding-helper? (y/N): " install_helper
        if [[ $install_helper =~ ^[Yy]$ ]]; then
            install_coding_helper
        fi
        return 0
    fi

    print_color "${YELLOW}" "  需要安装的组件:"
    for num in "${need_install[@]}"; do
        local result=$(parse_component "$num")
        local name="${result##*|}"
        echo -e "    [$num] $name"
    done
    echo ""

    read -p "是否继续? (Y/n): " confirm
    if [[ $confirm =~ ^[Nn]$ ]]; then
        return 0
    fi

    echo ""
    print_color "${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "${CYAN}" "  基础工具"
    print_color "${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    for num in "${need_install[@]}"; do
        local result=$(parse_component "$num")
        local func="${result%%|*}"
        $func
        echo ""
    done

    print_color "${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "${CYAN}" "  AI 工具"
    print_color "${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    install_coding_helper
    echo ""
}

cmd_upgrade() {
    print_header
    print_color "${YELLOW}" "       升级组件"
    print_separator
    echo ""

    load_nvm
    load_bun

    print_color "${CYAN}" "可用升级:"
    echo ""

    # Node.js 升级
    if has_cmd nvm && has_cmd node; then
        local current_ver=$(node -v)
        print_color "${WHITE}" "  Node.js 当前版本: $current_ver"
        echo -e "    ${DARK_GRAY}nvm install --lts${NC} - 安装最新 LTS"
        echo -e "    ${DARK_GRAY}nvm install --lts && nvm alias default lts/*${NC} - 设为默认"
        echo ""
    fi

    # Bun 升级
    if has_cmd bun; then
        local current_ver=$(bun --version)
        print_color "${WHITE}" "  Bun 当前版本: $current_ver"
        echo -e "    ${DARK_GRAY}bun upgrade${NC} - 升级到最新版"
        echo ""
    fi

    # coding-helper 升级
    if has_cmd npm; then
        print_color "${WHITE}" "  coding-helper:"
        echo -e "    ${DARK_GRAY}npm update -g @z_ai/coding-helper${NC} - 升级到最新版"
        echo ""
    fi

    print_separator
    read -p "是否自动执行升级? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        echo ""
        has_cmd nvm && nvm install --lts 2>/dev/null && nvm alias default lts/* 2>/dev/null
        has_cmd bun && bun upgrade 2>/dev/null
        has_cmd npm && npm update -g @z_ai/coding-helper 2>/dev/null
        echo ""
        print_color "${GREEN}" "  ✓ 升级完成"
        echo ""
        print_color "${YELLOW}" "  ! 请重新加载终端或运行: source ~/.bashrc"
    fi
}

# ==================== Node 管理 ====================
cmd_node() {
    local target_version=$1

    load_nvm

    if ! has_cmd nvm; then
        print_color "${RED}" "  ✗ nvm 未安装"
        echo ""
        print_color "${YELLOW}" "  运行 'codes install 5' 安装 nvm"
        return 1
    fi

    if [ -z "$target_version" ]; then
        # 显示当前版本和可用版本
        print_header
        print_color "${YELLOW}" "       Node.js 版本管理"
        print_separator
        echo ""

        if has_cmd node; then
            local current=$(node -v)
            print_color "${GREEN}" "  当前版本: $current"
        fi

        echo ""
        print_color "${CYAN}" "  已安装版本:"
        nvm ls 2>/dev/null | grep -v "N/A" || echo "    无"
        echo ""

        print_color "${CYAN}" "  常用命令:"
        echo -e "    ${DARK_GRAY}codes node lts${NC}     - 安装/切换到 LTS"
        echo -e "    ${DARK_GRAY}codes node latest${NC}  - 安装/切换到最新版"
        echo -e "    ${DARK_GRAY}codes node 20${NC}      - 安装/切换到 v20"
        echo -e "    ${DARK_GRAY}codes node 22${NC}      - 安装/切换到 v22"
        echo ""
        return 0
    fi

    # 处理特殊版本名
    case $target_version in
        lts|LTS)
            target_version="--lts"
            print_color "${CYAN}" "  切换到 LTS 版本..."
            ;;
        latest)
            target_version="node"
            print_color "${CYAN}" "  切换到最新版本..."
            ;;
        *)
            # 确保版本号以 v 开头
            [[ ! $target_version =~ ^v ]] && target_version="v$target_version"
            print_color "${CYAN}" "  切换到 $target_version..."
            ;;
    esac

    nvm install "$target_version" 2>/dev/null
    nvm alias default "$target_version" 2>/dev/null
    nvm use "$target_version" 2>/dev/null

    load_nvm

    if has_cmd node; then
        print_color "${GREEN}" "  ✓ 当前版本: $(node -v)"
        print_color "${YELLOW}" "  ! 运行 'source ~/.bashrc' 使更改生效"
    else
        print_color "${RED}" "  ✗ 切换失败"
        return 1
    fi
}

# ==================== 快捷启动 ====================
cmd_helper() {
    # 刷新环境（确保 npm bin 在 PATH 中）
    refresh_env

    if has_cmd coding-helper; then
        coding-helper "$@"
    elif has_cmd chelper; then
        chelper "$@"
    else
        print_color "${RED}" "  ✗ coding-helper 未安装"
        echo ""
        echo -e "  运行 ${DARK_GRAY}codes install 6${NC} 来安装"
        return 1
    fi
}

cmd_env() {
    print_header
    print_color "${YELLOW}" "       环境变量"
    print_separator
    echo ""

    load_nvm
    load_bun

    print_color "${CYAN}" "当前环境:"
    echo ""

    # Node.js
    if has_cmd node; then
        echo -e "  ${GREEN}Node.js${NC}: $(node -v) at $(which node)"
        echo -e "  ${GREEN}npm${NC}: $(npm -v) at $(which npm)"
    fi
    echo ""

    # Bun
    if has_cmd bun; then
        echo -e "  ${GREEN}Bun${NC}: $(bun --version) at $(which bun)"
    fi
    echo ""

    # 环境变量
    print_color "${CYAN}" "环境变量:"
    echo "  NVM_DIR=${NVM_DIR:-未设置}"
    echo "  BUN_INSTALL=${BUN_INSTALL:-未设置}"
    echo ""

    # npm 配置
    if has_cmd npm; then
        print_color "${CYAN}" "npm 配置:"
        npm config get registry 2>/dev/null | sed 's/^/  /'
    fi
    echo ""

    # 导出命令
    print_color "${YELLOW}" "导出环境变量（复制到其他终端使用）:"
    echo -e "${DARK_GRAY}"
    if [ -n "$NVM_DIR" ]; then
        echo "export NVM_DIR=\"$NVM_DIR\""
        echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\""
    fi
    if [ -n "$BUN_INSTALL" ]; then
        echo "export BUN_INSTALL=\"$BUN_INSTALL\""
        echo "export PATH=\"\$BUN_INSTALL/bin:\$PATH\""
    fi
    if has_cmd npm; then
        local npm_bin=$(npm config get prefix 2>/dev/null)/bin
        if [ -n "$npm_bin" ] && [ -d "$npm_bin" ]; then
            echo "export PATH=\"$npm_bin:\$PATH\""
        fi
    fi
    echo -e "${NC}"
}

# ==================== 主菜单 ====================
show_menu() {
    print_header

    # 快速状态
    local node_ver=$(has_cmd node && get_ver node || echo "未安装")
    local node_status=$([ "$node_ver" != "未安装" ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")
    local bun_ver=$(has_cmd bun && get_ver bun || echo "未安装")
    local bun_status=$([ "$bun_ver" != "未安装" ] && echo "${GREEN}✓${NC}" || echo "${DARK_GRAY}○${NC}")
    local claude_status=$(has_cmd claude && echo "${GREEN}✓${NC}" || echo "${DARK_GRAY}○${NC}")
    local git_status=$(has_cmd git && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")

    echo -e "${CYAN}   ┌─── 系统状态 ─────────────────────────────────────┐${NC}"
    echo -e "${CYAN}   │${NC}  Node.js: $node_status ${WHITE}$node_ver${NC}"
    echo -e "${CYAN}   │${NC}  Bun:     $bun_status ${WHITE}$bun_ver${NC}"
    echo -e "${CYAN}   │${NC}  Git:     $git_status ${WHITE}$(has_cmd git && get_ver git || "未安装")${NC}"
    echo -e "${CYAN}   │${NC}  Claude:   $claude_status ${WHITE}$(has_cmd claude && claude --version 2>/dev/null | head -1 || "未安装")${NC}"
    echo -e "${CYAN}   └────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${CYAN}   ╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}   ║${NC}           ${WHITE}${BOLD}主菜单${NC}                           ${CYAN}║${NC}"
    echo -e "${CYAN}   ╠═══════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}   ║${NC}  ${GREEN}[1]${NC} 环境诊断      ${DARK_GRAY}- 检查所有工具状态${NC}        ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${YELLOW}[2]${NC} 安装组件      ${DARK_GRAY}- 安装 Node.js/Bun/Git 等${NC}    ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${BLUE}[3]${NC} 升级组件      ${DARK_GRAY}- 升级已安装的工具${NC}            ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${MAGENTA}[4]${NC} Node 管理      ${DARK_GRAY}- 切换 Node.js 版本${NC}             ${CYAN}║${NC}"
    echo -e "${CYAN}   ╠═══════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}   ║${NC}  ${CYAN}[5]${NC} Claude Code    ${DARK_GRAY}- 安装 Claude Code CLI${NC}        ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${CYAN}[6]${NC} OpenCode       ${DARK_GRAY}- 安装 OpenCode 汉化版${NC}        ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${CYAN}[7]${NC} 汉化脚本       ${DARK_GRAY}- 安装汉化管理工具${NC}           ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${CYAN}[8]${NC} coding-helper  ${DARK_GRAY}- 启动智谱编码助手${NC}            ${CYAN}║${NC}"
    echo -e "${CYAN}   ╠═══════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}   ║${NC}  ${MAGENTA}[u]${NC} 检查更新      ${DARK_GRAY}- 检查 Codes 新版本${NC}             ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${GREEN}[U]${NC} 更新 Codes     ${DARK_GRAY}- 自动更新到最新版${NC}             ${CYAN}║${NC}"
    echo -e "${CYAN}   ╠═══════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}   ║${NC}  ${CYAN}[9]${NC} 环境变量       ${DARK_GRAY}- 显示/导出环境变量${NC}            ${CYAN}║${NC}"
    echo -e "${CYAN}   ║${NC}  ${RED}[0]${NC} 退出                                             ${CYAN}║${NC}"
    echo -e "${CYAN}   ╚═══════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${DARK_GRAY}提示: 也可以直接运行 'codes <命令>'，如: codes doctor${NC}"
    echo -e "${DARK_GRAY}      'codes install [编号]' 可指定安装组件${NC}"
    echo -e "${DARK_GRAY}      'codes update' 检查并更新 Codes${NC}"
    echo ""
}

# ==================== 帮助 ====================
show_help() {
    echo -e "${BOLD}Codes${NC} - 开发环境智能管理工具 v${VERSION}"
    echo ""
    echo -e "${CYAN}用法:${NC}"
    echo "  codes [命令] [参数]"
    echo ""
    echo -e "${CYAN}命令:${NC}"
    echo -e "  ${GREEN}doctor${NC}         环境诊断 - 检查所有工具状态"
    echo -e "  ${GREEN}install${NC} [编号]   安装组件 - 安装缺失的工具（可指定编号）"
    echo "                    编号: 1=Node.js 2=Bun 3=Git 4=Python 5=nvm 6=coding-helper"
    echo -e "  ${GREEN}upgrade${NC}         升级组件 - 升级已安装的工具"
    echo -e "  ${GREEN}node${NC} [ver]      Node 管理 - 切换 Node.js 版本"
    echo "                    可用: lts, latest, 或具体版本号 (如 20, 22)"
    echo -e "  ${GREEN}claude${NC}          Claude Code - 安装 Claude Code CLI"
    echo -e "  ${GREEN}opencode${NC}       OpenCode - 安装 OpenCode 汉化版"
    echo -e "  ${GREEN}i18n${NC}            汉化脚本 - 安装汉化管理工具"
    echo -e "  ${GREEN}helper${NC} [...]   coding-helper - 启动智谱编码助手"
    echo -e "  ${GREEN}env${NC}             环境变量 - 显示/导出环境变量"
    echo -e "  ${GREEN}update${NC}          检查并更新 Codes 到最新版本"
    echo -e "  ${GREEN}check-update${NC}    检查 Codes 新版本"
    echo -e "  ${GREEN}menu${NC}            显示交互菜单"
    echo -e "  ${GREEN}--version${NC}       显示版本信息"
    echo -e "  ${GREEN}--help${NC}          显示此帮助信息"
    echo ""
    echo -e "${CYAN}示例:${NC}"
    echo "  codes doctor              # 诊断环境"
    echo "  codes install             # 安装缺失组件"
    echo "  codes install 1           # 只安装 Node.js"
    echo "  codes node lts            # 切换到 LTS 版本"
    echo "  codes claude              # 安装 Claude Code"
    echo "  codes opencode            # 安装 OpenCode"
    echo "  codes i18n                 # 安装汉化脚本"
    echo "  codes update              # 更新 Codes"
    echo "  codes check-update        # 检查更新"
    echo ""
    echo -e "${CYAN}组件编号:${NC}"
    echo "  [1] Node.js    [2] Bun    [3] Git    [4] Python"
    echo "  [5] nvm        [6] coding-helper"
    echo ""
    echo -e "${CYAN}工具安装:${NC}"
    echo "  codes claude              # Claude Code CLI"
    echo "  codes opencode            # OpenCode 汉化版"
    echo "  codes i18n                 # 汉化管理工具"
}

# ==================== 全局安装 ====================
cmd_install_self() {
    print_header
    print_color "${YELLOW}" "       安装 codes 为全局命令"
    print_separator
    echo ""

    local install_dir="/usr/local/bin"
    local lib_dir="/usr/local/lib/codes"
    local script_source="$SCRIPT_DIR/codes.sh"

    # 检查权限
    if [ "$(id -u)" != "0" ] && ! has_cmd sudo; then
        print_color "${RED}" "  ✗ 需要 root 权限"
        echo ""
        echo "  请运行: sudo bash $0 --install-self"
        return 1
    fi

    # 创建库目录
    $SUDO_CMD mkdir -p "$lib_dir" 2>/dev/null

    # 复制脚本到库目录
    print_color "${CYAN}" "  复制资源到 $lib_dir..."
    $SUDO_CMD cp "$script_source" "$lib_dir/codes.sh" 2>/dev/null

    # 创建主脚本
    print_color "${CYAN}" "  创建命令到 $install_dir..."
    cat > /tmp/codes_wrapper.sh << 'WRAPPER_EOF'
#!/bin/bash
SCRIPT_DIR="/usr/local/lib/codes"
bash "$SCRIPT_DIR/codes.sh" "$@"
WRAPPER_EOF

    $SUDO_CMD cp /tmp/codes_wrapper.sh "$install_dir/codes" 2>/dev/null
    $SUDO_CMD chmod +x "$install_dir/codes" 2>/dev/null
    rm -f /tmp/codes_wrapper.sh

    if [ $? -eq 0 ]; then
        print_color "${GREEN}" "  ✓ 安装成功!"
        echo ""
        echo "  现在可以在任何位置运行 ${GREEN}codes${NC} 命令"
        return 0
    else
        print_color "${RED}" "  ✗ 安装失败"
        return 1
    fi
}

# ==================== 主入口 ====================
main() {
    # 每次启动时自动刷新环境变量
    refresh_env

    # 静默检查更新（每周检查一次）
    check_update true

    local command=${1:-menu}

    case $command in
        doctor|diag|check)
            cmd_doctor
            ;;
        install|add)
            cmd_install "$2"
            ;;
        upgrade|update-components)
            cmd_upgrade
            ;;
        node)
            cmd_node "$2"
            ;;
        helper|chelper|coding-helper)
            shift
            cmd_helper "$@"
            ;;
        env|environment)
            cmd_env
            ;;
        claude|claudecode)
            install_claudecode
            ;;
        opencode)
            install_opencode
            ;;
        i18n|chinese|localization)
            install_opencode_i18n
            ;;
        update|self-update)
            cmd_update
            ;;
        check-update)
            cmd_check_update
            ;;
        menu|interactive)
            # 交互式菜单
            if [ ! -t 0 ]; then
                # 非交互模式，显示状态
                cmd_doctor
                exit 0
            fi

            while true; do
                show_menu
                read -p "请选择: " choice

                case $choice in
                    1) cmd_doctor ;;
                    2) cmd_install ;;
                    3) cmd_upgrade ;;
                    4) cmd_node ;;
                    5) install_claudecode ;;
                    6) install_opencode ;;
                    7) install_opencode_i18n ;;
                    8) cmd_helper ;;
                    9) cmd_env ;;
                    u|U) [ "$choice" = "u" ] && cmd_check_update || cmd_update ;;
                    0)
                        print_color "${DARK_GRAY}" "再见！"
                        exit 0
                        ;;
                    *)
                        print_color "${RED}" "无效选择"
                        ;;
                esac

                echo ""
                read -p "按回车键继续..."
            done
            ;;
        --version|-v)
            echo "Codes v${VERSION}"
            ;;
        --help|-h)
            show_help
            ;;
        --install-self)
            cmd_install_self
            ;;
        *)
            print_color "${RED}" "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
