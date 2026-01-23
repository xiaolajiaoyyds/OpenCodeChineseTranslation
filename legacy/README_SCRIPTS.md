# [已废弃] OpenCode 汉化管理工具 (Legacy JS 版)

> ⚠️ **警告**: 本目录下的脚本 (`scripts/`) 是基于 Node.js/JavaScript 的旧版管理工具，现已停止维护。
> 
> 请使用根目录下的 **Go 版本 CLI 工具** (`opencode-cli`)。新版工具无需安装 Node.js 依赖，且提供更完善的功能。

---

## 历史说明

这是 OpenCode 汉化管理工具的 v7.0 版本（JavaScript 实现）。它已被 `cli-go/` 目录下的 Go 重写版本取代。

保留此目录仅为了：
1.  历史存档
2.  供需要参考旧实现逻辑的开发者查阅
3.  作为构建 OpenCode 源码的备用方案（在 CI 环境中）

## 迁移指南

如果您还在使用 `opencodenpm` 命令，请按以下步骤迁移到新版：

1.  卸载旧版全局命令：
    ```bash
    npm unlink -g opencodenpm
    ```

2.  安装新版 CLI (参见根目录 `README.md`)。

---

## (以下为原文档内容)

# OpenCode 汉化管理工具 v7.0

跨平台统一版本的 OpenCode 中文汉化管理工具。

## 功能特性

- **一键全流程**: 更新源码 → 应用汉化 → 验证 → 编译构建
- **源码管理**: 更新/恢复 OpenCode 源码
- **汉化操作**: 应用汉化配置、验证翻译覆盖率
- **编译构建**: 支持 Windows/macOS/Linux 三端编译
- **部署打包**: 全局命令部署、Release 打包

## 安装

```bash
cd scripts
npm install
```

...
