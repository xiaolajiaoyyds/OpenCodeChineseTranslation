#!/bin/bash
# ========================================
# 开发环境一键初始化脚本 v1.2
# 全平台支持: Linux / macOS
# 特性: 国内镜像备用 + 安装汇总报告
# ========================================

# 不使用 set -e，让安装失败不中断
# set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
DARK_GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 全局变量
QUIET=false
SKIP_AI=false
SKIP_DOCKER=false

# 安装结果跟踪
declare -a INSTALL_SUCCESS=()
declare -a INSTALL_FAILED=()
declare -a INSTALL_SKIPPED=()

# 国内镜像配置
NVM_MIRROR_CN="https://gitee.com/mirrors/nvm/raw/master/install.sh"
NVM_MIRROR_ORIGINAL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh"
NPM_REGISTRY="https://registry.npmmirror.com"
GHPROXY_PREFIX="https://mirror.ghproxy.com/https://github.com"

# 参数解析
for arg in "$@"; do
    case $arg in
        --quiet) QUIET=true ;;
        --skip-ai) SKIP_AI=true ;;
        --skip-docker) SKIP_DOCKER=true ;;
    esac
done

# ==================== 工具函数 ====================
print_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     开发环境一键初始化脚本 v1.2                             ║${NC}"
    echo -e "${CYAN}║     国内镜像 + 安装汇总报告                                 ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_separator() {
    echo -e "${DARK_GRAY}────────────────────────────────────────────────────────${NC}"
}

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

command_exists() {
    command -v "$1" &> /dev/null
}

get_version() {
    if command_exists "$1"; then
        "$1" --version 2>&1 | head -n 1 || echo "unknown"
    fi
}

# 记录安装结果
record_success() {
    INSTALL_SUCCESS+=("$1")
}

record_failed() {
    INSTALL_FAILED+=("$1: $2")
}

record_skipped() {
    INSTALL_SKIPPED+=("$1")
}

