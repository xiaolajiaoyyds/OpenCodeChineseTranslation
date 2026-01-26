/**
 * CLIProxyAPI 状态事件定义
 *
 * 复制到: packages/opencode/src/bus/cliproxy-event.ts
 */
import z from "zod";
import { BusEvent } from "./bus-event";

export const CLIProxyStatusUpdated = BusEvent.define(
  "cliproxy.status.updated",
  z.object({
    connected: z.boolean(),
    total: z.object({
      requests: z.number(),
      success: z.number(),
      failed: z.number(),
      tokens: z.number(),
      successRate: z.string(),
    }),
    channels: z.array(
      z.object({
        name: z.string(),
        requests: z.number(),
        success: z.number(),
        failed: z.number(),
        tokens: z.number(),
        successRate: z.string(),
      }),
    ),
    lastUpdated: z.string(),
  }),
);
