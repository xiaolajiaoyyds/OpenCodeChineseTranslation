const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const {
  getBinDir,
  getOpencodeDir,
  getPlatform,
  ensureDir,
} = require("./utils.js");
const { success, warn, error, indent, confirmAction } = require("./colors.js");

function getBuildPlatform() {
  const { platform, arch } = getPlatform();
  const platformMap = {
    darwin: `darwin-${arch}`,
    linux: `linux-${arch}`,
    win32: arch === "arm64" ? "windows-arm64" : "windows-x64",
  };
  return platformMap[platform] || "linux-x64";
}

function checkOpencodeRunning() {
  const { isWindows } = getPlatform();
  try {
    if (isWindows) {
      const result = execSync(
        'tasklist /FI "IMAGENAME eq opencode.exe" 2>nul',
        {
          encoding: "utf8",
          stdio: "pipe",
        },
      );
      return result.includes("opencode.exe");
    } else {
      const result = execSync("pgrep -x opencode 2>/dev/null || true", {
        encoding: "utf8",
        stdio: "pipe",
      });
      return result.trim().length > 0;
    }
  } catch {
    return false;
  }
}

function killRunningOpencode() {
  const { isWindows } = getPlatform();
  try {
    if (isWindows) {
      execSync("taskkill /F /IM opencode.exe 2>nul", { stdio: "ignore" });
    } else {
      execSync("pkill -9 -x opencode 2>/dev/null || true", { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

function findExistingOpencode() {
  const { isWindows } = getPlatform();
  try {
    const cmd = isWindows ? "where opencode" : "which opencode";
    const result = execSync(cmd, { encoding: "utf8" }).trim().split("\n")[0];
    if (result && fs.existsSync(result)) return result;
  } catch {}
  return null;
}

function getDefaultInstallPath() {
  const { isWindows, isMac } = getPlatform();
  const ext = isWindows ? ".exe" : "";

  if (isWindows) {
    return path.join(process.env.APPDATA || "", "npm", `opencode${ext}`);
  }
  if (isMac) {
    if (fs.existsSync("/opt/homebrew/bin"))
      return path.join("/opt/homebrew/bin", "opencode");
    return path.join("/usr/local/bin", "opencode");
  }
  return path.join(os.homedir(), ".local", "bin", "opencode");
}

function getCompiledBinary() {
  const platform = getBuildPlatform();
  const ext = platform.startsWith("windows") ? ".exe" : "";
  const binaryName = `opencode${ext}`;

  const binDir = getBinDir();
  const localBinary = path.join(binDir, binaryName);
  if (fs.existsSync(localBinary)) return localBinary;

  const opencodeDir = getOpencodeDir();
  const distBinary = path.join(
    opencodeDir,
    "packages",
    "opencode",
    "dist",
    `opencode-${platform}`,
    "bin",
    binaryName,
  );
  if (fs.existsSync(distBinary)) return distBinary;

  warn(`未找到平台 ${platform} 的构建产物`);
  indent(`期望路径: ${distBinary}`);
  return null;
}

async function deployBinary(binaryPath) {
  const { isWindows } = getPlatform();
  const existingPath = findExistingOpencode();
  let targetPath;

  if (existingPath) {
    targetPath = existingPath;
    indent(`检测到已安装: ${existingPath}`);

    const isRunning = checkOpencodeRunning();
    if (isRunning) {
      warn("检测到 opencode 正在运行");
      const confirmed = await confirmAction(
        "部署前需要终止运行中的进程，是否继续？",
      );
      if (!confirmed) {
        indent("已取消部署");
        return null;
      }
      killRunningOpencode();
      indent("已终止正在运行的 opencode 进程");
    }
  } else {
    targetPath = getDefaultInstallPath();
    ensureDir(path.dirname(targetPath));
  }

  try {
    fs.copyFileSync(binaryPath, targetPath);
    if (!isWindows) fs.chmodSync(targetPath, 0o755);
    success(`已部署到: ${targetPath}`);
    return targetPath;
  } catch (e) {
    if (e.code === "EBUSY" || e.code === "ETXTBSY") {
      warn("文件正在被使用，尝试强制终止 opencode 进程...");
      killRunningOpencode();
      try {
        fs.copyFileSync(binaryPath, targetPath);
        if (!isWindows) fs.chmodSync(targetPath, 0o755);
        success(`已部署到: ${targetPath}`);
        return targetPath;
      } catch (e2) {
        error(`部署失败: ${e2.message}`);
        indent("请手动关闭所有 opencode 进程后重试");
        return null;
      }
    }
    if (e.code === "EACCES" || e.code === "EPERM") {
      if (isWindows) {
        error("部署失败: 权限不足");
        indent("请尝试以管理员身份运行终端 (右键 -> 以管理员身份运行)", 2);
        return null;
      }
      indent(`需要管理员权限...`);
      try {
        execSync(
          `sudo cp "${binaryPath}" "${targetPath}" && sudo chmod 755 "${targetPath}"`,
          { stdio: "inherit" },
        );
        success(`已部署到: ${targetPath}`);
        return targetPath;
      } catch {
        error("部署失败，请手动执行:");
        indent(`  sudo cp "${binaryPath}" "${targetPath}"`);
        return null;
      }
    }
    throw e;
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function deployCompiledBinary() {
  const binary = getCompiledBinary();
  if (!binary) return null;

  const target = await deployBinary(binary);
  if (!target) return null;

  let size = null;
  try {
    const stats = fs.statSync(target);
    size = formatFileSize(stats.size);
  } catch {}

  return { target, size };
}

module.exports = {
  getCompiledBinary,
  deployBinary,
  deployCompiledBinary,
  killRunningOpencode,
  checkOpencodeRunning,
};
