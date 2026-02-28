# 贡献指南

## 分支模型
- main：生产构建来源（推送触发生产构建工件；打 tag 触发 Release）
- develop：测试构建来源（推送触发测试构建工件）
- feat/*、fix/*、chore/*：特性分支，通过 PR 合并到 develop

## 提交规范（Conventional Commits）
提交信息格式：

`<type>(<scope>): <subject>`

允许的 type：
- feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

示例：
- feat(i18n): add new dialog translations
- fix(cli): handle missing opencode directory
- ci: add branch build workflow

## 本地质量检查
- 运行单测：
  - `cd scripts && node --test`
- 版本一致性检查：
  - `node scripts/bin/opencodenpm version --strict`

## 版本管理
版本权威来源：`opencode-i18n/config.json` 的 `version` 字段。

### 版本号格式
`{官方版本号}-zh-v{汉化版本号}`，例如 `1.2.15-zh-v2.8`

- 前半部分 `1.2.15` 必须与官方 OpenCode 版本保持同步
- 官方版本号来源：`opencode-zh-CN/packages/opencode/package.json` 的 `version` 字段
- 后半部分 `v2.8` 是汉化工具自身的迭代版本

### 需要同步版本号的文件（全部）
1. `opencode-i18n/config.json` — `version` + `opencodeVersion`
2. `package.json` — `version`
3. `package-lock.json` — `version`（两处）
4. `scripts/package.json` — `version`
5. `scripts/package-lock.json` — `version`（两处）
6. `README.md` — 标题 + 徽章（OpenCode 版本 + 汉化版本）
7. `CHANGELOG.md` — 新版本条目

### 同步时机
- 每次同步官方源码（`opencodenpm sync` / `opencodenpm update`）后，检查官方版本号是否变化
- 如果官方版本号变了，上述所有文件都要同步更新
- 汉化工具自身有功能改动时，只递增后半部分版本号（如 v2.8 → v2.9）

当你修改版本号后：
- 同步仓库包版本：
  - `node scripts/bin/opencodenpm version --sync`
- 确保 `CHANGELOG.md` 添加对应版本条目

