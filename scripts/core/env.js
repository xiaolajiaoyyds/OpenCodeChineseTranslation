/**
 * 环境检查模块（跨平台）
 * 支持 Windows CMD/PowerShell、Git Bash、macOS、Linux
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  hasCommand,
  getCommandVersion,
  getPlatform,
  getOpencodeDir,
  getBinDir,
  execLive,
} = require("./utils.js");
const { step, success, error, warn, indent, createSpinner } = require("./colors.js");

// 要求的 Bun 版本（不超过此版本）
const REQUIRED_BUN_VERSION = "1.3.5";

/**
 * 检查 Node.js 版本
 */
function checkNode() {
  try {
    const version = getCommandVersion("node", "--version");
    if (!version) return { ok: false, version: null };

    const match = version.match(/v(\d+)\.(\d+)/);
    if (!match) return { ok: false, version };

    const major = parseInt(match[1], 10);
    const ok = major >= 18;
    return { ok, version, required: ">=18.0.0" };
  } catch (e) {
    return { ok: false, version: null };
  }
}

/**
 * 检查 Bun
 */
function checkBun() {
  try {
    const version = getCommandVersion("bun", "--version");
    if (!version) return { ok: false, version: null };

    const isCorrectVersion = version === REQUIRED_BUN_VERSION;
    return {
      ok: true,
      version,
      isCorrectVersion,
      required: REQUIRED_BUN_VERSION,
    };
  } catch (e) {
    return { ok: false, version: null };
  }
}

/**
 * 检查 Git
 */
function checkGit() {
  try {
    const raw = getCommandVersion("git", "--version");
    if (!raw) return { ok: false, version: null };
    const match = raw.match(/(\d+\.\d+\.\d+)/);
    const version = match ? match[1] : raw;
    return { ok: true, version };
  } catch (e) {
    return { ok: false, version: null };
  }
}

/**
 * 查找 OpenCode 安装路径
 */
function findInstalledOpencode() {
  const { isWindows, useUnixCommands } = getPlatform();
  try {
    const cmd = useUnixCommands ? "which opencode" : "where opencode";
    const result = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    })
      .trim()
      .split("\n")[0];
    if (result && fs.existsSync(result)) {
      return { installed: true, path: result };
    }
  } catch (e) {}
  return { installed: false, path: null };
}

/**
 * 检测 opencode 是否正在运行
 */
