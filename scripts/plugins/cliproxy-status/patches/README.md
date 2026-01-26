# CLIProxyAPI 状态显示补丁

## 文件说明

| 补丁文件              | 目标位置                       | 说明         |
| --------------------- | ------------------------------ | ------------ |
| `cliproxy-event.ts`   | `packages/opencode/src/bus/`   | Bus 事件定义 |
| `cliproxy-status.tsx` | `packages/app/src/components/` | 状态显示组件 |

## 手动应用步骤

1. 复制事件定义文件：

   ```bash
   cp patches/cliproxy-event.ts opencode-zh-CN/packages/opencode/src/bus/
   ```

2. 复制组件文件：

   ```bash
   cp patches/cliproxy-status.tsx opencode-zh-CN/packages/app/src/components/
   ```

3. 在 `opencode-zh-CN/packages/app/src/pages/layout.tsx` 中：

   - 添加导入：`import { CLIProxyStatusPanel } from "@/components/cliproxy-status"`
   - 在右侧边栏的 Session 信息下方添加：`<CLIProxyStatusPanel />`

4. 重新编译 OpenCode：
   ```bash
   bun run build
   ```

## 自动应用

运行 `apply-patches.js` 脚本自动应用所有补丁：

```bash
node scripts/plugins/cliproxy-status/apply-patches.js
```

## 配置要求

补丁组件会从 `~/.config/opencode/plugins.json` 读取配置：

```json
{
  "installed": {
    "cliproxy-status": {
      "baseUrl": "http://127.0.0.1:8317",
      "refreshInterval": "2000"
    }
  }
}
```

如果配置不存在或插件未启用，组件不会显示。

## 显示效果

组件会在 TUI 右侧边栏显示：

- 连接状态指示灯（绿色/红色/黄色）
- 总请求数
- 成功率
- Token 消耗
- 各渠道统计（如有）
