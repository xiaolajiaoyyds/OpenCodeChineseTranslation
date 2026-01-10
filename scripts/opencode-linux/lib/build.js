/**
 * 编译构建模块
 *
 * 调用 bun run build 编译 OpenCode
 */

const { execSync } = require('child_process');
const { hasCommand } = require('./env.js');
const path = require('path');
const Version = require('./version.js');

class Build {
  constructor() {
    this.projectDir = Version.getProjectDir();
    this.opencodeDir = path.join(this.projectDir, 'opencode-zh-CN');
  }

  /**
   * 检查并安装 Bun
   */
  async ensureBun() {
    if (hasCommand('bun')) {
      return true;
    }

    console.log('正在安装 Bun...');
    try {
      execSync('curl -fsSL https://bun.sh/install | bash', {
        stdio: 'inherit',
        shell: '/bin/bash'
      });

      // 添加 bun 到 PATH
      const bunPath = process.env.HOME + '/.bun/bin';
      process.env.PATH = bunPath + ':' + process.env.PATH;

      console.log('✓ Bun 已安装');
      return true;
    } catch (error) {
      throw new Error('Bun 安装失败，请手动安装: curl -fsSL https://bun.sh/install | bash');
    }
  }

  /**
   * 检查构建工具
   */
  checkTools() {
    const hasBun = hasCommand('bun');
    const hasNpm = hasCommand('npm');

    return { bun: hasBun, npm: hasNpm };
  }

  /**
   * 安装依赖
   */
  async install() {
    // 确保有 Bun
    await this.ensureBun();

    try {
      execSync('bun install', {
        cwd: this.opencodeDir,
        stdio: 'inherit'
      });
      return true;
    } catch (error) {
      throw new Error(`依赖安装失败: ${error.message}`);
    }
  }

  /**
   * 执行编译
   */
  async run() {
    // 确保有 Bun
    await this.ensureBun();

    // 检查是否需要安装依赖
    const nodeModules = path.join(this.opencodeDir, 'node_modules');
    if (!require('fs').existsSync(nodeModules)) {
      console.log('首次构建，正在安装依赖...');
      await this.install();
    }

    try {
      execSync('bun run build', {
        cwd: this.opencodeDir,
        stdio: 'inherit'
      });
      return true;
    } catch (error) {
      throw new Error(`编译失败: ${error.message}`);
    }
  }

  /**
   * 清理构建产物
   */
  async clean() {
    const fs = require('fs');
    const distDir = path.join(this.opencodeDir, 'dist');

    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }

    const exePath = path.join(this.opencodeDir, 'opencode.exe');
    if (fs.existsSync(exePath)) {
      fs.unlinkSync(exePath);
    }
  }
}

module.exports = Build;
