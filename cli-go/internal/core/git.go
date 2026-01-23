package core

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// ExecInDir 在指定目录执行命令（实时输出）
// 使用 exec.Cmd.Dir 而非 os.Chdir，避免改变全局工作目录
func ExecInDir(dir, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

// ExecInDirQuiet 在指定目录执行命令（静默模式，返回输出）
func ExecInDirQuiet(dir, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("command failed: %s %v: %w", name, args, err)
	}
	return strings.TrimSpace(string(out)), nil
}

// GitPull 在指定目录拉取最新代码
// dir: Git 仓库目录路径
func GitPull(dir string) error {
	fmt.Println("正在拉取最新代码...")
	return ExecInDir(dir, "git", "pull")
}

// GitClone 克隆仓库到指定目录
// url: 仓库地址
// dir: 目标目录
func GitClone(url, dir string) error {
	fmt.Printf("正在克隆仓库 %s...\n", url)
	return ExecLive("git", "clone", url, dir)
}

// GitCheckout 切换到指定分支
// dir: Git 仓库目录
// branch: 目标分支名
func GitCheckout(dir, branch string) error {
	fmt.Printf("正在切换到分支 %s...\n", branch)
	return ExecInDir(dir, "git", "checkout", branch)
}

// GitStash 暂存当前工作区更改
// dir: Git 仓库目录
// 如果没有更改则静默跳过
func GitStash(dir string) error {
	fmt.Println("正在暂存更改...")
	// 检查是否有更改
	out, err := ExecInDirQuiet(dir, "git", "status", "--porcelain")
	if err != nil {
		return err
	}
	if strings.TrimSpace(out) == "" {
		return nil // 无更改，跳过
	}
	return ExecInDir(dir, "git", "stash")
}

// GitStashPop 恢复暂存的更改
// dir: Git 仓库目录
func GitStashPop(dir string) error {
	fmt.Println("正在恢复暂存...")
	return ExecInDir(dir, "git", "stash", "pop")
}

// GetGitRemoteURL 获取远程仓库地址
// dir: Git 仓库目录
// 返回 origin 远程的 URL
func GetGitRemoteURL(dir string) (string, error) {
	return ExecInDirQuiet(dir, "git", "config", "--get", "remote.origin.url")
}

// CleanRepo 清理仓库，恢复到纯净状态
// dir: Git 仓库目录
// 执行 git checkout -- . 和 git clean -fd
func CleanRepo(dir string) error {
	fmt.Println("正在恢复源码到纯净状态...")
	// git checkout -- .
	if err := ExecInDir(dir, "git", "checkout", "--", "."); err != nil {
		return err
	}
	// git clean -fd
	return ExecInDir(dir, "git", "clean", "-fd")
}
