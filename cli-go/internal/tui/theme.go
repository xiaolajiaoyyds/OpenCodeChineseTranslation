package tui

import "github.com/charmbracelet/lipgloss"

// 主题颜色
var (
	Cyan    = lipgloss.Color("6")
	Green   = lipgloss.Color("2")
	Yellow  = lipgloss.Color("3")
	Red     = lipgloss.Color("1")
	White   = lipgloss.Color("15")
	Gray    = lipgloss.Color("8")
	Black   = lipgloss.Color("0")
	Magenta = lipgloss.Color("5")
)

// Box Drawing 字符
const (
	TopLeft     = "╭"
	TopRight    = "╮"
	BottomLeft  = "╰"
	BottomRight = "╯"
	Horizontal  = "─"
	Vertical    = "│"
	LeftTee     = "├"
	RightTee    = "┤"
)

// 布局配置
const (
	MaxWidth = 72
	MinWidth = 56
	Columns  = 3
)

// 样式定义
var (
	// 边框样式
	BorderStyle = lipgloss.NewStyle().
			Foreground(Cyan)

	// 标题样式
	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(White)

	// 选中项样式
	SelectedStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(Black).
			Background(White)

	// 普通项样式
	NormalStyle = lipgloss.NewStyle().
			Foreground(White)

	// 描述样式
	DescStyle = lipgloss.NewStyle().
			Foreground(Yellow)

	// 状态栏样式
	StatusStyle = lipgloss.NewStyle().
			Foreground(Cyan)

	// 成功状态
	SuccessStyle = lipgloss.NewStyle().
			Foreground(Green)

	// 警告状态
	WarnStyle = lipgloss.NewStyle().
		Foreground(Yellow)

	// 错误状态
	ErrorStyle = lipgloss.NewStyle().
			Foreground(Red)

	// 灰色样式
	DimStyle = lipgloss.NewStyle().
			Foreground(Gray)

	// 提示样式
	HintStyle = lipgloss.NewStyle().
			Foreground(Gray)
)
