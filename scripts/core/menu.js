/**
 * 交互式菜单
 */

const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { log } = require('./colors.js');
const { getOpencodeDir, exists } = require('./utils.js');

const updateCmd = require('../commands/update.js');
const applyCmd = require('../commands/apply.js');
const buildCmd = require('../commands/build.js');
const verifyCmd = require('../commands/verify.js');
const fullCmd = require('../commands/full.js');
const deployCmd = require('../commands/deploy.js');
const syncCmd = require('../commands/sync.js');
const checkCmd = require('../commands/check.js');
const Translator = require('./translator.js');

/**
 * 获取当前版本号
 */
function getVersion() {
  try {
    const pkgPath = path.join(getOpencodeDir(), 'packages', 'opencode', 'package.json');
    if (exists(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return `${pkg.version}-zh`;
    }
  } catch (e) {}
  return '未知版本';
}

// 主菜单项
const MENU_ITEMS = [
  { name: '🚀 一键汉化 - 完整流程（同步→汉化→编译→部署）', value: 'full' },
  new inquirer.Separator('─── 分步操作 ───'),
  { name: '🔄 同步官方 - 拉取最新代码（会重置汉化，需重新应用）', value: 'sync' },
  { name: '🌐 应用汉化 - AI翻译 + 替换源码', value: 'apply' },
  { name: '⚡ 增量翻译 - 只翻译 git 变更的文件', value: 'incremental' },
  { name: '🔨 编译构建 - 生成可执行文件', value: 'build' },
  { name: '📦 部署系统 - 安装到 PATH', value: 'deploy' },
  new inquirer.Separator('─── 质量工具 ───'),
  { name: '🔍 质量检查 - AI 审查翻译质量', value: 'quality' },
  { name: '📋 遗漏扫描 - 检查未翻译的文本', value: 'check' },
  new inquirer.Separator(),
  { name: '❌ 退出', value: 'exit' },
];

// 定义每个操作的下一步建议
const NEXT_STEP_MAP = {
  sync: {
    recommended: 'apply',
    choices: ['apply', 'incremental', 'menu', 'exit'],
    labels: { apply: '应用汉化', incremental: '增量翻译', menu: '返回菜单', exit: '退出' }
  },
  apply: {
    recommended: 'build',
    choices: ['build', 'quality', 'menu', 'exit'],
    labels: { build: '编译构建', quality: '质量检查', menu: '返回菜单', exit: '退出' }
  },
  incremental: {
    recommended: 'build',
    choices: ['build', 'apply', 'menu', 'exit'],
    labels: { build: '编译构建', apply: '全量汉化', menu: '返回菜单', exit: '退出' }
  },
  build: {
    recommended: 'deploy',
    choices: ['deploy', 'apply', 'menu', 'exit'],
    labels: { deploy: '部署系统', apply: '重新汉化', menu: '返回菜单', exit: '退出' }
  },
  deploy: {
    recommended: 'menu',
    choices: ['menu', 'sync', 'exit'],
    labels: { menu: '返回菜单', sync: '同步官方', exit: '退出' }
  },
  full: {
    recommended: 'menu',
    choices: ['menu', 'exit'],
    labels: { menu: '返回菜单', exit: '退出' }
  },
  quality: {
    recommended: 'menu',
    choices: ['apply', 'menu', 'exit'],
    labels: { apply: '应用汉化', menu: '返回菜单', exit: '退出' }
  },
  check: {
    recommended: 'apply',
    choices: ['apply', 'menu', 'exit'],
    labels: { apply: '应用汉化', menu: '返回菜单', exit: '退出' }
  }
};

async function runCommand(cmd) {
  console.log('');
  
  try {
    switch (cmd) {
      case 'full':
        await fullCmd.run({ auto: false });
        break;
      case 'sync':
        await syncCmd.run({});
        break;
      case 'apply':
        await applyCmd.run({});
        break;
      case 'incremental':
        // 增量翻译
        await applyCmd.run({ incremental: true });
        break;
      case 'build':
        await buildCmd.run({});
        break;
      case 'deploy':
        await deployCmd.run({});
        break;
      case 'quality':
        // 翻译质量检查
        const translator = new Translator();
        await translator.showQualityReport();
        break;
      case 'check':
        // 遗漏扫描
        await checkCmd.run({ verbose: false });
        break;
      case 'exit':
        console.log('再见~ 👋');
        process.exit(0);
      case 'menu':
        return 'menu';
    }
    return 'success';
  } catch (e) {
    console.error(`执行失败: ${e.message}`);
    return 'error';
  }
}

async function askNextStep(currentCmd) {
  const nextStepConfig = NEXT_STEP_MAP[currentCmd];
  
  const defaultConfig = {
    recommended: 'menu',
    choices: ['menu', 'exit'],
    labels: { menu: '返回菜单', exit: '退出' }
  };

  const config = nextStepConfig || defaultConfig;
  const choices = config.choices;
  const labels = config.labels;
  let currentIndex = choices.indexOf(config.recommended);
  if (currentIndex === -1) currentIndex = 0;

  // 使用 inquirer 的 rawlist 改为自定义实现
  // 但为了避免 stdin 冲突，用 inquirer 的 list 配合水平显示
  const choiceItems = choices.map((c, i) => ({
    name: labels[c],
    value: c,
    short: labels[c]
  }));

  // 分隔线
  console.log('');
  console.log('  ─────────────────────────────────────────');

  const { next } = await inquirer.prompt([
    {
      type: 'list',
      name: 'next',
      message: '下一步:',
      choices: choiceItems,
      default: config.recommended,
      pageSize: choices.length
    }
  ]);

  return next;
}

async function showMenu() {
  console.clear();
  console.log('');
  const version = getVersion();
  const title = `OpenCode 汉化工具 v${version}`;
  const padding = Math.max(0, 34 - title.length);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  
  log('╔════════════════════════════════════╗', 'cyan');
  log(`║${' '.repeat(left)} ${title} ${' '.repeat(right)}║`, 'cyan');
  log('╚════════════════════════════════════╝', 'cyan');
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '选择操作:',
      choices: MENU_ITEMS,
      pageSize: 15,  // 增大显示数量，避免循环滚动
      loop: false,   // 禁止循环
    },
  ]);

  if (action === 'exit') {
    console.log('再见~ 👋');
    process.exit(0);
  }

  // 执行命令
  await runCommand(action);

  // 询问下一步
  let nextAction = await askNextStep(action);
  
  // 循环执行直到返回菜单或退出
  while (nextAction !== 'menu' && nextAction !== 'exit') {
    await runCommand(nextAction);
    nextAction = await askNextStep(nextAction);
  }

  if (nextAction === 'menu') {
    await showMenu();
  } else {
    console.log('再见~ 👋');
  }
}

async function run() {
  await showMenu();
}

module.exports = { run };
