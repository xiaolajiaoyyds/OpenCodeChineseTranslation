# Oh My OpenCode 完整使用指南

[![oh-my-opencode](https://img.shields.io/badge/oh--my--opencode-v3.0-blue.svg)](https://github.com/code-yeongyu/oh-my-opencode)
[![OpenCode](https://img.shields.io/badge/OpenCode-中文版-green.svg)](https://github.com/1186258278/OpenCodeChineseTranslation)

> **Oh My OpenCode** 是 OpenCode 的终极增强插件，提供多模型协作、专业 Agent 团队、后台并行任务等强大功能。

---

## 📌 什么是 Oh My OpenCode？

**Oh My OpenCode** 将你的 AI 编码助手从单一模型升级为**完整的 AI 开发团队**：

| 特性 | 说明 |
|------|------|
| 🤖 **多 Agent 协作** | Sisyphus 作为主管，协调 Oracle、Librarian、Frontend 等专业 Agent |
| ⚡ **后台并行任务** | 多个 Agent 同时工作，大幅提升效率 |
| 🔧 **LSP/AST 工具** | 给 Agent 提供 IDE 级别的代码分析能力 |
| 📚 **内置 MCP** | Exa 搜索、Context7 文档、grep.app 代码搜索 |
| 🔄 **Claude Code 兼容** | 完整支持 Claude Code 的 Hooks、Commands、Skills |

**项目地址**: https://github.com/code-yeongyu/oh-my-opencode

---

## 🎭 Agent 团队介绍

### 核心 Agent

| Agent | 默认模型 | 专长 |
|-------|---------|------|
| **Sisyphus** | `claude-opus-4-5` | 主协调者，规划和委派任务 |
| **Oracle** | `gpt-5.2` | 架构设计、代码审查、战略分析 |
| **Librarian** | `glm-4.7-free` | 文档查询、开源实现研究 |
| **Explore** | `grok-code` / `gemini-3-flash` | 快速代码探索 |
| **Frontend UI/UX** | `gemini-3-pro` | 前端开发、UI 设计 |
| **Document Writer** | `gemini-3-flash` | 技术文档撰写 |
| **Multimodal Looker** | `gemini-3-flash` | 图片/PDF 分析 |

### 工作流程

```
你的请求 → Sisyphus (主管)
              ├── 派发给 Oracle (架构问题)
              ├── 派发给 Frontend (UI 任务)
              ├── 派发给 Librarian (查文档)
              └── 后台并行执行 Explore (代码搜索)
```

---

## 🚀 安装指南

### 前置条件

- OpenCode 已安装（v1.0.150+）
- Node.js 或 Bun 运行时

### 方式一：交互式安装（推荐）

```bash
# 使用 bunx
bunx oh-my-opencode install

# 或使用 npx
npx oh-my-opencode install
```

按提示选择你拥有的订阅：
- Claude Pro/Max 订阅
- ChatGPT Plus/Pro 订阅
- Gemini 订阅

### 方式二：命令行安装

```bash
# 示例：有 Claude Max20 + ChatGPT + Gemini
bunx oh-my-opencode install --no-tui --claude=max20 --chatgpt=yes --gemini=yes

# 示例：只有 Claude Pro
bunx oh-my-opencode install --no-tui --claude=yes --chatgpt=no --gemini=no
```

### 方式三：让 AI 帮你安装

在 OpenCode 中输入：
```
Install and configure by following the instructions here https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/refs/heads/master/README.md
```

---

## 🔐 认证配置

### Anthropic (Claude)

```bash
opencode auth login
# 选择 Provider: Anthropic
# 选择 Login method: Claude Pro/Max
# 在浏览器中完成 OAuth 授权
```

### Google Gemini (通过 Antigravity)

1. **添加插件**到 `opencode.json`:

```json
{
  "plugin": [
    "oh-my-opencode",
    "opencode-antigravity-auth@1.2.8"
  ]
}
```

2. **配置 Agent 模型**在 `oh-my-opencode.json`:

```json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro-high" },
    "document-writer": { "model": "google/antigravity-gemini-3-flash" },
    "multimodal-looker": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

3. **认证**:

```bash
opencode auth login
# 选择 Provider: Google
# 选择 Login method: OAuth with Google (Antigravity)
```

### OpenAI (ChatGPT)

1. **添加插件**:

```json
{
  "plugin": [
    "oh-my-opencode",
    "opencode-openai-codex-auth@4.3.0"
  ]
}
```

2. **认证**:

```bash
opencode auth login
# 选择 Provider: OpenAI
# 选择 Login method: ChatGPT Plus/Pro (Codex Subscription)
```

---

## ⚡ 魔法关键词

### ultrawork / ulw

在提示词中包含 `ultrawork` 或 `ulw`，自动启用所有增强功能：

```
ulw 帮我重构这个项目的认证系统
```

效果：
- ✅ 并行 Agent 协作
- ✅ 后台任务执行
- ✅ 深度代码探索
- ✅ 持续执行直到完成

### 其他关键词

| 关键词 | 效果 |
|-------|------|
| `ultrawork` / `ulw` | 最大性能模式 |
| `search` / `find` / `찾아` / `検索` | 最大化搜索，并行 Explore + Librarian |
| `analyze` / `investigate` / `分析` / `調査` | 深度分析模式 |
| `ultrathink` | 深度思考模式 |

---

## 📋 配置文件

### 配置文件位置

| 优先级 | 位置 |
|--------|------|
| 1 (最高) | `.opencode/oh-my-opencode.json` (项目级) |
| 2 | `~/.config/opencode/oh-my-opencode.json` (用户级) |

### 完整配置示例

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",

  // Google 认证（使用 Antigravity 插件时设为 false）
  "google_auth": false,

  // Sisyphus 主协调者配置
  "sisyphus_agent": {
    "disabled": false,
    "planner_enabled": true
  },

  // Agent 模型覆盖
  "agents": {
    "Sisyphus": {
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.3
    },
    "oracle": {
      "model": "openai/gpt-5.2"
    },
    "librarian": {
      "model": "opencode/glm-4.7-free"
    },
    "explore": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/antigravity-gemini-3-pro-high"
    }
  },

  // 后台任务并发配置
  "background_task": {
    "defaultConcurrency": 5,
    "providerConcurrency": {
      "anthropic": 3,
      "google": 10
    }
  },

  // 任务分类配置
  "categories": {
    "visual": {
      "model": "google/antigravity-gemini-3-pro-high",
      "temperature": 0.7
    },
    "business-logic": {
      "model": "openai/gpt-5.2",
      "temperature": 0.1
    }
  }
}
```

---

## 🔧 与 Antigravity Tools 集成

Oh My OpenCode 原生支持 Antigravity Tools！

### 配置方法

1. **安装 Antigravity 插件**:

```json
{
  "plugin": [
    "oh-my-opencode",
    "opencode-antigravity-auth@1.2.8"
  ]
}
```

2. **配置 oh-my-opencode.json**:

```json
{
  "google_auth": false,
  "agents": {
    "Sisyphus": {
      "model": "google/antigravity-claude-opus-4-5-thinking-high"
    },
    "oracle": {
      "model": "google/antigravity-claude-sonnet-4-5-thinking-medium"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/antigravity-gemini-3-pro-high"
    },
    "explore": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "librarian": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "document-writer": {
      "model": "google/antigravity-gemini-3-flash"
    }
  }
}
```

### 可用的 Antigravity 模型

| 模型名称 | 说明 |
|---------|------|
| `google/antigravity-gemini-3-pro-high` | Gemini 3 Pro 高性能 |
| `google/antigravity-gemini-3-pro-low` | Gemini 3 Pro 低延迟 |
| `google/antigravity-gemini-3-flash` | Gemini 3 Flash 快速 |
| `google/antigravity-claude-sonnet-4-5` | Claude Sonnet 4.5 |
| `google/antigravity-claude-sonnet-4-5-thinking-*` | Claude Sonnet 思考模式 |
| `google/antigravity-claude-opus-4-5-thinking-*` | Claude Opus 思考模式 |

---

## 🛠️ 内置工具

### LSP 工具

| 工具 | 功能 |
|------|------|
| `lsp_hover` | 获取类型信息和文档 |
| `lsp_goto_definition` | 跳转到定义 |
| `lsp_find_references` | 查找所有引用 |
| `lsp_rename` | 重命名符号 |
| `lsp_code_actions` | 获取快速修复建议 |
| `ast_grep_search` | AST 感知的代码搜索 |
| `ast_grep_replace` | AST 感知的代码替换 |

### 内置 MCP

| MCP | 功能 |
|-----|------|
| `websearch` | Exa AI 网络搜索 |
| `context7` | 官方文档查询 |
| `grep_app` | GitHub 代码搜索 |

### 内置 Skills

| Skill | 功能 |
|-------|------|
| `playwright` | 浏览器自动化 |
| `git-master` | Git 专家操作 |

---

## 🎯 使用示例

### 调用特定 Agent

```
Ask @oracle to review this design and propose an architecture
Ask @librarian how this is implemented
Ask @explore for the policy on this feature
```

### 后台任务

```
让 explore 在后台搜索所有使用 useState 的组件，同时我继续编写逻辑
```

### 任务分类

```javascript
// 使用 sisyphus_task 工具
sisyphus_task(category="visual", prompt="创建一个响应式仪表板组件")
sisyphus_task(category="business-logic", prompt="设计支付处理流程")
sisyphus_task(agent="oracle", prompt="审查这个架构")
```

### Ralph Loop（持续执行）

```
/ralph-loop "Build a REST API"
```

Agent 会持续工作直到任务完成，或达到最大迭代次数。

---

## ⚠️ 注意事项

1. **Librarian 模型选择**：不要为 Librarian 使用昂贵模型，推荐 Haiku、Flash、GLM 等

2. **后台任务并发**：根据你的订阅配额调整 `background_task.providerConcurrency`

3. **Claude Code 兼容**：如果同时使用 Claude Code，所有配置都兼容

4. **模型成本**：Opus 模型成本较高，建议仅在 Sisyphus 主 Agent 使用

---

## 🔗 相关链接

| 链接 | 说明 |
|------|------|
| [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | 官方仓库 |
| [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) | Antigravity 认证插件 |
| [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth) | OpenAI Codex 认证插件 |
| [Antigravity Tools](https://github.com/lbjlaq/Antigravity-Manager) | 本地 AI 网关 |
| [OpenCode 中文版](https://github.com/1186258278/OpenCodeChineseTranslation) | 本项目 |

---

## 📝 更新日志

- **2025-01-18**: 初始版本，完整 oh-my-opencode 使用指南
