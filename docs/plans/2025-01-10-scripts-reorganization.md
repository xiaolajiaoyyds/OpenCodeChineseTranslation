# Scripts 目录重组提案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 重组 scripts 目录，同步文档，优化脚本代码，确保 Linux/Windows 功能一致

**架构:** 将 scripts 分为两个子目录：`env/`（环境初始化）和 `codes/`（Codes 管理工具），文档统一管理

**Tech Stack:** Bash, PowerShell, Markdown

---

## 目录结构

**重组前：**
```
scripts/
├── codes.sh              # Codes 主脚本 (Linux)
├── codes.ps1             # Codes 主脚本 (Windows)
├── init-dev-env.sh      # 环境初始化 (Linux)
├── init-dev-env.ps1     # 环境初始化 (Windows)
├── init.ps1              # OpenCode 初始化
├── opencode.ps1          # OpenCode 主脚本
├── install.sh            # 一键安装 (最新)
├── install-codes.sh      # Codes 安装 (旧版，冗余)
├── install-codes.ps1     # Windows Codes 安装
└── README.md             # 文档 (v1.0，过时)
```

**重组后：**
```
scripts/
├── README.md                    # 统一文档入口
├── install.sh                   # 一键安装 (Linux/macOS)
├── install.ps1                  # 一键安装 (Windows)
│
├── env/                         # 环境初始化工具
│   ├── init.sh                  # Linux/macOS 环境初始化
│   ├── init.ps1                 # Windows 环境初始化
│   └── README.md                # 环境工具文档
│
├── codes/                       # Codes 管理工具
│   ├── codes.sh                 # Linux/macOS 核心
│   ├── codes.ps1                # Windows 核心
│   ├── install.sh               # Codes 安装 (Linux/macOS)
│   ├── install.ps1              # Codes 安装 (Windows)
│   └── README.md                # Codes 文档
│
└── opencode/                    # OpenCode 汉化工具
    ├── opencode.ps1             # Windows 主脚本
    ├── init.ps1                 # 初始化脚本
    └── README.md                # OpenCode 工具文档
```

---

## 问题分析

| 问题 | 严重性 | 说明 |
|------|--------|------|
| `install-codes.sh` 已过时 | 高 | 安装到 ~/.codes，与 install.sh 不一致 |
| `codes.ps1` 版本落后 | 高 | 还是 v1.0，缺少编号安装功能 |
| `scripts/README.md` 过时 | 中 | 显示 v1.0，缺少新功能说明 |
| 目录混乱 | 中 | 环境工具、Codes、OpenCode 混在一起 |
| 文档重复 | 低 | 主 README 和 scripts/README 内容重叠 |

---

## Task 1: 创建新目录结构

**文件:**
- Create: `scripts/env/`
- Create: `scripts/codes/`
- Create: `scripts/opencode/`

**Step 1: 创建目录**

```bash
cd /c/Data/PC/OpenCode/scripts
mkdir -p env codes opencode
```

**Step 2: 验证**

```bash
ls -la scripts/
```

预期输出包含 env/, codes/, opencode/

**Step 3: Commit**

```bash
git add scripts/env scripts/codes scripts/opencode
git commit -m "feat: 创建 scripts 子目录结构"
```

---

## Task 2: 移动环境初始化脚本

**文件:**
- Move: `scripts/init-dev-env.sh` → `scripts/env/init.sh`
- Move: `scripts/init-dev-env.ps1` → `scripts/env/init.ps1`

**Step 1: 移动 Linux 脚本**

```bash
git mv scripts/init-dev-env.sh scripts/env/init.sh
```

**Step 2: 移动 Windows 脚本**

```bash
git mv scripts/init-dev-env.ps1 scripts/env/init.ps1
```

**Step 3: 更新脚本内版本号**

编辑 `scripts/env/init.sh` 第 3 行，版本号改为 v1.4：
```bash
# 开发环境一键初始化脚本 v1.4
```

