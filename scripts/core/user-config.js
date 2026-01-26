const fs = require("fs");
const path = require("path");
const os = require("os");
const { getPlatform, ensureDir } = require("./utils.js");

function getUserConfigPath() {
  const { isWindows } = getPlatform();
  if (isWindows) {
    return path.join(process.env.APPDATA || "", "opencodenpm", "config.json");
  }
  return path.join(os.homedir(), ".config", "opencodenpm", "config.json");
}

function loadUserConfig() {
  const configPath = getUserConfigPath();
  if (!configPath || !fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) || {};
  } catch {
    return {};
  }
}

function saveUserConfig(config) {
  const configPath = getUserConfigPath();
  ensureDir(path.dirname(configPath));
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  return configPath;
}

function applyUserConfigToEnv(options = {}) {
  const { override = false } = options;
  const config = loadUserConfig();
  const mappings = [
    ["OPENAI_API_KEY", config.openaiApiKey],
    ["OPENAI_API_BASE", config.openaiApiBase],
    ["OPENAI_MODEL", config.openaiModel],
    ["NPM_REGISTRY", config.npmRegistry],
  ];

  for (const [envKey, value] of mappings) {
    if (!value) continue;
    if (!override && process.env[envKey]) continue;
    process.env[envKey] = value;
  }
}

module.exports = {
  getUserConfigPath,
  loadUserConfig,
  saveUserConfig,
  applyUserConfigToEnv,
};

