/**
 * 汉化处理模块
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { getI18nDir, getOpencodeDir } = require('./utils.js');
const { step, success, error, warn, indent } = require('./colors.js');

// TUI 源码目录（主要需要汉化的部分）
const TUI_DIR = 'src/cli/cmd/tui';

class I18n {
  constructor() {
    this.i18nDir = getI18nDir();
    this.opencodeDir = getOpencodeDir();
    this.sourceBase = path.join(this.opencodeDir, 'packages', 'opencode');
  }

  /**
   * 读取所有汉化配置文件
   */
  loadConfig() {
    if (!fs.existsSync(this.i18nDir)) {
      throw new Error(`汉化配置目录不存在: ${this.i18nDir}`);
    }

    const configs = [];
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
            console.warn(`警告: 跳过无效配置 ${filePath}: ${err.message}`);
          }
        }
      }
    }

    return configs;
  }

  /**
   * 获取 TUI 源码中所有需要汉化的文件
   */
  getTuiSourceFiles() {
    const tuiPath = path.join(this.sourceBase, TUI_DIR);
    if (!fs.existsSync(tuiPath)) {
      return [];
    }

    const files = glob.sync('**/*.tsx', { cwd: tuiPath });
    return files.map(f => path.join(TUI_DIR, f));
  }

  /**
   * 获取已配置汉化的文件列表
   */
  getConfiguredFiles() {
    const configs = this.loadConfig();
    const files = new Set();
    
    for (const config of configs) {
      if (config.file) {
        files.add(config.file);
      }
    }
    
    return files;
  }

  /**
   * 检测新增的未汉化文件
   */
  detectNewFiles() {
    const sourceFiles = this.getTuiSourceFiles();
    const configuredFiles = this.getConfiguredFiles();
    
    const newFiles = [];
    for (const file of sourceFiles) {
      if (!configuredFiles.has(file)) {
        // 检查文件是否包含需要汉化的文本
        const fullPath = path.join(this.sourceBase, file);
        if (this.hasTranslatableText(fullPath)) {
          newFiles.push(file);
        }
      }
    }
    
    return newFiles;
  }

  /**
   * 检查文件是否包含可翻译的文本
   */
  hasTranslatableText(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 排除纯 context/helper 文件（通常只有代码逻辑）
      if (filePath.includes('/context/') && !content.includes('<text') && !content.includes('<box')) {
        // context 文件如果没有 UI 组件，通常不需要汉化
        // 但如果有用户可见的字符串还是要检测
        const hasVisibleString = /["'](Connect|Select|Enter|Add|No |Please|Error|Warning|Success|Failed)/i.test(content);
        if (!hasVisibleString) return false;
      }

      // 检查是否有英文字符串（排除纯代码文件）
      const patterns = [
        /title="[A-Z][a-z]{2,}/,           // title="Something" (至少3个字母)
        /label="[A-Z][a-z]{2,}/,           // label="Something"
        /placeholder="[A-Z][a-z]{2,}/,     // placeholder="Something"
        /description="[A-Z][a-z]{2,}/,     // description="Something"
        />\s*[A-Z][a-z]{3,}[^<]*</,        // >Some text< (至少4个字母的文本)
        /"[A-Z][a-z].*\{highlight\}/,      // Tips 格式
        /message:\s*["'][A-Z][a-z]/,       // message: "Something"
        /text:\s*["'][A-Z][a-z]/,          // text: "Something"
      ];
      
      return patterns.some(p => p.test(content));
    } catch {
      return false;
    }
  }

  /**
   * 检测源码中未被汉化的英文文本
   */
  detectMissingTranslations() {
    const configs = this.loadConfig();
    const missing = [];

    for (const config of configs) {
      if (!config.file || !config.replacements) continue;

      const fullPath = path.join(this.sourceBase, config.file);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // 检查常见的未汉化模式
      const patterns = [
        { regex: /title="([A-Z][a-z][^"]+)"/g, type: 'title' },
        { regex: /label="([A-Z][a-z][^"]+)"/g, type: 'label' },
        { regex: /placeholder="([A-Z][a-z][^"]+)"/g, type: 'placeholder' },
      ];

      for (const { regex, type } of patterns) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const text = match[1];
          // 检查是否已有对应的汉化（简单检查是否包含中文）
          if (!/[\u4e00-\u9fa5]/.test(text)) {
            // 检查是否在 replacements 中
            const key = `${type}="${text}"`;
            if (!config.replacements[key] && !config.replacements[match[0]]) {
              missing.push({
                file: config.file,
                type,
                text,
                full: match[0]
              });
            }
          }
        }
      }
    }

    return missing;
  }

  /**
   * 应用单个配置文件的替换规则
   */
  applyConfig(config) {
    if (!config.file || !config.replacements) {
      return { files: 0, replacements: 0 };
    }

    let relativePath = config.file;
    if (!relativePath.startsWith('packages/')) {
      relativePath = path.join('packages/opencode', relativePath);
    }

    const targetPath = path.join(this.opencodeDir, relativePath);

    if (!fs.existsSync(targetPath)) {
      return { files: 0, replacements: 0 };
    }

    let content = fs.readFileSync(targetPath, 'utf-8');
    content = content.replace(/\r\n/g, '\n');
    let replaceCount = 0;
    const originalContent = content;

    for (const [find, replace] of Object.entries(config.replacements)) {
      const normalizedFind = find.replace(/\r\n/g, '\n');
      const isSimpleWord = /^[a-zA-Z0-9]+$/.test(normalizedFind);

      if (isSimpleWord) {
        const wordBoundaryPattern = new RegExp(`\\b${normalizedFind}\\b`, 'g');
        if (wordBoundaryPattern.test(content)) {
          content = content.replace(wordBoundaryPattern, replace);
          replaceCount++;
        }
      } else {
        if (content.includes(normalizedFind)) {
          content = content.replaceAll(normalizedFind, replace);
          replaceCount++;
        }
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(targetPath, content, 'utf-8');
      console.log(`  ✓ ${config.file} (${replaceCount} 处替换)`);
    }

    return { files: 1, replacements: replaceCount };
  }

  /**
   * 应用所有汉化配置（带新文件检测）
   */
  async apply(options = {}) {
    const { silent = false } = options;

    // 1. 检测新增文件
    if (!silent) {
      step('检测新增文件');
    }

    const newFiles = this.detectNewFiles();
    if (newFiles.length > 0) {
      warn(`发现 ${newFiles.length} 个新文件可能需要汉化:`);
      const showCount = Math.min(newFiles.length, 10);
      for (let i = 0; i < showCount; i++) {
        indent(`+ ${newFiles[i]}`, 2);
      }
      if (newFiles.length > showCount) {
        indent(`... 还有 ${newFiles.length - showCount} 个文件`, 2);
      }
      console.log('');
    } else if (!silent) {
      success('没有新增需要汉化的文件');
    }

    // 2. 应用汉化
    if (!silent) {
      step('应用汉化配置');
    }

    const configs = this.loadConfig();

    if (configs.length === 0) {
      throw new Error('未找到任何汉化配置文件');
    }

    if (!silent) {
      console.log(`找到 ${configs.length} 个配置文件`);
    }

    let totalFiles = 0;
    let totalReplacements = 0;

    for (const config of configs) {
      const result = this.applyConfig(config);
      totalFiles += result.files;
      totalReplacements += result.replacements;
    }

    if (!silent) {
      success(`汉化应用完成: ${totalFiles} 个文件, ${totalReplacements} 处替换`);
    }

    return { 
      files: totalFiles, 
      replacements: totalReplacements,
      newFiles 
    };
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
    }

    return errors;
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
   * 快速分析文件，判断是否包含可翻译的 UI 文本
   */
  analyzeFile(filePath) {
    const fullPath = path.join(this.sourceBase, filePath);
    if (!fs.existsSync(fullPath)) {
      return { hasUIText: false, reason: '文件不存在' };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n').length;
    
    // 检查是否有 JSX 返回（UI 组件的标志）
    const hasJSX = /<[A-Z][a-zA-Z]*/.test(content) || /return\s*\(?\s*</.test(content);
    
    // 检查是否有可翻译的文本模式
    const patterns = [
      />([A-Z][a-zA-Z\s]{3,})</,  // JSX 文本
      /(title|label|placeholder|message)=["'][A-Z]/,  // 属性文本
      /(title|label|message):\s*["'][A-Z]/,  // 对象属性
    ];
    
    let foundTexts = 0;
    for (const pattern of patterns) {
      const matches = content.match(new RegExp(pattern.source, 'g'));
      if (matches) foundTexts += matches.length;
    }

    // 判断文件类型
    if (!hasJSX && foundTexts === 0) {
      // 纯逻辑文件
      if (/export\s+(const|function|class)\s+\w+Context/.test(content)) {
        return { hasUIText: false, reason: 'Context 逻辑', type: 'context' };
      }
      if (/type\s+\w+\s*=|interface\s+\w+/.test(content) && lines < 100) {
        return { hasUIText: false, reason: '类型定义', type: 'types' };
      }
      if (/export\s+\{/.test(content) && lines < 30) {
        return { hasUIText: false, reason: '导出索引', type: 'index' };
      }
      return { hasUIText: false, reason: '纯逻辑代码', type: 'logic' };
    }

    if (foundTexts === 0 && hasJSX) {
      // 有 JSX 但没有检测到文本
      return { hasUIText: false, reason: '无固定文本', type: 'dynamic' };
    }

    // 有可翻译的文本
    return { hasUIText: true, textCount: foundTexts, reason: '需要翻译', type: 'ui' };
  }

  /**
   * 获取汉化覆盖率统计
   */
  getCoverageStats() {
    const configs = this.loadConfig();
    const sourceFiles = this.getTuiSourceFiles();
    const configuredFiles = this.getConfiguredFiles();
    
    // 统计各分类
    const categories = {};
    let totalReplacements = 0;
    
    for (const config of configs) {
      const cat = config.category;
      if (!categories[cat]) {
        categories[cat] = { files: 0, replacements: 0 };
      }
      categories[cat].files++;
      if (config.replacements) {
        const count = Object.keys(config.replacements).length;
        categories[cat].replacements += count;
        totalReplacements += count;
      }
    }

    // 计算文件覆盖率
    const coveredFiles = sourceFiles.filter(f => configuredFiles.has(f)).length;
    const fileCoverage = sourceFiles.length > 0 
      ? (coveredFiles / sourceFiles.length * 100) 
      : 100;

    // 分析未覆盖的文件
    const uncoveredFiles = sourceFiles.filter(f => !configuredFiles.has(f));
    const uncoveredAnalysis = uncoveredFiles.map(f => ({
      file: f,
      ...this.analyzeFile(f)
    }));

    // 分类统计未覆盖文件
    const needTranslate = uncoveredAnalysis.filter(f => f.hasUIText);
    const noNeedTranslate = uncoveredAnalysis.filter(f => !f.hasUIText);

    return {
      files: {
        total: sourceFiles.length,
        covered: coveredFiles,
        uncovered: uncoveredFiles.length,
        coverage: fileCoverage,
        uncoveredList: uncoveredFiles
      },
      translations: {
        total: totalReplacements,
        configs: configs.length
      },
      categories,
      uncoveredAnalysis: {
        needTranslate,
        noNeedTranslate
      }
    };
  }

  /**
   * 显示汉化覆盖率报告
   */
  showCoverageReport() {
    const stats = this.getCoverageStats();
    const { log: colorLog, success: colorSuccess } = require('./colors.js');
    
    step('汉化覆盖率');
    
    // 文件覆盖率进度条
    const barWidth = 30;
    const filled = Math.round(stats.files.coverage / 100 * barWidth);
    const empty = barWidth - filled;
    const bar = '━'.repeat(filled) + '─'.repeat(empty);
    
    const coverageColor = stats.files.coverage >= 95 ? 'green' : 
                          stats.files.coverage >= 80 ? 'yellow' : 'red';
    
    console.log('');
    
    // 大数字显示覆盖率
    const pct = stats.files.coverage.toFixed(1);
    colorLog(`    ${pct}%`, coverageColor);
    colorLog(`    [${bar}]`, coverageColor);
    console.log('');
    
    // 核心统计 - 简洁一行
    colorLog(`    📁 ${stats.files.covered}/${stats.files.total} 文件已覆盖`);
    colorLog(`    📝 ${stats.translations.total} 条翻译`);
    
    // 分类统计 - 用 emoji + 简洁格式
    console.log('');
    colorLog('    分类明细:');
    
    const categoryEmoji = {
      components: '🧩',
      dialogs: '💬', 
      routes: '🛣️',
      common: '📦',
      contexts: '⚙️'
    };
    const categoryNames = {
      components: '组件',
      dialogs: '对话框',
      routes: '路由',
      common: '通用',
      contexts: '上下文'
    };
    const categoryOrder = ['dialogs', 'components', 'routes', 'common', 'contexts'];
    
    for (const cat of categoryOrder) {
      const data = stats.categories[cat];
      if (data) {
        const emoji = categoryEmoji[cat] || '📄';
        const name = categoryNames[cat] || cat;
        colorLog(`      ${emoji} ${name}: ${data.files} 文件 / ${data.replacements} 条`, 'gray');
      }
    }

    // 未覆盖文件分析
    if (stats.files.uncovered > 0) {
      const { needTranslate, noNeedTranslate } = stats.uncoveredAnalysis;
      
      // 需要翻译的文件（警告）
      if (needTranslate.length > 0) {
        console.log('');
        warn(`    ⚠️  发现 ${needTranslate.length} 个文件需要翻译:`);
        needTranslate.slice(0, 5).forEach(f => {
          const shortPath = f.file.replace('src/cli/cmd/tui/', '');
          colorLog(`      → ${shortPath} (${f.textCount} 处文本)`, 'yellow');
        });
        if (needTranslate.length > 5) {
          colorLog(`      ... 还有 ${needTranslate.length - 5} 个`, 'yellow');
        }
      }
      
      // 无需翻译的文件 - 显示数量，AI 总结由外部调用
      if (noNeedTranslate.length > 0) {
        console.log('');
        colorLog(`    💡 跳过 ${noNeedTranslate.length} 个文件（无 UI 文本）`, 'gray');
      }
    } else {
      console.log('');
      colorSuccess('    🎉 所有文件都已覆盖！');
    }

    return stats;
  }

  /**
   * 显示汉化覆盖率报告（带 AI 总结）
   * @param {Object} newTranslations - 本次新翻译的内容（可选）
   */
  async showCoverageReportWithAI(newTranslations = null) {
    const stats = this.showCoverageReport();
    const { log: colorLog } = require('./colors.js');
    
    // 显示本次新增翻译
    if (newTranslations && newTranslations.files && newTranslations.files.length > 0) {
      console.log('');
      colorLog(`    ✨ 本次新增翻译:`, 'green');
      
      for (const fileResult of newTranslations.files.slice(0, 5)) {
        const shortPath = fileResult.file.replace('src/cli/cmd/tui/', '');
        const count = Object.keys(fileResult.translations).length;
        colorLog(`      + ${shortPath} (${count} 条)`, 'green');
      }
      
      if (newTranslations.files.length > 5) {
        colorLog(`      ... 还有 ${newTranslations.files.length - 5} 个文件`, 'green');
      }
    }
    
    // 调用 AI 生成总结
    const Translator = require('./translator.js');
    const translator = new Translator();
    
    // 构建 AI 总结的上下文
    const summaryContext = {
      uncoveredAnalysis: stats?.uncoveredAnalysis || { needTranslate: [], noNeedTranslate: [] },
      newTranslations: newTranslations
    };
    
    await translator.generateCoverageSummary(summaryContext);
    
    return stats;
  }
}

module.exports = I18n;
