/**
 * 构建工具模块
 * 调用 Bun 进行编译构建
 */

const path = require('path');
const fs = require('fs');
const { execLive, getOpencodeDir, exists, formatSize } = require('./utils.js');
const { getBunPath } = require('./env.js');
const { step, success, error, warn, indent } = require('./colors.js');

class Builder {
  constructor() {
    this.opencodeDir = getOpencodeDir();
    this.buildDir = path.join(this.opencodeDir, 'packages', 'opencode');
    this.bunPath = getBunPath();
  }

  /**
   * 检查构建环境
   */
  checkEnvironment() {
    if (!this.bunPath) {
      throw new Error('未找到 Bun，请先安装: npm install -g bun');
    }

    if (!exists(this.buildDir)) {
      throw new Error(`构建目录不存在: ${this.buildDir}`);
    }
  }

  /**
   * 修复 Bun 版本检查（允许更高版本）
   * 这是运行时修复，不影响官方源码更新
   */
  patchBunVersionCheck() {
    const scriptPath = path.join(this.opencodeDir, 'packages', 'script', 'src', 'index.ts');

    if (!exists(scriptPath)) {
      return false;
    }

    try {
      let content = fs.readFileSync(scriptPath, 'utf-8');

      // 检查是否已经修复过（包含 isCompatible）
      if (content.includes('isCompatible')) {
        return true; // 已修复
      }

      // 检查是否包含严格版本检查
      const strictCheck = 'if (process.versions.bun !== expectedBunVersion)';
      if (!content.includes(strictCheck)) {
        return true; // 不需要修复
      }

      // 使用正则表达式匹配严格版本检查（忽略缩进差异）
      const strictCheckRegex = /if\s*\(\s*process\.versions\.bun\s*!==\s*expectedBunVersion\s*\)\s*\{\s*\n\s*throw\s+new\s+Error\s*\(\s*`This script requires bun@\$\{expectedBunVersion\}, but you are using bun@\$\{process\.versions\.bun\}`\s*\)\s*\n\s*\}/;

      const newCode = `// 放宽版本检查：允许使用相同或更高版本的 Bun (1.3.5+)
const [expectedMajor, expectedMinor, expectedPatch] = expectedBunVersion.split(".").map(Number)
const [actualMajor, actualMinor, actualPatch] = (process.versions.bun || "0.0.0").split(".").map(Number)

const isCompatible =
  actualMajor > expectedMajor ||
  (actualMajor === expectedMajor && actualMinor > expectedMinor) ||
  (actualMajor === expectedMajor && actualMinor === expectedMinor && actualPatch >= expectedPatch)

if (!isCompatible) {
  throw new Error(\`This script requires bun@\${expectedBunVersion}+, but you are using bun@\${process.versions.bun}\`)
}`;

      if (strictCheckRegex.test(content)) {
        content = content.replace(strictCheckRegex, newCode);
        fs.writeFileSync(scriptPath, content, 'utf-8');
        return true;
      }

      // 备用方案：简单的行替换
      const lines = content.split('\n');
      let patchApplied = false;
      const newLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('if (process.versions.bun !== expectedBunVersion)')) {
          // 跳过这一行和下面两行（throw 和 }）
          newLines.push('// 放宽版本检查：允许使用相同或更高版本的 Bun (1.3.5+)');
          newLines.push('const [expectedMajor, expectedMinor, expectedPatch] = expectedBunVersion.split(".").map(Number)');
          newLines.push('const [actualMajor, actualMinor, actualPatch] = (process.versions.bun || "0.0.0").split(".").map(Number)');
          newLines.push('');
          newLines.push('const isCompatible =');
          newLines.push('  actualMajor > expectedMajor ||');
          newLines.push('  (actualMajor === expectedMajor && actualMinor > expectedMinor) ||');
          newLines.push('  (actualMajor === expectedMajor && actualMinor === expectedMinor && actualPatch >= expectedPatch)');
          newLines.push('');
          newLines.push('if (!isCompatible) {');
          newLines.push('  throw new Error(`This script requires bun@${expectedBunVersion}+, but you are using bun@${process.versions.bun}`)');
          newLines.push('}');
          // 跳过原来的 throw 和 }
          i += 2;
          patchApplied = true;
        } else {
          newLines.push(line);
        }
      }

      if (patchApplied) {
        fs.writeFileSync(scriptPath, newLines.join('\n'), 'utf-8');
        return true;
      }

