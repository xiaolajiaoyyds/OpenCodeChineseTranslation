package cmd

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"opencode-cli/internal/core"

	"github.com/spf13/cobra"
)

var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Deploy opencode to system PATH",
	Long:  "Deploy the compiled opencode binary to system PATH for global access",
	Run: func(cmd *cobra.Command, args []string) {
		createShortcut, _ := cmd.Flags().GetBool("shortcut")
		runDeploy(createShortcut)
	},
}

func init() {
	deployCmd.Flags().BoolP("shortcut", "s", false, "Create desktop shortcut")
	rootCmd.AddCommand(deployCmd)
}

func runDeploy(createShortcut bool) {
	fmt.Println("\n▶ 部署全局命令")

	binDir, err := core.GetBinDir()
	if err != nil {
		fmt.Printf("✗ 获取 bin 目录失败: %v\n", err)
		return
	}

	exeName := "opencode-cli"
	if runtime.GOOS == "windows" {
		if core.Exists(filepath.Join(binDir, "opencode-cli.exe")) {
			exeName = "opencode-cli.exe"
		} else {
			exeName = "opencode.exe"
		}
	} else {
		if core.Exists(filepath.Join(binDir, "opencode-cli")) {
			exeName = "opencode-cli"
		} else {
			exeName = "opencode"
		}
	}

	sourcePath := filepath.Join(binDir, exeName)
	if !core.Exists(sourcePath) {
		fmt.Println("✗ 未找到 opencode-cli 编译产物，请先运行 build")
		return
	}

	// 获取部署目标目录
	deployDir, err := getDeployDir()
	if err != nil {
		fmt.Printf("✗ 获取部署目录失败: %v\n", err)
		return
	}

	// 确保部署目录存在
	if err := os.MkdirAll(deployDir, 0755); err != nil {
		fmt.Printf("✗ 创建部署目录失败: %v\n", err)
		return
	}

	// 检查并添加 PATH
	addToPath(deployDir)

	// 部署 opencode-cli
	targetPath := filepath.Join(deployDir, exeName)
	if err := copyFileDeploy(sourcePath, targetPath); err != nil {
		fmt.Printf("✗ 部署 opencode-cli 失败: %v\n", err)
		return
	}

	// Windows 创建 CMD 包装器（如果是 opencode-cli.exe）
	if runtime.GOOS == "windows" && filepath.Ext(exeName) == ".exe" {
		cmdName := exeName[:len(exeName)-4]
		createCmdWrapper(deployDir, cmdName, exeName)
	}

	fmt.Printf("✓ 已部署 opencode-cli: %s\n", targetPath)

	if createShortcut {
		if runtime.GOOS == "windows" {
			createWindowsShortcut(targetPath)
		} else {
			createUnixShortcut(targetPath)
		}
	}

	// 尝试部署 opencode (软件本身)
	opencodeExeName := "opencode"
	if runtime.GOOS == "windows" {
		opencodeExeName = "opencode.exe"
	}
	opencodeSource := filepath.Join(binDir, opencodeExeName)

	if core.Exists(opencodeSource) {
		fmt.Println("\n▶ 部署 OpenCode 软件命令")

		checkRunningProcess(opencodeExeName)

		appTargetPath := filepath.Join(deployDir, opencodeExeName)
		if err := copyFileDeploy(opencodeSource, appTargetPath); err != nil {
			fmt.Printf("✗ 部署 OpenCode 失败: %v\n", err)
		} else {
			fmt.Printf("✓ 已部署 opencode: %s\n", appTargetPath)
			
			// Windows 创建 CMD 包装器
			if runtime.GOOS == "windows" {
				createCmdWrapper(deployDir, "opencode", opencodeExeName)
			}
			
			checkPathPriority("opencode", appTargetPath)
		}
	} else {
		fmt.Println("\n提示: 未找到编译好的 OpenCode 软件 (bin/opencode)，跳过部署 'opencode' 命令。")
		fmt.Println("      如需启用 'opencode' 全局命令，请先运行 build。")
	}

	fmt.Println("")
	fmt.Println("部署完成！")
	fmt.Printf("  部署位置: %s\n", deployDir)
}

// getDeployDir 获取部署目录
func getDeployDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	if runtime.GOOS == "windows" {
		// Windows: %LOCALAPPDATA%\OpenCode\bin
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData == "" {
			localAppData = filepath.Join(homeDir, "AppData", "Local")
		}
		return filepath.Join(localAppData, "OpenCode", "bin"), nil
	}
	
	// Unix: ~/.local/bin
	return filepath.Join(homeDir, ".local", "bin"), nil
}