编辑 `scripts/env/init.ps1` 第 3 行，版本号改为 v1.4：
```powershell
# 开发环境一键初始化脚本 v1.4
```

**Step 4: Commit**

```bash
git add scripts/env/
git commit -m "refactor(env): 移动环境初始化脚本到 env/ 目录，升级到 v1.4"
```

---

## Task 3: 移动 Codes 脚本

**文件:**
- Move: `scripts/codes.sh` → `scripts/codes/codes.sh`
- Move: `scripts/codes.ps1` → `scripts/codes/codes.ps1`
- Move: `scripts/install-codes.sh` → `scripts/codes/install.sh`
- Move: `scripts/install-codes.ps1` → `scripts/codes/install.ps1`

**Step 1: 移动脚本**

```bash
cd /c/Data/PC/OpenCode/scripts
git mv codes.sh codes/codes.sh
git mv codes.ps1 codes/codes.ps1
git mv install-codes.sh codes/install.sh
git mv install-codes.ps1 codes/install.ps1
```

**Step 2: 删除旧的 install-codes.sh（已替换为 install.sh）**

```bash
# 先对比确认差异
diff scripts/codes/install.sh scripts/install.sh
# 如果 codes/install.sh 更简单，直接删除
git rm codes/install.sh
```

**Step 3: Commit**

```bash
git add scripts/codes/
git commit -m "refactor(codes): 移动 Codes 脚本到 codes/ 目录"
```

---

## Task 4: 移动 OpenCode 脚本

**文件:**
- Move: `scripts/opencode.ps1` → `scripts/opencode/opencode.ps1`
- Move: `scripts/init.ps1` → `scripts/opencode/init.ps1`

**Step 1: 移动脚本**

```bash
cd /c/Data/PC/OpenCode/scripts
git mv opencode.ps1 opencode/opencode.ps1
git mv init.ps1 opencode/init.ps1
```

**Step 2: Commit**

```bash
git add scripts/opencode/
git commit -m "refactor(opencode): 移动 OpenCode 脚本到 opencode/ 目录"
```

---

## Task 5: 更新 codes.ps1 到 v1.1

**文件:**
- Modify: `scripts/codes/codes.ps1`

**问题:** `codes.ps1` 还是 v1.0，需要同步 `codes.sh` v1.1 的功能：
- 自包含设计（不依赖 init 脚本）
- 编号安装支持 `codes install 1`
- 无效编号友好提示

**Step 1: 同步版本号**

编辑 `scripts/codes/codes.ps1` 第 8 行：
```powershell
VERSION="1.1.0"
```

**Step 2: 添加编号安装支持**

在 `scripts/codes/codes.ps1` 的 `cmd_install` 函数中添加 `$targetNum` 参数支持（参考 codes.sh 的实现）

**Step 3: 添加组件列表**

在脚本顶部添加：
```powershell
# 组件列表
$Script:COMPONENTS = @(
    @{ Id="1"; Name="Node.js"; Function="Install-NodeJS"; Check="node" }
    @{ Id="2"; Name="Bun"; Function="Install-Bun"; Check="bun" }
    @{ Id="3"; Name="Git"; Function="Install-Git"; Check="git" }
    @{ Id="4"; Name="Python"; Function="Install-Python"; Check="python" }
    @{ Id="5"; Name="nvm"; Function="Install-Nvm"; Check="nvm" }
    @{ Id="6"; Name="coding-helper"; Function="Install-CodingHelper"; Check="chelper" }
)
```

**Step 4: 测试**

```powershell
# 测试诊断
.\scripts\codes\codes.ps1 doctor

# 测试无效编号
.\scripts\codes\codes.ps1 install 99

# 测试有效编号
.\scripts\codes\codes.ps1 install 1
```

**Step 5: Commit**

```bash
git add scripts/codes/codes.ps1
git commit -m "feat(codes): 升级 codes.ps1 到 v1.1，同步编号安装功能"
```

---

## Task 6: 更新主安装脚本路径

