# OpenCode 中文汉化版

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **OpenCode** 是由 [Anomaly Company](https://anomaly.company/) 开发的开源 AI 编程代理。
> 
> 本项目提供完整的中文本地化，通过 AI 辅助翻译和质量检查实现高质量汉化。

<p align="center">
  <img src="docs/1-1.png" alt="汉化效果展示" width="800">
</p>

---

## 快速开始

### 1. 安装管理工具

```bash
cd scripts
npm install
npm link
```

### 2. 运行汉化

```bash
# 交互式菜单（推荐）
opencodenpm

# 或一键完成
opencodenpm full
```

### 3. 编译运行

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
| `opencodenpm full` | 一键汉化（同步 + 翻译 + 编译） |
| `opencodenpm sync` | 同步官方源码 |
| `opencodenpm apply` | 应用汉化 |
| `opencodenpm apply --incremental` | 增量翻译（仅翻译变更文件） |
| `opencodenpm check --quality` | 翻译质量检查 |
| `opencodenpm build` | 编译构建 |
| `opencodenpm deploy` | 部署到系统 |
| `opencodenpm env` | 检查环境 |

---

## AI 翻译配置

创建 `.env` 文件：

```env
OPENAI_API_KEY=sk-your-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

支持任何兼容 OpenAI API 的服务。

---

## 项目结构

```
OpenCodeChineseTranslation/
├── scripts/              # 管理工具
│   ├── core/             # 核心模块
│   │   ├── translator.js # AI 翻译 + 质量检查
│   │   ├── i18n.js       # 汉化应用
│   │   └── menu.js       # 交互菜单
│   └── commands/         # CLI 命令
├── opencode-i18n/        # 语言包
│   ├── dialogs/          # 对话框翻译
│   ├── routes/           # 路由翻译
│   ├── components/       # 组件翻译
│   └── common/           # 通用翻译
└── opencode-zh-CN/       # OpenCode 源码（自动克隆）
```

---

## 翻译格式

```json
{
  "file": "src/cli/cmd/tui/xxx.tsx",
  "replacements": {
    "\"Original text\"": "\"中文翻译 (Original text)\""
  }
}
```

翻译采用 `中文 (English)` 双语格式，便于用户理解。

---

## 环境要求

- Node.js >= 18
- Bun >= 1.3
- Git

---

## 许可证

MIT License

OpenCode 原项目版权归 [Anomaly Company](https://anomaly.company/) 所有。

---

## 链接

- [OpenCode 官方](https://github.com/anomalyco/opencode)
- [问题反馈](https://github.com/1186258278/OpenCodeChineseTranslation/issues)

---

## 原作者

本汉化项目基于 [1186258278](https://github.com/1186258278) 的工作进行维护和改进。
