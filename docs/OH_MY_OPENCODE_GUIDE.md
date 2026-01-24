# Oh My OpenCode (Sisyphus) 终极实战指南

[![oh-my-opencode](https://img.shields.io/badge/oh--my--opencode-v3.0-blue.svg)](https://github.com/code-yeongyu/oh-my-opencode)
[![OpenCode](https://img.shields.io/badge/OpenCode-中文版-green.svg)](https://github.com/1186258278/OpenCodeChineseTranslation)

> **"Sisyphus 是像你的团队一样编码的智能体。"**
> 
> Oh My OpenCode 将 OpenCode 升级为拥有完整工程团队能力的智能体编排系统。你不再是单纯的 Coder，而是 AI 研发团队的 Tech Lead。

---

## 📦 第一章：安装指南 (Installation)

### 1. 交互式安装（推荐）
这是最简单的方式，安装脚本会自动检测环境并生成最优配置。

```bash
# 使用 bun (推荐)
bunx oh-my-opencode install

# 或使用 npm
npx oh-my-opencode install
```

安装过程中会询问你拥有的订阅类型（Claude/ChatGPT/Gemini），请如实选择，脚本会根据你的回答配置最佳的模型组合。

### 2. 命令行快速安装
如果你喜欢自动化脚本，可以使用参数直接安装：

```bash
# 示例：我有 Claude Max20 和 Gemini 订阅
bunx oh-my-opencode install --no-tui --claude=max20 --gemini=yes --chatgpt=no
```

### 3. AI 辅助安装
如果你懒得动手，直接把下面这句话发给 OpenCode：
> "Install and configure oh-my-opencode by following the instructions from https://github.com/code-yeongyu/oh-my-opencode"

---

## 🔐 第二章：认证与配置 (Auth & Config)

### 1. 基础认证 (必须)
无论你使用什么模式，必须先登录 OpenCode 才能解锁后台并行任务能力。

```bash
opencode auth login
```
*   如果不登录，后台任务 (Background Agents) 将无法启动，你会收到 `Unauthorized` 错误。

### 2. 配置文件
配置文件支持 `.jsonc` (带注释的 JSON)，位置优先级如下：
1.  **项目级** (最高优先级): `.opencode/oh-my-opencode.json`
2.  **用户级**: `~/.config/opencode/oh-my-opencode.json` (Windows下在 `%APPDATA%` 或 User Home)

**推荐配置结构：**
```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  
  // 1. 认证模式：如果使用了 Antigravity 插件，设为 false
  "google_auth": false,

  // 2. Agent 模型自定义 (根据你的财力调整)
  "agents": {
    "Sisyphus": { 
      "model": "anthropic/claude-opus-4-5", // 主管用最好的
      "temperature": 0.3 
    },
    "oracle": { "model": "openai/gpt-5.2" }, // 军师用逻辑最强的
    "explore": { "model": "google/gemini-3-flash" } // 跑腿用最快最便宜的
  },

  // 3. 后台并发控制
  "background_task": {
    "defaultConcurrency": 5, // 默认同时跑5个
    "providerConcurrency": {
      "google": 10, // Gemini 支持高并发
      "anthropic": 3 // Claude 并发较低
    }
  }
}
```

### 3. 进阶：Antigravity 认证 (Google 账号)
如果你需要极致的并发性能（同时跑 10+ 后台任务），建议安装 `opencode-antigravity-auth` 插件并配置 Google 账号。这能解锁 Gemini 的高并发能力。

---

## ⚡️ 第三章：核心模式 Ultrawork

这是该插件的灵魂。当你需要处理复杂任务，不想一步步确认时使用。

### 触发方式
在提示词中包含 `ultrawork` 或简写 `ulw`。

### 效果
Sisyphus 会自动进入"推石头"模式：
1.  **自动拆解**：分析需求，拆解为子任务。
2.  **后台并行**：启动多个后台线程 (Explore/Librarian) 并行搜索代码和文档。
3.  **循环执行**：执行 -> 检查 -> 修正 -> 下一步，直到任务 100% 完成。

### 示例
> "ulw 重构现在的登录逻辑，改用 NextAuth.js，并确保所有测试通过。"
> "ulw analyze 为什么这个 API 响应这么慢，给我出个优化方案。"

---

## 🎭 第四章：指挥你的“AI 团队” (Agents)

你不需要自己干所有的活，学会“点名”让专家上。

| 专家代号 | 擅长领域 | 最佳调用场景 | 话术示例 |
| :--- | :--- | :--- | :--- |
| **@oracle** | **架构/深思/调试** | 遇到死胡同、设计难题、需要“高智商”决策时 | "Ask @oracle 分析为什么这个死锁问题频繁发生" |
| **@librarian** | **文档/调研** | 不懂 API、不知道最佳实践、查阅开源实现 | "Ask @librarian 查一下 Stripe 最新 API 的退款流程" |
| **@explore** | **代码考古/搜索** | 想知道某个功能在哪定义的、理清复杂的依赖关系 | "Ask @explore 找出项目中所有用到 UserContext 的地方" |
| **@frontend-ui-ux-engineer** | **界面/CSS/设计** | 调整样式、动画、布局、Tailwind 类名 | "让 @frontend-ui-ux-engineer 把这个按钮改成类似 Vercel 的风格" |

---

## 🚨 第五章：迁移用户避坑指南 (Claude Code -> OpenCode)

**如果你是从 Claude Code 迁移过来的用户，请务必阅读本节！**

### 1. 路径优先级陷阱
Oh My OpenCode 会按照以下优先级加载配置：
1.  `.opencode/` (项目级)
2.  `.claude/` (兼容层)

**⚠️ 警告**：如果你在 `.opencode/skills` 和 `.claude/skills` 中存放了同名 Skill，系统可能会混淆或加载失败。
**✅ 建议**：删除 `.opencode` 下的重复内容，直接保留你的 `.claude` 目录。插件完美兼容 Claude Code 的目录结构。

### 2. MCP 重复配置
插件内置了以下 MCP 服务，请**不要**在你的 `.claude/.mcp.json` 中重复配置，否则会发生冲突：
*   `websearch` (Exa)
*   `context7` (文档查询)
*   `grep_app` (GitHub 代码搜索)

其他自定义 MCP (如 Postgres, Github, Filesystem) 可以放心保留。

### 3. Hook 调试
你的 `.claude/hooks` 自定义脚本按**文件名顺序**执行。如果发现 Hook 未触发：
*   检查文件名排序（建议加数字前缀，如 `01_init.js`）。
*   在 OpenCode 中运行 `opencode --debug` 查看加载日志。

---

## 🛠️ 第六章：常用增强命令

除了你的自定义 Commands，插件自带了几个神器：

*   **`/git-master`**：Git 专家。
    *   *commit*: 自动生成极高质量的原子提交信息。
    *   *squash*: 智能压缩提交。
    *   *blame*: "Who wrote this crap?"
*   **`/refactor`**：安全重构。
    *   先分析 AST -> 调用 LSP 重命名 -> 运行测试。
    *   *用法*：`/refactor 用户服务模块`
*   **`/playwright`**：浏览器自动化。
    *   *用法*：`/playwright 打开 localhost:3000 并截图` (前端验收神器)。
*   **`/init-deep`**：生成项目上下文。
    *   在各级目录生成 `AGENTS.md`，让 AI 更懂你的项目结构。

---

## ❓ 常见问题 (FAQ)

**Q: Sisyphus 和 Planner 模式有什么区别？**
A: **Sisyphus (默认)** 是敏捷模式，边干边想，适合调试和重构。**Planner** 是规划模式，会先生成详细的 `PLAN.md` 待你审批后再执行，适合大型功能开发。说 "先帮我做一个 Plan" 即可触发 Planner。

**Q: 后台任务报错 `Unauthorized`？**
A: 你的 OpenCode 认证过期了。运行 `opencode auth login` 重新登录。

**Q: 怎么让 AI 知道我的代码规范？**
A: 在项目根目录或子目录创建 `AGENTS.md`。Sisyphus 在编辑文件时会自动读取当前路径一直到根目录的所有 `AGENTS.md` 文件。

**Q: `ulw` 卡住了怎么办？**
A: 输入 `stop` 或 `/cancel-ralph` 强制停止。
