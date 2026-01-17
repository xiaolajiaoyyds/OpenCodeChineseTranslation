/**
 * CLI 入口模块
 */

const path = require('path');
const { Command } = require('commander');
const { error } = require('./colors.js');
const { run: runMenu } = require('./menu.js');

const pkg = require('../package.json');

// 加载 .env 配置（从项目根目录）
try {
  const dotenv = require('dotenv');
  const projectRoot = path.resolve(__dirname, '../../');
  dotenv.config({ path: path.join(projectRoot, '.env') });
} catch (e) {
  // dotenv 未安装或 .env 不存在，不影响其他功能
}

const updateCmd = require('../commands/update.js');
const applyCmd = require('../commands/apply.js');
const buildCmd = require('../commands/build.js');
const verifyCmd = require('../commands/verify.js');
const fullCmd = require('../commands/full.js');
const deployCmd = require('../commands/deploy.js');
const syncCmd = require('../commands/sync.js');
const checkCmd = require('../commands/check.js');

function createCLI() {
  const program = new Command();

  program
    .name('opencodenpm')
    .description('OpenCode 汉化工具')
    .version(pkg.version)
    .action(async () => {
      // 无参数时显示交互菜单
      await runMenu();
    });

  // update - 更新源码
  program
    .command('update')
    .description('更新 OpenCode 源码')
    .option('-f, --force', '强制重新克隆')
    .action(async (options) => {
      try {
        const result = await updateCmd.run(options);
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // apply - 应用汉化
  program
    .command('apply')
    .description('应用汉化（扫描→AI翻译→写入语言包→验证→替换）')
    .option('-s, --silent', '静默模式')
    .option('--skip-verify', '跳过配置验证')
    .option('--skip-translate', '跳过 AI 翻译')
    .option('--auto-translate', '自动翻译（不询问）')
    .option('--dry-run', '测试模式，只扫描不翻译')
    .option('-i, --incremental', '增量模式，只翻译变更文件')
    .option('--since <commit>', '增量起点（git commit）')
    .action(async (options) => {
      try {
        const result = await applyCmd.run(options);
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // build - 编译
  program
    .command('build')
    .description('编译 OpenCode')
    .option('--no-deploy', '不部署到本地 bin')
    .option('-s, --silent', '静默模式')
    .action(async (options) => {
      try {
        const result = await buildCmd.run(options);
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // verify - 验证配置
  program
    .command('verify')
    .description('验证汉化配置')
    .option('-d, --detailed', '显示详细信息')
    .option('-t, --translate', '自动翻译新文件（需配置 OPENAI_API_KEY）')
    .option('--dry-run', '测试模式，不保存配置文件')
    .action(async (options) => {
      try {
        const result = await verifyCmd.run(options);
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // full - 完整流程
  program
    .command('full')
    .description('完整流程：更新 → 汉化 → 编译')
    .option('--skip-update', '跳过更新')
    .option('--skip-build', '跳过编译')
    .option('-y, --auto', '自动模式')
    .action(async (options) => {
      try {
        const result = await fullCmd.run(options);
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // deploy - 部署到系统
  program
    .command('deploy')
    .description('部署到系统全局')
    .action(async () => {
      try {
        const result = await deployCmd.run();
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // sync - 同步官方版本
  program
    .command('sync')
    .description('同步官方版本')
    .option('-y, --yes', '自动确认')
    .option('--check-only', '仅检查')
    .action(async (options) => {
      try {
        const result = await syncCmd.run(options);
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // check - 检查遗漏翻译 / 翻译质量
  program
    .command('check')
    .description('检查遗漏翻译或审查翻译质量')
    .option('-v, --verbose', '显示详细信息')
    .option('-o, --output <file>', '导出报告到文件')
    .option('--all', '扫描所有源码（不仅是 TUI）')
    .option('-q, --quality', 'AI 审查翻译质量')
    .option('--limit <n>', '质量检查抽样数量', '50')
    .action(async (options) => {
      try {
        const result = await checkCmd.run({
          verbose: options.verbose,
          output: options.output,
          tuiOnly: !options.all,
          quality: options.quality,
          limit: parseInt(options.limit, 10) || 50,
        });
        process.exit(result ? 0 : 1);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  return program;
}

function run() {
  const program = createCLI();
  program.parseAsync(process.argv).catch((err) => {
    error(err.message);
    process.exit(1);
  });
}

module.exports = { createCLI, run };
