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

当你修改版本号后：
- 同步仓库包版本：
  - `node scripts/bin/opencodenpm version --sync`
- 确保 `CHANGELOG.md` 添加对应版本条目

