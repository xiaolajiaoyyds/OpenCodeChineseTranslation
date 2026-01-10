/**
 * 验证模块
 *
 * 检查汉化覆盖率并生成报告
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const Version = require('./version.js');

// 常见需要翻译的英文模式
const ENGLISH_PATTERNS = [
  // 菜单项
  /\b(File|Edit|View|Selection|Go|Run|Terminal|Help)\b/g,
  // 按钮
  /\b(OK|Cancel|Yes|No|Apply|Save|Delete|Close|Open)\b/g,
  // 状态
  /\b(Loading|Saving|Error|Warning|Success|Failed)\b/g,
  // 其他常见词
  /\b(Settings|Preferences|Configuration|Options|Properties)\b/g,
  /\b(Search|Find|Replace|Copy|Paste|Cut|Undo|Redo)\b/g,
  /\b(New|Open|Save|Export|Import|Print)\b/g,
];

// 已翻译的中文模式（用于避免误判）
const CHINESE_PATTERNS = [
  /[\u4e00-\u9fa5]+/g,  // 中文字符
];

class Verify {
  constructor() {
    this.projectDir = Version.getProjectDir();
    this.opencodeDir = path.join(this.projectDir, 'opencode-zh-CN');
  }

  /**
   * 扫描文件中的英文
   */
  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const untranslated = [];
    let translatedCount = 0;

    lines.forEach((line, index) => {
      // 跳过注释、纯代码行
      if (this.isCodeLine(line)) {
        return;
      }

      // 检查是否包含中文
      if (CHINESE_PATTERNS.some(p => p.test(line))) {
        translatedCount++;
        return;
      }

      // 检查是否包含英文单词
      for (const pattern of ENGLISH_PATTERNS) {
        const matches = line.match(pattern);
        if (matches) {
          // 排除代码关键字
          const filtered = matches.filter(m => !this.isKeyword(m));
          if (filtered.length > 0) {
            untranslated.push({
              line: index + 1,
              text: line.trim().substring(0, 50),
              words: [...new Set(filtered)]
            });
          }
        }
      }
    });

    return { translated: translatedCount, untranslated };
  }

  /**
   * 判断是否是代码行
   */
  isCodeLine(line) {
    const trimmed = line.trim();
    // 跳过空行
    if (!trimmed) return true;
    // 跳过注释
    if (trimmed.startsWith('//')) return true;
    if (trimmed.startsWith('#')) return true;
    // 跳过 import/require
    if (/^import\s/.test(trimmed)) return true;
    if (/^require\(/.test(trimmed)) return true;
    // 跳过只有符号的行
    if (/^[\{\}\[\]\(\);,]+$/.test(trimmed)) return true;
    return false;
  }

  /**
   * 判断是否是代码关键字
   */
  isKeyword(word) {
    const keywords = [
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'return', 'class', 'import', 'export', 'default', 'from', 'async',
      'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false',
      'null', 'undefined', 'typeof', 'instanceof'
    ];
    return keywords.includes(word);
  }

  /**
   * 执行完整验证
   */
  async check() {
    // 查找所有需要检查的文件
    const patterns = [
      'packages/**/*.ts',
      'packages/**/*.tsx',
      'packages/**/*.js',
      'packages/**/*.jsx',
      'scripts/**/*.ts',
      'scripts/**/*.js'
    ];

    let totalTranslated = 0;
    let totalUntranslated = 0;
    const files = [];

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        cwd: this.opencodeDir,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
      });

      for (const file of matches) {
        const filePath = path.join(this.opencodeDir, file);
        const result = this.scanFile(filePath);

        if (result.translated > 0 || result.untranslated.length > 0) {
          files.push({
            file,
            translated: result.translated,
            untranslated: result.untranslated.length
          });
        }

        totalTranslated += result.translated;
        totalUntranslated += result.untranslated.length;
      }
    }

    const total = totalTranslated + totalUntranslated;
    const coverage = total > 0 ? Math.round((totalTranslated / total) * 100) : 0;

    return {
      coverage,
      translated: totalTranslated,
      untranslated: totalUntranslated,
      files: files.filter(f => f.untranslated > 0).slice(0, 10)  // 最多显示 10 个未翻译文件
    };
  }
}

module.exports = Verify;
