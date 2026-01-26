/**
 * CLIProxyAPI 状态显示插件
 *
 * 功能：在 OpenCode TUI 右侧边栏显示 CLIProxyAPI 的状态信息
 */

const { CLIProxyAPIClient } = require("./api.js");

const PLUGIN_INFO = {
  name: "cliproxy-status",
  displayName: "CLIProxyAPI 状态显示",
  description:
    "在 OpenCode TUI 右侧边栏显示 CLIProxyAPI 的请求状态、成功率和 Token 用量",
  version: "1.0.0",
};

/**
 * 获取插件信息
 */
function getInfo() {
  return PLUGIN_INFO;
}

/**
 * 检查插件是否可用（CLIProxyAPI 是否可连接）
 * @param {string} baseUrl - CLIProxyAPI 地址
 */
async function checkAvailability(baseUrl) {
  const client = new CLIProxyAPIClient(baseUrl);
  return client.testConnection();
}

/**
 * 格式化使用统计
 * @param {Object} usage - 使用统计数据
 */
function formatUsageStats(usage) {
  const { total_requests, success_count, failure_count, total_tokens, apis } =
    usage.usage || usage;

  const successRate =
    total_requests > 0
      ? ((success_count / total_requests) * 100).toFixed(1)
      : "0.0";

  const channels = Object.entries(apis || {}).map(([name, stats]) => ({
    name,
    requests: stats.total_requests,
    success: stats.success_count,
    failed: stats.failure_count,
    tokens: stats.tokens?.total_tokens || 0,
    successRate:
      stats.total_requests > 0
        ? ((stats.success_count / stats.total_requests) * 100).toFixed(1)
        : "0.0",
  }));

  return {
    total: {
      requests: total_requests,
      success: success_count,
      failed: failure_count,
      tokens: total_tokens,
      successRate,
    },
    channels,
  };
}

/**
 * 获取需要应用的补丁列表
 */
function getPatches() {
  return [
    {
      file: "packages/opencode/src/bus/cliproxy-event.ts",
      type: "create",
      description: "CLIProxyAPI Bus 事件定义",
    },
    {
      file: "packages/app/src/components/cliproxy-status.tsx",
      type: "create",
      description: "CLIProxyAPI 状态显示组件",
    },
    {
      file: "packages/app/src/context/global-sync.tsx",
      type: "patch",
      description: "添加 CLIProxyAPI 事件处理",
    },
    {
      file: "packages/app/src/pages/layout.tsx",
      type: "patch",
      description: "在右侧边栏添加状态组件",
    },
  ];
}

module.exports = {
  getInfo,
  checkAvailability,
  formatUsageStats,
  getPatches,
  CLIProxyAPIClient,
};
