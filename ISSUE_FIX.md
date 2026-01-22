# 编译错误修复指南

## 问题描述

如果遇到以下编译错误：
```
error: Could not resolve: "./dialog-session - 重命名"
error: Unexpected token, expected "," (92:2)
```

## 原因

本地汉化配置文件中包含错误的翻译规则（可能是旧版本或手动修改导致）。

## 解决方案

### 方案一：重新下载最新汉化配置（推荐）

```bash
# 1. 备份当前配置
cd opencode-zh-CN
xcopy opencode-i18n opencode-i18n.backup /E /I

# 2. 删除旧的汉化配置
rmdir /S /Q opencode-i18n

# 3. 重新克隆最新版本
git clone https://github.com/xiaolajiaoyyds/OpenCodeChineseTranslation temp-i18n
xcopy temp-i18n\opencode-i18n opencode-i18n /E /I
rmdir /S /Q temp-i18n

# 4. 恢复官方源码纯净状态
cd packages\opencode
git checkout -- .

# 5. 重新执行汉化
cd ..\..
node scripts\bin\opencodenpm full
```

### 方案二：手动修复损坏的源文件

```bash
# 1. 恢复官方源码纯净状态
cd opencode-zh-CN\packages\opencode
git checkout -- src\cli\cmd\tui\component\dialog-session-list.tsx
git checkout -- src\cli\cmd\tui\routes\session\index.tsx

# 2. 重新编译
cd ..\..\..
node scripts\bin\opencodenpm build
```

### 方案三：检查并修复汉化配置

如果你修改过汉化配置，请确保：
- ❌ **不要翻译导入路径**（如 `from "./xxx"`）
- ❌ **不要翻译 TypeScript 类型定义**
- ❌ **不要翻译变量名、函数名**
- ✅ **只翻译用户可见的文本字符串**

## 预防措施

1. **定期更新汉化工具**：
   ```bash
   cd OpenCodeChineseTranslation
   git pull origin main
   ```

2. **不要手动修改 opencode-i18n 中的 JSON 文件**

3. **遇到问题时优先使用 sync 命令**：
   ```bash
   node scripts\bin\opencodenpm sync
   ```

## 联系支持

如果问题仍然存在，请提供以下信息：
- 汉化工具版本（`opencodenpm --version`）
- 错误日志
- 操作系统
