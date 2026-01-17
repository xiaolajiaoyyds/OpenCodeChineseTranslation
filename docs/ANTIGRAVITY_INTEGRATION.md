# Antigravity Tools + OpenCode 集成指南

[![Antigravity](https://img.shields.io/badge/Antigravity-v3.3.15-orange.svg)](https://github.com/lbjlaq/Antigravity-Manager)
[![OpenCode](https://img.shields.io/badge/OpenCode-中文版-green.svg)](https://github.com/1186258278/OpenCodeChineseTranslation)

> 使用 Antigravity Tools 作为本地 AI 网关，让 OpenCode 接入 Gemini 3 Pro、Claude Opus 4.5 等强大模型！

---

## 📌 什么是 Antigravity Tools？

**Antigravity Tools** 是一个专业的本地 AI 中转站，核心功能：

| 特性 | 说明 |
|------|------|
| 🔐 **多账号管理** | 智能轮换 Google/Anthropic 账号，自动处理配额限制 |
| 🔄 **协议转换** | 将 Web Session 转化为标准 API（OpenAI/Anthropic/Gemini 协议） |
| ⚡ **智能调度** | 429 自动切换账号、会话粘性、后台任务降级 |
| 🧠 **Thinking 支持** | 完美支持 Claude Extended Thinking 模式 |

**项目地址**: https://github.com/lbjlaq/Antigravity-Manager

---

## 🚀 快速开始

### 第一步：安装 Antigravity Tools

**macOS (Homebrew):**
```bash
brew tap lbjlaq/antigravity-manager https://github.com/lbjlaq/Antigravity-Manager
brew install --cask --no-quarantine antigravity-tools
```

**Windows / Linux:**

从 [GitHub Releases](https://github.com/lbjlaq/Antigravity-Manager/releases) 下载对应平台安装包：
- Windows: `.msi` 或 `.zip`
- Linux: `.deb` 或 `.AppImage`
- macOS: `.dmg`

### 第二步：配置 Antigravity

1. **打开 Antigravity Tools**

2. **添加账号**
   - 进入 **Accounts** → **添加账号** → **OAuth**
   - 点击生成的授权链接，在浏览器中完成 Google 账号授权
   - 授权完成后账号会自动添加

3. **启动代理服务**
   - 进入 **API Proxy** 页面
   - 点击 **Start** 启动代理服务器
   - 默认监听: `http://127.0.0.1:8045`

### 第三步：配置 OpenCode

#### 方式一：环境变量（推荐）

**Windows PowerShell:**
```powershell
# 设置环境变量
$env:LOCAL_ENDPOINT = "http://127.0.0.1:8045/v1"
$env:OPENAI_API_KEY = "sk-antigravity"

# 启动 OpenCode
opencode
```

**Windows CMD:**
```cmd
set LOCAL_ENDPOINT=http://127.0.0.1:8045/v1
set OPENAI_API_KEY=sk-antigravity
opencode
```

**Linux / macOS:**
```bash
export LOCAL_ENDPOINT="http://127.0.0.1:8045/v1"
export OPENAI_API_KEY="sk-antigravity"
opencode
```

#### 方式二：配置文件

创建或编辑 `~/.opencode.json`:

```json
{
  "providers": {
    "openai": {
      "apiKey": "sk-antigravity",
      "disabled": false
    }
  },
  "agents": {
    "coder": {
      "model": "gemini-3-pro-high",
      "maxTokens": 16000
    },
    "summarizer": {
      "model": "gemini-3-flash",
      "maxTokens": 4000
    },
    "task": {
      "model": "gemini-3-pro-high",
      "maxTokens": 8000
    },
    "title": {
      "model": "gemini-3-flash",
      "maxTokens": 80
    }
  },
  "autoCompact": true
}
```

---

## 📋 可用模型

通过 Antigravity 可以使用以下模型：

| 模型名称 | 特点 | 推荐场景 |
|---------|------|---------|
| `gemini-3-pro-high` | 高性能推理，强大的代码能力 | 复杂编码、架构设计 |
| `gemini-3-flash` | 快速响应，低延迟 | 简单任务、摘要生成 |
| `claude-opus-4-5-thinking` | 深度思考，最强推理 | 复杂分析、长文本处理 |
| `claude-sonnet-4-5-thinking` | 平衡性能和速度 | 日常开发任务 |

### 模型映射

Antigravity 支持自动模型映射：

| 请求模型 | 映射到 |
|---------|--------|
| `gpt-4-series` | `gemini-3-pro-high` |
| `gpt-4o-series` | `gemini-3-flash` |
| `claude-4.5-series` | `gemini-3-pro-high` |
| `claude-3.5-series` | `claude-sonnet-4-5-thinking` |

---

## 🔧 启动脚本

### Windows PowerShell 启动脚本

创建 `start-opencode.ps1`:

```powershell
# Antigravity + OpenCode 启动脚本
$ANTIGRAVITY_HOST = "127.0.0.1"
$ANTIGRAVITY_PORT = "8045"

# 设置环境变量
$env:LOCAL_ENDPOINT = "http://${ANTIGRAVITY_HOST}:${ANTIGRAVITY_PORT}/v1"
$env:OPENAI_API_KEY = "sk-antigravity"
$env:OPENAI_BASE_URL = "http://${ANTIGRAVITY_HOST}:${ANTIGRAVITY_PORT}/v1"

# 检查 Antigravity 状态
try {
    $response = Invoke-WebRequest -Uri "http://${ANTIGRAVITY_HOST}:${ANTIGRAVITY_PORT}/healthz" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[OK] Antigravity Tools 已连接" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Antigravity Tools 未运行!" -ForegroundColor Yellow
    Write-Host "         请先启动 Antigravity Tools 并开启 API Proxy" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

Write-Host ""
Write-Host "可用模型:" -ForegroundColor Cyan
Write-Host "  - gemini-3-pro-high           (主力推理)"
Write-Host "  - gemini-3-flash              (快速响应)"
Write-Host "  - claude-opus-4-5-thinking    (深度思考)"
Write-Host ""

# 启动 opencode
& opencode $args
```

### Windows CMD 启动脚本

创建 `start-opencode.bat`:

```batch
@echo off
SET ANTIGRAVITY_HOST=127.0.0.1
SET ANTIGRAVITY_PORT=8045

SET LOCAL_ENDPOINT=http://%ANTIGRAVITY_HOST%:%ANTIGRAVITY_PORT%/v1
SET OPENAI_API_KEY=sk-antigravity
SET OPENAI_BASE_URL=http://%ANTIGRAVITY_HOST%:%ANTIGRAVITY_PORT%/v1

curl -s http://%ANTIGRAVITY_HOST%:%ANTIGRAVITY_PORT%/healthz >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Antigravity Tools 未运行!
    pause
    exit /b 1
)

echo [OK] Antigravity Tools 已连接
opencode %*
```

### Linux/macOS 环境配置

添加到 `~/.bashrc` 或 `~/.zshrc`:

```bash
# Antigravity + OpenCode 配置
export LOCAL_ENDPOINT="http://127.0.0.1:8045/v1"
export OPENAI_API_KEY="sk-antigravity"
export OPENAI_BASE_URL="http://127.0.0.1:8045/v1"

# Anthropic 协议 (用于 Claude Code CLI)
export ANTHROPIC_API_KEY="sk-antigravity"
export ANTHROPIC_BASE_URL="http://127.0.0.1:8045"

# 别名
alias ag-status="curl -s http://127.0.0.1:8045/healthz && echo ' OK' || echo ' Not Running'"
```

---

## 🎯 多模型协作配置

OpenCode 支持为不同 Agent 配置不同模型，实现多模型协作：

```json
{
  "agents": {
    "coder": {
      "model": "claude-opus-4-5-thinking",
      "maxTokens": 32000,
      "reasoningEffort": "high"
    },
    "task": {
      "model": "gemini-3-pro-high",
      "maxTokens": 16000
    },
    "summarizer": {
      "model": "gemini-3-flash",
      "maxTokens": 4000
    },
    "title": {
      "model": "gemini-3-flash",
      "maxTokens": 80
    }
  }
}
```

**策略说明：**

| Agent | 推荐模型 | 理由 |
|-------|---------|------|
| `coder` | `claude-opus-4-5-thinking` | 核心编码任务，需要最强推理能力 |
| `task` | `gemini-3-pro-high` | 任务执行，平衡速度和质量 |
| `summarizer` | `gemini-3-flash` | 摘要生成，追求快速响应 |
| `title` | `gemini-3-flash` | 标题生成，极轻量任务 |

---

## 🔍 常用命令

```bash
# 检查 Antigravity 状态
curl http://127.0.0.1:8045/healthz

# 查看可用模型列表
curl http://127.0.0.1:8045/v1/models

# Claude Code CLI 使用
export ANTHROPIC_API_KEY="sk-antigravity"
export ANTHROPIC_BASE_URL="http://127.0.0.1:8045"
claude
```

---

## ⚠️ 注意事项

1. **先启动 Antigravity**：使用 OpenCode 前必须先启动 Antigravity 代理服务

2. **账号配额**：Antigravity 会自动轮换账号管理配额，无需手动干预

3. **模型映射**：可在 Antigravity 的「模型路由中心」自定义映射规则

4. **网络设置**：
   - 默认只监听本地 `127.0.0.1`
   - 如需局域网访问，在 Antigravity 设置中开启「允许局域网访问」

5. **Thinking 模式**：使用 `-thinking` 后缀的模型会自动启用深度推理

---

## 🔗 相关链接

| 链接 | 说明 |
|------|------|
| [Antigravity Manager](https://github.com/lbjlaq/Antigravity-Manager) | Antigravity 项目仓库 |
| [Antigravity Releases](https://github.com/lbjlaq/Antigravity-Manager/releases) | 下载安装包 |
| [OpenCode 官方](https://github.com/opencode-ai/opencode) | OpenCode 原项目 |
| [OpenCode 中文版](https://github.com/1186258278/OpenCodeChineseTranslation) | 本项目 |

---

## 📝 更新日志

- **2025-01-18**: 初始版本，支持 Antigravity v3.3.15 + OpenCode 集成
