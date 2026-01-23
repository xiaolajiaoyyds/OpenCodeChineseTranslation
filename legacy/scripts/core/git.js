/**
 * Git 操作模块
 */

const { exec } = require('./utils.js');
const { success, error, warn } = require('./colors.js');

/**
 * 获取 Git 仓库信息
 */
function getRepoInfo(repoPath) {
  try {
    const origin = exec('git remote get-url origin', { cwd: repoPath }).trim();
    const branch = exec('git rev-parse --abbrev-ref HEAD', { cwd: repoPath }).trim();
    const commit = exec('git rev-parse --short HEAD', { cwd: repoPath }).trim();
    const commitCount = exec('git rev-list --count HEAD', { cwd: repoPath }).trim();

    return { origin, branch, commit, commitCount };
  } catch (e) {
    return null;
  }
}

/**
 * 克隆仓库
 */
async function cloneRepo(url, targetPath, options = {}) {
  const { depth = 1, branch = null, silent = false } = options;

  try {
    let cmd = `git clone ${url} ${targetPath}`;
    if (depth) cmd += ` --depth ${depth}`;
    if (branch) cmd += ` --branch ${branch}`;

    exec(cmd, { stdio: silent ? 'pipe' : 'inherit' });

    if (!silent) success(`仓库已克隆到: ${targetPath}`);
    return true;
  } catch (e) {
    if (!silent) error(`克隆失败: ${e.message}`);
    return false;
  }
}

/**
 * 拉取最新代码
 */
async function pullRepo(repoPath, options = {}) {
  const { branch = null, silent = false } = options;

  try {
    // 获取当前分支（如果未指定）
    const currentBranch = branch || getCurrentBranch(repoPath) || 'main';

    // 获取远程跟踪分支
    let remoteBranch;
    try {
      const upstream = exec('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
        cwd: repoPath,
        stdio: 'pipe',
      }).trim();
      remoteBranch = upstream;
    } catch {
      // 如果没有上游分支，使用 origin/branch
      remoteBranch = `origin/${currentBranch}`;
    }

    // 获取远程的所有分支
    exec('git fetch origin', { cwd: repoPath, stdio: silent ? 'pipe' : 'inherit' });

    // 重置到远程分支
    exec(`git reset --hard ${remoteBranch}`, { cwd: repoPath, stdio: silent ? 'pipe' : 'inherit' });

    if (!silent) success('源码已更新');
    return true;
  } catch (e) {
    if (!silent) error(`拉取失败: ${e.message}`);
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
    exec('git restore --worktree --source=HEAD -- .', {
      cwd: repoPath,
      stdio: 'pipe',
    });

    // 清理未跟踪文件
    exec('git clean -fd', {
      cwd: repoPath,
      stdio: 'pipe',
    });

    if (!silent) success('源码已恢复到纯净状态');
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
    return exec('git rev-parse --abbrev-ref HEAD', { cwd: repoPath }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * 获取最新提交哈希
 */
function getLatestCommit(repoPath, short = true) {
  try {
    const flag = short ? '--short' : '';
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
    return parseInt(exec('git rev-list --count HEAD', { cwd: repoPath }).trim(), 10);
  } catch (e) {
    return 0;
  }
}

/**
 * 检查是否在 Git 仓库中
 */
function isGitRepo(repoPath) {
  try {
    exec('git rev-parse --git-dir', { cwd: repoPath, stdio: 'pipe' });
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
    const result = exec('git status --porcelain', { cwd: repoPath, stdio: 'pipe' });
    return result.trim().length > 0;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getRepoInfo,
  cloneRepo,
  pullRepo,
  cleanRepo,
  getCurrentBranch,
  getLatestCommit,
  getCommitCount,
  isGitRepo,
  hasChanges,
};
