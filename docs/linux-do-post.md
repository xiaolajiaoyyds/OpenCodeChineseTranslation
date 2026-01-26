# OpenCode 中文汉化版 - AI 自动翻译 + 质量检查

基于 [原作者 @1186258278 的汉化项目](https://linux.do/t/topic/1469651) 进行改进。

**项目地址**：https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation

## 效果展示

| 交互式菜单 | 覆盖率报告 | 质量检查 |
| :--------: | :--------: | :------: |
| ![菜单](https://raw.githubusercontent.com/xiaolajiaoyyds/OpenCodeChineseTranslation/main/docs/menu.png) | ![覆盖率](https://raw.githubusercontent.com/xiaolajiaoyyds/OpenCodeChineseTranslation/main/docs/coverage-report.png) | ![质量](https://raw.githubusercontent.com/xiaolajiaoyyds/OpenCodeChineseTranslation/main/docs/quality-check.png) |

---

## 原版 vs 改进版对比

### 核心痛点解决

| 痛点 | 原版 | 改进版 |
| --- | --- | --- |
| **官方更新后怎么办？** | 手动对比新增文本，手动翻译 | AI 自动检测新文本并翻译 |
| **翻译会不会破坏代码？** | 不知道，只能编译试试 | 质量检查：语法检测 + AI 审查 |
| **翻译了多少？还剩多少？** | 不清楚 | 覆盖率报告 + AI 智能总结 |
| **跨平台支持** | 仅 Windows (PowerShell) | macOS / Linux / Windows 通用 |

### 功能对比

| 功能 | 原版 | 改进版 |
| --- | :---: | :---: |
| 手动应用汉化 | ✅ | ✅ |
| 交互式菜单 | ✅ | ✅ 优化分类 |
| 编译构建 | ✅ | ✅ |
| **AI 自动翻译** | ❌ | ✅ |
| **增量翻译** | ❌ | ✅ |
| **质量检查** | ❌ | ✅ |
| **语法安全检测** | ❌ | ✅ |
| **AI 语义审查** | ❌ | ✅ |
| **自动修复** | ❌ | ✅ |
| **覆盖率报告** | ❌ | ✅ |
| **AI 智能总结** | ❌ | ✅ |
| **跨平台 CLI** | ❌ | ✅ |

### 文件对比

| 项目 | 原版 | 改进版 |
| --- | --- | --- |
| 语言包文件 | ~40 个 | 75 个 |
| 翻译条数 | 未统计 | 605 条 |
| 核心代码 | ~1500 行 | ~3800 行 |
| 新增模块 | - | translator.js (1882 行) |

---

## 新增功能详解

### 1. AI 自动翻译

官方更新后，不用再手动找新增文本了：

```bash
opencodenpm apply
```

自动完成：
1. 扫描源码，提取所有 UI 文本
2. 对比现有翻译，找出未翻译的
3. 调用 AI 翻译（支持 Claude/GPT/Gemini）
4. 生成语言包配置
5. 应用到源码

### 2. 增量翻译

只翻译 git 变更的文件，节省时间和 API 费用：

```bash
opencodenpm apply --incremental
```

### 3. 质量检查

翻译完担心出问题？跑一下质量检查：

```bash
opencodenpm check --quality
```

**本地语法检查**（不调用 API）：
- 引号匹配：`"` 数量一致
- 花括号匹配：`{` `}` 数量一致
- 标签匹配：`{highlight}...{/highlight}` 成对
- 变量保留：`${var}` 不丢失
- 括号闭合：`()` `[]` `{}` 正确闭合

**AI 语义审查**（抽样 30 条）：
- 翻译准确性
- 自然度
- 术语一致性

### 4. 覆盖率报告 + AI 总结

应用汉化后显示详细统计：

```
36/52 文件已覆盖
605 条翻译

分类明细：
  对话框：34 文件 / 186 条
  组件：  16 文件 / 212 条
  路由：  11 文件 / 149 条
  通用：  10 文件 / 54 条

AI 总结：
这 16 个文件被跳过，是因为它们压根就没啥中文可翻译的嘛～
有的是纯代码逻辑，有的是主题配置和类型定义。
```

### 5. 跨平台支持

原版是 PowerShell 脚本，只能在 Windows 用。

改进版用 Node.js 重写，macOS / Linux / Windows 都能跑。

---

## 快速开始

```bash
# 克隆
git clone https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation

# 安装
cd scripts && npm install && npm link

# 运行
opencodenpm
```

## AI 配置

创建 `.env` 文件：

```env
OPENAI_API_KEY=your-key
OPENAI_API_BASE=http://127.0.0.1:8045/v1
OPENAI_MODEL=claude-sonnet-4-20250514
```

推荐用 [Antigravity Tools](https://agtools.cc) 本地反代，支持各种模型。

---

## 命令参考

| 命令 | 说明 |
| --- | --- |
| `opencodenpm` | 交互式菜单 |
| `opencodenpm full` | 一键汉化 |
| `opencodenpm sync` | 同步官方 |
| `opencodenpm apply` | 应用汉化（含 AI 翻译） |
| `opencodenpm apply --incremental` | 增量翻译 |
| `opencodenpm check --quality` | 质量检查 |
| `opencodenpm build` | 编译 |
| `opencodenpm deploy` | 部署 |

---

## 致谢

感谢原作者 [@1186258278](https://github.com/1186258278) 的汉化工作，本项目在其基础上增加了 AI 翻译和质量检查功能。

有问题欢迎反馈！
