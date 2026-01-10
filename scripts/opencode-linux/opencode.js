#!/usr/bin/env node
/**
 * OpenCode 中文汉化管理工具 - Linux 版本
 *
 * 功能：
 * - 更新检测（脚本版本 + OpenCode 版本）
 * - 源码拉取
 * - 应用汉化
 * - 编译构建
 * - 汉化验证
 */

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

// 核心模块
const Env = require('./lib/env.js');
const Git = require('./lib/git.js');
const I18n = require('./lib/i18n.js');
const Build = require('./lib/build.js');
const Verify = require('./lib/verify.js');
const Version = require('./lib/version.js');

// ==================== 工具函数 ====================

/**
 * 打印标题
 */
function printHeader() {
  console.log('');
  console.log(chalk.cyan('╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.white.bold('       OpenCode 中文汉化管理工具 - Linux 版本           ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * 打印分隔线
 */
function printSeparator() {
  console.log(chalk.cyan('─────────────────────────────────────────────────────────────────'));
}

// ==================== 命令处理 ====================

/**
 * 更新源码
 */
async function cmdUpdate() {
  const spinner = ora('拉取 OpenCode 源码').start();

  try {
    const git = new Git();
    const updated = await git.pull();

    spinner.succeed(`源码已${updated ? '更新' : '是最新'}`);
  } catch (error) {
    spinner.fail(`拉取失败: ${error.message}`);
    throw error;
  }
}

/**
 * 应用汉化
 */
async function cmdApply() {
  const spinner = ora('应用汉化配置').start();

  try {
    const i18n = new I18n();
    const result = await i18n.apply();

    spinner.succeed(`汉化完成: ${result.files} 个文件, ${result.replacements} 处替换`);
  } catch (error) {
    spinner.fail(`汉化失败: ${error.message}`);
    throw error;
  }
}

/**
 * 编译构建
 */
async function cmdBuild() {
  const spinner = ora('编译构建').start();

  try {
    const build = new Build();
    await build.run();

    spinner.succeed('编译完成');
  } catch (error) {
    spinner.fail(`编译失败: ${error.message}`);
    throw error;
  }
}

/**
 * 验证汉化
 */
async function cmdVerify() {
  const spinner = ora('验证汉化').start();

  try {
    const verify = new Verify();
    const result = await verify.check();

    spinner.succeed(`验证完成: 覆盖率 ${result.coverage}%`);
    console.log('');
    console.log(`  - 已翻译: ${result.translated}`);
    console.log(`  - 未翻译: ${result.untranslated}`);
  } catch (error) {
    spinner.fail(`验证失败: ${error.message}`);
    throw error;
  }
}

/**
 * 一键全流程
 */
async function cmdFull() {
  printHeader();

  // 1. 环境检查
  const envCheck = await Env.check();
  if (!envCheck.ok) {
    console.log(chalk.red('环境检查失败:'));
    envCheck.errors.forEach(e => console.log(chalk.red(`  - ${e}`)));
    return;
  }

  // 2. 版本检测
  const version = await Version.check();
  console.log(`脚本版本: ${chalk.cyan(version.script)}`);
  console.log(`OpenCode版本: ${chalk.cyan(version.opencode)}`);
  console.log('');

  // 3. 拉取源码
  await cmdUpdate();

  // 4. 应用汉化
  await cmdApply();

  // 5. 编译构建
  await cmdBuild();

  // 6. 验证汉化
  await cmdVerify();

  console.log('');
  console.log(chalk.green('✓ 全部完成!'));
}

// ==================== CLI 配置 ====================

program
  .name('opencode')
  .description('OpenCode 中文汉化管理工具')
  .version('1.0.0');

program
  .command('update')
  .description('拉取最新源码')
  .action(cmdUpdate);

program
  .command('apply')
  .description('应用汉化配置')
  .action(cmdApply);

program
  .command('build')
  .description('编译构建')
  .action(cmdBuild);

program
  .command('verify')
  .description('验证汉化覆盖率')
  .action(cmdVerify);

program
  .command('full')
  .description('一键全流程')
  .action(cmdFull);

// 默认执行交互菜单
program.action(async () => {
  printHeader();

  // 环境检查
  const envCheck = await Env.check();
  if (!envCheck.ok) {
    console.log(chalk.red('环境检查失败:'));
    envCheck.errors.forEach(e => console.log(chalk.red(`  ✗ ${e}`)));
    console.log('');
    if (envCheck.warnings.length > 0) {
      console.log(chalk.yellow('警告:'));
      envCheck.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));
    }
    return;
  }

  // 显示环境信息
  console.log(chalk.cyan('环境信息:'));
  console.log(`  Node.js: ${chalk.green(envCheck.node)}`);
  if (envCheck.bun) {
    console.log(`  Bun: ${chalk.green(envCheck.bun)}`);
  }
  console.log(`  项目目录: ${chalk.gray(envCheck.projectDir)}`);
  console.log('');

  // 显示版本信息
  try {
    const version = await Version.check();
    console.log(chalk.cyan('版本信息:'));
    console.log(`  脚本版本: ${chalk.yellow(version.script)}`);
    console.log(`  OpenCode: ${chalk.yellow(version.opencode)}`);
    if (version.updateAvailable) {
      console.log(`  ${chalk.green('○')} 有新版本可用 (${version.remote})`);
    }
    console.log('');
  } catch (e) {
    // 版本检查失败不影响菜单显示
  }

  const { default: inquirer } = await import('inquirer');

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      choices: [
        { name: '🚀 一键全流程', value: 'full' },
        { name: '📥 拉取源码', value: 'update' },
        { name: '🌏 应用汉化', value: 'apply' },
        { name: '🔨 编译构建', value: 'build' },
        { name: '✓ 验证汉化', value: 'verify' },
        { name: '✕ 退出', value: 'exit' }
      ]
    }
  ]);

  if (answer.action === 'exit') {
    console.log('再见!');
    return;
  }

  try {
    switch (answer.action) {
      case 'full': await cmdFull(); break;
      case 'update': await cmdUpdate(); break;
      case 'apply': await cmdApply(); break;
      case 'build': await cmdBuild(); break;
      case 'verify': await cmdVerify(); break;
    }
  } catch (error) {
    console.error(chalk.red('执行失败:'), error.message);
    process.exit(1);
  }
});

// ==================== 主入口 ====================

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('错误:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { program, cmdUpdate, cmdApply, cmdBuild, cmdVerify, cmdFull };
