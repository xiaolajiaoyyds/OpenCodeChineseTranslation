/**
 * 构建工具模块（跨平台）
 */

const path = require("path");
const fs = require("fs");
const {
  execLive,
  getOpencodeDir,
  exists,
  formatSize,
  getI18nDir,
  getBinDir,
  getPlatform,
} = require("./utils.js");
const { ensureBun, addBunToPath, getRequiredBunVersion } = require("./env.js");
const { loadUserConfig } = require("./user-config.js");
const {
  step,
  success,
  error,
  warn,
  indent,
  nestedStep,
  nestedSuccess,
  nestedWarn,
  nestedError,
  nestedContent,
  createSpinner,
} = require("./colors.js");

function getBuildPlatform() {
  const { platform, arch } = getPlatform();
  const platformMap = {
    darwin: `darwin-${arch}`,
    linux: `linux-${arch}`,
    win32: arch === "arm64" ? "windows-arm64" : "windows-x64",
  };
  return platformMap[platform] || "linux-x64";
}

/**
 * 获取汉化版本号
 */
function getChineseVersion() {
  try {
    const pkgPath = path.join(
      getOpencodeDir(),
      "packages",
      "opencode",
      "package.json",
    );
    if (exists(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.version) {
        return `${pkg.version}-zh`;
      }
    }
  } catch (e) {}
  return null;
}

class Builder {
  constructor() {
    this.opencodeDir = getOpencodeDir();
    this.buildDir = path.join(this.opencodeDir, "packages", "opencode");
    this.bunPath = null;
  }

  /**
   * 确保 Bun 可用（检测 + 自动安装）
   * 始终使用 "bun" 命令，避免路径格式问题
   */
  async initBun() {
    if (this.bunPath) return this.bunPath;

    // 先确保 PATH 包含 bun
    addBunToPath();

    const result = await ensureBun();
    if (!result.ok) {
      const requiredVersion = getRequiredBunVersion();
      throw new Error(
        `无法获取 Bun，请手动安装 v${requiredVersion} 后重试\n` +
          `  安装命令: curl -fsSL https://bun.sh/install | bash -s "bun-v${requiredVersion}"`,
      );
    }

    // 始终使用 "bun" 命令，让系统从 PATH 中查找
    this.bunPath = "bun";
    return this.bunPath;
  }

  async checkEnvironment() {
    await this.initBun();
    if (!exists(this.buildDir)) {
      throw new Error(
        `构建目录不存在: ${this.buildDir}\n请先运行: opencodenpm sync`,
      );
    }
  }

