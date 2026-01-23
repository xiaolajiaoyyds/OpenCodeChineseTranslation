# OpenCode Chinese Translation Distribution

[![Release](https://img.shields.io/github/v/release/1186258278/OpenCodeChineseTranslation?label=Latest&style=flat-square&color=blue)](https://github.com/1186258278/OpenCodeChineseTranslation/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](#)
[![Build Status](https://img.shields.io/github/actions/workflow/status/1186258278/OpenCodeChineseTranslation/release.yml?label=Daily%20Build&style=flat-square)](https://github.com/1186258278/OpenCodeChineseTranslation/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

[中文文档](README.md)

> 🚀 **OpenCode Chinese Distribution | ⚡️ Daily Sync with Official | Automated Cross-Platform Builds (Win/Mac/Linux)**

---

## Overview

**OpenCode Chinese Translation** is a fully automated localization project for [OpenCode](https://github.com/anomalyco/opencode). We've built a complete CI/CD pipeline using GitHub Actions that **daily** pulls the latest source code, applies Chinese translation patches, and builds installation packages for Windows, macOS, and Linux.

**Key Features:**
*   ⚡️ **Daily Auto-Updates**: Stay up-to-date with the latest official features.
*   📦 **Cross-Platform Support**: Provides Windows, macOS (Apple Silicon), and Linux binaries.
*   🚀 **Zero-Dependency Installation**: New Go-based CLI tool, no Node.js or Bun required.
*   🔧 **Complete Localization**: Covers TUI, dialogs, and core workflows.

---

## Quick Start

### 1. One-Line Installation (Recommended)

The new installation scripts download the **Go-based CLI tool** directly, requiring no runtime dependencies.

**Windows (PowerShell)**
```powershell
powershell -c "irm https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/install.ps1 | iex"
```

**Linux / macOS**
```bash
curl -fsSL https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/install.sh | bash
```

### 2. Usage

After installation, run in your terminal:

```bash
opencode-cli
```

This launches the interactive menu.

### 3. Download Prebuilt Version (New in v8.1+)

If you already have `opencode-cli` installed, use the built-in download feature:

```bash
opencode-cli download
```

This automatically downloads the latest prebuilt Chinese version from GitHub Releases, no local compilation needed.

### 4. Manual Download

You can also visit the [Releases page](https://github.com/1186258278/OpenCodeChineseTranslation/releases/latest) to download binaries directly.

| Platform | CLI Tool | Chinese OpenCode |
|----------|----------|------------------|
| Windows x64 | `opencode-cli-windows-amd64.exe` | `opencode-zh-CN-windows-x64.zip` |
| macOS Apple Silicon | `opencode-cli-darwin-arm64` | `opencode-zh-CN-darwin-arm64.zip` |
| Linux x64 | `opencode-cli-linux-amd64` | `opencode-zh-CN-linux-x64.zip` |

---

## CLI Commands

The CLI tool (v8.1.0) provides comprehensive management capabilities:

| Command | Description |
|---------|-------------|
| `opencode-cli` | Launch interactive menu (default) |
| `opencode-cli download` | 📦 **New**: Download prebuilt Chinese version |
| `opencode-cli update` | Update OpenCode source code |
| `opencode-cli apply` | Apply translation patches |
| `opencode-cli verify` | Verify translation configuration |
| `opencode-cli build` | Build OpenCode binary |
| `opencode-cli deploy --shortcut` | Deploy and create desktop shortcut |
| `opencode-cli antigravity` | Configure Antigravity local AI proxy |
| `opencode-cli helper` | Install Zhipu Coding Helper (@z_ai/coding-helper) |

---

## Developer Guide

If you want to contribute, please refer to the [Contributing Guide](CONTRIBUTING.md).

*   [📅 Changelog](CHANGELOG.md)
*   [🚀 Antigravity Integration Guide](docs/ANTIGRAVITY_INTEGRATION.md)

---

## FAQ

**Q: Build failed with "bun command not found"?**
A: Bun is required for building OpenCode from source. Install it from [bun.sh](https://bun.sh). Alternatively, use `opencode-cli download` to get prebuilt binaries.

**Q: Some interface text is still in English?**
A: OpenCode updates frequently, and some new features may not yet be covered. Please submit an Issue to report missing translations.

**Q: How to use custom AI models?**
A: Use `opencode-cli antigravity` for one-click configuration, or manually edit `~/.config/opencode/opencode.json`.

---

## License

This project is open-sourced under the [MIT License](LICENSE).
The original OpenCode project is copyright [Anomaly Company](https://anomaly.company/).
