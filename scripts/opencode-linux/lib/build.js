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
    const tools = this.checkTools();

    if (!tools.bun && !tools.npm) {
      throw new Error('未找到构建工具（bun 或 npm）');
    }

    const cmd = tools.bun ? 'bun' : 'npm';
    const installCmd = tools.bun ? 'bun install' : 'npm install';

    try {
      execSync(installCmd, {
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
    const tools = this.checkTools();

    if (!tools.bun && !tools.npm) {
      throw new Error('未找到构建工具（bun 或 npm）');
    }

    // 检查是否需要安装依赖
    const nodeModules = path.join(this.opencodeDir, 'node_modules');
    if (!require('fs').existsSync(nodeModules)) {
      console.log('首次构建，正在安装依赖...');
      await this.install();
    }

    const cmd = tools.bun ? 'bun run build' : 'npm run build';

    try {
      execSync(cmd, {
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
