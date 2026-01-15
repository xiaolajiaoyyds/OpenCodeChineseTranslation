/**
 * Windows 构建脚本
 *
 * 直接调用 bun.exe 进行编译，绕过 PowerShell wrapper 问题
 * 用法: node scripts/build-windows.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  console.log('');
  log('========================================', 'cyan');
  log(`  ${message}`, 'cyan');
  log('========================================', 'cyan');
}

/**
 * 获取 bun.exe 的完整路径
 * 检查多个可能的安装位置
 */
function getBunPath() {
  const possiblePaths = [
    // npm 全局安装路径
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'bun', 'bin', 'bun.exe'),
    // Bun 官方安装路径
    path.join(process.env.USERPROFILE || '', '.bun', 'bin', 'bun.exe'),
    // Program Files
    path.join(process.env.ProgramFiles || '', 'bun', 'bin', 'bun.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'bun', 'bin', 'bun.exe'),
  ];

  for (const bunPath of possiblePaths) {
    if (fs.existsSync(bunPath)) {
      return bunPath;
    }
  }

  // 尝试从 PATH 中查找
  try {
    const whereResult = execSync('where bun', { encoding: 'utf-8' }).trim();
    if (whereResult) {
      return whereResult.split('\n')[0].trim();
    }
  } catch (e) {
    // 忽略错误
  }

  return null;
}

/**
 * 检查命令是否存在
 */
function hasCommand(cmd) {
  try {
    // 尝试运行命令获取版本
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  // 获取项目目录
  const projectDir = __dirname;
  const opencodeDir = path.join(projectDir, '..', 'opencode-zh-CN');
  const buildDir = path.join(opencodeDir, 'packages', 'opencode');

  // ========== 步骤 1: 检查环境 ==========
  logStep('步骤 1: 检查编译环境');

  const missing = [];
  const bunPath = getBunPath();

  if (!bunPath) missing.push('Bun');
  if (!hasCommand('node')) missing.push('Node.js');
  if (!hasCommand('git')) missing.push('Git');

  if (missing.length > 0) {
    log(`❌ 缺少必要工具: ${missing.join(', ')}`, 'red');
    log('请先安装这些工具后再运行', 'yellow');
    process.exit(1);
  }

  log('✓ 编译环境检查通过', 'green');
  log(`  Bun: ${bunPath}`, 'gray');

  // ========== 步骤 2: 检查源码目录 ==========
  logStep('步骤 2: 检查源码目录');

  if (!fs.existsSync(buildDir)) {
    log(`❌ 编译目录不存在: ${buildDir}`, 'red');
    process.exit(1);
  }

  log('✓ 源码目录存在', 'green');

  // ========== 步骤 3: 安装依赖（如果需要） ==========
  const nodeModulesPath = path.join(buildDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    logStep('步骤 3: 安装依赖');
    log('正在安装依赖...', 'cyan');

    try {
      execSync(`"${bunPath}" install`, {
        cwd: buildDir,
        stdio: 'inherit',
        shell: true
      });
      log('✓ 依赖安装完成', 'green');
    } catch (error) {
      log('❌ 依赖安装失败', 'red');
      process.exit(1);
    }
  } else {
    log('⊘ 依赖已存在，跳过安装', 'gray');
  }

  // ========== 步骤 4: 编译构建 ==========
  logStep('步骤 4: 编译构建');
  log('开始编译...', 'cyan');

  try {
    // 使用 spawn 来获取实时输出
    const args = ['run', 'script/build.ts', '--single'];
    const child = spawn(bunPath, args, {
      cwd: buildDir,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        log('✓ 编译成功', 'green');

        // 检查输出文件
        const distDir = path.join(buildDir, 'dist');
        const exePath = path.join(distDir, 'opencode-windows-x64', 'bin', 'opencode.exe');

        if (fs.existsSync(exePath)) {
          const stats = fs.statSync(exePath);
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          log(`✓ 生成二进制: ${exePath}`, 'green');
          log(`  大小: ${sizeMB} MB`, 'gray');

          // 部署到项目 bin 目录
          const binDir = path.join(projectDir, '..', 'bin');
          if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
          }

          const destPath = path.join(binDir, 'opencode.exe');
          fs.copyFileSync(exePath, destPath);
          log(`✓ 已部署到: ${destPath}`, 'green');
        }

        log('', 'reset');
        log('编译完成！', 'green');
        process.exit(0);
      } else {
        log(`❌ 编译失败 (退出码: ${code})`, 'red');
        process.exit(1);
      }
    });

    child.on('error', (error) => {
      log(`❌ 启动编译进程失败: ${error.message}`, 'red');
      process.exit(1);
    });

  } catch (error) {
    log(`❌ 编译失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行
main();
