/**
 * 汉化应用模块
 *
 * 读取 opencode-i18n 配置并应用到源码
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const Version = require('./version.js');

class I18n {
  constructor() {
    this.projectDir = Version.getProjectDir();
    this.i18nDir = path.join(this.projectDir, 'opencode-i18n');
    this.opencodeDir = path.join(this.projectDir, 'opencode-zh-CN');
  }

  /**
   * 读取所有汉化配置文件
   */
  loadConfig() {
    if (!fs.existsSync(this.i18nDir)) {
      throw new Error(`汉化配置目录不存在: ${this.i18nDir}`);
    }

    const configs = [];

    // 遍历 opencode-i18n 目录
    const entries = fs.readdirSync(this.i18nDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const categoryDir = path.join(this.i18nDir, entry.name);
        const jsonFiles = glob.sync('*.json', { cwd: categoryDir });

        for (const file of jsonFiles) {
          const filePath = path.join(categoryDir, file);
          try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            configs.push({
              category: entry.name,
              file: file,
              ...content
            });
          } catch (error) {
            console.warn(`警告: 跳过无效配置 ${filePath}: ${error.message}`);
          }
        }
      }
    }

    return configs;
  }

  /**
   * 应用单个配置文件的替换规则
   */
  applyConfig(config) {
    if (!config.targetFile || !config.replacements) {
      return { files: 0, replacements: 0 };
    }

    const targetPath = path.join(this.opencodeDir, config.targetFile);

    if (!fs.existsSync(targetPath)) {
      console.warn(`  跳过: ${config.targetFile} (文件不存在)`);
      return { files: 0, replacements: 0 };
    }

    let content = fs.readFileSync(targetPath, 'utf-8');
    let replaceCount = 0;

    for (const replacement of config.replacements) {
      const { find, replace } = replacement;

      if (content.includes(find)) {
        content = content.replaceAll(find, replace);
        replaceCount++;
      }
    }

    if (replaceCount > 0) {
      fs.writeFileSync(targetPath, content, 'utf-8');
      console.log(`  ✓ ${config.targetFile} (${replaceCount} 处替换)`);
    }

    return { files: 1, replacements: replaceCount };
  }

  /**
   * 应用所有汉化配置
   */
  async apply() {
    const configs = this.loadConfig();

    if (configs.length === 0) {
      throw new Error('未找到任何汉化配置文件');
    }

    let totalFiles = 0;
    let totalReplacements = 0;

    for (const config of configs) {
      const result = this.applyConfig(config);
      totalFiles += result.files;
      totalReplacements += result.replacements;
    }

    return { files: totalFiles, replacements: totalReplacements };
  }

  /**
   * 验证配置完整性
   */
  validate() {
    const configs = this.loadConfig();
    const errors = [];

    for (const config of configs) {
      if (!config.targetFile) {
        errors.push(`${config.category}/${config.file}: 缺少 targetFile`);
      }
      if (!config.replacements || config.replacements.length === 0) {
        errors.push(`${config.category}/${config.file}: 缺少 replacements`);
      }
    }

    return errors;
  }
}

module.exports = I18n;