**文件:**
- Modify: `scripts/install.sh`
- Modify: `scripts/install.ps1` (需创建)

**Step 1: 更新 Linux 安装脚本**

编辑 `scripts/install.sh`，更新路径：
```bash
LIB_DIR="/usr/local/lib/codes"
# 改为
LIB_DIR="/usr/local/lib/codes"
SCRIPT_PATH="$REPO/$BRANCH/scripts/codes/codes.sh"
```

**Step 2: 创建 Windows 安装脚本**

创建 `scripts/install.ps1`：
```powershell
# Codes 一键安装脚本 (Windows)
# 使用方式: irm https://raw.githubusercontent.com/.../install.ps1 | iex

$REPO = "1186258278/OpenCodeChineseTranslation"
$BRANCH = "main"
$LIB_DIR = "$env:ProgramData\codes"
$BIN_DIR = "$env:LOCALAPPDATA\Microsoft\WindowsApps"

# 下载脚本
Write-Host "→ 下载 codes.ps1..."
$GitHub_URL = "https://raw.githubusercontent.com/$REPO/$BRANCH/scripts/codes/codes.ps1"
$Gitee_URL = "https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation/raw/main/scripts/codes/codes.ps1"

# ... 实现下载逻辑
```

**Step 3: 测试**

```bash
# Linux 测试
docker run --rm ubuntu:22.04 bash -c "curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash"
```

**Step 4: Commit**

```bash
git add scripts/install.sh scripts/install.ps1
git commit -m "feat: 更新安装脚本路径，添加 Windows 版本"
```

---

## Task 7: 创建 scripts/README.md 统一文档

**文件:**
- Create: `scripts/README.md`

**Step 1: 编写文档**

```markdown
# Scripts 目录

OpenCode 中文汉化版脚本集合，包含三个主要工具：

## 工具概览

| 工具 | 目录 | 说明 |
|------|------|------|
| [Codes](./codes/) | `scripts/codes/` | 开发环境管理工具 |
| [Env](./env/) | `scripts/env/` | 一键环境初始化 |
| [OpenCode](./opencode/) | `scripts/opencode/` | OpenCode 汉化工具 |

## 快速开始

### Linux/macOS

```bash
# 一键安装 Codes
curl -fsSL https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/scripts/install.sh | bash
```

### Windows

```powershell
# 一键安装 Codes
irm https://raw.githubusercontent.com/1186258278/OpenCodeChineseTranslation/main/scripts/install.ps1 | iex
```

## 国内镜像

```bash
# 使用 Gitee 镜像
curl -fsSL https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation/raw/main/scripts/install.sh | bash
```
```

**Step 2: Commit**

```bash
git add scripts/README.md
git commit -m "docs: 创建 scripts 统一文档入口"
```

---

## Task 8: 创建各子目录 README

**文件:**
- Create: `scripts/codes/README.md`
- Create: `scripts/env/README.md`
- Create: `scripts/opencode/README.md`

**Step 1: 创建 Codes 文档**

编辑 `scripts/codes/README.md`，内容包含：
- Codes 功能介绍
- 安装方法
- 命令参考（包括编号安装）
- 组件编号表

**Step 2: 创建 Env 文档**

编辑 `scripts/env/README.md`，内容包含：
- 环境初始化功能
- 支持的组件
- 使用方法

**Step 3: 创建 OpenCode 文档**

编辑 `scripts/opencode/README.md`，内容包含：
- OpenCode 汉化功能
- 使用方法
- 菜单说明

**Step 4: Commit**

```bash
git add scripts/*/README.md
git commit -m "docs: 添加各子目录 README 文档"
```

---

## Task 9: 更新主 README 路径引用

**文件:**
- Modify: `README.md`
- Modify: `README_EN.md`

**Step 1: 更新中文 README**

将 scripts 相关路径更新为新结构：
```markdown
- scripts/init-dev-env.sh → scripts/env/init.sh
- scripts/codes.sh → scripts/codes/codes.sh
```

