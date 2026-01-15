/**
 * 交互式菜单模块
 * 提供简洁的 TUI 界面
 */

const inquirer = require('inquirer');
const { step, success, error, log } = require('./colors.js');
const { checkEnvironment } = require('./env.js');
const { getProjectDir, getOpencodeDir, getI18nDir, getBinDir, exists, exec } = require('./utils.js');
const { getCommitCount, isGitRepo, getCurrentBranch, getLatestCommit } = require('./git.js');

// 获取本地版本
function getLocalVersion() {
  try {
    const { getVersion } = require('./version.js');
    return getVersion();
  } catch (e) {
    return '5.6.0';
  }
}

/**
 * 检查脚本更新
 */
async function checkScriptUpdate() {
  try {
    const result = exec('git rev-list --count --left-right main...@{u}', {
      cwd: getProjectDir(),
      stdio: 'pipe',
    });

    const [behind, ahead] = result.trim().split('\t').map(Number);
    return { behind, ahead, hasUpdate: behind > 0 };
  } catch (e) {
    return { behind: 0, ahead: 0, hasUpdate: false };
  }
}

/**
 * 检查 OpenCode 源码更新
 */
async function checkSourceUpdate() {
  const opencodeDir = getOpencodeDir();

  if (!exists(opencodeDir) {
    return { hasUpdate: false, localCommit: null, remoteCommit: null };
  }

  try {
    // 获取本地最新提交
    const localCommit = getLatestCommit(opencodeDir);

    // 获取远程最新提交
    exec('git fetch origin', {
      cwd: opencodeDir,
      stdio: 'pipe',
    });
    const remoteCommit = exec('git rev-parse origin/main', {
      cwd: opencodeDir,
      stdio: 'pipe',
    }).trim();

    const hasUpdate = localCommit !== remoteCommit;

    return { hasUpdate, localCommit, remoteCommit };
  } catch (e) {
    return { hasUpdate: false, localCommit: null, remoteCommit: null };
  }
}

/**
 * 获取项目状态信息
 */
async function getProjectStatus() {
  const projectDir = getProjectDir();
  const opencodeDir = getOpencodeDir();
  const i18nDir = getI18nDir();
  const binDir = getBinDir();

  // 检查各目录状态
  const hasSource = exists(opencodeDir) && isGitRepo(opencodeDir);
  const hasI18n = exists(i18nDir);
  const hasBin = exists(binDir);

  // 获取源码版本
  let sourceVersion = '[未安装]';
  if (hasSource) {
    try {
      const count = getCommitCount(opencodeDir);
      sourceVersion = `main (${count})`;
    } catch (e) {
      sourceVersion = 'main';
    }
  }

  // 获取汉化配置数量
  let i18nCount = 0;
  if (hasI18n) {
    const I18n = require('./i18n.js');
    const i18n = new I18n();
    const stats = i18n.getStats();
    i18nCount = stats.totalConfigs;
  }

  // 检查更新
  const scriptUpdate = await checkScriptUpdate();
  const sourceUpdate = await checkSourceUpdate();

  return {
    projectDir,
    opencodeDir,
    i18nDir,
    binDir,
    hasSource,
    hasI18n,
    hasBin,
    sourceVersion,
    i18nCount,
    scriptUpdate,
    sourceUpdate,
  };
}

/**
 * 显示主菜单
 */
async function showMainMenu() {
  // 清屏
  console.clear();

  const status = await getProjectStatus();

  // 显示标题
  const line = '═'.repeat(56);
  console.log('');
  console.log('╔' + line + '╗');
  console.log('║' + ' '.repeat(56) + '║');
  console.log('║' + '        OpenCode 中文版 - 汉化管理工具 v' + getLocalVersion() + '        '.repeat(56 - 44 - getLocalVersion().length) + '║');
  console.log('║' + ' '.repeat(56) + '║');
  console.log('╚' + line + '╝');
  console.log('');

  // 显示更新提示
  if (status.scriptUpdate.hasUpdate) {
    log(`[!] 脚本有 ${status.scriptUpdate.behind} 个新提交，建议更新`, 'yellow');
  }
  if (status.sourceUpdate.hasUpdate) {
    log(`[!] OpenCode 源码有更新`, 'yellow');
  }
  if (!status.scriptUpdate.hasUpdate && !status.sourceUpdate.hasUpdate) {
    log(`[v] 已是最新版本`, 'green');
  }
  console.log('');

  // 显示状态
  console.log('  [当前状态]');
  console.log(`    源码: ${status.hasSource ? '[OK] ' + status.sourceVersion : '[--] 未安装'}`);
  console.log(`    汉化: ${status.hasI18n ? '[OK] ' + status.i18nCount + ' 个配置' : '[--] 未找到'}`);
  console.log(`    编译: ${status.hasBin ? '[OK] 已部署' : '[--] 未编译'}`);
  console.log('');

  // 菜单选项
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '  请选择操作:',
      choices: [
        { name: '[>>] 完整工作流 (更新 -> 恢复 -> 汉化 -> 编译)', value: 'full', short: '完整工作流' },
        { name: '[DL] 更新 OpenCode 源码', value: 'update', short: '更新源码' },
        { name: '[CN] 应用汉化配置', value: 'apply', short: '应用汉化' },
        { name: '[BD] 编译构建', value: 'build', short: '编译构建' },
        { name: '[CK] 验证汉化配置', value: 'verify', short: '验证配置' },
        { name: '[EV] 检查编译环境', value: 'env', short: '检查环境' },
        { name: '[CF] 显示项目配置', value: 'config', short: '显示配置' },
        { name: '[UP] 更新汉化脚本', value: 'update-script', short: '更新脚本' },
        new inquirer.Separator(),
        { name: '[XX] 退出', value: 'exit', short: '退出' },
      ],
      pageSize: 12,
    },
  ]);

  return action;
}

