/**
 * 通用工具模块 (macOS)
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * 获取项目根目录
 */
function getProjectDir() {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    const markerFile = path.join(currentDir, "opencode-i18n");
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
  return path.join(getProjectDir(), "opencode-zh-CN");
}

/**
 * 获取汉化配置目录
 */
function getI18nDir() {
  return path.join(getProjectDir(), "opencode-i18n");
}

/**
 * 获取 bin 目录
 */
function getBinDir() {
  return path.join(getProjectDir(), "bin");
}

/**
 * 检查命令是否存在
 */
function hasCommand(cmd) {
  const { useUnixCommands } = getPlatform();
  try {
    const checker = useUnixCommands ? "which" : "where";
    execSync(`${checker} ${cmd}`, { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取命令版本
 */
function getCommandVersion(cmd, versionFlag = "--version") {
  try {
    return execSync(`${cmd} ${versionFlag}`, { encoding: "utf-8" }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * 执行命令并返回输出
 */
function exec(command, options = {}) {
  const { cwd, stdio = "pipe", ...rest } = options;
  try {
    return execSync(command, {
      cwd,
      stdio,
      encoding: "utf-8",
      shell: true,
      ...rest,
    });
  } catch (e) {
    throw new Error(`命令执行失败: ${command}\n${e.message}`);
  }
}

/**
 * 异步执行命令（带实时输出）
 * @param {string} command - 命令
 * @param {string[]} args - 参数
 * @param {object} options - 选项
 * @param {boolean} options.silent - 静默模式，不输出 stdout/stderr
 */
function execLive(command, args, options = {}) {
  const { silent = false, timeoutMs = 0, ...spawnOptions } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: silent ? "pipe" : "inherit",
      ...spawnOptions,
    });

    let captured = "";
    let timeoutId = null;
    if (silent) {
      const append = (chunk) => {
        if (!chunk) return;
        captured += chunk.toString("utf-8");
        if (captured.length > 20000) captured = captured.slice(-20000);
      };
      if (child.stdout) child.stdout.on("data", append);
      if (child.stderr) child.stderr.on("data", append);
    }

    if (timeoutMs && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {}
        if (silent && captured.trim()) {
          reject(
            new Error(
              `进程超时（${timeoutMs}ms）\n` +
                `输出片段（末尾）：\n` +
                captured.trim(),
            ),
          );
        } else {
          reject(new Error(`进程超时（${timeoutMs}ms）`));
        }
      }, timeoutMs);
    }

    child.on("close", (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (code === 0) {
        resolve();
      } else {
        if (silent && captured.trim()) {
          reject(
            new Error(
              `进程退出，代码: ${code}\n` +
                `输出片段（末尾）：\n` +
                captured.trim(),
            ),
          );
        } else {
          reject(new Error(`进程退出，代码: ${code}`));
        }
      }
    });

    child.on("error", reject);
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
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * 写入 JSON 文件
 */
function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
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

/**
 * 检测是否在 Git Bash 环境下运行
 * Git Bash 下 process.platform 仍是 'win32'，但需要使用 Unix 风格的命令
 */
function isGitBash() {
  // Git Bash 设置 MSYSTEM 环境变量
  if (process.env.MSYSTEM) return true;
  // Git Bash 通常设置 SHELL 为 /bin/bash 或类似
  if (process.env.SHELL && process.env.SHELL.includes('/')) return true;
  // Git Bash 设置 TERM 为 xterm 或类似
  if (process.env.TERM && process.env.TERM !== 'dumb') {
    // 在 CMD/PowerShell 下通常没有 TERM 或是 dumb
    if (process.env.TERM.startsWith('xterm') || process.env.TERM === 'cygwin') return true;
  }
  return false;
}

/**
 * 获取当前平台信息
 */
function getPlatform() {
  const platform = process.platform; // 'darwin' | 'linux' | 'win32'
  const arch = process.arch; // 'arm64' | 'x64'
  const gitBash = platform === 'win32' && isGitBash();
  return {
    platform,
    arch,
    isWindows: platform === "win32",
    isMac: platform === "darwin",
    isLinux: platform === "linux",
    isArm64: arch === "arm64",
    isGitBash: gitBash,
    // 在 Git Bash 下使用 Unix 风格的命令
    useUnixCommands: platform !== 'win32' || gitBash,
  };
}

/**
 * 获取 OpenCode 配置文件路径（跨平台）
 */
function getOpencodeConfigPath() {
  const { isWindows } = getPlatform();
  if (isWindows) {
    return path.join(process.env.APPDATA || "", "opencode", "opencode.json");
  }
  return path.join(os.homedir(), ".config", "opencode", "opencode.json");
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
  getPlatform,
  getOpencodeConfigPath,
};
