# OpenCode 中文汉化版

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **OpenCode** 是由 [Anomaly Company](https://anomaly.company/) 开发的开源 AI 编程代理。
> 
> 本项目提供完整的中文本地化，通过 AI 辅助翻译和质量检查实现高质量汉化。

---

## 效果展示

### 交互式菜单

<p align="center">
  <img src="docs/menu.png" alt="交互式菜单" width="700">
</p>

运行 `opencodenpm` 即可进入交互式菜单，提供完整的汉化工作流：

- **一键汉化** - 自动执行同步→翻译→编译→部署全流程
- **分步操作** - 可单独执行同步、翻译、编译、部署
- **增量翻译** - 仅翻译 git 变更的文件，节省时间
- **质量工具** - AI 审查翻译质量，检测遗漏文本

### 翻译覆盖率报告

<p align="center">
  <img src="docs/coverage-report.png" alt="覆盖率报告" width="700">
</p>

应用汉化后会生成详细的覆盖率报告：

- **36/52 文件已覆盖** - 自动跳过无需翻译的纯代码文件
- **605 条翻译** - 涵盖对话框、组件、路由、通用文本
- **分类明细** - 按模块统计翻译数量
- **AI 总结** - 智能分析跳过的文件原因

### 质量检查报告

<p align="center">
  <img src="docs/quality-check.png" alt="质量检查" width="700">
</p>

质量检查确保翻译不会破坏代码：

- **语法安全检查** - 引号、花括号、标签匹配
- **AI 语义审查** - 抽样检查翻译准确性
- **质量评分** - 100/100 表示无问题

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation
```

### 2. 安装管理工具

```bash
cd scripts
npm install
npm link
```

### 3. 配置 AI 翻译（可选）

如需使用 AI 翻译新文本，创建 `.env` 文件：

```env
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=http://127.0.0.1:8045/v1
OPENAI_MODEL=claude-sonnet-4-20250514
```

### 4. 运行汉化

```bash
# 交互式菜单（推荐）
opencodenpm

# 或一键完成
opencodenpm full
```

### 5. 编译运行

```bash
opencodenpm build
opencodenpm deploy
opencode
```

---

## 命令参考

| 命令 | 说明 |
|------|------|
| `opencodenpm` | 交互式菜单 |
| `opencodenpm full` | 一键汉化（同步→翻译→编译→部署） |
| `opencodenpm sync` | 同步官方源码 |
| `opencodenpm apply` | 应用汉化（AI 翻译 + 替换源码） |
| `opencodenpm apply --incremental` | 增量翻译（仅翻译 git 变更文件） |
| `opencodenpm check --quality` | 质量检查（语法 + AI 语义审查） |
| `opencodenpm build` | 编译构建 |
| `opencodenpm deploy` | 部署到系统 PATH |
| `opencodenpm env` | 检查编译环境 |

---

## AI 翻译配置

本项目使用 AI 进行自动翻译，支持任何兼容 OpenAI API 格式的服务。

### 配置文件

在项目根目录创建 `.env` 文件：

```env
# API 密钥
OPENAI_API_KEY=your-api-key

# API 地址
OPENAI_API_BASE=http://127.0.0.1:8045/v1

# 使用的模型
OPENAI_MODEL=claude-sonnet-4-20250514
```

### 支持的服务

| 服务 | API 地址 | 说明 |
|------|----------|------|
| OpenAI 官方 | `https://api.openai.com/v1` | 需要官方 API Key |
| **Antigravity Tools** | `http://127.0.0.1:8045/v1` | 本地反代，支持多模型（推荐） |
| 其他兼容服务 | 自定义地址 | 任何 OpenAI 兼容 API |

### 推荐：使用 Antigravity Tools

[Antigravity Tools](https://agtools.cc) 是一个本地 API 反代工具，可以方便地调用各种 AI 模型：

**优势**：
- 支持 Claude、GPT、Gemini 等多种模型
- 本地运行，无需暴露 API Key
- 统一的 OpenAI 兼容接口

**配置示例**：

```env
OPENAI_API_KEY=your-antigravity-key
OPENAI_API_BASE=http://127.0.0.1:8045/v1
OPENAI_MODEL=claude-sonnet-4-20250514
```

**支持的模型**：
- Claude 系列：`claude-sonnet-4-20250514`、`claude-opus-4-20250514` 等
- GPT 系列：`gpt-4o`、`gpt-4-turbo` 等
- Gemini 系列：`gemini-2.0-flash` 等

---

## 质量检查

翻译完成后建议运行质量检查：

```bash
opencodenpm check --quality
```

### 检查项目

| 检查类型 | 说明 |
|----------|------|
| **引号匹配** | 双引号/单引号数量一致 |
| **花括号匹配** | `{` 和 `}` 数量一致 |
| **标签匹配** | `{highlight}...{/highlight}` 成对 |
| **变量保留** | `${var}`、`{name}` 等占位符不丢失 |
| **括号闭合** | `()` `[]` `{}` 正确闭合 |
| **AI 语义审查** | 抽样检查翻译准确性和自然度 |

### 自动修复

发现语法问题时，AI 会自动尝试修复并重新验证。

---

## 项目结构

```
OpenCodeChineseTranslation/
├── scripts/                  # 管理工具
│   ├── core/                 # 核心模块
│   │   ├── translator.js     # AI 翻译 + 质量检查
│   │   ├── i18n.js           # 汉化应用
│   │   ├── menu.js           # 交互菜单
│   │   └── cli.js            # 命令行入口
│   └── commands/             # CLI 命令
│       ├── apply.js          # 应用汉化
│       ├── sync.js           # 同步源码
│       ├── check.js          # 质量检查
│       └── build.js          # 编译构建
├── opencode-i18n/            # 语言包（605 条翻译）
│   ├── dialogs/              # 对话框（34 文件 / 186 条）
│   ├── components/           # 组件（16 文件 / 212 条）
│   ├── routes/               # 路由（11 文件 / 149 条）
│   ├── common/               # 通用（10 文件 / 54 条）
│   └── contexts/             # 上下文（2 文件 / 4 条）
├── opencode-zh-CN/           # OpenCode 源码（自动克隆）
├── docs/                     # 文档和截图
└── .env                      # AI 配置（需自行创建）
```

---

## 翻译格式

语言包采用 JSON 格式，每个文件对应一个源码文件：

```json
{
  "file": "src/cli/cmd/tui/dialog/help.tsx",
  "description": "帮助对话框",
  "replacements": {
    "\"Help\"": "\"帮助 (Help)\"",
    "\"Keyboard shortcuts\"": "\"快捷键 (Keyboard shortcuts)\""
  }
}
```

### 翻译原则

- **双语格式**：`中文 (English)`，便于用户理解原始含义
- **保留代码**：变量、标签、占位符必须原样保留
- **上下文安全**：使用完整字符串匹配，避免误替换

---

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 | 运行管理脚本 |
| Bun | >= 1.3 | 编译 OpenCode |
| Git | latest | 克隆和同步源码 |

检查环境：

```bash
opencodenpm env
```

---

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 编译失败 | 运行 `opencodenpm env` 检查 Bun 是否安装 |
| 汉化未生效 | 运行 `opencodenpm apply` 重新应用 |
| AI 翻译失败 | 检查 `.env` 配置和 API 服务是否正常 |
| 源码目录为空 | 运行 `opencodenpm sync` 克隆源码 |

---

## 许可证

MIT License

OpenCode 原项目版权归 [Anomaly Company](https://anomaly.company/) 所有。

---

## 链接

- [OpenCode 官方](https://github.com/anomalyco/opencode)
- [Antigravity Tools](https://agtools.cc)

---

## 致谢

本汉化项目基于 [1186258278](https://github.com/1186258278) 的工作进行维护和改进。
