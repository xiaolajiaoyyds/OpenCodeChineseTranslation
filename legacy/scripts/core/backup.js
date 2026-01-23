/**
 * 备份和回滚模块
 * 在翻译前备份文件，支持失败后回滚
 */

const fs = require('fs');
const path = require('path');
const { step, success, error, warn, indent } = require('./colors.js');
const { getOpencodeDir } = require('./utils.js');

const BACKUP_DIR = '.i18n-backup';

/**
 * 备份管理器
 */
class BackupManager {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.dirname(getOpencodeDir());
    this.backupRoot = path.join(this.baseDir, BACKUP_DIR);
  }

  /**
   * 获取备份目录路径
   */
  getBackupDir(timestamp = null) {
    const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.backupRoot, ts);
  }

  /**
   * 创建备份
   * @param {string[]} files - 要备份的文件路径列表（相对于 opencodeDir）
   * @returns {Object} 备份信息
   */
  createBackup(files) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = this.getBackupDir(timestamp);

    // 创建备份目录
    fs.mkdirSync(backupDir, { recursive: true });

    const opencodeDir = getOpencodeDir();
    const backedUp = [];
    const skipped = [];

    for (const file of files) {
      const sourcePath = path.join(opencodeDir, file);

      if (!fs.existsSync(sourcePath)) {
        skipped.push(file);
        continue;
      }

      // 保持目录结构
      const targetPath = path.join(backupDir, file);
      const targetDir = path.dirname(targetPath);

      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      backedUp.push(file);
    }

    // 保存备份元信息
    const meta = {
      timestamp,
      created: new Date().toISOString(),
      files: backedUp,
      skipped,
    };
    fs.writeFileSync(
      path.join(backupDir, 'backup-meta.json'),
      JSON.stringify(meta, null, 2),
      'utf-8'
    );

    return {
      id: timestamp,
      dir: backupDir,
      files: backedUp,
      skipped,
    };
  }

  /**
   * 列出所有备份
   */
  listBackups() {
    if (!fs.existsSync(this.backupRoot)) {
      return [];
    }

    const entries = fs.readdirSync(this.backupRoot, { withFileTypes: true });
    const backups = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metaPath = path.join(this.backupRoot, entry.name, 'backup-meta.json');
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            backups.push({
              id: entry.name,
              ...meta,
            });
          } catch (e) {
            // 忽略损坏的备份
          }
        }
      }
    }

    // 按时间倒序排列
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    return backups;
  }

  /**
   * 获取最新备份
   */
  getLatestBackup() {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * 回滚到指定备份
   * @param {string} backupId - 备份ID（时间戳）
   */
  restoreBackup(backupId = null) {
    let backup;

    if (backupId) {
      const backups = this.listBackups();
      backup = backups.find(b => b.id === backupId);
    } else {
      backup = this.getLatestBackup();
    }

    if (!backup) {
      throw new Error(backupId ? `备份 ${backupId} 不存在` : '没有可用的备份');
    }

    const backupDir = path.join(this.backupRoot, backup.id);
    const opencodeDir = getOpencodeDir();
    const restored = [];

    for (const file of backup.files) {
      const sourcePath = path.join(backupDir, file);
      const targetPath = path.join(opencodeDir, file);

      if (fs.existsSync(sourcePath)) {
        // 确保目标目录存在
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(sourcePath, targetPath);
        restored.push(file);
      }
    }

    return {
      backupId: backup.id,
      restored,
    };
  }

  /**
   * 删除指定备份
   */
  deleteBackup(backupId) {
    const backupDir = path.join(this.backupRoot, backupId);

    if (!fs.existsSync(backupDir)) {
      throw new Error(`备份 ${backupId} 不存在`);
    }

    fs.rmSync(backupDir, { recursive: true, force: true });
    return true;
  }

  /**
   * 清理旧备份（保留最近 N 个）
   */
  cleanOldBackups(keepCount = 5) {
    const backups = this.listBackups();
    const toDelete = backups.slice(keepCount);
    const deleted = [];

    for (const backup of toDelete) {
      try {
        this.deleteBackup(backup.id);
        deleted.push(backup.id);
      } catch (e) {
        // 忽略删除失败
      }
    }

    return deleted;
  }

  /**
   * 获取备份占用空间
   */
  getBackupSize() {
    if (!fs.existsSync(this.backupRoot)) {
      return 0;
    }

    let totalSize = 0;

    const calcSize = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          calcSize(fullPath);
        } else {
          totalSize += fs.statSync(fullPath).size;
        }
      }
    };

    calcSize(this.backupRoot);
    return totalSize;
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * 创建备份管理器实例
 */
function createBackupManager(baseDir = null) {
  return new BackupManager(baseDir);
}

module.exports = {
  BackupManager,
  createBackupManager,
  BACKUP_DIR,
};
