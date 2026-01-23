# OpenCode 中文汉化发行版

[![Release](https://img.shields.io/github/v/release/1186258278/OpenCodeChineseTranslation?label=最新汉化版&style=flat-square&color=blue)](https://github.com/1186258278/OpenCodeChineseTranslation/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](#)
[![Build Status](https://img.shields.io/github/actions/workflow/status/1186258278/OpenCodeChineseTranslation/release.yml?label=每日构建&style=flat-square)](https://github.com/1186258278/OpenCodeChineseTranslation/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

> 🚀 **OpenCode 汉化发行版 | ⚡️ 每日自动同步官方最新版 | 全自动构建三端安装包 (Win/Mac/Linux)**
> 
> 🎉 **访问官方网站**：[https://1186258278.github.io/OpenCodeChineseTranslation/](https://1186258278.github.io/OpenCodeChineseTranslation/)

---

## 项目简介

**OpenCode 汉化发行版** 是一个全自动化的 OpenCode 本地化项目。我们基于 GitHub Actions 构建了一套完整的自动化流水线，**每日定时**从官方仓库拉取最新源码，自动应用汉化补丁，并构建适用于 Windows、macOS 和 Linux 的中文安装包。

**主要特性：**
*   ⚡️ **每日自动更新**：紧跟官方节奏，第一时间体验新特性。
*   📦 **全平台支持**：提供 Windows、macOS (Apple Silicon)、Linux 二进制包。
*   🚀 **一键安装**：全新 Go 语言编写的管理工具，无需任何运行时依赖。
*   🔧 **完整汉化**：覆盖 TUI、对话框及核心交互流程。

## 界面预览

<p align="center">
  <img src="docs/0-1.png" alt="OpenCode 汉化管理工具主界面" width="800">
</p>

---

## 快速开始

### 1. 一键安装 (推荐)

全新的安装脚本会自动下载 **Go 版本 CLI 工具**，无需安装 Node.js 或 Bun。

**Windows (PowerShell)**
```powershell
powershell -c "irm https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/install.ps1 | iex"
```

**Linux / macOS**
```bash
curl -fsSL https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/install.sh | bash
```

### 2. 使用方法

安装完成后，直接在终端运行：

```bash
opencode interactive
```

或者使用快捷命令 `opencode` 启动交互式菜单。

### 3. 使用 CLI 下载预编译版 (新功能 v8.1+)

如果您已安装 `opencode-cli`，可以直接使用内置的下载功能：

```bash
opencode-cli download
```

此命令会自动从 GitHub Releases 下载最新的预编译汉化版 OpenCode，无需本地编译环境。

### 4. 手动下载

如果您无法使用脚本安装，也可以直接访问 [Releases 页面](https://github.com/1186258278/OpenCodeChineseTranslation/releases/latest) 下载对应平台的二进制文件。

| 平台 | 管理工具 | 汉化版 OpenCode |
|------|----------|-----------------|
| Windows x64 | `opencode-cli-windows-amd64.exe` | `opencode-zh-CN-windows-x64.zip` |
| macOS Apple Silicon | `opencode-cli-darwin-arm64` | `opencode-zh-CN-darwin-arm64.zip` |
| Linux x64 | `opencode-cli-linux-amd64` | `opencode-zh-CN-linux-x64.zip` |

---

## 管理工具功能

新的 CLI 工具 (v8.1.0) 提供了丰富的功能来管理您的 OpenCode 安装：

| 命令 | 说明 |
|------|------|
| `opencode-cli` | 启动交互式管理菜单 (默认) |
| `opencode-cli download` | 📦 **新功能**: 下载预编译汉化版，无需本地编译环境 |
| `opencode-cli update` | 更新 OpenCode 源码 |
| `opencode-cli apply` | 应用汉化补丁 |
| `opencode-cli verify` | 验证汉化配置完整性 |
| `opencode-cli build` | 编译构建 OpenCode |
| `opencode-cli deploy --shortcut` | 部署并创建桌面快捷方式 |
| `opencode-cli antigravity` | 配置 Antigravity 本地 AI 代理 |
| `opencode-cli helper` | 安装智谱编码助手 (@z_ai/coding-helper) |

---

## 开发者指南

如果您希望参与贡献，请参考 [贡献指南](CONTRIBUTING.md)。

*   [📅 更新日志 (CHANGELOG)](CHANGELOG.md)
*   [🚀 Antigravity 集成指南](docs/ANTIGRAVITY_INTEGRATION.md)

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
OpenCode 原项目版权归 [Anomaly Company](https://anomaly.company/) 所有。
