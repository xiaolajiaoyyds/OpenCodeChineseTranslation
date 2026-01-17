/**
 * 构建工具模块 (macOS ARM64)
 */

const path = require('path');
const fs = require('fs');
const { execLive, getOpencodeDir, exists, formatSize, getI18nDir, getBinDir } = require('./utils.js');
const { getBunPath } = require('./env.js');
const { step, success, error, warn, indent } = require('./colors.js');

const PLATFORM = 'darwin-arm64';

/**
 * 获取汉化版本号（从官方源码 package.json 读取，加上 -zh 后缀）
 */
function getChineseVersion() {
  try {
    const pkgPath = path.join(getOpencodeDir(), 'packages', 'opencode', 'package.json');
    if (exists(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
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
    this.buildDir = path.join(this.opencodeDir, 'packages', 'opencode');
    this.bunPath = getBunPath();
  }

  checkEnvironment() {
    if (!this.bunPath) {
      throw new Error('未找到 Bun，请先安装: npm install -g bun');
    }
    if (!exists(this.buildDir)) {
      throw new Error(`构建目录不存在: ${this.buildDir}`);
    }
  }

  async installDependencies(options = {}) {
    const { silent = false } = options;
    if (!silent) step('安装依赖');

    const nodeModulesPath = path.join(this.buildDir, 'node_modules');
    if (exists(nodeModulesPath)) {
      if (!silent) warn('依赖已存在，跳过安装');
      return true;
    }

    try {
      await execLive(this.bunPath, ['install'], { cwd: this.buildDir });
      if (!silent) success('依赖安装完成');
      return true;
    } catch (e) {
      error(`依赖安装失败: ${e.message}`);
      return false;
    }
  }

  async build(options = {}) {
    const { silent = false } = options;
    if (!silent) step('编译构建');

    this.checkEnvironment();
    await this.installDependencies({ silent });

    try {
      const args = ['run', 'script/build.ts', '--single'];
      indent(`执行: ${this.bunPath} ${args.join(' ')}`, 2);

      // 设置汉化版本号
      const chineseVersion = getChineseVersion();
      const env = { ...process.env };
      if (chineseVersion) {
        env.OPENCODE_VERSION = chineseVersion;
        env.OPENCODE_CHANNEL = 'latest';
      }

      await execLive(this.bunPath, args, { cwd: this.buildDir, env });
      if (!silent) success('编译成功');
      return true;
    } catch (e) {
      error(`编译失败: ${e.message}`);
      return false;
    }
  }

  getDistPath() {
    return path.join(this.buildDir, 'dist', `opencode-${PLATFORM}`, 'bin', 'opencode');
  }

  async deployToLocal(options = {}) {
    const { silent = false } = options;
    if (!silent) step('部署到本地环境');

    const binDir = getBinDir();
    if (!exists(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const sourcePath = this.getDistPath();
    const destPath = path.join(binDir, 'opencode');

    if (!exists(sourcePath)) {
      if (!silent) warn('编译产物不存在，请先运行 build');
      return false;
    }

    try {
      fs.copyFileSync(sourcePath, destPath);
      fs.chmodSync(destPath, 0o755);
      const stats = fs.statSync(destPath);
      if (!silent) {
        success(`已部署到: ${destPath}`);
        indent(`大小: ${formatSize(stats.size)}`, 2);
      }
      return true;
    } catch (e) {
      error(`部署失败: ${e.message}`);
      return false;
    }
  }

  clean(options = {}) {
    const { silent = false } = options;
    const distDir = path.join(this.buildDir, 'dist');
    if (exists(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
      if (!silent) success('构建产物已清理');
    }
  }
}

module.exports = Builder;