      return false;
    } catch (e) {
      warn(`版本检查修复失败: ${e.message}`);
      return false;
    }
  }

  /**
   * 安装依赖
   */
  async installDependencies(options = {}) {
    const { silent = false } = options;

    if (!silent) {
      step('安装依赖');
    }

    const nodeModulesPath = path.join(this.buildDir, 'node_modules');

    if (exists(nodeModulesPath)) {
      if (!silent) {
        warn('依赖已存在，跳过安装');
      }
      return true;
    }

    try {
      await execLive(this.bunPath, ['install'], {
        cwd: this.buildDir,
      });
      if (!silent) success('依赖安装完成');
      return true;
    } catch (e) {
      error(`依赖安装失败: ${e.message}`);
      return false;
    }
  }

  /**
   * 清理指定平台的编译产物
   */
  cleanPlatform(platform) {
    const platformDistDir = path.join(this.buildDir, 'dist', `opencode-${platform}`);
    if (exists(platformDistDir)) {
      fs.rmSync(platformDistDir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  /**
   * 执行编译
   */
  async build(options = {}) {
    const { silent = false, platform = null } = options;

    if (!silent) {
      step('编译构建');
    }

    this.checkEnvironment();

    // 修复 Bun 版本检查（运行时修复，不影响源码更新）
    if (this.patchBunVersionCheck()) {
      if (!silent) {
        indent('已应用 Bun 版本兼容性修复', 2);
      }
    }

    // 清理编译产物，确保纯净构建
    if (platform) {
      // 清理指定平台
      if (this.cleanPlatform(platform)) {
        if (!silent) {
          indent(`已清理 ${platform} 编译产物`, 2);
        }
      }
    } else {
      // 清理所有平台
      const platforms = ['windows-x64', 'darwin-arm64', 'linux-x64'];
      let cleaned = false;
      for (const p of platforms) {
        if (this.cleanPlatform(p)) {
          cleaned = true;
        }
      }
      if (cleaned && !silent) {
        indent('已清理旧编译产物', 2);
      }
    }

    // 确保依赖已安装
    await this.installDependencies({ silent });

    try {
      // 构建命令参数
      const args = ['run', 'script/build.ts'];

      // 智能判断是否使用 --single
      // 只有当目标平台与当前平台完全匹配时，才使用 --single
      // 否则（跨平台构建），不使用 --single 以构建所有目标（因为 build.ts 不支持 --target）
      if (platform) {
        const [targetOs, targetArch] = platform.split('-');
        const currentOs = process.platform === 'win32' ? 'windows' : process.platform;
        const currentArch = process.arch;

        if (targetOs === currentOs && targetArch === currentArch) {
          args.push('--single');
        } else {
          if (!silent) {
            indent(`跨平台构建检测: 当前 ${currentOs}-${currentArch}, 目标 ${platform}`, 2);
            indent(`将构建所有目标以获取 ${platform} 产物`, 2);
          }
        }
      }

      indent(`执行: ${this.bunPath} ${args.join(' ')}`, 2);

      await execLive(this.bunPath, args, {
        cwd: this.buildDir,
      });

      if (!silent) success('编译成功');
      return true;
    } catch (e) {
      error(`编译失败: ${e.message}`);
      return false;
    }
  }

  /**
   * 获取编译产物路径
   */
  getDistPath(platform = 'windows-x64') {
    return path.join(
      this.buildDir,
      'dist',
      `opencode-${platform}`,
      'bin',
      `opencode${platform === 'windows-x64' ? '.exe' : ''}`
    );
  }

  /**
   * 检查编译产物是否存在
   */
  hasOutput(platform = 'windows-x64') {
    return exists(this.getDistPath(platform));
  }

  /**
   * 获取编译产物信息
   */
  getOutputInfo(platform = 'windows-x64') {
    const distPath = this.getDistPath(platform);

    if (!exists(distPath)) {
      return null;
    }

    const stats = fs.statSync(distPath);
    return {
      path: distPath,
      size: stats.size,
      sizeFormatted: formatSize(stats.size),
    };
  }

  /**
   * 部署到本地 bin 目录
   */
  async deployToLocal(options = {}) {
    const { silent = false, platform = 'windows-x64' } = options;

    if (!silent) {
      step('部署到本地环境');
    }

    const { getBinDir } = require('./utils');
    const binDir = getBinDir();

    // 确保 bin 目录存在
    if (!exists(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const sourcePath = this.getDistPath(platform);
    const destPath = path.join(binDir, `opencode${platform === 'windows-x64' ? '.exe' : ''}`);

    if (!exists(sourcePath)) {
      if (!silent) {
        warn('编译产物不存在，请先运行 build');
      }
      return false;
    }

    try {
      fs.copyFileSync(sourcePath, destPath);
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

  /**
   * 清理构建产物
   */
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
