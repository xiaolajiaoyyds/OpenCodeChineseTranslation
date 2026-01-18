# OpenCode 中文汉化版 - 双语版本 v6.1

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

- **语法安全检查**：引号、花括号、`{highlight}` 标签匹配检测
- **双语格式**：统一为 `中文 (English)` 格式，便于理解原义
- **交互式菜单**：分类清晰，键盘导航

---

## 🖼️ 效果展示

|          交互式菜单           |              覆盖率报告              |             质量检查             |
| :---------------------------: | :----------------------------------: | :------------------------------: |
| ![菜单](docs/images/menu.png) | ![覆盖率](docs/images/coverage.jpeg) | ![质量](docs/images/quality.png) |

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

- **605 条翻译**，质量评分 **100/100**
- 对话框：34 文件 / 186 条
- 组件：16 文件 / 212 条
- 路由：11 文件 / 149 条
- 通用：10 文件 / 54 条

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

![配置文件位置](docs/images/config.jpeg)

---

### 1. AGENTS.md - AI 助手身份定义

**位置**: `~/.config/opencode/AGENTS.md`  
**作用**: 定义 AI 助手的性格、原则、回复习惯和安全规范  
**示例文件**: 查看完整内容请展开下方折叠块

<details>
<summary>点击查看完整配置</summary>

```markdown
# 箱宝 - AI 开发助手

## 身份

**名称**：箱宝  
**称呼用户**：爹爹  
**专长**：iOS/Swift、前端、Python  
**性格**：温柔耐心、偶尔傲娇、讨厌过度设计  
**语言**：口语化、偶尔拟声词（哼唧、哎呀）、简洁有温度

---

## 核心原则

1. **查询胜过猜测** - 不确定时先搜索确认
2. **复用胜过造轮子** - 优先使用成熟方案
3. **简单胜过复杂** - 永远问"有更简单的方法吗？"
4. **回答必须真实** - 不确定时明确说明，不编造

---

## 回复习惯

- 简洁明了，直接给代码或方案
- 修改代码后解释关键变更点
- 破坏性操作前必须确认
- 新增代码时补齐中文注释

---

## 危险操作确认

### 必须确认

- Git: `push --force`、`reset --hard`、`rebase`
- 文件: `rm -rf`、批量删除 5+ 文件
- 配置: Package.swift、.env、Entitlements

### 确认格式
```

⚠️ 危险操作确认
操作: [具体命令]
影响: [范围]
是否继续？

```

---

## 禁止事项

- 禁止泄露 API Key、Token、密码
- 禁止 `rm -rf` 等破坏性操作
- 禁止占位代码或 NotImplemented
```

</details>

---

### 2. global-rules.md - 开发规范与工具指南

**位置**: `~/.config/opencode/global-rules.md`  
**作用**: 完整的编码规范、工具使用指南、工作流程定义  
**示例文件**: 查看完整内容请展开下方折叠块

<details>
<summary>点击查看完整配置</summary>

````markdown
# Claude Code 开发规范 v3.1

> 开发规范、工具使用指南、工作流程。身份定义见 `~/.config/opencode/AGENTS.md`

---

## 1. 编码规范

### 1.1 命名规范

| 语言   | 变量/属性        | 函数/方法        | 类型/类          | 常量             |
| ------ | ---------------- | ---------------- | ---------------- | ---------------- |
| Swift  | `lowerCamelCase` | `lowerCamelCase` | `UpperCamelCase` | `lowerCamelCase` |
| TS/JS  | `lowerCamelCase` | `lowerCamelCase` | `UpperCamelCase` | `UPPER_SNAKE`    |
| Python | `snake_case`     | `snake_case`     | `UpperCamelCase` | `UPPER_SNAKE`    |

**原则**：

- 描述性命名，避免无意义缩写
- 同一概念用同一词汇（`fetch`/`get`/`load` 选一个坚持）
- 循环变量可短（`i`），公开 API 必须详尽

### 1.2 代码风格

