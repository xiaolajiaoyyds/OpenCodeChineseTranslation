/**
 * deploy 命令
 * 部署 opencode 到 macOS 全局
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getBinDir, getOpencodeDir } = require('../core/utils.js');
const { step, success, error, indent } = require('../core/colors.js');

/**
 * 获取编译产物路径
 */
function getCompiledBinary() {
  // 优先从 bin 目录
  const binDir = getBinDir();
  const localBinary = path.join(binDir, 'opencode');
  if (fs.existsSync(localBinary)) {
    return localBinary;
  }

  // 从源码 dist 目录
  const opencodeDir = getOpencodeDir();
  const distBinary = path.join(
    opencodeDir, 'packages', 'opencode', 'dist',
    'opencode-darwin-arm64', 'bin', 'opencode'
  );
  if (fs.existsSync(distBinary)) {
    return distBinary;
  }

  return null;
}

/**
 * 查找已安装的 opencode 位置
 */
function findExistingOpencode() {
  try {
    const result = execSync('which opencode', { encoding: 'utf8' }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch (e) {
    // 忽略
  }
  return null;
}

/**
 * 部署到 macOS
 */
function deploy(binaryPath) {
  const homebrewBin = '/opt/homebrew/bin';
  const usrLocalBin = '/usr/local/bin';

  // 检测已安装位置
  const existingPath = findExistingOpencode();
  let targetPath;

  if (existingPath) {
    targetPath = existingPath;
    indent(`检测到已安装: ${existingPath}`, 2);
  } else if (fs.existsSync(homebrewBin)) {
    targetPath = path.join(homebrewBin, 'opencode');
  } else {
    targetPath = path.join(usrLocalBin, 'opencode');
  }

  // 尝试直接复制
  try {
    fs.copyFileSync(binaryPath, targetPath);
    fs.chmodSync(targetPath, 0o755);
    success(`已部署到: ${targetPath}`);
    return targetPath;
  } catch (e) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      // 需要 sudo
      indent(`需要管理员权限...`, 2);
      try {
        execSync(`sudo cp "${binaryPath}" "${targetPath}" && sudo chmod 755 "${targetPath}"`, {
          stdio: 'inherit',
        });
        success(`已部署到: ${targetPath}`);
        return targetPath;
      } catch (sudoError) {
        error('部署失败，请手动执行:');
        indent(`sudo cp "${binaryPath}" "${targetPath}"`, 4);
        return null;
      }
    }
    throw e;
  }
}

/**
 * 主函数
 */
async function run(options = {}) {
  step('部署 opencode');

  const binaryPath = getCompiledBinary();
  if (!binaryPath) {
    error('未找到编译产物，请先运行: opencodenpm build');
    return false;
  }

  indent(`源文件: ${binaryPath}`, 2);

  try {
    const result = deploy(binaryPath);
    if (result) {
      indent('', 0);
      indent('运行 opencode 启动', 2);
    }
    return !!result;
  } catch (e) {
    error(`部署失败: ${e.message}`);
    return false;
  }
}

module.exports = { run, getCompiledBinary };