  async installDependencies(options = {}) {
    const { silent = false, force = false, nested = false } = options;
    const outputStep = nested ? nestedStep : step;
    const outputWarn = nested ? nestedWarn : warn;
    const outputError = nested ? nestedError : error;
    const outputSuccess = nested ? nestedSuccess : success;
    const outputContent = nested ? nestedContent : (m) => indent(m, 2);

    if (!silent && !nested) outputStep("安装依赖");

    await this.initBun();
    const config = loadUserConfig();
    const registry = config.npmRegistry;

    // 从 package.json 动态读取所有 dependencies，自动检测缺失
    const pkgNodeModules = path.join(this.buildDir, "node_modules");
    const rootNodeModules = path.join(this.opencodeDir, "node_modules");
    let hasDeps = false;
    let missingDeps = [];
    try {
      const pkgJsonPath = path.join(this.buildDir, "package.json");
      if (exists(pkgJsonPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const deps = pkgJson.dependencies || {};
        // workspace: 是内部包不检查；catalog: 和普通版本号都是外部包需要检查
        const externalDeps = Object.keys(deps).filter(
          (dep) =>
            typeof deps[dep] === "string" &&
            !deps[dep].startsWith("workspace:"),
        );
        missingDeps = externalDeps.filter(
          (dep) =>
            !exists(path.join(pkgNodeModules, dep)) &&
            !exists(path.join(rootNodeModules, dep)),
        );
        hasDeps =
          exists(pkgNodeModules) &&
          externalDeps.length > 0 &&
          missingDeps.length === 0;
      }
    } catch (e) {
      // 读取 package.json 失败，视为依赖不完整
      hasDeps = false;
    }

    if (hasDeps && !force) {
      if (!silent) {
        if (nested) {
          outputContent("依赖完整，跳过安装");
        } else {
          outputWarn("依赖完整，跳过安装（使用 --force 强制重装）");
        }
      }
      return true;
    }

    // 有缺失依赖时提示具体包名
    if (missingDeps.length > 0 && !silent) {
      const preview = missingDeps.slice(0, 5).join(", ");
      const suffix = missingDeps.length > 5 ? ` 等 ${missingDeps.length} 个` : "";
      outputWarn(`检测到依赖缺失: ${preview}${suffix}，将自动安装`);
    }

    // workspace 项目需要在根目录安装依赖
    const installCwd = this.opencodeDir;

    // 安装策略：先尝试 --frozen-lockfile，失败后降级为普通 install（应对上游更新 lockfile 不同步）
    const installAttempts = [
      { args: ["install", "--frozen-lockfile"], label: "frozen-lockfile" },
      { args: ["install"], label: "常规安装" },
    ];

    for (let i = 0; i < installAttempts.length; i++) {
      const attempt = installAttempts[i];
      const args = [...attempt.args];
      if (registry) args.push("--registry", registry);

      try {
        if (silent) {
          await execLive("bun", args, {
            cwd: installCwd,
            silent: true,
            timeoutMs: 15 * 60 * 1000,
          });
          return true;
        }

        const spinner = createSpinner("正在安装依赖...");
        spinner.start();
        let seconds = 0;
        const tick = setInterval(() => {
          seconds += 1;
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          const time = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          spinner.update(`正在安装依赖... ${time}`);
        }, 1000);
        try {
          await execLive("bun", args, {
            cwd: installCwd,
            silent: true,
            timeoutMs: 15 * 60 * 1000,
          });
          clearInterval(tick);
          const finalTime =
            seconds > 60
              ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
              : `${seconds}s`;
          spinner.stop(`依赖安装完成 (${finalTime})`);
        } catch (err) {
          clearInterval(tick);
          throw err;
        }

        if (!nested) outputSuccess("依赖安装完成");
        return true;
      } catch (e) {
        // 最后一次尝试也失败了，报错
        if (i === installAttempts.length - 1) {
          outputError(`${e.message}`);
          if (!nested) {
            outputContent("可能的解决方案:");
            outputContent("1. 检查网络连接");
            if (!registry) {
              outputContent("2. 尝试配置国内镜像源 (运行 opencodenpm ai)");
            }
            outputContent("3. 删除 node_modules 后重试");
          }
          return false;
        }
        // frozen-lockfile 失败，降级重试
        if (!silent) {
          outputWarn("lockfile 与 package.json 不同步，尝试常规安装...");
        }
      }
    }
    return false;
  }

  async build(options = {}) {
    const { silent = false, nested = false } = options;
    const outputStep = nested ? nestedStep : step;
    const outputError = nested ? nestedError : error;
    const outputSuccess = nested ? nestedSuccess : success;
    const outputContent = nested ? nestedContent : (m) => indent(m, 2);

    if (!silent && !nested) outputStep("编译构建");

    await this.checkEnvironment();

    const depResult = await this.installDependencies({ silent, nested });
    if (!depResult) {
      return false;
    }

    try {
      const args = ["run", "script/build.ts", "--single", "--skip-install"];

      const chineseVersion = getChineseVersion();
      const env = { ...process.env };
      if (chineseVersion) {
        env.OPENCODE_VERSION = chineseVersion;
        env.OPENCODE_CHANNEL = "latest";
      }

      if (silent) {
        await execLive("bun", args, {
          cwd: this.buildDir,
          env,
          silent: true,
          timeoutMs: 30 * 60 * 1000,
        });
        return true;
      }

      const spinner = createSpinner("正在编译 OpenCode...");
      spinner.start();
      const startTime = Date.now();
      const tick = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const time = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const stage =
          elapsed < 30 ? "Bundling" : elapsed < 180 ? "Compiling" : "Packaging";
        spinner.update(`正在编译 OpenCode (${stage})... ${time}`);
      }, 1000);
      try {
        await execLive("bun", args, {
          cwd: this.buildDir,
          env,
          silent: true,
          timeoutMs: 30 * 60 * 1000,
        });
        clearInterval(tick);
        const totalSeconds = Math.round((Date.now() - startTime) / 1000);
        const finalTime =
          totalSeconds > 60
            ? `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
            : `${totalSeconds}s`;
        spinner.stop(`编译完成 (${finalTime})`);
      } catch (err) {
        clearInterval(tick);
        throw err;
      }

      return true;
    } catch (e) {
      const output = e.output || e.stdout || "";
      const errorOutput = typeof output === "string" ? output : String(output);

      // 检测是否是版本问题导致的编译错误
      const isVersionIssue = this.detectVersionIssue(errorOutput);

      if (isVersionIssue) {
        outputError(`检测到汉化配置版本问题，尝试自动修复...`);
        const fixed = await this.autoUpdateVersion(silent, nested);
        if (fixed) {
          if (!silent && !nested) {
            outputSuccess(`已更新到最新版本，重新编译...`);
          }
          // 重新尝试编译
          try {
            await execLive("bun", args, {
              cwd: this.buildDir,
              env,
              silent: true,
              timeoutMs: 30 * 60 * 1000,
            });
            if (!silent && !nested) {
              outputSuccess(`编译成功`);
            }
            return true;
          } catch (retryErr) {
            outputError(`自动修复后仍然编译失败`);
          }
        } else {
          outputError(`自动修复失败，请手动更新`);
        }
      }

      outputError(`${e.message}`);
      return false;
    }
  }

  /**
   * 检测编译错误是否由版本问题导致
   */
  detectVersionIssue(errorOutput) {
    const versionErrorPatterns = [
      /Could not resolve.*重命名|Could not resolve.*\s+-\s+/, // 导入路径被翻译
      /dialog-session\s+-\s+重命名/,
      /Unexpected token.*[\u4e00-\u9fa5]/, // 包含中文的语法错误
      /show\s+[\u4e00-\u9fa5]+.*\(\)/, // 函数名被翻译
    ];

    return versionErrorPatterns.some((pattern) => pattern.test(errorOutput));
  }

  /**
   * 自动更新汉化工具到最新版本
   */
  async autoUpdateVersion(silent = false, nested = false) {
    const outputStep = nested ? nestedStep : step;
    const outputSuccess = nested ? nestedSuccess : success;
    const outputError = nested ? nestedError : error;
    const { execSync } = require("child_process");

    try {
      if (!silent) {
        outputStep("自动更新汉化工具");
      }

      // 获取项目根目录
      const projectDir = require("../core/utils.js").getProjectDir();

      // 恢复官方源码纯净状态
      if (!silent) {
        outputStep("恢复官方源码");
      }
      execSync("git checkout -- .", {
        cwd: path.join(projectDir, "opencode-zh-CN/packages/opencode"),
        stdio: silent ? "ignore" : "inherit",
      });

      // 拉取最新汉化配置
      if (!silent) {
        outputStep("更新汉化配置");
      }
      execSync("git pull origin main", {
        cwd: projectDir,
        stdio: silent ? "ignore" : "inherit",
      });

      // 重新应用汉化
      if (!silent) {
        outputStep("重新应用汉化");
      }

      const I18n = require("../core/i18n.js");
      const i18n = new I18n();
      await i18n.apply({ silent: true, skipNewFileCheck: true });

      if (!silent) {
        outputSuccess(`自动更新完成`);
      }
      return true;
    } catch (e) {
      outputError(`自动更新失败: ${e.message}`);
      return false;
    }
  }

  getDistPath() {
    const platform = getBuildPlatform();
    const ext = platform.startsWith("windows") ? ".exe" : "";
    return path.join(
      this.buildDir,
      "dist",
      `opencode-${platform}`,
      "bin",
      `opencode${ext}`,
    );
  }

  getDistDir() {
    const platform = getBuildPlatform();
    return path.join(this.buildDir, "dist", `opencode-${platform}`);
  }

  async deployToLocal(options = {}) {
    const { silent = false, nested = false } = options;
    const outputStep = nested ? nestedStep : step;
    const outputWarn = nested ? nestedWarn : warn;
    const outputSuccess = nested ? nestedSuccess : success;
    const outputContent = nested ? nestedContent : (m) => indent(m, 2);
    const outputError = nested ? nestedError : error;

    if (!silent) outputStep("部署到本地");

    const binDir = getBinDir();
    if (!exists(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const sourcePath = this.getDistPath();
    const { isWindows } = getPlatform();
    const destName = isWindows ? "opencode.exe" : "opencode";
    const destPath = path.join(binDir, destName);

    if (!exists(sourcePath)) {
      if (!silent) outputWarn("编译产物不存在，请先运行 build");
      return false;
    }

    try {
      fs.copyFileSync(sourcePath, destPath);
      if (!isWindows) {
        fs.chmodSync(destPath, 0o755);
      }
      const stats = fs.statSync(destPath);
      if (!silent) {
        outputSuccess(`已部署到: ${destPath}`);
        outputContent(`大小: ${formatSize(stats.size)}`);
      }
      return true;
    } catch (e) {
      outputError(`部署失败: ${e.message}`);
      return false;
    }
  }

  clean(options = {}) {
    const { silent = false } = options;
    const distDir = path.join(this.buildDir, "dist");
    if (exists(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
      if (!silent) success("构建产物已清理");
    }
  }
}

module.exports = Builder;