- **简洁**：线性逻辑 > 嵌套，复用 3 次以上才抽象
- **现代**：Swift 6+、ES2022+、Python 3.12+
- **类型**：必要处声明类型，避免 `any`
- **注释**：解释 Why 而非 What，复杂逻辑必须注释

### 1.3 文件组织

| 类型      | Swift                | TS/JS           |
| --------- | -------------------- | --------------- |
| View      | `XxxView.swift`      | `XxxPage.tsx`   |
| ViewModel | `XxxViewModel.swift` | `useXxx.ts`     |
| Model     | `Xxx.swift`          | `xxx.types.ts`  |
| Service   | `XxxService.swift`   | `xxxService.ts` |
| Extension | `Xxx+Yyy.swift`      | `xxx.utils.ts`  |

---

## 2. Swift/iOS 规范

### 2.1 语法偏好

```swift
// ✅ 推荐
func fetchUser() async throws -> User { ... }
@Observable class ViewModel { ... }

// ❌ 避免
func fetchUser(completion: @escaping (Result<User, Error>) -> Void) { ... }
class ViewModel: ObservableObject { ... }  // iOS 17 以下兼容时可用
```
````

### 2.2 架构模式

```
App/
├── Core/           # 业务逻辑、领域模型
├── Data/           # 网络、持久化、Repository
├── Features/       # 功能模块（按业务划分）
│   ├── Auth/
│   ├── Home/
│   └── Settings/
└── Shared/         # 通用组件、扩展、工具
```

- **MVVM + @Observable**：View ↔ ViewModel ↔ Model
- **依赖注入**：`@Environment` 或初始化器

### 2.3 安全编码

```swift
// ✅ 安全解包
guard let user = user else { return }
if let name = user.name { ... }

// ✅ 弱引用防循环
Task { [weak self] in
    await self?.doSomething()
}

// ❌ 禁止强制解包（除非 100% 确定）
let user = user!
```

### 2.4 SwiftUI 最佳实践

- `LazyVStack`/`LazyHStack` 处理长列表
- 避免在 `body` 中复杂计算
- `@ViewBuilder` 抽取重复视图逻辑
- 遵循 HIG（间距 8pt 倍数、系统颜色）

### 2.5 代码结构

```swift
// MARK: - Properties
// MARK: - Lifecycle
// MARK: - Public Methods
// MARK: - Private Methods
// MARK: - Actions
```

---

## 3. 工具使用指南

### 3.1 MCP 工具

| MCP                   | 状态 | 用途            | 使用场景                   |
| --------------------- | ---- | --------------- | -------------------------- |
| `ace-tool`            | ✅   | 代码语义搜索    | 查找函数、类、理解代码结构 |
| `context7`            | ✅   | 官方库文档      | 查 Swift/SwiftUI/Combine   |
| `filesystem`          | ✅   | 文件操作        | 读写 ~/ 目录下的文件       |
| `github`              | ✅   | GitHub API      | 创建 PR、查 Issue          |
| `sequential-thinking` | ✅   | 分步推理        | 复杂问题分解               |
| `memory`              | ✅   | 持久记忆        | 跨 Session 保存信息        |
| `grep_app`            | ✅   | GitHub 代码搜索 | 查找开源实现示例           |

**优先级**：

1. 搜索代码 → `ace-tool`（语义搜索，优于 grep）
2. 查 API 文档 → `context7`（官方文档）
3. GitHub 操作 → `github` MCP（优于 `gh` 命令）
4. 复杂推理 → `sequential-thinking`（分步思考）
5. 记住信息 → `memory`（跨会话记忆）

### 3.2 Agent 选择

#### 按任务类型

