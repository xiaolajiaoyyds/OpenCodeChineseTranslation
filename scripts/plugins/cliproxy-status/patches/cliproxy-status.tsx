/**
 * CLIProxyAPI 状态显示组件
 *
 * 复制到: packages/app/src/components/cliproxy-status.tsx
 *
 * 在 layout.tsx 的右侧边栏中引入此组件
 */
import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";

interface ChannelStats {
  name: string;
  requests: number;
  success: number;
  failed: number;
  tokens: number;
  successRate: string;
}

interface CLIProxyStatus {
  connected: boolean;
  total: {
    requests: number;
    success: number;
    failed: number;
    tokens: number;
    successRate: string;
  };
  channels: ChannelStats[];
  lastUpdated: string;
}

// 从配置文件读取 CLIProxyAPI 地址
function getConfig() {
  try {
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const configPath = path.join(
      os.homedir(),
      ".config",
      "opencode",
      "plugins.json",
    );
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return config.installed?.["cliproxy-status"] || null;
    }
  } catch (e) {}
  return null;
}

export function CLIProxyStatusPanel() {
  const [status, setStatus] = createSignal<CLIProxyStatus | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [enabled, setEnabled] = createSignal(false);

  const config = getConfig();

  createEffect(() => {
    if (!config) {
      setEnabled(false);
      return;
    }

    setEnabled(true);
    const baseUrl = config.baseUrl || "http://127.0.0.1:8317";
    const refreshInterval = parseInt(config.refreshInterval) || 2000;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${baseUrl}/v0/management/usage`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const usage = data.usage || data;

        const channels = Object.entries(usage.apis || {}).map(
          ([name, stats]: [string, any]) => ({
            name,
            requests: stats.total_requests || 0,
            success: stats.success_count || 0,
            failed: stats.failure_count || 0,
            tokens: stats.tokens?.total_tokens || 0,
            successRate:
              stats.total_requests > 0
                ? ((stats.success_count / stats.total_requests) * 100).toFixed(
                    1,
                  )
                : "0.0",
          }),
        );

        setStatus({
          connected: true,
          total: {
            requests: usage.total_requests || 0,
            success: usage.success_count || 0,
            failed: usage.failure_count || 0,
            tokens: usage.total_tokens || 0,
            successRate:
              usage.total_requests > 0
                ? ((usage.success_count / usage.total_requests) * 100).toFixed(
                    1,
                  )
                : "0.0",
          },
          channels,
          lastUpdated: new Date().toISOString(),
        });
        setError(null);
      } catch (e: any) {
        setError(e.message);
        setStatus((prev) => (prev ? { ...prev, connected: false } : null));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);

    onCleanup(() => clearInterval(interval));
  });

  return (
    <Show when={enabled()}>
      <div class="px-4 py-2 border-b border-border-weak-base">
        <div class="flex items-center justify-between mb-2">
          <span class="text-12-medium text-text-strong">CLIProxyAPI</span>
          <span
            class="w-2 h-2 rounded-full"
            classList={{
              "bg-green-500": status()?.connected,
              "bg-red-500": !status()?.connected || error(),
              "bg-yellow-500": !status() && !error(),
            }}
          />
        </div>

        <Show when={error()}>
          <div class="text-11 text-red-400 mb-2">{error()}</div>
        </Show>

        <Show when={status()}>
          <div class="space-y-1 text-11">
            <div class="flex justify-between text-text-weak">
              <span>请求</span>
              <span class="text-text-base">{status()!.total.requests}</span>
            </div>
            <div class="flex justify-between text-text-weak">
              <span>成功率</span>
              <span class="text-green-400">{status()!.total.successRate}%</span>
            </div>
            <div class="flex justify-between text-text-weak">
              <span>Token</span>
              <span class="text-text-base">
                {status()!.total.tokens.toLocaleString()}
              </span>
            </div>
          </div>

          <Show when={status()!.channels.length > 0}>
            <div class="mt-2 pt-2 border-t border-border-weak-base">
              <div class="text-11 text-text-weak mb-1">渠道</div>
              <For each={status()!.channels}>
                {(channel) => (
                  <div class="flex justify-between text-11 py-0.5">
                    <span class="text-text-weak truncate max-w-[100px]">
                      {channel.name}
                    </span>
                    <span class="text-text-base">{channel.successRate}%</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </Show>
  );
}