// addToPath 检查并提示/自动添加 PATH
func addToPath(dir string) {
	// 在 Windows 上，我们需要检查 User PATH，而不仅仅是 os.Getenv("PATH") (它包含 System + User)
	if runtime.GOOS == "windows" {
		// 获取当前的 User PATH
		cmd := exec.Command("powershell", "-NoProfile", "-Command", `[Environment]::GetEnvironmentVariable("Path", "User")`)
		output, err := cmd.Output()
		if err == nil {
			userPath := strings.TrimSpace(string(output))
			// 如果 User PATH 中已经包含了该目录，就不再添加
			// 注意：这里简单的字符串检查可能不够精确，但通常足够，且避免重复添加
			if strings.Contains(strings.ToLower(userPath), strings.ToLower(dir)) {
				// 虽然在 User PATH 中，但可能不在当前 Session PATH 中 (需要重启终端)
				if !containsPath(os.Getenv("PATH"), dir) {
					fmt.Printf("\n提示: 部署目录已在用户 PATH 中，但未在当前终端生效。\n")
					fmt.Printf("      请尝试重启终端或注销/登录。\n")
				}
				return
			}
		}
	} else {
		// Unix: 检查当前 PATH
		pathVar := os.Getenv("PATH")
		if containsPath(pathVar, dir) {
			return
		}
	}

	fmt.Printf("\n提示: 部署目录不在 PATH 环境变量中\n")
	fmt.Printf("      %s\n", dir)

	if runtime.GOOS == "windows" {
		// 尝试自动添加 PATH (Windows)
		fmt.Println("正在尝试自动添加到用户环境变量...")
		
		// 使用 PowerShell 添加 PATH (追加模式)
		// 注意: 获取 User Path -> 拼接 -> 设置 User Path
		psCommand := fmt.Sprintf(
			`$currentPath = [Environment]::GetEnvironmentVariable("Path", "User"); if (-not $currentPath.ToLower().Contains("%s".ToLower())) { [Environment]::SetEnvironmentVariable("Path", $currentPath + ";%s", "User") }`,
			dir, dir,
		)
		
		cmd := exec.Command("powershell", "-NoProfile", "-Command", psCommand)
		if err := cmd.Run(); err != nil {
			fmt.Printf("✗ 自动添加失败: %v\n", err)
			fmt.Println("请手动将该目录添加到系统 PATH 环境变量中")
		} else {
			fmt.Println("✓ 已更新用户环境变量 PATH")
			fmt.Println("注意: 您需要重启终端才能生效")
		}
	} else {
		// Unix 提示
		fmt.Println("请将以下行添加到您的 shell 配置文件中 (~/.bashrc, ~/.zshrc 等):")
		fmt.Printf("export PATH=\"%s:$PATH\"\n", dir)
	}
	fmt.Println("")
}

// createCmdWrapper 创建 Windows CMD 包装器
func createCmdWrapper(dir, cmdName, targetName string) {
	cmdPath := filepath.Join(dir, cmdName+".cmd")
	cmdContent := fmt.Sprintf(`@echo off
"%%~dp0%s" %%*
`, targetName)
	_ = os.WriteFile(cmdPath, []byte(cmdContent), 0644)
}

func createWindowsShortcut(targetPath string) {
	fmt.Println("正在创建桌面快捷方式...")
	homeDir, _ := os.UserHomeDir()
	desktopPath := filepath.Join(homeDir, "Desktop", "OpenCode CLI.lnk")

	script := fmt.Sprintf(`
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("%s")
$Shortcut.TargetPath = "%s"
$Shortcut.Description = "OpenCode 汉化管理工具"
$Shortcut.Save()`, desktopPath, targetPath)

	cmd := core.ExecLive("powershell", "-Command", script)
	if cmd != nil {
		fmt.Printf("✗ 创建快捷方式失败: %v\n", cmd)
	} else {
		fmt.Printf("✓ 已创建快捷方式: %s\n", desktopPath)
	}
}

func createUnixShortcut(targetPath string) {
	fmt.Println("正在创建桌面启动器...")
	homeDir, _ := os.UserHomeDir()
	desktopPath := filepath.Join(homeDir, "Desktop", "OpenCode CLI.command")

	content := fmt.Sprintf(`#!/bin/bash
"%s" interactive
`, targetPath) // 默认进入交互模式

	if err := os.WriteFile(desktopPath, []byte(content), 0755); err != nil {
		fmt.Printf("✗ 创建启动器失败: %v\n", err)
	} else {
		fmt.Printf("✓ 已创建启动器: %s\n", desktopPath)
	}
}

