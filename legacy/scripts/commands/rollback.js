/**
 * rollback 命令
 * 回滚到之前的备份
 */

const { createBackupManager } = require('../core/backup.js');
const { step, success, error, warn, indent } = require('../core/colors.js');

async function run(options = {}) {
  const { backupId = null, list = false } = options;

  const backupManager = createBackupManager();

  // 列出备份
  if (list) {
    step('已有备份列表');

    const backups = backupManager.listBackups();

    if (backups.length === 0) {
      warn('暂无备份');
      return true;
    }

    console.log('');
    console.log('| 备份ID | 创建时间 | 文件数 |');
    console.log('|--------|----------|--------|');

    for (const backup of backups) {
      const date = new Date(backup.created).toLocaleString('zh-CN');
      console.log(`| ${backup.id.slice(0, 20)}... | ${date} | ${backup.files.length} |`);
    }

    console.log('');
    const totalSize = backupManager.getBackupSize();
    console.log(`总占用: ${backupManager.formatSize(totalSize)}`);

    return true;
  }

  // 执行回滚
  step('执行回滚');

  try {
    const result = backupManager.restoreBackup(backupId);

    success(`回滚完成: ${result.restored.length} 个文件已恢复`);
    console.log(`  📁 备份ID: ${result.backupId}`);

    if (result.restored.length > 0 && result.restored.length <= 10) {
      console.log('  恢复的文件:');
      for (const file of result.restored) {
        indent(`    - ${file}`, 2);
      }
    }

    return true;
  } catch (err) {
    error(`回滚失败: ${err.message}`);
    return false;
  }
}

module.exports = { run };
