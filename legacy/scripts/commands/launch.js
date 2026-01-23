/**
 * launch 命令
 * 启动已编译的 OpenCode 程序
 */

const path = require('path');
const { exec } = require('../core/utils.js');
const { getBinDir, getOpencodeDir, getPlatform } = require('../core/utils.js');
const { step, success, error, skip } = require('../core/colors.js');

/**
 * 获取编译产物的路径
 */
function getBinaryPath() {
  const { platform } = getPlatform();

  // 首先检查本地 bin 目录
  const binDir = getBinDir();
  const binExt = platform === 'win32' ? '.exe' : '';
  const localBinary = path.join(binDir, `opencode${binExt}`);

  if (require('fs').existsSync(localBinary)) {
    return localBinary;
  }

  // 检查源码目录中的编译产物
  const opencodeDir = getOpencodeDir();
  const platformMap = {
    win32: 'windows-x64',
    darwin: 'darwin-arm64',
    linux: 'linux-x64',
  };
  const targetPlatform = platformMap[platform] || 'linux-x64';
  const distBinary = path.join(
    opencodeDir,
    'packages',
    'opencode',
    'dist',
    `opencode-${targetPlatform}`,
    'bin',
    `opencode${binExt}`
  );

  if (require('fs').existsSync(distBinary)) {
    return distBinary;
  }

  return null;
}

/**
 * 启动 OpenCode
 */
async function launch(options = {}) {
  const { background = false } = options;

  step('启动 OpenCode');

  const binaryPath = getBinaryPath();

  if (!binaryPath) {
    skip('未找到编译产物，请先运行 build 命令');
    return false;
  }

  try {
    const { platform } = getPlatform();

    if (platform === 'win32') {
      // Windows: 使用 start 命令启动
      if (background) {
        exec(`start "" "${binaryPath}"`, { stdio: 'ignore' });
      } else {
        exec(`"${binaryPath}"`, { stdio: 'inherit' });
      }
    } else if (platform === 'darwin') {
      // macOS: 使用 open 命令
      exec(`open "${binaryPath}"`, { stdio: background ? 'ignore' : 'inherit' });
    } else {
      // Linux: 直接运行
      if (background) {
        exec(`"${binaryPath}" &`, { stdio: 'ignore' });
      } else {
        exec(`"${binaryPath}"`, { stdio: 'inherit' });
      }
    }

    success('OpenCode 已启动');
    return true;
  } catch (e) {
    error(`启动失败: ${e.message}`);
    return false;
  }
}

module.exports = { run: launch, getBinaryPath };
