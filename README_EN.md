# OpenCode Chinese Localization Tool

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-blue.svg)](https://microsoft.com/PowerShell)
[![OpenCode](https://img.shields.io/badge/OpenCode-dev-green.svg)](https://github.com/anomalyco/opencode)

> Make OpenCode AI coding assistant more user-friendly with Chinese localization!

[中文版](README.md) | English

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Translation Scope](#translation-scope)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Menu Guide](#menu-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The OpenCode Chinese Localization Tool is a comprehensive PowerShell management script suite that localizes the OpenCode project to Chinese. It supports automated workflows for pulling, patching, building, and deploying.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **One-Click Localization** | Automated pull, patch, and build OpenCode |
| **Modular Configuration** | 36 independent i18n modules for easy maintenance |
| **Version Management** | Check updates, view changelog, pull latest code |
| **Backup & Restore** | Full backup and selective restore |
| **Verification** | Validate translation coverage, debug tools |
| **Interactive Changelog** | View commit history with details and browser integration |

---

## Translation Scope

- 🎯 **Command Panel** - Sessions, models, agent switching
- 💬 **Dialogs** - Agent selection, session list, message handling
- 📊 **Sidebar** - Context management, MCP status
- 🔝 **Top Bar** - Sub-agent navigation
- 🛠️ **Permission System** - File access requests
- 🔔 **Notifications & Tips** - 70+ action prompts

---

## Project Structure

```
OpenCodeChineseTranslation/
├── .gitignore               # Git ignore configuration
├── README.md                # Bilingual documentation
├── README_EN.md             # This file (English version)
├── CONTRIBUTING.md          # Contribution guide
├── LICENSE                  # MIT License
├── scripts/                 # Management scripts
│   └── opencode.ps1         # Main script (2300+ lines)
├── opencode-i18n/           # Modular i18n configuration
│   ├── config.json          # Main configuration file
│   ├── dialogs/             # Dialog translations (21 modules)
│   ├── routes/              # Route translations (3 modules)
│   ├── components/          # Component translations (6 modules)
│   └── common/              # Common translations (6 modules)
├── opencode-zh-CN/          # OpenCode source (Git submodule)
├── dist/                    # Build output (.gitignore)
└── docs/                    # Project documentation
    └── SCREENSHOTS.md        # Feature showcase
```

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| PowerShell | 5.1+ | Built-in with Windows |
| Git | 2.25+ | [git-scm.com](https://git-scm.com/) |
| Bun | 1.3+ | `npm install -g bun` |

### Clone & Initialize

```bash
# Clone the repository
git clone https://github.com/1186258278/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation

# Initialize submodule
git submodule update --init --recursive
```

### Run Localization Script

```powershell
.\scripts\opencode.ps1
```

Select `[1] One-Click Localization+Deploy` and wait for completion.

---

## Menu Guide

### Main Menu

| Option | Function |
|--------|----------|
| `[1]` | **One-Click Localization+Deploy** (Recommended for beginners) |
| `[2]` | Verify Translation Results |
| `[3]` | Debug Tools |
| `[4]` | Check Version Updates |
| `[5]` | Backup Current Version |
| `[L]` | View Changelog |
| `[6]` | Advanced Menu |

### Advanced Menu

| Option | Function |
|--------|----------|
| `[1]` | Pull Latest Code |
| `[2]` | Apply Translation Patches |
| `[3]` | Build Program |
| `[4]` | Check Version |
| `[5]` | Backup Source & Build |
| `[6]` | Restore from Backup |
| `[H]` | View Changelog |
| `[7]` | Restore Original Files |
| `[8]` | Open Output Directory |
| `[9]` | Replace Global Version |
| `[C]` | Cleanup Tools |
| `[L]` | Launch OpenCode |
| `[R]` | Source Recovery (Force Reset) |
| `[S]` | Restore Script |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Execution Policy Error** | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| **Build Failed** | Check Bun version, run `[3] Debug Tools` for diagnosis |
| **Translation Not Applied** | Run `[2] Verify Translation` for details |
| **Source Corrupted** | Run Advanced Menu `[R] Restore Source` |
| **Network Issues** | Check proxy settings or use SSH for git operations |

---

## Contributing

We welcome issues and pull requests!

### Ways to Contribute

1. **Report Bugs** → Submit an issue with details
2. **Suggest Features** → Submit an issue with your proposal
3. **Improve Translation** → Submit a pull request
4. **Optimize Scripts** → Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Translation Safety

When adding translations, use context-safe patterns to avoid breaking variable names:

### ✅ Safe Patterns

```json
{
  "<b>Todo</b>": "<b>待办</b>",
  "title: \"Redo\"": "title: \"重做\"",
  ">\n  Status\n": ">\n  状态\n"
}
```

### ❌ Dangerous Patterns

```json
{
  "Todo": "待办",  // Breaks: TodoItem, TodoList
  "Edit": "编辑",  // Breaks: EditBody, EditFile
  "Status": "状态" // Breaks: DialogStatus
}
```

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Related Links

- [OpenCode Official Repository](https://github.com/anomalyco/opencode)
- [OpenCode Documentation](https://opencode.ai/docs)
- [中文文档](README.md)

---

## Star History

If you find this project helpful, please consider giving it a ⭐ star!

[![Star History Chart](https://api.star-history.com/svg?repos=1186258278/OpenCodeChineseTranslation&type=Date)](https://star-history.com/#1186258278/OpenCodeChineseTranslation&Date)