**Step 2: 更新英文 README**

同步英文版的路径更新。

**Step 3: Commit**

```bash
git add README.md README_EN.md
git commit -m "docs: 更新主 README 路径引用"
```

---

## Task 10: 删除冗余文件

**文件:**
- Delete: `scripts/install-codes.sh` (如果还存在)
- Delete: `scripts/install-codes.ps1` (如果还存在)

**Step 1: 确认冗余**

```bash
# 检查是否还有旧文件
ls scripts/install-codes.* 2>/dev/null
```

**Step 2: 删除**

```bash
git rm scripts/install-codes.sh scripts/install-codes.ps1
```

**Step 3: Commit**

```bash
git commit -m "chore: 删除已冗余的 install-codes 脚本"
```

---

## Task 11: 更新版本号到 v1.1

**文件:**
- Modify: `scripts/codes/codes.sh`
- Modify: `scripts/codes/README.md`

**Step 1: 确认版本号一致**

```bash
grep "VERSION=" scripts/codes/codes.sh
grep "v1.0" scripts/codes/README.md
```

**Step 2: 更新 README 版本徽章**

编辑 `scripts/codes/README.md` 第 3 行：
```markdown
[![Codes](https://img.shields.io/badge/codes-v1.1.0-cyan.svg)]
```

**Step 3: Commit**

```bash
git add scripts/codes/
git commit -m "chore: 同步版本号到 v1.1.0"
```

---

## Task 12: Docker 测试验证

**文件:**
- Test: 所有脚本

**Step 1: 测试 Linux 安装**

```bash
cd /c/Data/PC/OpenCode
docker run --rm -v "$PWD:/repo" ubuntu:22.04 bash -c "
cp /repo/scripts/install.sh /tmp/
chmod +x /tmp/install.sh
# 模拟安装（不实际写入系统）
sed 's|/usr/local/lib|/tmp/lib|g' /tmp/install.sh | bash
"
```

**Step 2: 测试 Codes 功能**

```bash
docker run --rm -v "$PWD:/repo" ubuntu:22.04 bash -c "
bash /repo/scripts/codes/codes.sh doctor
bash /repo/scripts/codes/codes.sh install 99
bash /repo/scripts/codes/codes.sh --help
"
```

**Step 3: 验证文档**

```bash
# 检查所有链接
grep -r "scripts/" README.md | grep -v "Binary"
```

**Step 4: Commit（如有修复）**

```bash
git add .
git commit -m "test: 修复测试发现的问题"
```

---

## Task 13: 推送并更新 Gitee

**文件:**
- Git push

**Step 1: 推送到 GitHub**

```bash
git push origin main
```

**Step 2: 同步到 Gitee**

```bash
# 添加 Gitee remote（如果还没有）
git remote add gitee https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation.git

# 推送到 Gitee
git push gitee main
```

**Step 3: 验证**

访问 https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation 确认同步成功。

---

## 执行顺序

1. Task 1: 创建新目录结构
2. Task 2: 移动环境初始化脚本
3. Task 3: 移动 Codes 脚本
4. Task 4: 移动 OpenCode 脚本
5. Task 5: 更新 codes.ps1 到 v1.1
6. Task 6: 更新主安装脚本路径
7. Task 7: 创建 scripts/README.md 统一文档
8. Task 8: 创建各子目录 README
9. Task 9: 更新主 README 路径引用
10. Task 10: 删除冗余文件
11. Task 11: 更新版本号到 v1.1
12. Task 12: Docker 测试验证
13. Task 13: 推送并更新 Gitee

---

## 验收标准

- [ ] 目录结构清晰，三个工具独立存放
- [ ] scripts/README.md 作为统一文档入口
- [ ] 所有脚本路径引用正确
- [ ] codes.sh 和 codes.ps1 功能同步
- [ ] Docker 测试全部通过
- [ ] GitHub 和 Gitee 同步
