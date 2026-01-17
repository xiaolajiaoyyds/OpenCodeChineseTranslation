# OpenCode 中文汉化版 - AI 自动翻译 + 质量检查

基于 [原作者 @1186258278 的汉化项目](https://linux.do/t/topic/1469651) 进行改进，新增 AI 自动翻译和质量检查功能。

## 项目地址

https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation

## 效果展示

| 交互式菜单 | 覆盖率报告 | 质量检查 |
| :--------: | :--------: | :------: |
| ![菜单](https://raw.githubusercontent.com/xiaolajiaoyyds/OpenCodeChineseTranslation/main/docs/menu.png) | ![覆盖率](https://raw.githubusercontent.com/xiaolajiaoyyds/OpenCodeChineseTranslation/main/docs/coverage-report.png) | ![质量](https://raw.githubusercontent.com/xiaolajiaoyyds/OpenCodeChineseTranslation/main/docs/quality-check.png) |

## 相比原版的改进

### 新增功能

| 功能 | 说明 |
| --- | --- |
| **AI 自动翻译** | 官方更新后自动检测新文本，调用 AI 翻译 |
| **增量翻译** | `opencodenpm apply --incremental`，仅翻译 git 变更文件 |
| **质量检查** | `opencodenpm check --quality`，语法检查 + AI 语义审查 |
| **自动修复** | 发现语法问题时 AI 自动修复 |
| **覆盖率报告** | 显示翻译统计 + AI 智能总结 |
| **跨平台支持** | Node.js CLI 替代 PowerShell，macOS/Linux/Windows 通用 |

### 技术改进

- **语法安全检查**：引号、花括号、`{highlight}` 标签匹配检测
- **双语格式**：统一为 `中文 (English)` 格式，便于理解原义
- **交互式菜单**：分类清晰，键盘导航

### 翻译统计

```
总计 605 条翻译，质量评分 100/100

对话框：34 文件 / 186 条
组件：  16 文件 / 212 条
路由：  11 文件 / 149 条
通用：  10 文件 / 54 条
上下文：2 文件 / 4 条
```

## 快速开始

```bash
# 克隆
git clone https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation

# 安装
cd scripts && npm install && npm link

# 运行（交互式菜单）
opencodenpm

# 编译
opencodenpm build && opencodenpm deploy && opencode
```

## AI 翻译配置

创建 `.env` 文件，支持任何 OpenAI 兼容 API：

```env
OPENAI_API_KEY=your-key
OPENAI_API_BASE=http://127.0.0.1:8045/v1
OPENAI_MODEL=claude-sonnet-4-20250514
```

推荐使用 [Antigravity Tools](https://agtools.cc) 本地反代，支持 Claude/GPT/Gemini 等模型。

## 命令参考

| 命令 | 说明 |
| --- | --- |
| `opencodenpm` | 交互式菜单 |
| `opencodenpm full` | 一键汉化（同步→翻译→编译→部署） |
| `opencodenpm sync` | 同步官方源码 |
| `opencodenpm apply` | 应用汉化 |
| `opencodenpm apply --incremental` | 增量翻译 |
| `opencodenpm check --quality` | 质量检查 |
| `opencodenpm build` | 编译构建 |
| `opencodenpm deploy` | 部署到系统 |

## 更新日志

### v6.1 (2026-01-18)
- 更新文档，添加截图和详细说明

### v6.0 (2026-01-17)
- 新增 AI 自动翻译功能
- 新增增量翻译、质量检查
- Node.js CLI 替代 PowerShell，跨平台支持
- 修复 28 处翻译语法问题
- 605 条翻译，质量评分 100/100

## 致谢

感谢原作者 [@1186258278](https://github.com/1186258278) 的汉化工作，本项目在其基础上进行了功能扩展。

---

有问题欢迎反馈！
