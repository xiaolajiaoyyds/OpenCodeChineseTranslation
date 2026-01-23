package core

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// GetProjectDir 获取项目根目录
func GetProjectDir() (string, error) {
	// 1. 尝试环境变量 OPENCODE_PROJECT_DIR
	if envDir := os.Getenv("OPENCODE_PROJECT_DIR"); envDir != "" {
		if _, err := os.Stat(filepath.Join(envDir, "opencode-i18n")); err == nil {
			return envDir, nil
		}
	}

	// 2. 尝试从当前工作目录向上查找
	wd, err := os.Getwd()
	if err == nil {
		currentDir := wd
		for {
			if _, err := os.Stat(filepath.Join(currentDir, "opencode-i18n")); err == nil {
				return currentDir, nil
			}
			parentDir := filepath.Dir(currentDir)
			if parentDir == currentDir {
				break
			}
			currentDir = parentDir
		}
	}

	// 3. 尝试从可执行文件目录向上查找
	exePath, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exePath)
		currentDir := exeDir
		for {
			if _, err := os.Stat(filepath.Join(currentDir, "opencode-i18n")); err == nil {
				return currentDir, nil
			}
			parentDir := filepath.Dir(currentDir)
			if parentDir == currentDir {
				break
			}
			currentDir = parentDir
		}
	}

	// 4. 如果是开发环境（如 go run），尝试特定路径
	// 假设我们在 cli-go 目录下运行
	if wd, err := os.Getwd(); err == nil {
		if strings.HasSuffix(wd, "cli-go") {
			parent := filepath.Dir(wd)
			if _, err := os.Stat(filepath.Join(parent, "opencode-i18n")); err == nil {
				return parent, nil
			}
		}
	}

	return "", fmt.Errorf("project root not found (missing opencode-i18n directory)")
}

// GetOpencodeDir 获取 OpenCode 源码目录
func GetOpencodeDir() (string, error) {
	projectDir, err := GetProjectDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(projectDir, "opencode-zh-CN"), nil
}

// GetI18nDir 获取汉化配置目录
func GetI18nDir() (string, error) {
	projectDir, err := GetProjectDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(projectDir, "opencode-i18n"), nil
}

// GetBinDir 获取输出目录
func GetBinDir() (string, error) {
	projectDir, err := GetProjectDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(projectDir, "bin"), nil
}

// Exec 执行命令并返回输出
func Exec(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("command failed: %s %v\n%s", name, args, err)
	}
	return strings.TrimSpace(string(out)), nil
}

// ExecLive 实时执行命令，输出到 stdout
func ExecLive(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

// ExecLiveEnv 实时执行命令（带环境变量）
func ExecLiveEnv(name string, args []string, env []string) error {
	cmd := exec.Command(name, args...)
	cmd.Env = env
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

// Exists 检查路径是否存在
func Exists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

// EnsureDir 确保目录存在
func EnsureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

// CopyFile 复制文件
func CopyFile(src, dst string) error {
	sourceFileStat, err := os.Stat(src)
	if err != nil {
		return err
	}

	if !sourceFileStat.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", src)
	}

	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	if err := EnsureDir(filepath.Dir(dst)); err != nil {
		return err
	}

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	return err
}

// ReadJSON 读取 JSON 文件
func ReadJSON(path string, v interface{}) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	return json.NewDecoder(file).Decode(v)
}

// WriteJSON 写入 JSON 文件
func WriteJSON(path string, v interface{}) error {
	if err := EnsureDir(filepath.Dir(path)); err != nil {
		return err
	}
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(v)
}

// IsWindows 检查是否为 Windows
func IsWindows() bool {
	return runtime.GOOS == "windows"
}

// FileExists 检查文件是否存在（非目录）
func FileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

// DirExists 检查目录是否存在
func DirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// Truncate 截断字符串到指定长度
// 如果超过 maxLen，添加省略号
func Truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// DetectPlatform 检测当前平台，返回 OpenCode 构建目标格式
// 返回值如：windows-x64, darwin-arm64, linux-x64
func DetectPlatform() string {
	os := runtime.GOOS
	arch := runtime.GOARCH

	// 平台映射
	switch os {
	case "windows":
		if arch == "amd64" || arch == "x64" {
			return "windows-x64"
		}
	case "darwin":
		if arch == "arm64" {
			return "darwin-arm64"
		}
		if arch == "amd64" {
			return "darwin-x64"
		}
	case "linux":
		if arch == "amd64" || arch == "x64" {
			return "linux-x64"
		}
		if arch == "arm64" {
			return "linux-arm64"
		}
	}

	// 默认
	return "windows-x64"
}
