package core

import (
	"archive/zip"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Packager 打包器
type Packager struct {
	projectDir string
	version    string
}

// NewPackager 创建打包器
func NewPackager() (*Packager, error) {
	projectDir, err := GetProjectDir()
	if err != nil {
		return nil, err
	}
	return &Packager{
		projectDir: projectDir,
		version:    VERSION,
	}, nil
}

// GetReleasesDir 获取 releases 目录
func (p *Packager) GetReleasesDir() string {
	return filepath.Join(p.projectDir, "releases")
}

// PackageInfo 打包信息
type PackageInfo struct {
	Platform string
	Filename string
	Path     string
	Size     string
	Bytes    int64
	MD5      string
	SHA256   string
	Success  bool
}

// CalculateChecksums 计算校验码
func CalculateChecksums(filePath string) (string, string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", "", err
	}
	defer file.Close()

	hashMD5 := md5.New()
	hashSHA256 := sha256.New()

	// 使用 MultiWriter 同时写入两个 hash
	writer := io.MultiWriter(hashMD5, hashSHA256)

	if _, err := io.Copy(writer, file); err != nil {
		return "", "", err
	}

	return hex.EncodeToString(hashMD5.Sum(nil)), hex.EncodeToString(hashSHA256.Sum(nil)), nil
}

// ZipDirectory 压缩目录
func ZipDirectory(source, target string) error {
	zipfile, err := os.Create(target)
	if err != nil {
		return err
	}
	defer zipfile.Close()

	archive := zip.NewWriter(zipfile)
	defer archive.Close()

	return filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 获取相对路径
		relPath, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}

		if relPath == "." {
			return nil
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		// 使用正斜杠
		header.Name = filepath.ToSlash(relPath)

		if info.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		return err
	})
}

// PackagePlatform 打包单个平台
func (p *Packager) PackagePlatform(platform string, versionDir string) (*PackageInfo, error) {
	fmt.Printf("打包 %s...\n", platform)

	// 触发编译
	builder, err := NewBuilder()
	if err != nil {
		return nil, err
	}

	distPath := builder.GetDistPath(platform)
	if !Exists(distPath) {
		fmt.Printf("  编译产物不存在，正在编译 %s...\n", platform)
		if err := builder.Build(platform, false); err != nil {
			return nil, err
		}
	}

	if !Exists(distPath) {
		return nil, fmt.Errorf("编译产物仍不存在: %s", distPath)
	}

	baseName := fmt.Sprintf("opencode-zh-CN-v%s-%s", p.version, platform)
	tempDir := filepath.Join(versionDir, "temp", baseName)
	
	// 清理并创建临时目录
	os.RemoveAll(tempDir)
	if err := EnsureDir(tempDir); err != nil {
		return nil, err
	}

	// 复制二进制文件
	binName := filepath.Base(distPath)
	destBinPath := filepath.Join(tempDir, binName)
	if err := CopyFile(distPath, destBinPath); err != nil {
		return nil, err
	}

	// 压缩
	outputPath := filepath.Join(versionDir, baseName+".zip")
	os.Remove(outputPath) // 删除旧文件

	if err := ZipDirectory(tempDir, outputPath); err != nil {
		return nil, fmt.Errorf("压缩失败: %v", err)
	}

	// 清理临时目录
	os.RemoveAll(tempDir)

	// 计算信息
	fileInfo, err := os.Stat(outputPath)
	if err != nil {
		return nil, err
	}

	md5Sum, sha256Sum, err := CalculateChecksums(outputPath)
	if err != nil {
		return nil, err
	}

	sizeMB := float64(fileInfo.Size()) / 1024 / 1024

	fmt.Printf("打包完成: %s (%.2f MB)\n", filepath.Base(outputPath), sizeMB)

	return &PackageInfo{
		Platform: platform,
		Filename: filepath.Base(outputPath),
		Path:     outputPath,
		Size:     fmt.Sprintf("%.2f MB", sizeMB),
		Bytes:    fileInfo.Size(),
		MD5:      md5Sum,
		SHA256:   sha256Sum,
		Success:  true,
	}, nil
}

// GenerateReleaseNotes 生成发布说明
func (p *Packager) GenerateReleaseNotes(opencodeInfo OpencodeInfo, packages []*PackageInfo, versionDir string) error {
	now := time.Now()
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04:05")

	changelog := GetOpencodeChangelog(15)

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# OpenCode 中文汉化版 v%s\n\n", p.version))
	sb.WriteString(fmt.Sprintf("> 🎉 **发布日期**: %s %s\n", dateStr, timeStr))
	sb.WriteString(fmt.Sprintf("> 📦 **基于 OpenCode**: v%s (commit: `%s`)\n", opencodeInfo.Version, opencodeInfo.Commit))
	sb.WriteString(fmt.Sprintf("> 🔧 **构建环境**: Bun %s\n\n", opencodeInfo.BunVersion))
	sb.WriteString("---\n\n")
	sb.WriteString("## 🚀 官方近期更新 (Upstream Changes)\n\n")
	sb.WriteString(changelog + "\n\n")
	sb.WriteString("---\n\n")
	sb.WriteString("## 📦 下载文件\n\n")
	sb.WriteString("| 平台 | 文件名 | 大小 | MD5 |\n")
	sb.WriteString("|------|--------|------|-----|\n")

	for _, pkg := range packages {
		shortMD5 := pkg.MD5
		if len(shortMD5) > 8 {
			shortMD5 = shortMD5[:8] + "..."
		}
		sb.WriteString(fmt.Sprintf("| %s | `%s` | %s | `%s` |\n", pkg.Platform, pkg.Filename, pkg.Size, shortMD5))
	}

	sb.WriteString("\n---\n\n## 🔐 校验码\n\n```\n")
	for _, pkg := range packages {
		sb.WriteString(fmt.Sprintf("# %s\nMD5:    %s\nSHA256: %s\n\n", pkg.Filename, pkg.MD5, pkg.SHA256))
	}
	sb.WriteString("```\n")

	return os.WriteFile(filepath.Join(versionDir, "RELEASE_NOTES.md"), []byte(sb.String()), 0644)
}

// GenerateChecksumsFile 生成校验文件
func (p *Packager) GenerateChecksumsFile(packages []*PackageInfo, versionDir string) error {
	var sb strings.Builder
	for _, pkg := range packages {
		sb.WriteString(fmt.Sprintf("文件: %s\n大小: %s\nMD5:    %s\nSHA256: %s\n\n", pkg.Filename, pkg.Size, pkg.MD5, pkg.SHA256))
	}
	return os.WriteFile(filepath.Join(versionDir, "checksums.txt"), []byte(sb.String()), 0644)
}