/**
 * 显示选项菜单
 */
async function showOptionsMenu(title, choices) {
  console.clear();
  console.log('');
  console.log(`  ${title}`);
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '  请选择:',
      choices: [...choices, { name: '[<<] 返回主菜单', value: 'back' }],
      pageSize: 10,
    },
  ]);

  return action;
}

/**
 * 执行完整工作流
 */
async function runFullWorkflow() {
  console.clear();
  console.log('');

  const line2 = '═'.repeat(50);
  console.log('╔' + line2 + '╗');
  console.log('║' + '              完整工作流流程              '.center(50) + '║');
  console.log('╠' + line2 + '╣');
  console.log('║' + '  更新源码 -> 恢复纯净 -> 应用汉化 -> 编译构建  '.center(50) + '║');
  console.log('╚' + line2 + '╝');
  console.log('');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '  确认开始完整工作流?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log('  [已取消]');
    await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
    return;
  }

  try {
    const fullCmd = require('../commands/full.js');
    await fullCmd.run({});

    console.log('');
    const { again } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'again',
        message: '  工作流完成! 是否返回主菜单?',
        default: true,
      },
    ]);

    if (!again) {
      console.log('');
      console.log('  [退出]');
      console.log('');
      process.exit(0);
    }
  } catch (e) {
    error(`工作流失败: ${e.message}`);
    await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
  }
}

/**
 * 更新汉化脚本
 */
async function updateScript() {
  console.clear();
  console.log('');
  console.log('  更新汉化脚本');
  console.log('');

  try {
    const { getProjectDir } = require('./utils');
    const projectDir = getProjectDir();

    step('拉取最新代码');

    const { exec: execSync } = require('child_process');

    execSync('git fetch origin', {
      cwd: projectDir,
      stdio: 'inherit',
    });

    execSync('git reset --hard origin/main', {
      cwd: projectDir,
      stdio: 'inherit',
    });

    success('脚本已更新到最新版本');
    console.log('');
    console.log('  请重新运行: opencodenpm');
    console.log('');

    process.exit(0);
  } catch (e) {
    error(`更新失败: ${e.message}`);
    await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
  }
}

/**
 * 运行交互式菜单
 */
async function run() {
  while (true) {
    try {
      const action = await showMainMenu();

      switch (action) {
        case 'full':
          await runFullWorkflow();
          break;

        case 'update': {
          console.clear();
          step('更新 OpenCode 源码');
          const updateCmd = require('../commands/update.js');
          await updateCmd.run({});
          await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
          break;
        }

        case 'apply': {
          console.clear();
          step('应用汉化配置');
          const applyCmd = require('../commands/apply.js');
          await applyCmd.run({});
          await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
          break;
        }

        case 'build': {
          console.clear();
          const options = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'deploy',
              message: '  编译后自动部署到本地 bin 目录?',
              default: true,
            },
          ]);
          step('编译构建');
          const buildCmd = require('../commands/build.js');
          await buildCmd.run({ deploy: options.deploy });
          await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
          break;
        }

        case 'verify': {
          console.clear();
          step('验证汉化配置');
          const verifyCmd = require('../commands/verify.js');
          await verifyCmd.run({ detailed: true });
          await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
          break;
        }

        case 'env': {
          console.clear();
          await checkEnvironment();
          await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
          break;
        }

        case 'config': {
          const status = await getProjectStatus();
          console.clear();
          console.log('');
          console.log('  [项目配置]');
          console.log(`    项目目录: ${status.projectDir}`);
          console.log(`    源码目录: ${status.opencodeDir}`);
          console.log(`    汉化目录: ${status.i18nDir}`);
          console.log(`    输出目录: ${status.binDir}`);
          console.log(`    脚本版本: ${getLocalVersion()}`);
          if (status.scriptUpdate.behind > 0) {
            console.log(`    脚本更新: 落后 ${status.scriptUpdate.behind} 个提交`, 'yellow');
          } else {
            console.log(`    脚本更新: 已是最新`, 'green');
          }
          console.log('');
          await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
          break;
        }

        case 'update-script':
          await updateScript();
          break;

        case 'exit':
          console.clear();
          console.log('');
          console.log('  [退出 OpenCode 中文汉化管理工具]');
          console.log('');
          process.exit(0);
      }
    } catch (e) {
      if (e.message === 'User force closed the prompt with 0 null') {
        console.log('');
        console.log('  [退出]');
        console.log('');
        process.exit(0);
      }
      error(`错误: ${e.message}`);
      await inquirer.prompt([{ type: 'input', name: 'continue', message: '  按回车返回...' }]);
    }
  }
}

module.exports = { run, showMainMenu, getProjectStatus, checkScriptUpdate, checkSourceUpdate };
