/**
 * 通用工具模块 (macOS)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 获取项目根目录
 */
function getProjectDir() {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    const markerFile = path.join(currentDir, 'opencode-i18n');
    if (fs.existsSync(markerFile)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return path.dirname(__dirname);
}

/**
 * 获取 OpenCode 源码目录
 */
function getOpencodeDir() {
  return path.join(getProjectDir(), 'opencode-zh-CN');
}

/**
 * 获取汉化配置目录
 */
function getI18nDir() {
  return path.join(getProjectDir(), 'opencode-i18n');
}

/**
 * 获取 bin 目录
 */
function getBinDir() {
  return path.join(getProjectDir(), 'bin');
}

/**
 * 检查命令是否存在
 */
function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取命令版本
 */
function getCommandVersion(cmd, versionFlag = '--version') {
  try {
    return execSync(`${cmd} ${versionFlag}`, { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * 执行命令并返回输出
 */
function exec(command, options = {}) {
  const { cwd, stdio = 'pipe', ...rest } = options;
  try {
    return execSync(command, {
      cwd,
      stdio,
      encoding: 'utf-8',
      shell: true,
      ...rest,
    });
  } catch (e) {
    throw new Error(`命令执行失败: ${command}\n${e.message}`);
  }
}

/**
 * 异步执行命令（带实时输出）
 */
function execLive(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`进程退出，代码: ${code}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * 检查路径是否存在
 */
function exists(targetPath) {
  return fs.existsSync(targetPath);
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 删除文件/目录
 */
function remove(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

/**
 * 复制文件
 */
function copy(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/**
 * 读取 JSON 文件
 */
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 写入 JSON 文件
 */
function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 延迟执行
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 获取用户主目录
 */
function getHomeDir() {
  return os.homedir();
}

module.exports = {
  getProjectDir,
  getOpencodeDir,
  getI18nDir,
  getBinDir,
  hasCommand,
  getCommandVersion,
  exec,
  execLive,
  exists,
  ensureDir,
  remove,
  copy,
  readJSON,
  writeJSON,
  formatSize,
  sleep,
  getHomeDir,
};