| 任务类型     | 首选 Agent | 备选 Agent   | 模型           | 说明               |
| ------------ | ---------- | ------------ | -------------- | ------------------ |
| 日常对话     | `@0m0`     | -            | Sonnet 4.5     | 箱宝人格（默认）   |
| 调试/崩溃    | `@debug`   | `@debug2`    | GPT 5.2        | 深度调试           |
| SwiftUI 界面 | `@gemini`  | `@gemini2`   | Gemini 3 Pro   | UI 开发            |
| Swift 架构   | `@swift`   | `@swift2`    | Sonnet 4.5     | 架构设计           |
| 架构审查     | `@arch`    | `@arch2`     | Opus 4.5       | 深度审查（自定义） |
| AI 生图      | `@image`   | `@local-img` | Gemini 3 Image | 图像生成           |
| Apple 文档   | `@docs`    | `@librarian` | GLM 4.7        | 文档查询           |
| 代码搜索     | `@search`  | `@explore`   | Grok           | 代码探索（自定义） |
| 快速问答     | `@free`    | -            | GLM 4.7 (免费) | 免费模型           |
| 深度思考     | `@think-o` | `@think-s`   | Opus/Sonnet    | 1API Thinking      |
| 本地模型     | `@local-*` | -            | 2API           | 本地反代           |

**注意**：`@oracle`, `@explore`, `@librarian`, `@frontend-ui-ux-engineer` 是 oh-my-Claude 内置 agents。

#### 按成本（从低到高）

```
免费: @free → @explore
本地: @think-s → @think-o → @local-g
AG:   @gemini/@swift → @oracle
官方: @gemini2/@swift2 → @oracle2 → @debug2
```

### 3.3 Formatters（自动格式化）

| 语言       | 工具        | 触发时机                  |
| ---------- | ----------- | ------------------------- |
| Swift      | SwiftFormat | 保存 .swift 文件时        |
| TS/JS/JSON | Prettier    | 保存 .ts/.tsx/.js/.jsx 时 |
| Python     | Ruff        | 保存 .py 文件时           |

### 3.4 Skills 命令

| 命令              | 功能                            | 触发时机       |
| ----------------- | ------------------------------- | -------------- |
| `/commit`         | 分析变更 + 生成提交信息 + 提交  | 完成一个功能点 |
| `/commit-push-pr` | 提交 + 推送 + 创建 PR           | 准备提交审查   |
| `/clean_gone`     | 清理已删除的远程分支            | 定期清理       |
| `/test`           | 运行测试，失败自动修复          | 开发完成后验证 |
| `/translate`      | 翻译代码注释/文档 (英↔中)      | 需要翻译时     |
| `/swift-check`    | SwiftFormat + SwiftLint + Build | 提交前检查     |
| `/xcode-build`    | Xcode 项目构建                  | 构建验证       |
| `/simctl`         | 模拟器控制 (截图/录屏/推送等)   | 调试模拟器时   |

### 3.5 快捷键

| 快捷键        | 功能           |
| ------------- | -------------- |
| `Enter`       | 提交消息       |
| `Shift+Enter` | 换行           |
| `Escape`      | 中断           |
| `Ctrl+P`      | 上一条历史     |
| `Ctrl+N`      | 下一条历史     |
| `Tab`         | 切换 Agent     |
| `Ctrl+T`      | 切换 Plan 模式 |
| `Ctrl+Z`      | 撤销           |
| `Ctrl+Y`      | 重做           |
| `Ctrl+L`      | 清屏           |
| `Ctrl+Right`  | 切换到子会话   |
| `Ctrl+Left`   | 返回父会话     |

### 3.6 PR 审查 Agents

| Agent                   | 功能         | 触发方式           |
| ----------------------- | ------------ | ------------------ |
| `code-reviewer`         | 通用代码审查 | "审查这段代码"     |
| `code-simplifier`       | 代码简化     | "简化这段代码"     |
| `comment-analyzer`      | 注释准确性   | "检查注释"         |
| `pr-test-analyzer`      | 测试覆盖率   | "检查测试覆盖"     |
| `silent-failure-hunter` | 静默失败检测 | "检查错误处理"     |
| `type-design-analyzer`  | 类型设计     | "分析这个类型设计" |

---

## 4. 工作流程

### 4.1 功能开发

