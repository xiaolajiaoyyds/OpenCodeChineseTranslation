# 发布与回滚

## 分支构建（main / develop）
- 触发：推送到 `main` 或 `develop`
- 产物：GitHub Actions 的 workflow artifacts
  - main：生产构建工件（OPENCODE_CHANNEL=latest）
  - develop：测试构建工件（预览版本号）

## 正式发布（tag）
### 1. 更新版本号
- 修改 `opencode-i18n/config.json` 的 `version`
- 运行：
  - `node scripts/bin/opencodenpm version --sync`

### 2. 更新更新日志
- 在 `CHANGELOG.md` 添加对应版本条目

### 3. 打 tag 并推送
- tag 必须匹配：`v<config.version>`
- 示例：`v1.1.27-zh`

推送 tag 后会触发 Release 工作流并生成多平台产物。

## 回滚
### 方式一：回退到旧版本 Release
- 从 GitHub Releases 下载目标版本的产物
- 替换系统中的 `opencode` 二进制文件

### 方式二：使用分支构建工件回滚
- 从对应 commit 的 workflow artifacts 下载产物
- 替换系统中的 `opencode` 二进制文件

