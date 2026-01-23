package cmd

import (
	"fmt"
	"opencode-cli/internal/core"
	"path/filepath"

	"github.com/spf13/cobra"
)

var packageCmd = &cobra.Command{
	Use:   "package",
	Short: "Package OpenCode for release",
	Run: func(cmd *cobra.Command, args []string) {
		platform, _ := cmd.Flags().GetString("platform")
		all, _ := cmd.Flags().GetBool("all")
		// skipBinaries, _ := cmd.Flags().GetBool("skip-binaries")

		packager, err := core.NewPackager()
		if err != nil {
			fmt.Printf("错误: 初始化打包器失败: %v\n", err)
			return
		}

		opencodeInfo := core.GetOpencodeInfo()
		fmt.Printf("打包 v%s (基于 OpenCode v%s)\n", core.VERSION, opencodeInfo.Version)

		versionDir := filepath.Join(packager.GetReleasesDir(), fmt.Sprintf("v%s", core.VERSION))
		if err := core.EnsureDir(versionDir); err != nil {
			fmt.Printf("错误: 创建发布目录失败: %v\n", err)
			return
		}

		var platforms []string
		if all {
			platforms = []string{"windows-x64", "darwin-arm64", "linux-x64"}
		} else if platform != "" {
			platforms = []string{platform}
		} else {
			// 默认打包 windows-x64，或者根据当前系统判断，这里简化为 windows-x64
			platforms = []string{"windows-x64"}
		}

		var packages []*core.PackageInfo

		for _, p := range platforms {
			pkgInfo, err := packager.PackagePlatform(p, versionDir)
			if err != nil {
				fmt.Printf("打包 %s 失败: %v\n", p, err)
			} else {
				packages = append(packages, pkgInfo)
			}
		}

		if len(packages) > 0 {
			if err := packager.GenerateReleaseNotes(opencodeInfo, packages, versionDir); err != nil {
				fmt.Printf("警告: 生成发布说明失败: %v\n", err)
			} else {
				fmt.Println("生成发布说明: RELEASE_NOTES.md")
			}

			if err := packager.GenerateChecksumsFile(packages, versionDir); err != nil {
				fmt.Printf("警告: 生成校验文件失败: %v\n", err)
			} else {
				fmt.Println("生成校验文件: checksums.txt")
			}
		}

		fmt.Println("\n打包流程结束")
		fmt.Printf("版本目录: %s\n", versionDir)
	},
}

func init() {
	rootCmd.AddCommand(packageCmd)
	packageCmd.Flags().StringP("platform", "p", "", "Target platform")
	packageCmd.Flags().Bool("all", false, "Package all platforms")
	packageCmd.Flags().Bool("skip-binaries", false, "Skip binary packaging")
}