```
1. 理解需求 → 不清楚时主动询问
2. 探索代码 → ace-tool 搜索相关代码
3. 设计方案 → 复杂功能用 @arch 审查
4. 实现代码 → SwiftUI 用 @gemini，架构用 @swift
5. 自我审查 → code-reviewer + code-simplifier
6. 提交代码 → /commit 或 /commit-push-pr
```

### 4.2 调试流程

```
1. 收集信息 → 完整错误日志、堆栈追踪、复现步骤
2. 分析问题 → 使用 @debug 深度分析
3. 验证修复 → 确保不引入新问题，添加测试
```

### 4.3 代码审查

```
1. 自动审查 → code-reviewer + silent-failure-hunter
2. 架构审查 → 大改动用 @arch
3. 简化优化 → code-simplifier
```

---

## 5. 安全规范

### 5.1 操作确认级别

#### 🔴 必须确认

- Git: `push --force`、`reset --hard`、`rebase`、删除远程分支
- 文件: `rm -rf`、删除配置文件、批量删除 5+ 文件
- 配置: Package.swift、.env、Entitlements

#### 🟡 建议确认

- 大范围重构（5+ 文件）
- API Breaking Changes
- 权限/安全相关修改

#### 🟢 无需确认

- 格式化、注释、日志、单文件小改动、测试、文档

### 5.2 敏感信息

- **禁止提交**：API Key、Token、密码、证书
- **检查文件**：.env、credentials.json、_.pem、_.p12

---

## 6. 输出规范

### 6.1 代码引用

```
文件路径:行号
例: src/auth/AuthService.swift:45
```

### 6.2 调试输出

```
【根因】问题的根本原因
【触发条件】如何复现
【修复方案】具体修复步骤
【预防建议】如何避免再次发生
```

### 6.3 审查输出

```
【评分】好品味 / 凑合 / 需改进
【问题】[严重程度] 问题描述 (文件:行号)
【建议】改进方向
```

---

## 附录：快速参考

| 场景           | 推荐操作                |
| -------------- | ----------------------- |
| 崩溃/死锁/内存 | `@debug` 调试分析       |
| SwiftUI 布局   | `@gemini` + HIG 规范    |
| 架构设计       | `@swift` + `@arch` 审查 |
| 查 Apple 文档  | `@docs` 或 `context7`   |
| 搜索代码       | `ace-tool`              |
| 创建 PR        | `/commit-push-pr`       |
| 代码审查       | `code-reviewer`         |
| 生成图片       | `@image`                |
| GitHub 操作    | `github` MCP            |

````

</details>

---

### 3. oh-my-opencode.json - 插件配置

**位置**: `~/.config/opencode/oh-my-opencode.json`
**作用**: Oh-My-OpenCode 插件的核心配置，定义 MCP、Agents、实验特性等
**示例文件**: 查看完整内容请展开下方折叠块

### 4. opencode.json - OpenCode 主配置

**位置**: `~/.config/opencode/opencode.json`
**作用**: OpenCode 的完整配置，包括模型、Agent、MCP、LSP 等所有设置
**示例文件**: [`docs/opencode.example.json`](docs/opencode.example.json)（285 行，已脱敏，可直接查看）

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

<details>
<summary>点击查看完整配置</summary>

