# 贡献指南

感谢您考虑为 OpenCode 中文汉化项目做出贡献！

---

## 如何贡献

### 报告问题

提交 Issue 时请包含：

- 问题描述
- 复现步骤
- 环境信息（OS、Node.js 版本）

### 添加翻译

1. 在 `opencode-i18n/` 对应目录创建或编辑 JSON 文件
2. 遵循翻译格式：

```json
{
  "file": "src/path/to/file.tsx",
  "replacements": {
    "\"Original\"": "\"中文 (Original)\""
  }
}
```

3. 运行质量检查：`opencodenpm check --quality`

### 翻译原则

- 保持 `中文 (English)` 双语格式
- 保留代码中的变量、标签、占位符
- 不翻译函数名、变量名

### 提交 PR

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交更改：`git commit -m "feat: 添加xxx"`
4. 推送并创建 PR

---

## 提交格式

```
<类型>: <描述>

类型：feat/fix/docs/refactor/chore
```

---

## 行为准则

- 尊重所有贡献者
- 欢迎新手提问
