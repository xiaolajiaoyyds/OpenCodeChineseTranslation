/**
 * Git 操作模块
 */

const { exec, execLive } = require("./utils.js");
const {
  success,
  error,
  warn,
  indent,
  nestedSuccess,
  nestedContent,
  createSpinner,
} = require("./colors.js");
const p = require("@clack/prompts");
const path = require("path");
const fs = require("fs");

/**
 * 获取 Git 仓库信息
 */
function getRepoInfo(repoPath) {
  try {
    const origin = exec("git remote get-url origin", { cwd: repoPath }).trim();
    const branch = exec("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
    }).trim();
    const commit = exec("git rev-parse --short HEAD", { cwd: repoPath }).trim();
    const commitCount = exec("git rev-list --count HEAD", {
      cwd: repoPath,
    }).trim();

    return { origin, branch, commit, commitCount };
  } catch (e) {
    return null;
  }
}

/**
 * 获取仓库版本信息（从 package.json）
 */
function getRepoVersion(repoPath) {
  try {
    const pkgPath = path.join(repoPath, "packages", "opencode", "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const commit = exec("git rev-parse --short HEAD", {
        cwd: repoPath,
      }).trim();
      return {
        version: pkg.version,
        commit: commit,
      };
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * 克隆仓库
 */
async function cloneRepo(url, targetPath, options = {}) {
  const { depth = 1, branch = null, silent = false, nested = false } = options;

  const outputSuccess = nested ? nestedSuccess : success;
  const spinner = silent
    ? null
    : nested
      ? createSpinner("正在克隆仓库...")
      : p.spinner();

  try {
    let cmd = `git clone ${url} ${targetPath}`;
    if (depth) cmd += ` --depth ${depth}`;
    if (branch) cmd += ` --branch ${branch}`;

    if (!silent) spinner.start("正在克隆仓库...");

    await execLive(cmd, { silent: true, shell: true });

    if (!silent) {
      spinner.stop("仓库克隆完成");
      if (!nested) {
        indent(`仓库已克隆到: ${targetPath}`);
      }
    }
    return true;
  } catch (e) {
    if (!silent) {
      if (nested) {
        spinner.stop("克隆失败");
      } else {
        spinner.stop("克隆失败", 1);
        error(`克隆失败: ${e.message}`);
      }

      // 网络错误提示
      if (
        e.message.includes("Could not resolve host") ||
        e.message.includes("Failed to connect")
      ) {
        warn("检测到网络连接问题");
        indent("建议检查网络连接或配置 Git 代理", nested ? 0 : 2);
      }
    }
    return false;
  }
}

/**
 * 拉取最新代码
 */
async function pullRepo(repoPath, options = {}) {
  const { branch = null, silent = false, nested = false } = options;

  const spinner = silent
    ? null
    : nested
      ? createSpinner("正在拉取最新代码...")
      : p.spinner();

  try {
    const currentBranch = branch || getCurrentBranch(repoPath) || "main";

    let remoteBranch;
    try {
      const upstream = exec(
        "git rev-parse --abbrev-ref --symbolic-full-name @{u}",
        {
          cwd: repoPath,
          stdio: "pipe",
        },
      ).trim();
      remoteBranch = upstream;
    } catch {
      remoteBranch = `origin/${currentBranch}`;
    }

    if (!silent) spinner.start("正在拉取最新代码...");

    const remoteName = remoteBranch.includes("/")
      ? remoteBranch.split("/")[0]
      : "origin";

    await execLive(`git fetch ${remoteName}`, {
      cwd: repoPath,
      silent: true,
      shell: true,
    });

    await execLive(`git reset --hard ${remoteBranch}`, {
      cwd: repoPath,
      silent: true,
      shell: true,
    });

    if (!silent) spinner.stop("源码已更新");
    return true;
  } catch (e) {
    if (!silent) {
      if (nested) {
        spinner.stop("拉取失败");
      } else {
        spinner.stop("拉取失败", 1);
        error(`拉取失败: ${e.message}`);
      }

      // 网络错误提示
      if (
        e.message.includes("Could not resolve host") ||
        e.message.includes("Failed to connect")
      ) {
        warn("检测到网络连接问题");
        indent("建议检查网络连接或配置 Git 代理", nested ? 0 : 2);
      }
    }
    return false;
  }
}

/**
 * 恢复源码到纯净状态
 */
async function cleanRepo(repoPath, options = {}) {
  const { silent = false } = options;

  try {
    // 恢复所有修改
    exec("git restore --worktree --source=HEAD -- .", {
      cwd: repoPath,
      stdio: "pipe",
    });

    // 清理未跟踪文件
    exec("git clean -fd", {
      cwd: repoPath,
      stdio: "pipe",
    });

    if (!silent) success("源码已恢复到纯净状态");
    return true;
  } catch (e) {
    if (!silent) error(`清理失败: ${e.message}`);
    return false;
  }
}

/**
 * 获取当前分支
 */
function getCurrentBranch(repoPath) {
  try {
    return exec("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * 获取最新提交哈希
 */
function getLatestCommit(repoPath, short = true) {
  try {
    const flag = short ? "--short" : "";
    return exec(`git rev-parse ${flag} HEAD`, { cwd: repoPath }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * 获取提交总数
 */
function getCommitCount(repoPath) {
  try {
    return parseInt(
      exec("git rev-list --count HEAD", { cwd: repoPath }).trim(),
      10,
    );
  } catch (e) {
    return 0;
  }
}

/**
 * 检查是否在 Git 仓库中
 */
function isGitRepo(repoPath) {
  try {
    exec("git rev-parse --git-dir", { cwd: repoPath, stdio: "pipe" });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 检查是否有未提交的更改
 */
function hasChanges(repoPath) {
  try {
    const result = exec("git status --porcelain", {
      cwd: repoPath,
      stdio: "pipe",
    });
    return result.trim().length > 0;
  } catch (e) {
    return false;
  }
}

module.exports = {
  cloneRepo,
  pullRepo,
  cleanRepo,
  getRepoInfo,
  getRepoVersion,
  getCurrentBranch,
  getLatestCommit,
  getCommitCount,
  isGitRepo,
  hasChanges,
};