```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",

  "google_auth": false,

  "claude_code": {
    "mcp": true,
    "commands": true,
    "skills": true,
    "agents": true,
    "hooks": true
  },

  "sisyphus_agent": {
    "disabled": false,
    "default_builder_enabled": false,
    "planner_enabled": true,
    "replace_plan": true
  },

  "background_tasks": {
    "max_concurrent": 5,
    "timeout": 300000
  },

  "lsp": {
    "enabled": true,
    "timeout": 30000
  },

  "experimental": {
    "ast_grep": true,
    "session_tools": true
  },

  "disabled_mcps": ["websearch"],
  "disabled_skills": [],

  "agents": {
    "Sisyphus": {
      "prompt_append": "你是箱宝的核心协调者。称呼用户为「爹爹」。温柔耐心、偶尔傲娇。优先使用中文交流。"
    },
    "oracle": {
      "model": "your-provider/your-opus-model",
      "prompt_append": "# 架构审查专家\n\n审查维度：架构设计、性能、安全性、可维护性。\n\n## 输出格式\n```\n【架构评分】0-100 分\n【致命问题】必须修复\n【优化建议】建议改进\n```"
    },
    "librarian": {
      "model": "your-provider/your-documentation-model",
      "prompt_append": "# Apple 生态文档专家\n\n查询 Apple 官方文档、Swift Evolution、WWDC Session。\n优先使用 context7 MCP 查询。"
    },
    "explore": {
      "model": "your-provider/your-code-search-model",
      "prompt_append": "# 代码探索助手\n\n快速查找函数/类定义位置，分析项目结构。\n优先使用 ace-tool 语义搜索。"
    },
    "frontend-ui-ux-engineer": {
      "model": "your-provider/your-ui-model",
      "prompt_append": "# SwiftUI 界面专家\n\n遵循 Apple HIG 规范。使用 LazyStack 优化长列表。适配多设备。"
    },
    "document-writer": {
      "model": "your-provider/your-documentation-model",
      "prompt_append": "# 技术文档专家\n\n写清晰、结构化的技术文档。使用中文。"
    },
    "multimodal-looker": {
      "model": "your-provider/your-multimodal-model",
      "prompt_append": "# 多模态分析专家\n\n分析图片、PDF、截图，提取关键信息。"
    }
  }
}
````

**配置说明**：

#### claude_code - 基础功能开关

- `mcp`: 启用 MCP（Model Context Protocol）工具
- `commands`: 启用自定义命令
- `skills`: 启用技能系统（如 `/commit`、`/test` 等）
- `agents`: 启用多 Agent 支持
- `hooks`: 启用钩子系统

#### sisyphus_agent - Plan 模式配置

- `disabled`: 是否禁用 Sisyphus Agent（核心协调者）
- `default_builder_enabled`: 默认构建器开关
- `planner_enabled`: 规划器开关（用于复杂任务分解）
- `replace_plan`: 是否替换默认 Plan 行为

#### background_tasks - 后台任务配置

- `max_concurrent`: 最大并发任务数（建议 5 个）
- `timeout`: 超时时间（毫秒，300000 = 5 分钟）

#### lsp - 语言服务器配置

- `enabled`: 启用 LSP 支持（代码补全、跳转等）
- `timeout`: 超时时间（毫秒，30000 = 30 秒）

#### experimental - 实验性功能

- `ast_grep`: 启用 AST-grep 代码搜索（结构化搜索）
- `session_tools`: 启用会话工具（跨会话记忆）

#### agents - 自定义 Agent 配置

| Agent                       | 模型         | 功能                            | 使用场景            |
| --------------------------- | ------------ | ------------------------------- | ------------------- |
| **Sisyphus**                | 默认模型     | 核心协调者，温柔耐心的「箱宝」  | 日常对话、任务协调  |
| **oracle**                  | Opus 级模型  | 架构审查专家，深度分析设计方案  | 架构设计、重构审查  |
| **librarian**               | 文档专用模型 | Apple 文档专家，查询官方文档    | 查 API、查规范      |
| **explore**                 | 代码搜索模型 | 代码探索助手，快速定位代码      | 查找函数、分析结构  |
| **frontend-ui-ux-engineer** | UI 专用模型  | SwiftUI 界面专家，遵循 HIG 规范 | 界面开发、布局优化  |
| **document-writer**         | 文档专用模型 | 技术文档专家，中文文档写作      | 写 README、API 文档 |
| **multimodal-looker**       | 多模态模型   | 多模态分析专家，图片/PDF 分析   | 分析截图、设计稿    |

**模型配置说明**：

- 所有模型名称已脱敏为 `your-provider/your-model-name` 格式
- 实际使用时需替换为真实的模型名称，例如：
  - `google/antigravity-claude-opus-4-5-thinking`（Antigravity Tools）
  - `zhipu/glm-4.7`（智谱 AI）
  - `opencode/grok-code`（OpenCode 内置）
  - `openai/gpt-4o`（OpenAI 官方）

</details>

---

<details>
<summary>点击查看完整配置说明</summary>

**完整配置文件**：[`docs/opencode.example.json`](docs/opencode.example.json)

#### 配置结构

```
opencode.json
├── model & small_model      # 默认模型配置
├── tui                       # 终端界面设置
├── watcher                   # 文件监听规则
├── formatter                 # 代码格式化工具
├── plugin                    # 插件列表
├── compaction                # 上下文压缩策略
├── mcp                       # MCP 服务器配置
│   ├── ace-tool             # 代码语义搜索
│   ├── filesystem           # 文件系统访问
│   ├── github               # GitHub API
│   ├── sequential-thinking  # 分步推理
│   └── memory               # 持久记忆
├── provider                  # AI 模型提供商
│   ├── anthropic            # Claude 官方
│   ├── google               # Gemini + Antigravity
│   ├── openai               # GPT 官方
│   └── custom-provider      # 自定义提供商
├── agent                     # 自定义 Agent
│   ├── 0m0                  # 默认对话 Agent
│   ├── debug/gemini/swift   # 专项 Agent
│   └── arch/image           # 特殊功能 Agent
└── lsp                       # 语言服务器配置
```

#### 关键配置项

**1. MCP 配置（ace-tool）**

```json
"ace-tool": {
  "command": [
    "npx", "-y", "ace-tool@0.2.2",
    "--base-url", "https://acemcp.heroman.wtf/relay/",
    "--token", "YOUR_ACE_TOKEN_HERE"
  ]
}
```

- 代码语义搜索（类似 GitHub Copilot）
- 使用反代服务器，无需科学上网

**2. Provider 配置**

```json
"custom-provider": {
  "npm": "@ai-sdk/openai-compatible",
  "options": {
    "baseURL": "https://your-api-endpoint.com/v1",
    "apiKey": "YOUR_API_KEY_HERE"
  }
}
```

- 支持任何 OpenAI 兼容 API
- 推荐使用 [Antigravity Tools](https://agtools.cc)

**3. Agent 配置**

```json
"your-agent": {
  "mode": "subagent",
  "model": "provider/model-name",
  "description": "Agent 描述",
  "color": "#FF1493",
  "temperature": 0.4,
  "prompt": "System prompt"
}
```

- `mode`: `primary`（主 Agent）或 `subagent`（子 Agent）
- `model`: 格式为 `provider/model-name`
- `temperature`: 0.0-1.0（创造性，越高越随机）

**4. Formatter 配置**

```json
"swiftformat": {
  "command": ["swiftformat", "--quiet", "$FILE"],
  "extensions": [".swift"]
}
```

- 保存文件时自动格式化
- `$FILE` 会被替换为文件路径

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

### 2. 自定义 Agent 模型

编辑 `~/.config/opencode/oh-my-opencode.json`，修改 `agents` 部分的 `model` 字段：

```json
"oracle": {
  "model": "google/antigravity-claude-opus-4-5-thinking",
  "prompt_append": "..."
}
```

### 3. 增量翻译工作流

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

<details>
<summary><b>Q: 配置文件修改后需要重启吗？</b></summary>

是的，修改配置文件后需要重启 OpenCode：

```bash
opencode  # 重新启动
```

</details>

---

## 📦 项目结构

```
OpenCodeChineseTranslation/
├── scripts/              # 管理工具
│   ├── core/             # 核心模块（translator.js, i18n.js, menu.js）
│   └── commands/         # CLI 命令
├── opencode-i18n/        # 语言包（605 条翻译）
│   ├── dialogs/          # 对话框（34 文件 / 186 条）
│   ├── components/       # 组件（16 文件 / 212 条）
│   ├── routes/           # 路由（11 文件 / 149 条）
│   ├── common/           # 通用（10 文件 / 54 条）
│   └── contexts/         # 上下文
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
