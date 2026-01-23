package core

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// TranslationConfig 汉化配置结构
type TranslationConfig struct {
	Category     string
	FileName     string
	ConfigPath   string
	File         string            `json:"file"`
	Replacements map[string]string `json:"replacements"`
}

// Replacement 单条替换规则（用于 verify 命令）
type Replacement struct {
	From string
	To   string
}

// GetReplacementsList 获取替换规则列表
func (c *TranslationConfig) GetReplacementsList() []Replacement {
	var list []Replacement
	for from, to := range c.Replacements {
		list = append(list, Replacement{From: from, To: to})
	}
	return list
}

// LoadI18nConfig 从单个 JSON 文件加载配置
func LoadI18nConfig(path string) (*TranslationConfig, error) {
	var config TranslationConfig
	if err := ReadJSON(path, &config); err != nil {
		return nil, err
	}
	config.ConfigPath = path
	return &config, nil
}

// I18n 汉化处理器
type I18n struct {
	i18nDir     string
	opencodeDir string
}

// NewI18n 创建 I18n 实例
func NewI18n() (*I18n, error) {
	i18nDir, err := GetI18nDir()
	if err != nil {
		return nil, err
	}
	opencodeDir, err := GetOpencodeDir()
	if err != nil {
		return nil, err
	}
	return &I18n{
		i18nDir:     i18nDir,
		opencodeDir: opencodeDir,
	}, nil
}

// LoadConfig 读取所有汉化配置文件
func (i *I18n) LoadConfig() ([]TranslationConfig, error) {
	var configs []TranslationConfig

	entries, err := os.ReadDir(i.i18nDir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			categoryDir := filepath.Join(i.i18nDir, entry.Name())
			files, err := os.ReadDir(categoryDir)
			if err != nil {
				continue
			}

			for _, file := range files {
				if strings.HasSuffix(file.Name(), ".json") {
					configPath := filepath.Join(categoryDir, file.Name())
					var config TranslationConfig
					if err := ReadJSON(configPath, &config); err != nil {
						fmt.Printf("警告: 解析配置文件失败 %s: %v\n", configPath, err)
						continue
					}
					config.Category = entry.Name()
					config.FileName = file.Name()
					config.ConfigPath = configPath
					configs = append(configs, config)
				}
			}
		}
	}

	return configs, nil
}

// ApplyResult 应用结果
type ApplyResult struct {
	File         string
	Success      bool
	Replacements struct {
		Total   int
		Success int
		Failed  int
	}
	Skipped    bool
	SkipReason string
}

// ApplyConfig 应用单个配置文件的替换规则
func (i *I18n) ApplyConfig(config TranslationConfig, dryRun bool) ApplyResult {
	result := ApplyResult{
		File: config.File,
	}

	if config.File == "" || len(config.Replacements) == 0 {
		result.Skipped = true
		result.SkipReason = "缺少 file 或 replacements 字段"
		return result
	}

	relativePath := config.File
	if !strings.HasPrefix(relativePath, "packages/") {
		relativePath = filepath.Join("packages", "opencode", relativePath)
	}

	targetPath := filepath.Join(i.opencodeDir, relativePath)

	if !Exists(targetPath) {
		result.Skipped = true
		result.SkipReason = "目标文件不存在"
		return result
	}

	contentBytes, err := os.ReadFile(targetPath)
	if err != nil {
		result.Skipped = true
		result.SkipReason = fmt.Sprintf("读取文件失败: %v", err)
		return result
	}
	content := string(contentBytes)
	// 规范化换行符
	content = strings.ReplaceAll(content, "\r\n", "\n")
	originalContent := content

	result.Replacements.Total = len(config.Replacements)

	for find, replace := range config.Replacements {
		// 规范化查找字符串
		normalizedFind := strings.ReplaceAll(find, "\r\n", "\n")

		// 判断是否为简单单词（只包含字母和数字）
		isSimpleWord, _ := regexp.MatchString("^[a-zA-Z0-9]+$", normalizedFind)

		matched := false
		if isSimpleWord {
			// 简单单词使用单词边界
			wordBoundaryPattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(normalizedFind) + `\b`)
			if wordBoundaryPattern.MatchString(content) {
				if !dryRun {
					content = wordBoundaryPattern.ReplaceAllString(content, replace)
				}
				matched = true
			}
		} else {
			// 复杂模式使用普通替换
			if strings.Contains(content, normalizedFind) {
				if !dryRun {
					content = strings.ReplaceAll(content, normalizedFind, replace)
				}
				matched = true
			}
		}

		if matched {
			result.Replacements.Success++
		} else {
			result.Replacements.Failed++
		}
	}

	if !dryRun && content != originalContent {
		if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
			result.Success = false
			fmt.Printf("错误: 写入文件失败 %s: %v\n", targetPath, err)
		} else {
			result.Success = result.Replacements.Success > 0
		}
	} else {
		result.Success = result.Replacements.Success > 0
	}

	return result
}
