# 贡献指南 / Contributing Guide

感谢您考虑为 OpenCode 中文汉化项目做出贡献！

Thank you for considering contributing to the OpenCode Chinese Localization project!

---

[中文指南](#中文指南) | [English Guide](#english-guide)

---

## 中文指南

### 如何贡献

#### 1. 报告问题 (Bug Reports)

如果您发现了 Bug，请提交 Issue 并包含：

- **问题描述**：清晰描述遇到的问题
- **复现步骤**：如何触发问题
- **预期行为**：您期望发生什么
- **实际行为**：实际发生了什么
- **环境信息**：
  - 操作系统版本
  - PowerShell 版本
  - Bun 版本
  - OpenCode 版本（commit hash）

#### 2. 汉化改进

**添加新的汉化模块：**

1. 在 `opencode-i18n/` 对应目录下创建 JSON 文件
2. 添加汉化映射（注意使用上下文安全模式）

```json
{
  "file": "src/path/to/file.tsx",
  "translations": [
    {
      "source": "<b>Original Text</b>",
      "target": "<b>翻译文本</b>"
    }
  ]
}
```

3. 在 `opencode-i18n/config.json` 中注册新模块

**汉化安全原则：**

- ✅ 使用完整上下文：`"<b>Todo</b>": "<b>待办</b>"`
- ✅ 包含周围字符：`"title: \"Redo\"": "title: \"重做\""`
- ❌ 避免单词替换：`"Todo": "待办"` (会破坏 `TodoItem` 等变量名)

#### 3. 脚本优化

如果您想改进 `scripts/opencode.ps1`：

1. 遵循现有代码风格
2. 添加适当的注释
3. 测试所有受影响的功能
4. 更新相关文档

#### 4. 提交 Pull Request

1. **Fork 本仓库**
2. **创建特性分支**：`git checkout -b feature/your-feature`
3. **提交更改**：`git commit -m "feat: 添加某功能"`
4. **推送到分支**：`git push origin feature/your-feature`
5. **创建 Pull Request**

#### 提交消息格式

```
<类型>(<范围>): <简短描述>

类型选择：
- feat     新功能
- fix      修复 Bug
- docs     文档更新
- refactor 重构（不改变功能）
- style    代码风格（不影响功能）
- chore    构建/工具链相关
```

---

## English Guide

### How to Contribute

#### 1. Report Bugs

If you found a bug, please submit an issue with:

- **Description**: Clear description of the problem
- **Steps to Reproduce**: How to trigger the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment Info**:
  - OS version
  - PowerShell version
  - Bun version
  - OpenCode version (commit hash)

#### 2. Translation Improvements

**Adding new i18n modules:**

1. Create a JSON file in `opencode-i18n/` corresponding directory
2. Add translation mappings (use context-safe patterns)

```json
{
  "file": "src/path/to/file.tsx",
  "translations": [
    {
      "source": "<b>Original Text</b>",
      "target": "<b>Translated Text</b>"
    }
  ]
}
```

3. Register the new module in `opencode-i18n/config.json`

**Translation Safety Principles:**

- ✅ Use full context: `"<b>Todo</b>": "<b>待办</b>"`
- ✅ Include surrounding chars: `"title: \"Redo\"": "title: \"重做\""`
- ❌ Avoid single-word replacement: `"Todo": "待办"` (breaks `TodoItem` etc.)

#### 3. Script Optimization

If you want to improve `scripts/opencode.ps1`:

1. Follow existing code style
2. Add appropriate comments
3. Test all affected features
4. Update related documentation

#### 4. Submit Pull Request

1. **Fork** this repository
2. **Create feature branch**: `git checkout -b feature/your-feature`
3. **Commit changes**: `git commit -m "feat: add some feature"`
4. **Push to branch**: `git push origin feature/your-feature`
5. **Create Pull Request**

#### Commit Message Format

```
<type>(<scope>): <short description>

Types:
- feat     New feature
- fix      Bug fix
- docs     Documentation update
- refactor Refactoring (no functional change)
- style    Code style (no functional change)
- chore    Build/tooling related
```

---

## Code of Conduct

- 尊重所有贡献者
- 建设性讨论问题
- 欢迎新手提问

- Respect all contributors
- Discuss issues constructively
- Welcome questions from beginners

---

## Questions?

Join our discussions or open an issue!
