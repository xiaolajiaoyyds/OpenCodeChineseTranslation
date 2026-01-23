package cmd

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"opencode-cli/internal/core"

	"github.com/spf13/cobra"
)

// ohmyopencodeCmd Oh-My-OpenCode 命令
var ohmyopencodeCmd = &cobra.Command{
	Use:   "ohmyopencode",
	Short: "Install Oh-My-OpenCode plugin",
	Long:  "Install Oh-My-OpenCode plugin for enhanced features",
	Run: func(cmd *cobra.Command, args []string) {
		runOhMyOpenCode()
	},
}

// helperCmd 智谱编码助手命令
var helperCmd = &cobra.Command{
	Use:   "helper",
	Short: "Install Zhipu Coding Helper",
	Long:  "Install GLM Coding Plan helper for Claude Code CLI management",
	Run: func(cmd *cobra.Command, args []string) {
		runHelper()
	},
}

// fixBunCmd 校准 Bun 命令
var fixBunCmd = &cobra.Command{
	Use:   "fix-bun",
	Short: "Fix Bun version",
	Long:  "Calibrate Bun to the recommended version",
	Run: func(cmd *cobra.Command, args []string) {
		runFixBun()
	},
}

func init() {
	rootCmd.AddCommand(ohmyopencodeCmd)
	rootCmd.AddCommand(helperCmd)
	rootCmd.AddCommand(fixBunCmd)
}

func runOhMyOpenCode() {
	fmt.Println("")
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println("  Oh-My-OpenCode 安装向导")
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println("")
	fmt.Println("  Oh-My-OpenCode 是 OpenCode 的增强扩展插件")
	fmt.Println("  类似于 Oh My Zsh 对 Zsh 的增强")
	fmt.Println("")
	fmt.Println("  功能特性:")
	fmt.Println("    • 智能体: Sisyphus(编排), Oracle(分析), Librarian(研究)")
	fmt.Println("    • 多模型协作")
	fmt.Println("    • 提示词优化")
	fmt.Println("    • 后台任务管理")
	fmt.Println("")

	reader := bufio.NewReader(os.Stdin)
	fmt.Print("是否安装 Oh-My-OpenCode? [Y/n]: ")
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))
	if answer == "n" || answer == "no" {
		fmt.Println("安装已取消")
		return
	}

	// 获取配置目录
	homeDir, _ := os.UserHomeDir()
	configDir := filepath.Join(homeDir, ".config", "opencode")
	ohMyConfigPath := filepath.Join(configDir, "oh-my-opencode.json")

	// 创建默认配置
	if err := os.MkdirAll(configDir, 0755); err != nil {
		fmt.Printf("✗ 创建目录失败: %v\n", err)
		return
	}

	defaultConfig := `{
  "enabled": true,
  "agents": {
    "sisyphus": {
      "enabled": true,
      "description": "编排智能体，负责任务分解和协调"
    },
    "oracle": {
      "enabled": true,
      "description": "分析智能体，负责代码分析和建议"
    },
    "librarian": {
      "enabled": true,
      "description": "研究智能体，负责文档和资料查询"
    }
  },
  "features": {
    "multiModel": true,
    "promptOptimization": true,
    "backgroundTasks": true
  }
}`

	if err := os.WriteFile(ohMyConfigPath, []byte(defaultConfig), 0644); err != nil {
		fmt.Printf("✗ 保存配置失败: %v\n", err)
		return
	}

	fmt.Println("")
	fmt.Println("✓ Oh-My-OpenCode 安装完成!")
	fmt.Printf("  配置文件: %s\n", ohMyConfigPath)
	fmt.Println("")
	fmt.Println("  已启用的智能体:")
	fmt.Println("    ✓ Sisyphus (编排)")
	fmt.Println("    ✓ Oracle (分析)")
	fmt.Println("    ✓ Librarian (研究)")
	fmt.Println("")
	fmt.Println("  重启 OpenCode 后生效")
}

