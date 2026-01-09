# OpenCode Chinese Localization / OpenCode 中文汉化

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-blue.svg)](https://microsoft.com/PowerShell)
[![OpenCode](https://img.shields.io/badge/OpenCode-dev-green.svg)](https://github.com/anomalyco/opencode)

> 🎉 让 OpenCode AI 编程助手更友好！/ Make OpenCode AI coding assistant more user-friendly!

[中文](#中文文档) | [English](#english-documentation)

---

## 中文文档

<div id="中文文档">

### 📖 简介

OpenCode 中文汉化工具是一套完整的 PowerShell 管理脚本，用于将 OpenCode 项目汉化为中文版本。支持自动化拉取、汉化、编译、部署全流程。

---

### ✨ 核心功能

| 功能 | 描述 |
|------|------|
| **一键汉化** | 自动拉取、汉化、编译 OpenCode |
| **模块化配置** | 支持 36 个独立汉化模块，易于维护 |
| **版本管理** | 检测更新、查看更新日志、拉取最新代码 |
| **备份恢复** | 完整备份和选择性恢复 |
| **汉化验证** | 验证汉化结果覆盖率，调试工具 |

### 汉化范围

- 🎯 命令面板（会话、模型、智能体切换）
- 💬 对话框（智能体选择、会话列表、消息处理）
- 📊 侧边栏（上下文管理、MCP 状态）
- 🔝 顶部栏（子智能体导航）
- 🛠️ 权限系统（文件操作权限请求）
- 🔔 通知和提示（70+ 条操作提示）

---

### 📁 目录结构

```
OpenCodeChineseTranslation/
├── .gitignore               # Git 忽略配置
├── README.md                # 项目说明（本文档）
├── README_EN.md             # 英文版说明
├── CONTRIBUTING.md          # 贡献指南
├── LICENSE                  # MIT 许可证
├── scripts/                 # 管理脚本
│   └── opencode.ps1         # 主管理脚本（2300+ 行）
├── opencode-i18n/           # 模块化汉化配置
│   ├── config.json          # 主配置文件
│   ├── dialogs/             # 对话框汉化（21个模块）
│   ├── routes/              # 路由汉化（3个模块）
│   ├── components/          # 组件汉化（6个模块）
│   └── common/              # 通用汉化（6个模块）
├── opencode-zh-CN/          # OpenCode 源码（Git 子模块）
├── dist/                    # 编译产物（.gitignore）
└── docs/                    # 项目文档
```

---

### 🚀 快速开始

#### 系统要求

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| PowerShell | 5.1+ | Windows 自带 |
| Git | 2.25+ | [git-scm.com](https://git-scm.com/) |
| Bun | 1.3+ | `npm install -g bun` |

#### 克隆仓库

```bash
git clone https://github.com/1186258278/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation
```

#### 初始化子模块

```bash
git submodule update --init --recursive
```

#### 一键汉化+部署

```powershell
.\scripts\opencode.ps1
```

选择 `[1] 一键汉化+部署`，等待完成即可。

---

### 📋 功能菜单

#### 主菜单

| 选项 | 功能 |
|------|------|
| `[1]` | 一键汉化+部署（推荐新手） |
| `[2]` | 验证汉化效果 |
| `[3]` | 汉化调试工具 |
| `[4]` | 版本检测 |
| `[5]` | 备份当前版本 |
| `[L]` | 查看更新日志 |
| `[6]` | 高级菜单 |

#### 高级菜单

| 选项 | 功能 |
|------|------|
| `[1]` | 拉取最新代码 |
| `[2]` | 应用汉化补丁 |
| `[3]` | 编译程序 |
| `[4]` | 版本检测 |
| `[5]` | 备份源码和编译产物 |
| `[6]` | 从备份恢复 |
| `[H]` | 查看更新日志 |
| `[7]` | 恢复原始文件 |
| `[8]` | 打开输出目录 |
| `[9]` | 替换全局版本 |
| `[C]` | 清理工具 |
| `[L]` | 启动 OpenCode |
| `[R]` | 源码恢复（强制重置） |
| `[S]` | 恢复脚本 |

---

### 🛠️ 常见问题

| 问题 | 解决方法 |
|------|----------|
| 执行策略错误 | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| 编译失败 | 检查 Bun 版本，运行 `[3] 汉化调试工具` |
| 汉化未生效 | 运行 `[2] 验证汉化结果` 查看详情 |
| 源码损坏 | 运行高级菜单 `[R] 源码恢复` |

---

### 🌟 贡献指南

欢迎提交 Issue 和 Pull Request！

1. **发现 Bug** → 提交 Issue
2. **新功能建议** → 提交 Issue
3. **汉化改进** → 提交 Pull Request
4. **脚本优化** → 提交 Pull Request

详细贡献指南请参考 [CONTRIBUTING.md](CONTRIBUTING.md)

---

### 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

### 🔗 相关链接

- [OpenCode 官方仓库](https://github.com/anomalyco/opencode)
- [OpenCode 官方文档](https://opencode.ai/docs)

---

</div>

## English Documentation

<div id="english-documentation">

### 📖 Overview

OpenCode Chinese Localization Tool is a complete PowerShell management script set for localizing the OpenCode project to Chinese. It supports automated pull, patch, build, and deployment workflows.

---

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| **One-Click Localization** | Automated pull, patch, and build OpenCode |
| **Modular Configuration** | 36 independent i18n modules for easy maintenance |
| **Version Management** | Check updates, view changelog, pull latest code |
| **Backup & Restore** | Full backup and selective restore |
| **Verification** | Validate translation coverage, debug tools |

### Translation Scope

- 🎯 Command Panel (sessions, models, agent switching)
- 💬 Dialogs (agent selection, session list, message handling)
- 📊 Sidebar (context management, MCP status)
- 🔝 Top Bar (sub-agent navigation)
- 🛠️ Permission System (file access requests)
- 🔔 Notifications & Tips (70+ action prompts)

---

### 🚀 Quick Start

#### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| PowerShell | 5.1+ | Built-in with Windows |
| Git | 2.25+ | [git-scm.com](https://git-scm.com/) |
| Bun | 1.3+ | `npm install -g bun` |

#### Clone Repository

```bash
git clone https://github.com/1186258278/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation
```

#### Initialize Submodule

```bash
git submodule update --init --recursive
```

#### Run Localization Script

```powershell
.\scripts\opencode.ps1
```

Select `[1] One-Click Localization+Deploy` and wait for completion.

---

### 📋 Menu Options

#### Main Menu

| Option | Function |
|--------|----------|
| `[1]` | One-Click Localization+Deploy (Recommended) |
| `[2]` | Verify Translation |
| `[3]` | Debug Tools |
| `[4]` | Check Version |
| `[5]` | Backup Current Version |
| `[L]` | View Changelog |
| `[6]` | Advanced Menu |

---

### 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Execution Policy Error | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Build Failed | Check Bun version, run `[3] Debug Tools` |
| Translation Not Applied | Run `[2] Verify Translation` for details |
| Source Code Corrupted | Run Advanced Menu `[R] Restore Source` |

---

### 🤝 Contributing

Issues and Pull Requests are welcome!

1. **Found a Bug** → Submit an Issue
2. **Feature Request** → Submit an Issue
3. **Translation Improvement** → Submit a Pull Request
4. **Script Optimization** → Submit a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

### 📄 License

MIT License - See [LICENSE](LICENSE) file

---

### 🔗 Related Links

- [OpenCode Official Repository](https://github.com/anomalyco/opencode)
- [OpenCode Documentation](https://opencode.ai/docs)

---

</div>

## ⭐ Star this project if you find it helpful!