# 打印安装汇总报告
print_summary() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    安装汇总报告                             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # 成功列表
    if [ ${#INSTALL_SUCCESS[@]} -gt 0 ]; then
        print_color "$GREEN" "✓ 安装成功 (${#INSTALL_SUCCESS[@]}):"
        for item in "${INSTALL_SUCCESS[@]}"; do
            echo -e "  ${GREEN}✔${NC} $item"
        done
        echo ""
    fi

    # 跳过列表
    if [ ${#INSTALL_SKIPPED[@]} -gt 0 ]; then
        print_color "$YELLOW" "⊙ 已安装，跳过 (${#INSTALL_SKIPPED[@]}):"
        for item in "${INSTALL_SKIPPED[@]}"; do
            echo -e "  ${YELLOW}⊙${NC} $item"
        done
        echo ""
    fi

    # 失败列表
    if [ ${#INSTALL_FAILED[@]} -gt 0 ]; then
        print_color "$RED" "✗ 安装失败 (${#INSTALL_FAILED[@]}):"
        for item in "${INSTALL_FAILED[@]}"; do
            echo -e "  ${RED}✗${NC} $item"
        done
        echo ""
    fi

    # 统计
    local total=$((${#INSTALL_SUCCESS[@]} + ${#INSTALL_FAILED[@]} + ${#INSTALL_SKIPPED[@]}))
    local success_rate=0
    if [ $total -gt 0 ]; then
        success_rate=$((100 * ${#INSTALL_SUCCESS[@]} / total))
    fi

    print_separator
    echo -e "  总计: ${WHITE}$total${NC} | ${GREEN}成功: ${#INSTALL_SUCCESS[@]}${NC} | ${YELLOW}跳过: ${#INSTALL_SKIPPED[@]}${NC} | ${RED}失败: ${#INSTALL_FAILED[@]}${NC} | 成功率: ${success_rate}%"
    print_separator
    echo ""

    # 环境变量提示
    if [ ${#INSTALL_SUCCESS[@]} -gt 0 ]; then
        print_color "$YELLOW" "! 请运行以下命令使环境变量生效:"
        echo -e "  ${WHITE}source ~/.bashrc${NC}"
        echo ""
    fi
}

# ==================== 系统检测 ====================
show_system_status() {
    print_color "$CYAN" "  系统环境检测"
    print_separator

    declare -A tools=(
        ["Node.js"]="node"
        ["npm"]="npm"
        ["Bun"]="bun"
        ["Git"]="git"
        ["Docker"]="docker"
        ["Python"]="python3"
        ["coding-helper"]="chelper"
    )

    for name in "${!tools[@]}"; do
        cmd="${tools[$name]}"
        if command_exists "$cmd"; then
            version=$(get_version "$cmd")
            echo -e "  [$name] ${GREEN}✓${NC} $version"
        else
            echo -e "  [$name] ${RED}✗${NC} 未安装"
        fi
    done
    print_separator
    echo ""
}

# ==================== 包管理器检测 ====================
detect_package_manager() {
    if command_exists dnf; then
        echo "dnf"
    elif command_exists yum; then
        echo "yum"
    elif command_exists apt-get; then
        echo "apt"
    elif command_exists brew; then
        echo "brew"
    elif command_exists pacman; then
        echo "pacman"
    else
        echo ""
    fi
}

# ==================== 组件安装 ====================
install_nodejs() {
    print_color "$CYAN" "[1/5] 安装 Node.js..."

    if command_exists node; then
        local version=$(get_version node)
        print_color "$YELLOW" "  ⊙ Node.js 已安装: $version"
        record_skipped "Node.js ($version)"
        return 0
    fi

    print_color "$DARK_GRAY" "  使用 nvm 安装 Node.js..."

    # 方法1: 尝试 Gitee 镜像
    if ! command_exists nvm; then
        print_color "$DARK_GRAY" "  方法1: 使用 Gitee 镜像安装 nvm..."
        if curl -o- "$NVM_MIRROR_CN" 2>/dev/null | bash 2>/dev/null; then
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        fi
    fi

    # 方法2: 尝试官方源（带代理）
    if ! command_exists nvm; then
        print_color "$YELLOW" "  方法2: 使用官方源（可能较慢）..."
        if curl -o- "$NVM_MIRROR_ORIGINAL" 2>/dev/null | bash 2>/dev/null; then
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        fi
    fi

    # 安装 Node.js
    if command_exists nvm; then
        nvm install --lts 2>/dev/null
        nvm alias default lts/* 2>/dev/null
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        if command_exists node; then
            local version=$(get_version node)
            print_color "$GREEN" "  ✓ Node.js 安装成功: $version"
            record_success "Node.js ($version)"

            # 配置 npm 国内镜像
            npm config set registry "$NPM_REGISTRY" 2>/dev/null
            print_color "$DARK_GRAY" "  ✓ npm 已配置国内镜像"

            # 添加到 bashrc
            if ! grep -q 'NVM_DIR' ~/.bashrc 2>/dev/null; then
                echo "" >> ~/.bashrc
                echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
                echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
            fi
            return 0
        fi
    fi

    print_color "$RED" "  ✗ Node.js 安装失败"
    record_failed "Node.js" "nvm 安装失败"
    return 1
}

install_bun() {
    print_color "$CYAN" "[2/5] 安装 Bun..."

    if command_exists bun; then
        local version=$(get_version bun)
        print_color "$YELLOW" "  ⊙ Bun 已安装: $version"
        record_skipped "Bun ($version)"
        return 0
    fi

    # 方法1: 官方安装脚本（通过代理）
    print_color "$DARK_GRAY" "  方法1: 官方安装脚本（通过 ghproxy）..."
    if curl -fsSL "${GHPROXY_PREFIX}/oven-sh/bun/raw/main/install.sh" 2>/dev/null | bash 2>/dev/null; then
        if [ -f "$HOME/.bun/bin/bun" ]; then
            export BUN_INSTALL="$HOME/.bun"
            export PATH="$BUN_INSTALL/bin:$PATH"
            if ! grep -q 'BUN_INSTALL' ~/.bashrc 2>/dev/null; then
                echo "" >> ~/.bashrc
                echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
                echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
            fi
            print_color "$GREEN" "  ✓ Bun 安装成功"
            record_success "Bun"
            return 0
        fi
    fi

    # 方法2: 使用 npm 安装（备用）
    if command_exists npm; then
        print_color "$YELLOW" "  方法2: 使用 npm 安装..."
        if npm install -g bun 2>/dev/null; then
            print_color "$GREEN" "  ✓ Bun 安装成功 (通过 npm)"
            record_success "Bun (via npm)"
            return 0
        fi
    fi

    print_color "$YELLOW" "  ⊙ Bun 安装跳过（网络问题）"
    record_failed "Bun" "网络连接失败，请手动安装"
    return 1
}

install_git() {
    print_color "$CYAN" "[3/5] 安装 Git..."

    if command_exists git; then
        local version=$(get_version git)
        print_color "$YELLOW" "  ⊙ Git 已安装: $version"
        record_skipped "Git ($version)"
        return 0
    fi

    local pm=$(detect_package_manager)
    case $pm in
        dnf|yum)
            sudo $pm install -y git 2>/dev/null
            ;;
        apt)
            sudo apt-get install -y git 2>/dev/null
            ;;
        pacman)
            sudo pacman -S --noconfirm git 2>/dev/null
            ;;
    esac

    if command_exists git; then
        print_color "$GREEN" "  ✓ Git 安装成功"
        record_success "Git"
        return 0
    fi

    print_color "$RED" "  ✗ Git 安装失败"
    record_failed "Git" "请使用系统包管理器手动安装"
    return 1
}

install_python() {
    print_color "$CYAN" "[4/5] 安装 Python..."

    if command_exists python3; then
        local version=$(get_version python3)
        print_color "$YELLOW" "  ⊙ Python 已安装: $version"
        record_skipped "Python ($version)"
        return 0
    fi

    local pm=$(detect_package_manager)
    case $pm in
        dnf|yum)
            sudo $pm install -y python3 python3-pip 2>/dev/null
            ;;
        apt)
            sudo apt-get install -y python3 python3-pip 2>/dev/null
            ;;
    esac

    if command_exists python3; then
        print_color "$GREEN" "  ✓ Python 安装成功"
        record_success "Python"
        return 0
    fi

    print_color "$RED" "  ✗ Python 安装失败"
    record_failed "Python" "请使用系统包管理器手动安装"
    return 1
}

install_coding_helper() {
    print_color "$CYAN" "[5/5] 安装 @z_ai/coding-helper..."

    if ! command_exists npm; then
        print_color "$RED" "  ✗ 需要先安装 npm"
        record_failed "coding-helper" "npm 未安装"
        return 1
    fi

    if command_exists chelper; then
        print_color "$YELLOW" "  ⊙ coding-helper 已安装"
        record_skipped "coding-helper"
        return 0
    fi

    print_color "$DARK_GRAY" "  使用国内镜像安装..."
    if npm install -g @z_ai/coding-helper --registry="$NPM_REGISTRY" 2>/dev/null; then
        print_color "$GREEN" "  ✓ coding-helper 安装成功"
        record_success "coding-helper"
        return 0
    fi

    # 备用：官方源
    if npm install -g @z_ai/coding-helper 2>/dev/null; then
        print_color "$GREEN" "  ✓ coding-helper 安装成功"
        record_success "coding-helper"
        return 0
    fi

    print_color "$RED" "  ✗ coding-helper 安装失败"
    record_failed "coding-helper" "网络问题或包不存在"
    return 1
}

# ==================== 主安装流程 ====================
install_all() {
    print_header
    print_color "$YELLOW" "       一键安装全部组件"
    print_separator
    echo ""

    # 安装基础工具
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "$CYAN" "  第一阶段: 基础工具"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    install_nodejs
    echo ""
    install_bun
    echo ""
    install_git
    echo ""
    install_python
    echo ""

    # 安装 AI 工具
    if [ "$SKIP_AI" = false ]; then
        print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_color "$CYAN" "  第二阶段: AI 工具"
        print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        install_coding_helper
        echo ""
    fi

    # 显示汇总报告
    print_summary
}

install_basic_tools() {
    print_header
    print_color "$YELLOW" "       安装基础工具"
    print_separator
    echo ""

    install_nodejs
    echo ""
    install_bun
    echo ""
    install_git
    echo ""
    install_python
    echo ""

    print_summary
}

install_ai_tools() {
    print_header
    print_color "$YELLOW" "       安装 AI 工具"
    print_separator
    echo ""

    install_coding_helper
    echo ""

    print_summary
}

# ==================== 主菜单 ====================
show_menu() {
    print_header
    show_system_status

    echo -e "${CYAN}   ┌─── 安装模式 ─────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}   │${NC}"
    echo -e "${GREEN}   │  [1]  一键安装全部 (推荐)${NC}"
    echo -e "${YELLOW}   │  [2]  仅安装基础工具 (Node.js, Bun, Git, Python)${NC}"
    echo -e "${MAGENTA}   │  [3]  仅安装 AI 工具${NC}"
    echo -e "${CYAN}   │  [4]  检查更新${NC}"
    echo -e "${CYAN}   │${NC}"
    echo -e "${RED}   │  [0]  退出${NC}"
    echo -e "${CYAN}   │${NC}"
    echo -e "${CYAN}   └───────────────────────────────────────────────────────┘${NC}"
    echo ""
}

check_updates() {
    print_header
    print_color "$YELLOW" "       检查更新"
    print_separator
    echo ""

    print_color "$CYAN" "已安装组件版本:"
    echo ""

    declare -A tools=(
        ["Node.js"]="node"
        ["Bun"]="bun"
        ["npm"]="npm"
        ["Git"]="git"
        ["Python"]="python3"
    )

    for name in "${!tools[@]}"; do
        cmd="${tools[$name]}"
        if command_exists "$cmd"; then
            version=$(get_version "$cmd")
            echo -e "  [$name] $version"
        fi
    done

    echo ""
    print_color "$YELLOW" "更新命令:"
    echo -e "  ${DARK_GRAY}nvm install --lts${NC}"
    echo -e "  ${DARK_GRAY}bun upgrade${NC}"
    echo ""
}

# ==================== 主循环 ====================
# 检测是否在管道模式（非交互）
if [ ! -t 0 ]; then
    print_color "$YELLOW" "检测到管道模式（非交互），自动执行一键安装..."
    install_all
    exit 0
fi

if [ "$QUIET" = true ]; then
    install_all
    exit 0
fi

while true; do
    show_menu
    read -p "请选择: " choice

    case $choice in
        1) install_all ;;
        2) install_basic_tools ;;
        3) install_ai_tools ;;
        4) check_updates ;;
        0)
            print_color "$DARK_GRAY" "再见！"
            exit 0
            ;;
        *)
            print_color "$RED" "无效选择"
            sleep 0.5
            ;;
    esac

    if [ "$choice" != "0" ]; then
        echo ""
        read -p "按回车键继续..."
    fi
done