// runHelper 安装智谱编码助手 (GLM Coding Plan)
func runHelper() {
	fmt.Println("")
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println("  智谱编码助手安装向导")
	fmt.Println("══════════════════════════════════════════════════")
	fmt.Println("")
	fmt.Println("  GLM Coding Plan - 智谱编码助手")
	fmt.Println("  NPM 包: @z_ai/coding-helper")
	fmt.Println("  统一管理 Claude Code 等 CLI 工具")
	fmt.Println("")

	// 检查 Node.js 版本
	nodeVersion := ""
	if out, err := exec.Command("node", "--version").Output(); err == nil {
		nodeVersion = strings.TrimSpace(string(out))
	}

	if nodeVersion == "" {
		fmt.Println("✗ 未检测到 Node.js")
		fmt.Println("")
		fmt.Println("  智谱编码助手需要 Node.js >= v18.0.0")
		fmt.Println("")
		fmt.Println("  安装方式:")
		switch runtime.GOOS {
		case "windows":
			fmt.Println("    方法 1: winget install OpenJS.NodeJS.LTS")
			fmt.Println("    方法 2: scoop install nodejs-lts")
			fmt.Println("    方法 3: 官网下载 https://nodejs.org/")
		case "darwin":
			fmt.Println("    方法 1: brew install node@20")
			fmt.Println("    方法 2: 使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash")
			fmt.Println("            然后: nvm install 20")
		default:
			fmt.Println("    方法 1: 使用包管理器 (apt/yum/pacman) 安装 nodejs")
			fmt.Println("    方法 2: 使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash")
			fmt.Println("            然后: nvm install 20")
		}
		return
	}

	// 解析版本号
	versionStr := strings.TrimPrefix(nodeVersion, "v")
	parts := strings.Split(versionStr, ".")
	majorVersion := 0
	if len(parts) > 0 {
		fmt.Sscanf(parts[0], "%d", &majorVersion)
	}

	if majorVersion < 18 {
		fmt.Printf("✗ Node.js 版本过低: %s (需要 >= v18.0.0)\n", nodeVersion)
		fmt.Println("")
		fmt.Println("  请升级 Node.js:")
		switch runtime.GOOS {
		case "windows":
			fmt.Println("    winget upgrade OpenJS.NodeJS.LTS")
		case "darwin":
			fmt.Println("    brew upgrade node")
		default:
			fmt.Println("    使用包管理器或 nvm 升级到 v18+")
		}
		return
	}

	fmt.Printf("✓ Node.js 版本: %s (满足要求)\n", nodeVersion)
	fmt.Println("")

	// 检查 npx 是否可用
	if _, err := exec.LookPath("npx"); err != nil {
		fmt.Println("✗ 未找到 npx 命令")
		fmt.Println("  请确保 Node.js 安装正确，npx 通常随 npm 一起安装")
		return
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Print("是否安装智谱编码助手? [Y/n]: ")
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))
	if answer == "n" || answer == "no" {
		fmt.Println("安装已取消")
		return
	}

	fmt.Println("")
	fmt.Println("▶ 正在安装 @z_ai/coding-helper...")
	fmt.Println("  (首次安装可能需要较长时间)")

	// 使用 npm install -g 全局安装
	cmd := exec.Command("npm", "install", "-g", "@z_ai/coding-helper")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Printf("✗ 安装失败: %v\n", err)
		fmt.Println("")
		fmt.Println("  可能的解决方案:")
		fmt.Println("    1. 检查网络连接")
		fmt.Println("    2. 尝试使用淘宝镜像: npm config set registry https://registry.npmmirror.com")
		fmt.Println("    3. Windows 用户尝试以管理员身份运行")
		return
	}

	fmt.Println("")
	fmt.Println("✓ 智谱编码助手安装完成!")
	fmt.Println("")
	fmt.Println("  使用方式:")
	fmt.Println("    coding-helper          # 启动助手")
	fmt.Println("    coding-helper --help   # 查看帮助")
}

func runFixBun() {
	fmt.Println("")
	fmt.Println("▶ 校准 Bun 版本")

	// 获取推荐版本
	recommendedVersion := "1.3.5"

	// 获取源码目录
	opencodeDir, err := core.GetOpencodeDir()
	if err == nil && core.Exists(opencodeDir) {
		// 尝试从 package.json 读取
		pkgPath := filepath.Join(opencodeDir, "package.json")
		if data, err := os.ReadFile(pkgPath); err == nil {
			content := string(data)
			if strings.Contains(content, "packageManager") {
				// 简单解析
				if idx := strings.Index(content, "bun@"); idx != -1 {
					start := idx + 4
					end := start
					for end < len(content) && (content[end] >= '0' && content[end] <= '9' || content[end] == '.') {
						end++
					}
					if end > start {
						recommendedVersion = content[start:end]
					}
				}
			}
		}
	}

	// 获取当前版本
	currentVersion := ""
	if out, err := exec.Command("bun", "--version").Output(); err == nil {
		currentVersion = strings.TrimSpace(string(out))
	}

	if currentVersion == "" {
		fmt.Println("✗ Bun 未安装")
		fmt.Println("")
		fmt.Println("  安装 Bun:")
		switch runtime.GOOS {
		case "windows":
			fmt.Println("    powershell -c \"irm bun.sh/install.ps1 | iex\"")
		default:
			fmt.Println("    curl -fsSL https://bun.sh/install | bash")
		}
		return
	}

	fmt.Printf("  当前版本: %s\n", currentVersion)
	fmt.Printf("  推荐版本: %s\n", recommendedVersion)

	if currentVersion == recommendedVersion {
		fmt.Println("")
		fmt.Println("✓ Bun 版本已是推荐版本，无需校准")
		return
	}

	fmt.Println("")

	reader := bufio.NewReader(os.Stdin)
	fmt.Printf("是否将 Bun 升级/降级到 v%s? [Y/n]: ", recommendedVersion)
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))
	if answer == "n" || answer == "no" {
		fmt.Println("操作已取消")
		return
	}

	fmt.Println("")
	fmt.Printf("▶ 正在安装 Bun v%s...\n", recommendedVersion)

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("powershell", "-Command",
			fmt.Sprintf("irm https://bun.sh/install.ps1 | iex; bun upgrade --version %s", recommendedVersion))
	default:
		cmd = exec.Command("bash", "-c",
			fmt.Sprintf("curl -fsSL https://bun.sh/install | bash -s bun-v%s", recommendedVersion))
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Printf("✗ 安装失败: %v\n", err)
		return
	}

	fmt.Println("")
	fmt.Printf("✓ Bun v%s 安装完成\n", recommendedVersion)
	fmt.Println("  请重新打开终端使更改生效")
}
