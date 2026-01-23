/**
 * full 命令
 * 优化的完整工作流：检查源码 → (可选)更新 → 恢复纯净 → 汉化 → 验证 → (可选)编译 → (可选)部署
 */

const inquirer = require('inquirer');
const { step, success, error, warn, log } = require('../core/colors.js');
const { existsSync } = require('fs');
const { execSync } = require('child_process');
const { cleanRepo, isGitRepo } = require('../core/git.js');
const { getOpencodeDir } = require('../core/utils.js');
const updateCmd = require('./update.js');
const applyCmd = require('./apply.js');
const verifyCmd = require('./verify.js');
const buildCmd = require('./build.js');
const deployCmd = require('./deploy.js');

/**
 * 检查源码是否有更新
 */
function checkSourceUpdate() {
  const opencodeDir = getOpencodeDir();

  if (!existsSync(opencodeDir) || !isGitRepo(opencodeDir)) {
    return { hasUpdate: false, exists: false };
  }

  try {
    const localCommit = execSync('git rev-parse HEAD', {
      cwd: opencodeDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();

    const remoteCommit = execSync('git rev-parse @{u}', {
      cwd: opencodeDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();

    return {
      exists: true,
      hasUpdate: localCommit !== remoteCommit,
      localCommit: localCommit.slice(0, 8),
      remoteCommit: remoteCommit.slice(0, 8),
    };
  } catch {
    return { exists: true, hasUpdate: false };
  }
}

/**
 * 检查源码是否有修改
 */
function hasLocalChanges() {
  const opencodeDir = getOpencodeDir();

  if (!existsSync(opencodeDir) || !isGitRepo(opencodeDir)) {
    return false;
  }

  try {
    const result = execSync('git status --porcelain', {
      cwd: opencodeDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * 完整工作流
 */
async function run(options = {}) {
  const { auto = false } = options;

  console.log('');
  log('=== OpenCode 中文版 - 一键汉化全流程 ===', 'cyan');
  console.log('');

  // 1. 检查源码状态
  step('[1/7] 检查源码状态');
  const sourceStatus = checkSourceUpdate();

  if (!sourceStatus.exists) {
    warn('源码不存在，需要克隆');
    const { confirm } = auto
      ? { confirm: true }
      : await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: '是否克隆 OpenCode 源码?',
            default: true,
          },
        ]);

    if (!confirm) {
      error('已取消');
      return false;
    }

    await updateCmd.run({});
  } else {
    log(`  源码目录: ${getOpencodeDir()}`, 'dim');

    if (sourceStatus.hasUpdate) {
      log(`  本地版本: ${sourceStatus.localCommit}`, 'dim');
      log(`  远程版本: ${sourceStatus.remoteCommit}`, 'dim');
      warn('  源码有更新可用');

      const { shouldUpdate } = auto
        ? { shouldUpdate: true }
        : await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldUpdate',
              message: '是否更新到最新版本?',
              default: true,
            },
          ]);

      if (shouldUpdate) {
        await updateCmd.run({});
      }
    } else {
      success('  源码已是最新');
    }
  }

  // 2. 检查本地修改
  step('[2/7] 检查本地修改');
  if (hasLocalChanges()) {
    warn('  检测到本地修改，将恢复到纯净状态');
  } else {
    success('  源码纯净，无修改');
  }

  // 3. 恢复纯净
  step('[3/7] 恢复源码到纯净状态');
  await cleanRepo(getOpencodeDir());

  // 4. 应用汉化
  step('[4/7] 应用汉化配置');
  await applyCmd.run({});

  // 5. 验证汉化
  step('[5/7] 验证汉化结果');
  await verifyCmd.run({});

  // 6. 询问是否编译
  step('[6/7] 编译构建');
  const { shouldBuild } = auto
    ? { shouldBuild: true }
    : await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldBuild',
          message: '是否编译 OpenCode?',
          default: true,
        },
      ]);

  if (shouldBuild) {
    await buildCmd.run({});

    // 7. 询问是否部署全局命令
    step('[7/7] 部署全局命令');
    const { shouldDeploy } = auto
      ? { shouldDeploy: true }
      : await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldDeploy',
            message: '是否部署 opencode 全局命令? (任意终端可执行)',
            default: true,
          },
        ]);

    if (shouldDeploy) {
      await deployCmd.run({});
    }
  } else {
    success('跳过编译');
  }

  // 完成
  console.log('');
  log('=== 汉化流程完成! ===', 'cyan');
  console.log('');

  return true;
}

module.exports = { run };