function isOpencodeRunning() {
  const { isWindows } = getPlatform();
  try {
    if (isWindows) {
      const result = execSync('tasklist /FI "IMAGENAME eq opencode.exe" /FO CSV 2>nul', {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const lines = result.trim().split("\n").slice(1);
      const processes = lines
        .filter((line) => line.includes("opencode.exe"))
        .map((line) => {
          const parts = line.split(",");
          return { pid: parts[1]?.replace(/"/g, ""), command: "opencode.exe" };
        });
      return { running: processes.length > 0, processes };
    } else {
      const result = execSync("ps -eo pid,command | grep -E '^\\s*[0-9]+\\s+opencode' | grep -v grep", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const lines = result.trim().split("\n").filter(Boolean);
      const processes = lines.map((line) => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
          return { pid: match[1], command: match[2] };
        }
        return null;
      }).filter(Boolean);
      return { running: processes.length > 0, processes };
    }
  } catch (e) {
    return { running: false, processes: [] };
  }
}

/**
 * 获取硬件信息
 */
function getHardwareModel() {
  const { isMac, isLinux, isWindows } = getPlatform();
  try {
    if (isMac) {
      const model = execSync("sysctl -n hw.model", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
      const chip = execSync("sysctl -n machdep.cpu.brand_string", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
      return { model, chip };
    }
    if (isLinux) {
      let model = "Linux";
      try {
        model = fs.readFileSync("/sys/devices/virtual/dmi/id/product_name", "utf8").trim();
      } catch (e) {
        try {
          const osRelease = fs.readFileSync("/etc/os-release", "utf8");
          const match = osRelease.match(/PRETTY_NAME="([^"]+)"/);
          if (match) model = match[1];
        } catch (e2) {}
      }
      return { model, chip: os.cpus()[0]?.model || "" };
    }
    if (isWindows) {
      const model = execSync("wmic computersystem get model", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })
        .split("\n")[1]?.trim() || "Windows PC";
      return { model, chip: os.cpus()[0]?.model || "" };
    }
  } catch (e) {}
  return { model: null, chip: null };
}

/**
 * 将 bun 目录加入 PATH（当前进程）
 */
function addBunToPath() {
  const { isWindows } = getPlatform();
  const bunDirs = isWindows
    ? [
        path.join(process.env.LOCALAPPDATA || "", "bun", "bin"),
        path.join(os.homedir(), ".bun", "bin"),
      ]
    : [
        path.join(os.homedir(), ".bun", "bin"),
        "/usr/local/bin",
        "/opt/homebrew/bin",
        path.join(os.homedir(), ".local", "bin"),
      ];

  for (const dir of bunDirs) {
    if (fs.existsSync(dir) && !process.env.PATH.includes(dir)) {
      process.env.PATH = `${dir}${path.delimiter}${process.env.PATH}`;
    }
  }
}

/**
 * 安装 Bun（指定版本）
 * @param {object} options
 * @param {boolean} options.silent - 静默模式
 * @returns {Promise<boolean>} 安装是否成功
 */
async function installBun(options = {}) {
  const { silent = false } = options;
  const { isWindows, isGitBash } = getPlatform();

  const spinner = createSpinner(`正在安装 Bun v${REQUIRED_BUN_VERSION}`);
  if (!silent) spinner.start();

  try {
    // 先将 bun 目录加入 PATH
    addBunToPath();

    if (isWindows && !isGitBash) {
      // Windows CMD/PowerShell
      await execLive(
        `powershell -Command "$env:BUN_INSTALL = [Environment]::GetFolderPath('UserProfile') + '\\.bun'; ` +
        `$env:BUN_VERSION = '${REQUIRED_BUN_VERSION}'; ` +
        `iwr bun.sh/install.ps1 -useb | iex"`,
        { silent: true, shell: true }
      );
    } else {
      // macOS / Linux / Git Bash
      await execLive(
        `curl -fsSL https://bun.sh/install | bash -s "bun-v${REQUIRED_BUN_VERSION}"`,
        { silent: true, shell: true }
      );
    }

    // 再次确保 PATH 包含 bun
    addBunToPath();

    // 验证安装
    const bunCheck = checkBun();
    if (bunCheck.ok) {
      if (!silent) spinner.stop(`Bun v${bunCheck.version} 安装成功`);
      return true;
    } else {
      if (!silent) spinner.fail("安装完成但验证失败，请重新打开终端后重试");
      return false;
    }
  } catch (e) {
    if (!silent) spinner.fail(`Bun 安装失败: ${e.message}`);
    return false;
  }
}

/**
 * 确保 Bun 可用（检测 + 自动安装）
 * 始终返回命令名 "bun"，避免路径格式问题
 * @param {object} options
 * @param {boolean} options.silent - 静默模式
 * @param {boolean} options.autoInstall - 是否自动安装（默认 true）
 * @returns {Promise<{ok: boolean, version: string|null, path: string|null}>}
 */
async function ensureBun(options = {}) {
  const { silent = false, autoInstall = true } = options;

  // 1. 先将可能的 bun 目录加入 PATH
  addBunToPath();

  // 2. 检测 bun
  let bunCheck = checkBun();

  // 3. 处理检测结果
  if (bunCheck.ok) {
    if (bunCheck.isCorrectVersion) {
      // 版本正确
      return { ok: true, version: bunCheck.version, path: "bun" };
    } else {
      // 版本不匹配
      if (!silent) {
        warn(`Bun 版本 ${bunCheck.version}，需要 ${REQUIRED_BUN_VERSION}`);
      }
      if (autoInstall) {
        if (!silent) warn("正在安装指定版本...");
        const installed = await installBun({ silent });
        if (installed) {
          return { ok: true, version: REQUIRED_BUN_VERSION, path: "bun" };
        }
      }
      // 版本不对但可尝试使用
      if (!silent) warn("将使用当前版本，可能导致构建失败");
      return { ok: true, version: bunCheck.version, path: "bun" };
    }
  } else {
    // 没有 bun
    if (autoInstall) {
      if (!silent) warn("未检测到 Bun，正在自动安装...");
      const installed = await installBun({ silent });
      if (installed) {
        return { ok: true, version: REQUIRED_BUN_VERSION, path: "bun" };
      }
    }
    return { ok: false, version: null, path: null };
  }
}

/**
 * 获取 bun 命令（确保可用）
 * @returns {Promise<string|null>} 始终返回 "bun" 或 null
 */
async function getBunPath() {
  const result = await ensureBun();
  return result.ok ? "bun" : null;
}

/**
 * 完整的环境检查
 */
async function checkEnvironment(options = {}) {
  const { silent = false, autoInstall = true } = options;

  if (!silent) {
    step("检查编译环境");
  }

  const results = {
    node: checkNode(),
    bun: checkBun(),
    git: checkGit(),
  };

  const missing = [];

  // Node.js
  if (!results.node.ok) {
    missing.push("Node.js (需要 >=18.0.0)");
  } else if (!silent) {
    success(`Node.js ${results.node.version}`);
  }

  // Bun - 支持自动安装
  if (!results.bun.ok) {
    if (autoInstall) {
      const bunResult = await ensureBun({ silent });
      if (bunResult.ok) {
        results.bun = { ok: true, version: bunResult.version, isCorrectVersion: true };
        if (!silent) success(`Bun ${bunResult.version} (已自动安装)`);
      } else {
        missing.push("Bun");
      }
    } else {
      missing.push("Bun");
    }
  } else if (!silent) {
    if (results.bun.isCorrectVersion) {
      success(`Bun ${results.bun.version}`);
    } else {
      warn(`Bun ${results.bun.version} (需要 ${REQUIRED_BUN_VERSION})`);
      if (autoInstall) {
        const bunResult = await ensureBun({ silent });
        if (bunResult.ok && bunResult.version === REQUIRED_BUN_VERSION) {
          success(`Bun ${REQUIRED_BUN_VERSION} (已自动安装)`);
          results.bun.version = REQUIRED_BUN_VERSION;
          results.bun.isCorrectVersion = true;
        }
      }
    }
  }

  // Git
  if (!results.git.ok) {
    missing.push("Git");
  } else if (!silent) {
    success(`Git ${results.git.version}`);
  }

  // 平台信息
  if (!silent) {
    const { platform, arch } = getPlatform();
    const platformNames = { darwin: "macOS", linux: "Linux", win32: "Windows" };
    const hw = getHardwareModel();
    const platformStr = `${platformNames[platform] || platform} ${arch}`;
    const modelStr = hw.model ? ` (${hw.model})` : "";
    indent(`平台: ${platformStr}${modelStr}`, 2);

    const opencode = findInstalledOpencode();
    const runningInfo = isOpencodeRunning();
    if (opencode.installed) {
      success(`OpenCode 已安装${runningInfo.running ? " (运行中)" : ""}`);
      indent(`路径: ${opencode.path}`, 2);
    } else {
      warn("OpenCode 未安装，完成构建后运行: opencodenpm deploy");
    }
  }

  if (missing.length > 0) {
    if (!silent) {
      error(`缺少必要工具: ${missing.join(", ")}`);
    }
    return { ok: false, missing, results };
  }

  return { ok: true, missing: [], results };
}

module.exports = {
  checkNode,
  checkBun,
  checkGit,
  checkEnvironment,
  ensureBun,
  getBunPath,
  installBun,
  isOpencodeRunning,
  findInstalledOpencode,
  addBunToPath,
  REQUIRED_BUN_VERSION,
};
