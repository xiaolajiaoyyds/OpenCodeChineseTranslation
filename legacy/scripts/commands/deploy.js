/**
 * deploy 命令
 * 部署全局 opencode 命令到三端
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('../core/utils.js');
const { getBinDir, getOpencodeDir, getProjectDir, getPlatform } = require('../core/utils.js');
const { step, success, error, indent, warn } = require('../core/colors.js');

/**
 * 获取 opencodenpm 脚本路径
 */
function getOpencodenpmScript() {
  return path.join(getProjectDir(), 'scripts', 'bin', 'opencodenpm');
}

/**
 * 获取编译产物的路径
 */
function getCompiledBinary() {
  const { platform } = getPlatform();
  const platformMap = {
    win32: 'windows-x64',
    darwin: 'darwin-arm64',
    linux: 'linux-x64',
  };
  const targetPlatform = platformMap[platform] || 'linux-x64';
  const binExt = platform === 'win32' ? '.exe' : '';

  // 优先从 bin 目录
  const binDir = getBinDir();
  const localBinary = path.join(binDir, `opencode${binExt}`);

  if (fs.existsSync(localBinary)) {
    return localBinary;
  }

  // 从源码目录
  const opencodeDir = getOpencodeDir();
  const distBinary = path.join(
    opencodeDir,
    'packages',
    'opencode',
    'dist',
    `opencode-${targetPlatform}`,
    'bin',
    `opencode${binExt}`
  );

  if (fs.existsSync(distBinary)) {
    return distBinary;
  }

  return null;
}

/**
 * 安全复制文件（处理目标文件被占用的情况）
 */
function safeCopy(source, target) {
  // 如果目标文件存在，先尝试删除
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
    } catch (e) {
      if (e.code === 'EBUSY' || e.code === 'EPERM') {
        throw new Error('目标文件正在使用中，请先关闭所有 opencode 进程');
      }
      throw e;
    }
  }

  // 复制文件
  fs.copyFileSync(source, target);
}

/**
 * 部署单个文件到 Windows
 */
function deployFileToWindows(name, sourcePath, isNodeScript = false) {
  const npmGlobal = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm')
    : path.join(require('os').homedir(), 'AppData', 'Roaming', 'npm');

  if (!fs.existsSync(npmGlobal)) {
    fs.mkdirSync(npmGlobal, { recursive: true });
  }

  const targetName = isNodeScript ? name : `${name}.exe`;
  const targetPath = path.join(npmGlobal, targetName);

  try {
    safeCopy(sourcePath, targetPath);
  } catch (e) {
    warn(`部署 ${name} 警告: ${e.message}`);
    return null;
  }

  // 创建 CMD 包装器
  const cmdPath = path.join(npmGlobal, `${name}.cmd`);
  const cmdContent = isNodeScript
    ? `@echo off\r\nnode "%~dp0${name}" %*\r\n`
    : `@echo off\r\n"%~dp0${targetName}" %*\r\n`;

  fs.writeFileSync(cmdPath, cmdContent);

  success(`已部署 ${name}: ${targetPath}`);
  
  return { targetPath, npmGlobal };
}

/**
 * 部署单个文件到 Unix
 */
function deployFileToUnix(name, sourcePath) {
  const usrLocalBin = '/usr/local/bin';
  const homeBin = path.join(require('os').homedir(), '.local', 'bin');

  let targetDir = homeBin;
  const pathVar = process.env.PATH || '';
  
  if (!pathVar.includes(homeBin) && fs.existsSync(usrLocalBin)) {
    targetDir = usrLocalBin;
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, name);
  fs.copyFileSync(sourcePath, targetPath);
  fs.chmodSync(targetPath, 0o755);

  success(`已部署 ${name}: ${targetPath}`);
  
  return { targetPath, targetDir };
}

/**
 * 主运行函数
 */
async function run(options = {}) {
  const { platform } = getPlatform();
  const binaryPath = getCompiledBinary();
  const scriptPath = getOpencodenpmScript();
  let successCount = 0;

  step('部署全局命令');

  // 1. 部署 opencode (二进制)
  if (binaryPath) {
    indent(`部署 opencode...`, 2);
    try {
      if (platform === 'win32') {
        const res = deployFileToWindows('opencode', binaryPath, false);
        if (res) successCount++;
      } else {
        const res = deployFileToUnix('opencode', binaryPath);
        if (res) successCount++;
      }
    } catch (e) {
      error(`  部署 opencode 失败: ${e.message}`);
    }
  } else {
    warn('  未找到 opencode 编译产物，跳过部署 (请先运行 build)');
  }

  // 2. 部署 opencodenpm (脚本)
  if (fs.existsSync(scriptPath)) {
    indent(`部署 opencodenpm...`, 2);
    try {
      if (platform === 'win32') {
        const res = deployFileToWindows('opencodenpm', scriptPath, true);
        if (res) successCount++;
      } else {
        const res = deployFileToUnix('opencodenpm', scriptPath);
        if (res) successCount++;
      }
    } catch (e) {
      error(`  部署 opencodenpm 失败: ${e.message}`);
    }
  } else {
    warn('  未找到 opencodenpm 脚本，跳过部署');
  }

  if (successCount > 0) {
    indent('', 0);
    indent('现在可以使用以下命令:', 2);
    if (binaryPath) indent('  opencode      - 启动 OpenCode 编辑器', 4);
    if (fs.existsSync(scriptPath)) indent('  opencodenpm   - 启动汉化管理工具', 4);
    return true;
  }

  return false;
}

module.exports = {
  run,
  getCompiledBinary,
};
