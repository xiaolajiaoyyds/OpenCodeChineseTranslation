/**
 * 版本管理模块
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectDir, getOpencodeDir, readJSON } = require('./utils.js');

/**
 * 版本配置文件路径
 */
const VERSION_FILE = path.join(getProjectDir(), 'opencode-i18n', 'config.json');

/**
 * 读取版本配置
 */
function getVersionConfig() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return readJSON(VERSION_FILE);
    }
  } catch (e) {
    // 忽略错误
  }

  // 默认配置
  return {
    version: '1.0.0',
    opencodeVersion: 'main',
    supportedCommit: null,
  };
}

/**
 * 获取当前版本号
 */
function getVersion() {
  const config = getVersionConfig();
  return config.version;
}

/**
 * 获取 OpenCode 目标版本/提交
 */
function getOpencodeVersion() {
  const config = getVersionConfig();
  return config.opencodeVersion || 'main';
}

/**
 * 获取支持的提交哈希
 */
function getSupportedCommit() {
  const config = getVersionConfig();
  return config.supportedCommit || null;
}

/**
 * 格式化版本号（带 v 前缀）
 */
function formatVersion(version) {
  return version.startsWith('v') ? version : `v${version}`;
}

/**
 * 从 Git 提交数生成版本号
 */
function generateVersionFromCount(count, baseVersion = '5.6') {
  return `${baseVersion}.${count}`;
}

/**
 * 解析版本号
 */
function parseVersion(version) {
  // 移除 v 前缀
  const cleanVersion = version.replace(/^v/, '');

  // 匹配 semver 格式
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null,
      formatted: cleanVersion,
    };
  }

  // 匹配简化格式 (如 5.6.123)
  const simpleMatch = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (simpleMatch) {
    return {
      major: parseInt(simpleMatch[1], 10),
      minor: parseInt(simpleMatch[2], 10),
      patch: parseInt(simpleMatch[3], 10),
      prerelease: null,
      formatted: cleanVersion,
    };
  }

  return null;
}

/**
 * 保存版本配置
 */
function saveVersionConfig(config) {
  try {
    // 读取现有配置
    let existing = {};
    if (fs.existsSync(VERSION_FILE)) {
      existing = readJSON(VERSION_FILE);
    }
    
    // 合并配置
    const merged = { ...existing, ...config };
    
    // 写入文件
    fs.writeFileSync(VERSION_FILE, JSON.stringify(merged, null, 4), 'utf-8');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 从 OpenCode 源码获取官方版本号
 * 读取 package.json 或 git tag
 */
function fetchOpencodeVersion() {
  const opencodeDir = getOpencodeDir();
  
  if (!fs.existsSync(opencodeDir)) {
    return null;
  }
  
  try {
    // 方式1: 读取 package.json
    const pkgPath = path.join(opencodeDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = readJSON(pkgPath);
      if (pkg.version) {
        return pkg.version;
      }
    }
    
    // 方式2: 读取 go.mod 或其他版本文件
    const versionFile = path.join(opencodeDir, 'internal', 'version', 'version.go');
    if (fs.existsSync(versionFile)) {
      const content = fs.readFileSync(versionFile, 'utf-8');
      const match = content.match(/Version\s*=\s*["']([^"']+)["']/);
      if (match) {
        return match[1];
      }
    }
    
    // 方式3: 从 git describe 获取
    const gitVersion = execSync('git describe --tags --abbrev=0 2>/dev/null || git rev-parse --short HEAD', {
      cwd: opencodeDir,
      encoding: 'utf-8',
    }).trim();
    
    return gitVersion || null;
  } catch (e) {
    return null;
  }
}

/**
 * 获取当前 OpenCode 源码的 commit hash
 */
function fetchOpencodeCommit() {
  const opencodeDir = getOpencodeDir();
  
  if (!fs.existsSync(opencodeDir)) {
    return null;
  }
  
  try {
    const commit = execSync('git rev-parse HEAD', {
      cwd: opencodeDir,
      encoding: 'utf-8',
    }).trim();
    return commit;
  } catch (e) {
    return null;
  }
}

/**
 * 更新官方版本信息（在 sync 后调用）
 */
function updateOpencodeVersion() {
  const version = fetchOpencodeVersion();
  const commit = fetchOpencodeCommit();
  
  const updates = {
    lastUpdate: new Date().toISOString().split('T')[0],
  };
  
  if (version) {
    updates.opencodeVersion = version;
  }
  
  if (commit) {
    updates.supportedCommit = commit;
  }
  
  return saveVersionConfig(updates);
}

/**
 * 比较版本号
 * @returns {number} -1: v1 < v2, 0: v1 == v2, 1: v1 > v2
 */
function compareVersions(v1, v2) {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  if (!parsed1 || !parsed2) return 0;

  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }

  // 预发布版本比较
  if (parsed1.prerelease && parsed2.prerelease) {
    return parsed1.prerelease.localeCompare(parsed2.prerelease);
  }
  if (parsed1.prerelease) return -1;
  if (parsed2.prerelease) return 1;

  return 0;
}

module.exports = {
  getVersionConfig,
  getVersion,
  getOpencodeVersion,
  getSupportedCommit,
  formatVersion,
  generateVersionFromCount,
  parseVersion,
  compareVersions,
  saveVersionConfig,
  fetchOpencodeVersion,
  fetchOpencodeCommit,
  updateOpencodeVersion,
};
