/**
 * Git 操作模块
 *
 * 处理 OpenCode 源码的拉取和更新
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Version = require('./version.js');

const REPO_URL = 'https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation.git';

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
   * 初始化仓库（首次克隆）
   */
  async clone() {
    if (this.exists()) {
      throw new Error('源码目录已存在');
    }

    try {
      execSync(`git clone --depth 1 ${REPO_URL} "${this.opencodeDir}"`, {
        stdio: 'inherit'
      });
      return true;
    } catch (error) {
      throw new Error(`克隆失败: ${error.message}`);
    }
  }

  /**
   * 拉取最新代码
   */
  async pull() {
    if (!this.exists()) {
      await this.clone();
      return true;
    }

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

      execSync('git reset --hard origin/master', {
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
      throw new Error(`拉取失败: ${error.message}`);
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
