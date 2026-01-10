# OpenCode Linux 汉化脚本

OpenCode 中文汉化管理工具的 Linux 版本，使用 Node.js 编写。

## 功能特性

- **版本检测** - 检测脚本版本和 OpenCode 版本，支持更新提醒
- **源码拉取** - 从 Gitee 拉取最新 OpenCode 源码
- **应用汉化** - 读取 `opencode-i18n/` 配置并自动应用汉化
- **编译构建** - 调用 Bun/NPM 编译项目
- **汉化验证** - 检查汉化覆盖率

## 安装

### 方式一：使用 Codes 工具（推荐）

```bash
# 安装 Codes 工具后，自动检测平台并安装对应版本
bash -c "$(curl -fsSL https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation/raw/main/scripts/codes/install.sh)"
```

### 方式二：手动安装

```bash
# 1. 克隆仓库
git clone https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation.git
cd OpenCodeChineseTranslation

# 2. 安装依赖
cd scripts/opencode-linux
npm install

# 3. 创建全局命令（可选）
npm link
```

## 使用方法

### 交互式菜单

```bash
node scripts/opencode-linux/opencode.js
```

或安装后直接：

```bash
opencode
```

### 命令行模式

```bash
# 拉取最新源码
opencode update

# 应用汉化
opencode apply

# 编译构建
opencode build

# 验证汉化
opencode verify

# 一键全流程
opencode full
```

## 项目结构

```
scripts/opencode-linux/
├── opencode.js       # 主入口
├── package.json      # 依赖配置
└── lib/
    ├── env.js        # 环境检查
    ├── git.js        # Git 操作
    ├── i18n.js       # 汉化应用
    ├── build.js      # 编译构建
    ├── verify.js     # 验证功能
    └── version.js    # 版本检测
```

## 环境要求

- **Node.js** >= 18.0.0（必需）
- **Bun**（可选，用于更快编译）
- **Git**（必需）

## 配置目录

脚本会自动查找以下目录：

- `opencode-zh-CN/` - OpenCode 源码目录
- `opencode-i18n/` - 汉化配置目录（与 Windows 版本共享）

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 调试模式
node --inspect opencode.js
```

## License

MIT
