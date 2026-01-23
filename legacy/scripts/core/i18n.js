/**
 * 汉化处理模块 (增强版)
 * 读取 opencode-i18n 配置并应用到源码
 *
 * 新增功能:
 * - 详细的错误收集和报告
 * - 变量保护检测
 * - 翻译统计
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { getI18nDir, getOpencodeDir } = require('./utils.js');
const { step, success, error, indent, warn } = require('./colors.js');
const { ErrorType, ErrorCollector } = require('./errors.js');
const { validateTranslation } = require('./variable-guard.js');

class I18n {
  constructor() {
    this.i18nDir = getI18nDir();
    this.opencodeDir = getOpencodeDir();
    this.errorCollector = new ErrorCollector();
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
              fileName: file,
              configPath: filePath,
              ...content
            });
          } catch (err) {
            this.errorCollector.configInvalid(
              `${entry.name}/${file}`,
              `JSON 解析失败: ${err.message}`
            );
          }
        }
      }
    }

    return configs;
  }

  /**
   * 应用单个配置文件的替换规则
   * @returns {Object} 详细的替换结果
   */
  applyConfig(config, options = {}) {
    const { dryRun = false, checkVariables = true } = options;

    const result = {
      file: config.file,
      configFile: `${config.category}/${config.fileName}`,
      success: false,
      replacements: {
        total: 0,
        success: 0,
        failed: 0,
      },
      skipped: false,
      skipReason: null,
      variableIssues: [],
    };

    // 使用 'file' 字段（不是 'targetFile'）
    if (!config.file || !config.replacements) {
      result.skipped = true;
      result.skipReason = '缺少 file 或 replacements 字段';
      return result;
    }

    // OpenCode 源码在 packages/opencode/ 目录
    let relativePath = config.file;
    if (!relativePath.startsWith('packages/')) {
      relativePath = path.join('packages/opencode', relativePath);
    }

    const targetPath = path.join(this.opencodeDir, relativePath);

    if (!fs.existsSync(targetPath)) {
      result.skipped = true;
      result.skipReason = '目标文件不存在';
      this.errorCollector.fileNotFound(config.file, result.configFile);
      return result;
    }

    let content = fs.readFileSync(targetPath, 'utf-8');
    // 规范化换行符：统一使用 LF
    content = content.replace(/\r\n/g, '\n');
    const originalContent = content;

    result.replacements.total = Object.keys(config.replacements).length;

    // 变量检测
    if (checkVariables) {
      for (const [find, replace] of Object.entries(config.replacements)) {
        const validation = validateTranslation(find, replace);
        if (!validation.valid) {
          result.variableIssues.push({
            original: find,
            translated: replace,
            issues: validation.issues,
          });
          this.errorCollector.variableCorrupted(
            config.file,
            find,
            replace,
            { expected: validation.expected, actual: validation.actual }
          );
        }
      }
    }

    // 应用替换
    for (const [find, replace] of Object.entries(config.replacements)) {
      // 规范化查找字符串中的换行符
      const normalizedFind = find.replace(/\r\n/g, '\n');

      // 判断是否为简单单词（只包含字母和数字）
      const isSimpleWord = /^[a-zA-Z0-9]+$/.test(normalizedFind);

      let matched = false;

      if (isSimpleWord) {
        // 简单单词使用单词边界
        const wordBoundaryPattern = new RegExp(`\\b${normalizedFind}\\b`, 'g');
        if (wordBoundaryPattern.test(content)) {
          if (!dryRun) {
            content = content.replace(wordBoundaryPattern, replace);
          }
          matched = true;
        }
      } else {
        // 复杂模式使用普通替换
        if (content.includes(normalizedFind)) {
          if (!dryRun) {
            content = content.replaceAll(normalizedFind, replace);
          }
          matched = true;
        }
      }

      if (matched) {
        result.replacements.success++;
      } else {
        result.replacements.failed++;
        this.errorCollector.patternNotFound(config.file, find, result.configFile);
      }
    }

    // 写入文件
    if (!dryRun && content !== originalContent) {
      fs.writeFileSync(targetPath, content, 'utf-8');
    }

    result.success = result.replacements.success > 0;
    return result;
  }

  /**
   * 应用所有汉化配置
   * @param {Object} options - 选项
   * @param {boolean} options.silent - 静默模式
   * @param {boolean} options.dryRun - 模拟运行，不实际修改文件
   * @param {boolean} options.checkVariables - 检查变量保护
   * @param {boolean} options.strict - 严格模式，有错误则失败
   * @returns {Object} 详细的应用结果
   */
  async apply(options = {}) {
    const {
      silent = false,
      dryRun = false,
      checkVariables = true,
      strict = false,
    } = options;

    // 清空错误收集器
    this.errorCollector.clear();

    if (!silent) {
      step(dryRun ? '模拟应用汉化配置' : '应用汉化配置');
    }

    const configs = this.loadConfig();

    if (configs.length === 0) {
      throw new Error('未找到任何汉化配置文件');
    }

    if (!silent) {
      console.log(`找到 ${configs.length} 个配置文件`);
    }

    const results = [];
    const stats = {
      files: { total: 0, success: 0, skipped: 0, failed: 0 },
      replacements: { total: 0, success: 0, failed: 0 },
      variableIssues: 0,
    };

    for (const config of configs) {
      const result = this.applyConfig(config, { dryRun, checkVariables });
      results.push(result);

      stats.files.total++;
      if (result.skipped) {
        stats.files.skipped++;
      } else if (result.success) {
        stats.files.success++;
        if (!silent) {
          console.log(`  ✓ ${config.file} (${result.replacements.success}/${result.replacements.total} 处替换)`);
        }
      } else {
        stats.files.failed++;
      }

      stats.replacements.total += result.replacements.total;
      stats.replacements.success += result.replacements.success;
      stats.replacements.failed += result.replacements.failed;
      stats.variableIssues += result.variableIssues.length;
    }

    // 构建返回结果
    const finalResult = {
      success: !this.errorCollector.hasErrors() || !strict,
      dryRun,
      stats,
      results,
      errors: this.errorCollector.errors.map(e => e.toJSON()),
      warnings: this.errorCollector.warnings.map(w => w.toJSON()),
      errorStats: this.errorCollector.getStats(),
    };

    if (!silent) {
      // 输出统计
      console.log('');
      success(`汉化${dryRun ? '模拟' : '应用'}完成:`);
      console.log(`  📁 文件: ${stats.files.success} 成功, ${stats.files.skipped} 跳过, ${stats.files.failed} 失败`);
      console.log(`  📝 替换: ${stats.replacements.success}/${stats.replacements.total} 成功`);

      if (stats.variableIssues > 0) {
        warn(`  ⚠️ 变量问题: ${stats.variableIssues} 处`);
      }

      // 输出错误和警告
      if (this.errorCollector.hasErrors() || this.errorCollector.hasWarnings()) {
        this.errorCollector.print();
      }
    }

    // 严格模式下有错误则抛出
    if (strict && this.errorCollector.hasErrors()) {
      throw new Error(`翻译过程中发现 ${this.errorCollector.errors.length} 个错误`);
    }

    return finalResult;
  }

  /**
   * 验证配置完整性
   */
  validate() {
    const configs = this.loadConfig();
    const errors = [];

    for (const config of configs) {
      if (!config.file) {
        errors.push(`${config.category}/${config.fileName}: 缺少 file 字段`);
      }
      if (!config.replacements || Object.keys(config.replacements).length === 0) {
        errors.push(`${config.category}/${config.fileName}: 缺少 replacements`);
      }
    }

    return errors;
  }

  /**
   * 深度验证 - 检查变量保护
   */
  validateVariables() {
    const configs = this.loadConfig();
    const issues = [];

    for (const config of configs) {
      if (!config.replacements) continue;

      for (const [original, translated] of Object.entries(config.replacements)) {
        const validation = validateTranslation(original, translated);
        if (!validation.valid) {
          issues.push({
            file: `${config.category}/${config.fileName}`,
            targetFile: config.file,
            original,
            translated,
            issues: validation.issues,
          });
        }
      }
    }

    return issues;
  }

  /**
   * 获取汉化统计信息
   */
  getStats() {
    const configs = this.loadConfig();
    const stats = {
      totalConfigs: configs.length,
      categories: {},
      totalReplacements: 0,
    };

    for (const config of configs) {
      const category = config.category;
      if (!stats.categories[category]) {
        stats.categories[category] = { count: 0, replacements: 0 };
      }
      stats.categories[category].count++;
      if (config.replacements) {
        const count = Object.keys(config.replacements).length;
        stats.categories[category].replacements += count;
        stats.totalReplacements += count;
      }
    }

    return stats;
  }

  /**
   * 获取错误收集器
   */
  getErrorCollector() {
    return this.errorCollector;
  }
}

module.exports = I18n;
