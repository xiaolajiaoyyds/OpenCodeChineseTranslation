/**
 * apply 命令 (增强版)
 * 应用汉化配置到源码，支持备份、报告和严格模式
 */

const I18n = require('../core/i18n.js');
const { createReporter } = require('../core/reporter.js');
const { createBackupManager } = require('../core/backup.js');
const { step, success, error, warn } = require('../core/colors.js');
const path = require('path');

async function run(options = {}) {
  const {
    silent = false,
    backup = false,
    report = false,
    strict = false,
    dryRun = false,
    checkVariables = true,
  } = options;

  const i18n = new I18n();

  // 1. 备份（如果启用）
  if (backup && !dryRun) {
    step('创建备份');

    const backupManager = createBackupManager();
    const configs = i18n.loadConfig();

    // 收集所有目标文件
    const filesToBackup = [];
    for (const config of configs) {
      if (config.file) {
        let relativePath = config.file;
        if (!relativePath.startsWith('packages/')) {
          relativePath = path.join('packages/opencode', relativePath);
        }
        filesToBackup.push(relativePath);
      }
    }

    try {
      const backupResult = backupManager.createBackup(filesToBackup);
      success(`备份完成: ${backupResult.files.length} 个文件`);
      console.log(`  📁 备份ID: ${backupResult.id}`);

      // 清理旧备份
      const deleted = backupManager.cleanOldBackups(5);
      if (deleted.length > 0) {
        console.log(`  🗑️ 清理了 ${deleted.length} 个旧备份`);
      }
    } catch (err) {
      warn(`备份失败: ${err.message}`);
      // 继续执行，备份失败不阻止翻译
    }
  }

  // 2. 应用汉化
  const result = await i18n.apply({
    silent,
    dryRun,
    checkVariables,
    strict,
  });

  // 3. 生成报告（如果启用）
  if (report && !silent) {
    const reporter = createReporter(result);

    // 打印控制台报告
    reporter.printConsole();

    // 保存 Markdown 报告
    const reportPath = path.join(process.cwd(), 'i18n-report.md');
    reporter.saveToFile(reportPath);
  }

  return result;
}

module.exports = { run };
