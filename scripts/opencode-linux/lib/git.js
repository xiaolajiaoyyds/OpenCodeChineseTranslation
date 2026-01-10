/**
 * Git 操作模块
 *
 * 处理 OpenCode 源码的拉取和更新
 * 智能检测并修复错误的克隆
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Version = require('./version.js');

// OpenCode 原始仓库（不是翻译仓库）
const REPO_URL_GITEE = 'https://gitee.com/mirrors/opencode.git';
const REPO_URL_GITHUB = 'https://github.com/anomalyco/opencode.git';

// 正确的仓库名称
const VALID_REPOS = ['anomalyco/opencode', 'gitee/mirrors/opencode'];

class Git {
  constructor() {
    this.projectDir = Version.getProjectDir();
    this.opencodeDir = path.join(this.projectDir, 'opencode-zh-CN');
  }

  /**
   * 检查源码目录是否存在
   */
  exists() {
    return fs.existsSync(this.opencodeDir);
  }

  /**
   * 检查当前目录是否是正确的 OpenCode 仓库
   */
  isValidRepo() {
    if (!this.exists()) return false;

    try {
      // 检查是否有 package.json
      const pkgPath = path.join(this.opencodeDir, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      // 检查是否是 OpenCode 项目
      if (pkg.name === 'opencode') return true;

      // 检查远程仓库 URL
      const originUrl = execSync('git config --get remote.origin.url', {
        cwd: this.opencodeDir,
        encoding: 'utf-8'
      }).trim().toLowerCase();

      return VALID_REPOS.some(repo => originUrl.includes(repo));
    } catch {
      return false;
    }
  }

  /**
   * 强制清理并重新克隆
   */
  async forceReclone() {
    console.log('检测到错误的源码目录，正在重新克隆...');

    try {
      // 删除旧目录
      fs.rmSync(this.opencodeDir, { recursive: true, force: true });
      console.log('✓ 旧目录已清理');
    } catch (error) {
      // 忽略删除错误
    }

    return await this.clone();
  }

  /**
   * 初始化仓库（首次克隆）
   */
  async clone() {
    const urls = [REPO_URL_GITEE, REPO_URL_GITHUB];
    let lastError = null;

    for (const url of urls) {
      try {
        const source = url.includes('gitee') ? 'Gitee' : 'GitHub';
        console.log(`从 ${source} 克隆 OpenCode 源码...`);

        execSync(`git clone --depth 1 ${url} "${this.opencodeDir}"`, {
          stdio: 'inherit'
        });

        console.log('✓ 源码克隆成功');
        return true;
      } catch (error) {
        lastError = error;
        // 继续尝试下一个 URL
      }
    }

    throw new Error(`克隆失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 拉取最新代码（智能检测）
   */
  async pull() {
    // 1. 目录不存在，直接克隆
    if (!this.exists()) {
      return await this.clone();
    }

    // 2. 检查是否是正确的仓库
    if (!this.isValidRepo()) {
      return await this.forceReclone();
    }

    // 3. 正常拉取更新
    try {
      // 获取当前 commit
      const before = execSync('git rev-parse HEAD', {
        cwd: this.opencodeDir,
        encoding: 'utf-8'
      }).trim();

      // 拉取更新
      execSync('git fetch origin', {
        cwd: this.opencodeDir,
        stdio: 'inherit'
      });

      execSync('git reset --hard origin/main', {
        cwd: this.opencodeDir,
        stdio: 'inherit'
      });

      // 获取更新后的 commit
      const after = execSync('git rev-parse HEAD', {
        cwd: this.opencodeDir,
        encoding: 'utf-8'
      }).trim();

      return before !== after;
    } catch (error) {
      // 拉取失败，尝试强制重新克隆
      console.log('拉取失败，尝试重新克隆...');
      return await this.forceReclone();
    }
  }

  /**
   * 获取当前 commit 信息
   */
  getCurrentCommit() {
    if (!this.exists()) {
      return null;
    }

    try {
      const hash = execSync('git rev-parse HEAD', {
        cwd: this.opencodeDir,
        encoding: 'utf-8'
      }).trim();

      const message = execSync('git log -1 --pretty=%s', {
        cwd: this.opencodeDir,
        encoding: 'utf-8'
      }).trim();

      return { hash: hash.substring(0, 8), message };
    } catch {
      return null;
    }
  }

  /**
   * 获取版本信息（从 package.json）
   */
  getVersion() {
    if (!this.exists()) {
      return null;
    }

    try {
      const pkgPath = path.join(this.opencodeDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

module.exports = Git;
