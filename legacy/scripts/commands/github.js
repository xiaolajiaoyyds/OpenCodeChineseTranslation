/**
 * github 命令
 * 打开汉化项目的 GitHub 仓库
 */

const { step, success, log } = require('../core/colors.js');
const { exec } = require('../core/utils.js');
const { getPlatform } = require('../core/utils.js');

// 项目仓库地址
const GITHUB_URL = 'https://github.com/1186258278/OpenCodeChineseTranslation';
const GITEE_URL = 'https://gitee.com/QtCodeCreators/OpenCodeChineseTranslation';

/**
 * 打开 URL
 */
function openUrl(url) {
  const { isWindows, isMacOS } = getPlatform();

  try {
    if (isWindows) {
      exec(`start "" "${url}"`, { stdio: 'pipe' });
    } else if (isMacOS) {
      exec(`open "${url}"`, { stdio: 'pipe' });
    } else {
      // Linux
      exec(`xdg-open "${url}"`, { stdio: 'pipe' });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 打开 GitHub 仓库
 */
async function openGitHub(options = {}) {
  const { gitee = false } = options;

  const url = gitee ? GITEE_URL : GITHUB_URL;
  const platform = gitee ? 'Gitee' : 'GitHub';

  step(`打开 ${platform} 仓库`);
  log(`  ${url}`, 'cyan');

  const opened = openUrl(url);

  if (opened) {
    success(`已在浏览器中打开 ${platform}`);
  } else {
    log(`  请手动访问: ${url}`, 'yellow');
  }

  console.log('');
  log(`${'═'.repeat(50)}`, 'cyan');
  log('  OpenCode 中文汉化项目', 'cyan');
  log(`${'═'.repeat(50)}`, 'cyan');
  console.log('');

  log('  项目地址:', 'white');
  log(`    GitHub: ${GITHUB_URL}`, 'dim');
  log(`    Gitee:  ${GITEE_URL}`, 'dim');
  console.log('');

  log('  欢迎:', 'yellow');
  log('    ⭐ Star 支持项目', 'dim');
  log('    🐛 提交 Issue 反馈问题', 'dim');
  log('    🔀 提交 PR 贡献代码', 'dim');
  console.log('');

  return true;
}

/**
 * 主运行函数
 */
async function run(options = {}) {
  return await openGitHub(options);
}

module.exports = {
  run,
  openGitHub,
  openUrl,
  GITHUB_URL,
  GITEE_URL,
};
