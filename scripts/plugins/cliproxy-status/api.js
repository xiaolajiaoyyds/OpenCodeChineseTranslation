/**
 * CLIProxyAPI Management API 封装
 */

/**
 * @typedef {Object} TokenStats
 * @property {number} input_tokens
 * @property {number} output_tokens
 * @property {number} reasoning_tokens
 * @property {number} cached_tokens
 * @property {number} total_tokens
 */

/**
 * @typedef {Object} APISnapshot
 * @property {number} total_requests
 * @property {number} success_count
 * @property {number} failure_count
 * @property {TokenStats} tokens
 */

/**
 * @typedef {Object} UsageStatistics
 * @property {number} total_requests
 * @property {number} success_count
 * @property {number} failure_count
 * @property {number} total_tokens
 * @property {Object.<string, APISnapshot>} apis
 */

class CLIProxyAPIClient {
  constructor(baseUrl = "http://127.0.0.1:8317") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getUsage() {
    const response = await fetch(`${this.baseUrl}/v0/management/usage`);
    if (!response.ok) {
      throw new Error(`Failed to fetch usage: ${response.status}`);
    }
    return response.json();
  }

  async getLogs(limit = 50, after = null) {
    let url = `${this.baseUrl}/v0/management/logs?limit=${limit}`;
    if (after) {
      url += `&after=${after}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }
    return response.json();
  }

  async testConnection() {
    try {
      await this.getUsage();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = { CLIProxyAPIClient };
