# 更新日志

---

## [6.0] - 2026-01-17

### 新增
- AI 自动翻译功能（集成到 apply 命令）
- 增量翻译：`opencodenpm apply --incremental`
- 翻译质量检查：`opencodenpm check --quality`
  - 本地语法检查（引号、花括号、标签匹配）
  - AI 语义审查
  - 自动修复语法问题
- 交互式菜单优化

### 改进
- 翻译格式统一为 `中文 (English)` 双语格式
- 语法检查支持 `{highlight}...{/highlight}` 标签
- 检查逻辑排除不完整代码片段的误报

### 修复
- 修复 28 处翻译语法问题
- 修复菜单 stdin 事件监听冲突

---

## [5.x] - 2026-01

历史版本，由原作者 [1186258278](https://github.com/1186258278) 维护。

主要功能：
- 模块化汉化配置
- PowerShell 管理脚本
- 基础验证功能

---

## 链接

- [问题反馈](https://github.com/1186258278/OpenCodeChineseTranslation/issues)
