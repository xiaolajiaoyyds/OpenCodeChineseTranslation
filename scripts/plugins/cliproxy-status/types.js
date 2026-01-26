/**
 * CLIProxyAPI 插件类型定义
 * @module cliproxy-status/types
 */

/**
 * @typedef {Object} PluginConfig
 * @property {string} baseUrl - CLIProxyAPI 地址
 * @property {number} refreshInterval - 刷新间隔（毫秒）
 * @property {boolean} enabled - 是否启用
 */

/**
 * @typedef {Object} ChannelStats
 * @property {string} name - 渠道名称
 * @property {number} requests - 总请求数
 * @property {number} success - 成功数
 * @property {number} failed - 失败数
 * @property {number} tokens - Token 用量
 * @property {string} successRate - 成功率（百分比字符串）
 */

/**
 * @typedef {Object} FormattedStats
 * @property {Object} total - 总计统计
 * @property {number} total.requests
 * @property {number} total.success
 * @property {number} total.failed
 * @property {number} total.tokens
 * @property {string} total.successRate
 * @property {ChannelStats[]} channels - 各渠道统计
 */

module.exports = {};
