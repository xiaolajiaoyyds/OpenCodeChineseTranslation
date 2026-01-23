/**
 * helper 命令
 * 安装/启动智谱编码助手 (coding-helper)
 */

const { exec } = require('../core/utils.js');
const { step, success, error, warn, skip } = require('../core/colors.js');
const { spawn } = require('child_process');

/**
 * 检查是否已安装
 */
function isInstalled() {
  try {
    const { execSync } = require('child_process');
    // 检查 chelper 或 coding-helper 命令
    execSync('chelper --version', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      const { execSync } = require('child_process');
      execSync('coding-helper --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 安装智谱助手
 */
async function install(options = {}) {
  const { force = false, registry = null } = options;

  step('安装智谱编码助手 (@z_ai/coding-helper)');

  if (isInstalled() && !force) {
    skip('coding-helper 已安装，使用 --force 强制重装');
    return true;
  }

  try {
    // 构建安装命令
    let cmd = 'npm install -g @z_ai/coding-helper';
    if (registry) {
      cmd += ` --registry=${registry}`;
    }

    exec(cmd, { stdio: 'inherit' });

    success('coding-helper 安装成功');
    return true;
  } catch (e) {
    error(`安装失败: ${e.message}`);
    return false;
  }
}

/**
 * 启动智谱助手
 */
async function launch(args = []) {
  step('启动智谱编码助手');

  if (!isInstalled()) {
    error('coding-helper 未安装，请先运行: opencodenpm helper install');
    return false;
  }

  try {
    // 查找命令
    const command = findCommand();

    // 使用 spawn 启动，传递所有参数
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    return true;
  } catch (e) {
    error(`启动失败: ${e.message}`);
    return false;
  }
}

/**
 * 查找命令
 */
function findCommand() {
  try {
    const { execSync } = require('child_process');
    // 优先使用 chelper
    execSync('chelper --version', { stdio: 'pipe' });
    return 'chelper';
  } catch {
    return 'coding-helper';
  }
}

/**
 * 获取版本信息
 */
function getVersion() {
  if (!isInstalled()) {
    return null;
  }

  try {
    const { execSync } = require('child_process');
    const command = findCommand();
    const version = execSync(`${command} --version`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
    return version;
  } catch {
    return null;
  }
}

/**
 * 主运行函数
 */
async function run(options = {}) {
  const args = options._ || [];

  if (args.length === 0 || args[0] === 'install') {
    return await install(options);
  }

  if (args[0] === 'start' || args[0] === 'run') {
    return await launch(args.slice(1));
  }

  // 其他命令直接转发给 coding-helper
  return await launch(args);
}

module.exports = {
  run,
  install,
  launch,
  isInstalled,
  getVersion,
  findCommand,
};
