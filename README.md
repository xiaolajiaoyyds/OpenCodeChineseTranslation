# OpenCode 中文汉化版 - 双语版本 v6.2

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-汉化版-brightgreen)](https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation)

> **OpenCode** 是由 [Anomaly Company](https://anomaly.company/) 开发的开源 AI 编程代理。
> 本项目提供完整的中文本地化，通过 AI 辅助翻译和质量检查实现高质量汉化。

---

## 📌 项目说明

基于 [@QinTian 的汉化项目](https://linux.do/t/topic/1469651) 进行改进。

### 为什么做这个项目？

**由于 OpenCode 官方更新频繁，每次都会新增文件，手动翻译太累了！**

于是花了半天时间搞了个自动化方案：

- ✅ AI 自动检测新文本并翻译
- ✅ AI 审查防止翻译错误导致源文件报错
- ✅ 支持增量翻译，只翻译 git 变更文件
- ✅ 质量检查 + 自动修复
- ✅ 覆盖率报告 + AI 智能总结
- ✅ 统一 TUI 视觉风格，Knight Rider 流星动画

**现在不怕官方更新了，AI 会自动搞定翻译！**

---

## 🎯 核心功能

| 功能            | 说明                                                   |
| --------------- | ------------------------------------------------------ |
| **AI 自动翻译** | 官方更新后自动检测新文本，调用 AI 翻译                 |
| **增量翻译**    | `opencodenpm apply --incremental`，仅翻译 git 变更文件 |
| **质量检查**    | `opencodenpm check --quality`，语法检查 + AI 语义审查  |
| **自动修复**    | 发现语法问题时 AI 自动修复                             |
| **覆盖率报告**  | 显示翻译统计 + AI 智能总结                             |
| **跨平台支持**  | Node.js CLI 替代 PowerShell，macOS/Linux/Windows 通用  |

### 技术改进

- **统一 TUI 输出**：嵌套输出连接线颜色统一，视觉一致性
- **Knight Rider 动画**：AI 总结打字机效果带流星尾巴
- **智能换行**：只在标点符号后断行，避免中文断字
- **语法安全检查**：引号、花括号、`{highlight}` 标签匹配检测
- **双语格式**：统一为 `中文 (English)` 格式，便于理解原义

---

## 🖼️ 效果展示

### 汉化后的 OpenCode

|              主界面              |              命令菜单               |
| :------------------------------: | :---------------------------------: |
| ![主界面](docs/images/opencode-main.png) | ![命令](docs/images/opencode-commands.png) |

### 汉化工具界面

|          交互式菜单           |           覆盖率 + AI 总结           |
| :---------------------------: | :----------------------------------: |
| ![菜单](docs/images/menu.png) | ![覆盖率](docs/images/coverage.png) |

### 一键汉化全流程

|             步骤 1-4             |             步骤 4-5             |             步骤 5-7             |
| :------------------------------: | :------------------------------: | :------------------------------: |
| ![流程1](docs/images/full-1.png) | ![流程2](docs/images/full-2.png) | ![流程3](docs/images/full-3.png) |

|              部署完成              |
| :--------------------------------: |
| ![部署](docs/images/deploy.png) |

---

## 🚀 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation

# 2. 安装依赖
cd scripts && npm install && npm link

# 3. 运行汉化（交互式菜单）
opencodenpm

# 4. 编译运行
opencodenpm build && opencodenpm deploy && opencode
```

---

## 📊 翻译统计

- **452 条翻译**，覆盖率 **100%**
- 对话框：32 文件 / 177 条
- 组件：12 文件 / 158 条
- 路由：6 文件 / 70 条
- 通用：3 文件 / 42 条
- 上下文：1 文件 / 1 条

---

## 🔧 AI 翻译配置

创建 `.env` 文件（支持任何 OpenAI 兼容 API）：

```env
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=http://127.0.0.1:8045/v1
OPENAI_MODEL=claude-sonnet-4-20250514
```

### 推荐：Antigravity Tools

使用 [Antigravity Tools](https://agtools.cc) 本地反代，支持 Claude、GPT、Gemini 等多种模型。

![Antigravity Tools 配置](docs/images/antigravity.jpeg)

---

## 📝 命令参考

| 命令                              | 说明                            |
| --------------------------------- | ------------------------------- |
| `opencodenpm`                     | 交互式菜单（推荐）              |
| `opencodenpm full`                | 一键汉化（同步→翻译→编译→部署） |
| `opencodenpm sync`                | 同步官方源码                    |
| `opencodenpm apply`               | 应用汉化                        |
| `opencodenpm apply --incremental` | 增量翻译（只翻译 git 变更）     |
| `opencodenpm check --quality`     | 质量检查（语法 + AI 审查）      |
| `opencodenpm build`               | 编译构建                        |
| `opencodenpm deploy`              | 部署到系统                      |
| `opencodenpm env`                 | 检查环境                        |

---

## ⚙️ OpenCode 配置文件

> **配置文件位置**：`~/.config/opencode/`
> 所有配置文件保存在用户根目录，**更新项目不会丢失配置**。

---

### 1. AGENTS.md - AI 助手身份定义

**位置**: `~/.config/opencode/AGENTS.md`
**作用**: 定义 AI 助手的性格、原则、回复习惯和安全规范
**示例文件**: 👉 [`docs/AGENTS.example.md`](docs/AGENTS.example.md)（点击查看完整配置）

---

### 2. global-rules.md - 开发规范与工具指南

**位置**: `~/.config/opencode/global-rules.md`
**作用**: 完整的编码规范、工具使用指南、工作流程定义
**示例文件**: 👉 [`docs/global-rules.example.md`](docs/global-rules.example.md)（点击查看完整配置）

---

### 3. oh-my-opencode.json - 插件配置

**位置**: `~/.config/opencode/oh-my-opencode.json`
**作用**: Oh-My-OpenCode 插件的核心配置，定义 MCP、Agents、实验特性等
**示例文件**: 👉 [`docs/oh-my-opencode.example.json`](docs/oh-my-opencode.example.json)（点击查看完整配置）

---

### 4. opencode.json - OpenCode 主配置

**位置**: `~/.config/opencode/opencode.json`
**作用**: OpenCode 的完整配置，包括模型、Agent、MCP、LSP 等所有设置
**示例文件**: 👉 [`docs/opencode.example.json`](docs/opencode.example.json)（点击查看完整配置，285 行已脱敏）

<details>
<summary>点击查看配置说明</summary>

**包含内容**：

- MCP 服务器配置（ace-tool、filesystem、github、memory 等）
- Provider 配置（anthropic、google、openai、自定义提供商）
- Agent 配置（0m0、debug、gemini、swift、arch、image 等）
- LSP 语言服务器（Swift、TypeScript、Python）
- Formatter 自动格式化（SwiftFormat、Prettier、Ruff）
- 插件列表（oh-my-opencode、antigravity-auth 等）

**使用方法**：

1. 复制 [`docs/opencode.example.json`](docs/opencode.example.json) 到 `~/.config/opencode/opencode.json`
2. 替换敏感信息（API Keys、Tokens、用户名）
3. 根据需要调整模型、Agent 配置

</details>

---

## 💡 使用技巧

### 1. 首次配置

```bash
# 创建配置目录
mkdir -p ~/.config/opencode

# 编辑配置文件（参考上面的配置内容）
vim ~/.config/opencode/AGENTS.md
vim ~/.config/opencode/global-rules.md
vim ~/.config/opencode/oh-my-opencode.json
vim ~/.config/opencode/opencode.json
```

### 2. 增量翻译工作流

```bash
# 官方更新后，只翻译变更的文件
opencodenpm sync                    # 同步官方源码
opencodenpm apply --incremental     # 增量翻译
opencodenpm check --quality         # 质量检查
opencodenpm build && opencodenpm deploy && opencode
```

---

## ❓ 常见问题

<details>
<summary><b>Q: 配置文件会不会丢失？</b></summary>

不会！所有配置文件保存在用户根目录 `~/.config/` 下，更新项目不会影响配置。

建议定期备份：

```bash
cp -r ~/.config/opencode ~/backup-opencode-config
```

</details>

<details>
<summary><b>Q: 如何接入 AI 翻译？</b></summary>

1. 创建 `.env` 文件，配置 OpenAI 兼容 API
2. 推荐使用 [Antigravity Tools](https://agtools.cc) 本地反代
3. 运行 `opencodenpm apply` 自动调用 AI 翻译

</details>

<details>
<summary><b>Q: 官方更新后如何同步？</b></summary>

```bash
opencodenpm sync    # 同步官方源码
opencodenpm apply   # 应用汉化
```

如果只想翻译变更的文件：

```bash
opencodenpm apply --incremental
```

</details>

<details>
<summary><b>Q: 发现翻译错误怎么办？</b></summary>

1. 手动修改 `opencode-i18n/` 下的语言包文件
2. 运行 `opencodenpm check --quality` 检查质量
3. 提交 PR 到项目仓库

</details>

---

## 📦 项目结构

```
OpenCodeChineseTranslation/
├── scripts/              # 管理工具
│   ├── core/             # 核心模块（translator.js, i18n.js, menu.js）
│   └── commands/         # CLI 命令
├── opencode-i18n/        # 语言包（452 条翻译）
│   ├── dialogs/          # 对话框（32 文件 / 177 条）
│   ├── components/       # 组件（12 文件 / 158 条）
│   ├── routes/           # 路由（6 文件 / 70 条）
│   ├── common/           # 通用（3 文件 / 42 条）
│   └── contexts/         # 上下文（1 文件 / 1 条）
└── opencode-zh-CN/       # OpenCode 源码（自动克隆）
```

---

## 🔗 相关链接

- **项目地址**: https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation
- **OpenCode 官方**: https://github.com/anomalyco/opencode
- **Antigravity Tools**: https://agtools.cc
- **原汉化项目**: [QinTian 的帖子](https://linux.do/t/topic/1469651)
- **Oh-My-OpenCode**: https://github.com/code-yeongyu/oh-my-opencode

---

## 📋 更新日志

### v6.2 (2025-01-21)

**TUI 视觉体验全面升级**

- ✨ **统一 TUI 输出系统**
  - 嵌套输出连接线颜色统一为青色
  - 状态徽章统一使用 `●` 符号，按颜色区分状态
  - 构建/检查日志输出更加整洁

- 🌠 **Knight Rider 流星动画**
  - AI 总结打字机效果带 14 格粉色渐变尾巴
  - 流星划过效果，视觉更加生动

- 🎨 **AI 总结格式化输出**
  - 结构化要点展示（`▸` 青色标记）
  - `【重点内容】` 黄色高亮显示
  - 告别"小作文"，一目了然

- 📝 **智能换行算法**
  - 只在标点符号（，。！？、；：等）后断行
  - 避免中文词语被截断，阅读更流畅

### v6.1 (2025-01-18)

- 🚀 初始版本发布
- AI 自动翻译 + 增量翻译
- 质量检查 + 自动修复
- 覆盖率报告 + AI 智能总结
- 跨平台支持（macOS/Linux/Windows）

---

## 📜 许可证

MIT License | OpenCode 原项目版权归 [Anomaly Company](https://anomaly.company/) 所有

---

## 🙏 致谢

本汉化项目基于 [1186258278](https://github.com/1186258278) 和 [@QinTian](https://linux.do/t/topic/1469651) 的工作进行维护和改进。

感谢所有贡献者和使用者的支持！

---

## 📮 问题反馈

有问题欢迎在 [Issues](https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation/issues) 留言，我会抽空解决~

**在报告问题前，建议先备份配置文件！**