// copyFileDeploy 复制文件
func copyFileDeploy(src, dst string) error {
	// 如果目标文件存在，先删除
	if core.Exists(dst) {
		if err := os.Remove(dst); err != nil {
			return fmt.Errorf("删除旧文件失败（可能正在使用中）: %v", err)
		}
	}

	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// containsPath 检查 PATH 是否包含指定目录
func containsPath(pathVar, dir string) bool {
	separator := ":"
	if runtime.GOOS == "windows" {
		separator = ";"
	}

	paths := filepath.SplitList(pathVar)
	// 标准化路径比较
	cleanDir := filepath.Clean(strings.ToLower(dir))
	
	for _, p := range paths {
		if filepath.Clean(strings.ToLower(p)) == cleanDir {
			return true
		}
	}
	_ = separator
	return false
}

// checkRunningProcess 检查进程是否运行
func checkRunningProcess(name string) {
	// 简单的进程检查 (需要 ps 或 tasklist)
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("tasklist", "/FI", fmt.Sprintf("IMAGENAME eq %s", name))
	} else {
		cmd = exec.Command("pgrep", "-f", name)
	}

	output, _ := cmd.CombinedOutput()
	outputStr := string(output)

	// Windows tasklist 输出包含进程名即为存在
	// Unix pgrep 输出 PID 即为存在
	isRunning := false
	if runtime.GOOS == "windows" {
		if strings.Contains(outputStr, name) {
			isRunning = true
		}
	} else {
		if len(strings.TrimSpace(outputStr)) > 0 {
			isRunning = true
		}
	}

	if isRunning {
		fmt.Printf("\n⚠️  警告: 检测到 %s 正在运行！\n", name)
		fmt.Println("   请立即关闭相关程序，否则文件替换可能会失败。")
		fmt.Println("   按回车键继续部署，或按 Ctrl+C 取消...")
		fmt.Scanln()
	}
}

// checkPathPriority 检查 PATH 优先级
func checkPathPriority(cmdName, deployedPath string) {
	path, err := exec.LookPath(cmdName)
	if err != nil {
		return
	}

	// 解析符号链接
	realDeployedPath, _ := filepath.EvalSymlinks(deployedPath)
	realFoundPath, _ := filepath.EvalSymlinks(path)

	// 统一路径分隔符比较
	realDeployedPath = filepath.Clean(realDeployedPath)
	realFoundPath = filepath.Clean(realFoundPath)

	if !strings.EqualFold(realDeployedPath, realFoundPath) {
		fmt.Printf("\n⚠️  警告: PATH 优先级覆盖未生效\n")
		fmt.Printf("   系统优先使用: %s\n", realFoundPath)
		fmt.Printf("   我们部署在:   %s\n", realDeployedPath)
		fmt.Println("   建议: 请检查 PATH 环境变量顺序，将部署目录前移，或删除旧版本。")

		// 尝试检测是否为旧版 npm 全局安装
		if strings.Contains(strings.ToLower(realFoundPath), "npm") {
			fmt.Printf("\n发现旧的 npm 安装版本，是否尝试自动删除？ [y/N]: ")
			var input string
			fmt.Scanln(&input)
			if strings.ToLower(input) == "y" {
				fmt.Println("正在删除旧版本...")
				// 尝试删除 .exe, .cmd, .ps1 (Windows)
				exts := []string{}
				if runtime.GOOS == "windows" {
					exts = []string{".exe", ".cmd", ".ps1"}
				} else {
					exts = []string{""}
				}
				
				// 清理 opencode 和 opencode-cli
				targets := []string{"opencode", "opencode-cli"}
				
				// 获取基础路径 (去除文件名)
				baseDir := filepath.Dir(realFoundPath)

				for _, name := range targets {
					for _, ext := range exts {
						target := filepath.Join(baseDir, name+ext)
						if core.Exists(target) {
							if err := os.Remove(target); err == nil {
								fmt.Printf("✓ 已删除: %s\n", target)
							} else {
								fmt.Printf("✗ 删除失败: %s (%v)\n", target, err)
							}
						}
					}
				}
				
				fmt.Println("清理完成。请重启终端以生效。")
			}
		}
	}
}
