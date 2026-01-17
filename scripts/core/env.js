/**
 * 环境检查模块 (macOS)
 */

const { hasCommand, getCommandVersion } = require('./utils.js');
const { step, success, error, warn, indent } = require('./colors.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

function checkNode() {
  try {
    const version = getCommandVersion('node', '--version');
    if (!version) return { ok: false, version: null };

    const match = version.match(/v(\d+)\.(\d+)/);
    if (!match) return { ok: false, version };

    const major = parseInt(match[1], 10);
    const ok = major >= 18;
    return { ok, version, required: '>=18.0.0' };
  } catch (e) {
    return { ok: false, version: null };
  }
}

function checkBun() {
  try {
    const version = getCommandVersion('bun', '--version');
    return { ok: !!version, version };
  } catch (e) {
    return { ok: false, version: null };
  }
}

function checkGit() {
  try {
    const version = getCommandVersion('git', '--version');
    return { ok: !!version, version };
  } catch (e) {
    return { ok: false, version: null };
  }
}

async function checkEnvironment(options = {}) {
  const { silent = false } = options;

  if (!silent) {
    step('检查编译环境');
  }

  const results = {
    node: checkNode(),
    bun: checkBun(),
    git: checkGit(),
  };

  const missing = [];

  if (!results.node.ok) {
    missing.push('Node.js (需要 >=18.0.0)');
  } else if (!silent) {
    success(`Node.js ${results.node.version}`);
  }

  if (!results.bun.ok) {
    missing.push('Bun');
  } else if (!silent) {
    success(`Bun ${results.bun.version}`);
  }

  if (!results.git.ok) {
    missing.push('Git');
  } else if (!silent) {
    success(`Git ${results.git.version}`);
  }

  if (!silent) {
    indent(`平台: macOS ARM64`, 2);
  }

  if (missing.length > 0) {
    if (!silent) {
      error(`缺少必要工具: ${missing.join(', ')}`);
      if (!results.bun?.ok) {
        indent('安装 Bun: curl -fsSL https://bun.sh/install | bash', 2);
      }
    }
    return { ok: false, missing, results };
  }

  return { ok: true, missing: [], results };
}

function getBunPath() {
  const possiblePaths = [
    path.join(os.homedir(), '.bun', 'bin', 'bun'),
    '/usr/local/bin/bun',
    '/opt/homebrew/bin/bun',
    path.join(os.homedir(), '.local', 'bin', 'bun'),
  ];

  for (const bunPath of possiblePaths) {
    if (fs.existsSync(bunPath)) {
      return bunPath;
    }
  }

  // 从 PATH 获取
  try {
    const result = require('child_process').execSync('which bun', { encoding: 'utf-8' }).trim();
    if (result) return result;
  } catch (e) {}

  return null;
}

module.exports = {
  checkNode,
  checkBun,
  checkGit,
  checkEnvironment,
  getBunPath,
};
