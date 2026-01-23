# OpenCode 中文汉化发行版

[![Release](https://img.shields.io/github/v/release/1186258278/OpenCodeChineseTranslation?label=最新正式版&style=flat-square&color=blue)](https://github.com/1186258278/OpenCodeChineseTranslation/releases/latest)
[![Nightly](https://img.shields.io/badge/Nightly-自动构建-orange?style=flat-square)](https://github.com/1186258278/OpenCodeChineseTranslation/releases/tag/nightly)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](#)
[![Build Status](https://img.shields.io/github/actions/workflow/status/1186258278/OpenCodeChineseTranslation/release.yml?label=构建状态&style=flat-square)](https://github.com/1186258278/OpenCodeChineseTranslation/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

> 🚀 **OpenCode 汉化发行版** | ⚡️ **每小时自动同步官方更新** | 全自动构建三端安装包 (Win/Mac/Linux)
> 
> 🎉 **访问官方网站**：[https://1186258278.github.io/OpenCodeChineseTranslation/](https://1186258278.github.io/OpenCodeChineseTranslation/)

---

## 项目简介

**OpenCode 汉化发行版** 是一个全自动化的 OpenCode 本地化项目。我们基于 GitHub Actions 构建了一套完整的自动化流水线：

- **🕐 每小时检测** 官方仓库更新
- **📊 智能触发** 累计 ≥5 个新 commit 时自动构建
- **📝 完整日志** Release Notes 自动包含官方更新日志

**主要特性：**
*   ⚡️ **实时跟进**：每小时检测上游更新，第一时间体验新特性
*   📦 **全平台支持**：提供 Windows、macOS (Apple Silicon)、Linux 二进制包
*   🚀 **一键安装**：Go 语言编写的管理工具，无需任何运行时依赖
*   🔧 **完整汉化**：覆盖 TUI、对话框及核心交互流程

---

## 界面预览

### CLI 管理工具

<p align="center">
  <img src="docs/01.png" alt="OpenCode 汉化管理工具" width="800">
</p>

**全功能 TUI 界面** - 一键完成更新、汉化、编译、部署

### 汉化后的 OpenCode

<p align="center">
  <img src="docs/02.png" alt="OpenCode 主编辑器" width="800">
</p>

**沉浸式中文编程体验** - 命令面板、侧边栏、对话框完整汉化

### MCP 服务器配置

<p align="center">
  <img src="docs/05.png" alt="MCP 配置界面" width="800">
</p>

**MCP 服务器管理** - 状态监控、工具配置、资源管理

> 📸 更多截图请查看 [功能演示文档](docs/SCREENSHOTS.md)

---

## 快速开始

### 1. 一键安装 (推荐)

全新的安装脚本会自动下载 **Go 版本 CLI 工具**，无需安装 Node.js 或 Bun。

**Windows (PowerShell)**
```powershell
powershell -c "irm https://cdn.jsdelivr.net/gh/1186258278/OpenCodeChineseTranslation@main/install.ps1 | iex"
```

**Linux / macOS**
```bash
curl -fsSL https://cdn.jsdelivr.net/gh/1186258278/OpenCodeChineseTranslation@main/install.sh | bash
```

> 💡 使用 jsDelivr CDN 加速，解决国内网络问题

### 2. 使用方法

安装完成后，直接在终端运行：

```bash
opencode-cli
```

启动交互式菜单，通过方向键选择功能。

### 3. 下载预编译版 (推荐新手)

如果您已安装 `opencode-cli`，可以直接使用内置的下载功能：

```bash
opencode-cli download
```

此命令会自动从 GitHub Releases 下载最新的预编译汉化版 OpenCode，无需本地编译环境。

### 4. 手动下载

访问 [Releases 页面](https://github.com/1186258278/OpenCodeChineseTranslation/releases/latest) 下载：

| 平台 | 管理工具 (CLI) | 汉化版 OpenCode |
|------|----------------|-----------------|
| Windows x64 | `opencode-cli-windows-amd64.exe` | `opencode-zh-CN-*-windows-x64.zip` |
| macOS Apple Silicon | `opencode-cli-darwin-arm64` | `opencode-zh-CN-*-darwin-arm64.zip` |
| Linux x64 | `opencode-cli-linux-amd64` | `opencode-zh-CN-*-linux-x64.zip` |

---

## 版本说明

本项目提供两种版本：

| 版本 | Tag | 说明 | 推荐用户 |
|------|-----|------|----------|
| **正式版** | `v8.x.x` | 经过测试的稳定版本 | 普通用户 |
| **Nightly** | `nightly` | 每小时自动跟进上游更新 | 开发者/测试者 |

**Nightly 版本特点：**
- 每小时检测上游更新，累计 ≥5 个 commit 时自动构建
- Release Notes 包含 OpenCode 官方更新日志
- 固定 `nightly` tag，下载链接始终指向最新构建

---

## CLI 工具功能

| 命令 | 说明 |
|------|------|
| `opencode-cli` | 启动交互式管理菜单 |
| `opencode-cli download` | 📦 下载预编译汉化版 |
| `opencode-cli update` | 更新 OpenCode 源码 |
| `opencode-cli apply` | 应用汉化补丁 |
| `opencode-cli verify` | 验证汉化配置完整性 |
| `opencode-cli build` | 编译构建 OpenCode |
| `opencode-cli deploy --shortcut` | 部署并创建桌面快捷方式 |
| `opencode-cli antigravity` | 配置 Antigravity 本地 AI 代理 |

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [📅 更新日志](CHANGELOG.md) | 版本更新记录 |
| [📸 功能截图](docs/SCREENSHOTS.md) | 界面预览与演示 |
| [🔧 贡献指南](CONTRIBUTING.md) | 开发者参与指南 |
| [🚀 Antigravity 集成](docs/ANTIGRAVITY_INTEGRATION.md) | 本地 AI 网关配置 |
| [🤖 AI 维护指南](docs/AI_MAINTENANCE.md) | AI 助手维护手册 |

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

OpenCode 原项目版权归 [Anomaly Company](https://anomaly.company/) 所有。
