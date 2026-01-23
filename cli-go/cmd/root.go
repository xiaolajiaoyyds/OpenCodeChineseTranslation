package cmd

import (
	"fmt"
	"os"

	"opencode-cli/internal/core"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:     "opencode-cli",
	Short:   "OpenCode Chinese Translation Tool",
	Long:    `A CLI tool for managing OpenCode Chinese translations.`,
	Version: core.VERSION,
	Run: func(cmd *cobra.Command, args []string) {
		// 默认启动交互式菜单
		RunMenu()
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
