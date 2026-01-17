/**
 * check 命令
 * 1. 扫描源码中遗漏的可翻译文本
 * 2. AI 审查翻译质量
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { step, success, error, warn, indent, log } = require('../core/colors.js');
const { getOpencodeDir, getI18nDir, getProjectDir } = require('../core/utils.js');
const I18n = require('../core/i18n.js');
const Translator = require('../core/translator.js');

// 需要扫描的翻译模式
const TRANSLATION_PATTERNS = [
  // 属性模式
  { regex: /title[=:]\s*["']([A-Z][^"']*?)["']/g, type: 'title' },
  { regex: /label[=:]\s*["']([A-Z][^"']*?)["']/g, type: 'label' },
  { regex: /placeholder[=:]\s*["']([A-Z][^"']*?)["']/g, type: 'placeholder' },
  { regex: /message[=:]\s*["']([A-Z][^"']*?)["']/g, type: 'message' },
  { regex: /description[=:]\s*["']([A-Z][^"']*?)["']/g, type: 'description' },
  { regex: /category[=:]\s*["']([A-Z][^"']*?)["']/g, type: 'category' },

  // JSX 文本内容
  { regex: />([A-Z][a-z]{2,}[^<]*?)</g, type: 'text', minLength: 4 },

  // 特殊模式
  { regex: /variant:\s*["'](info|error|warning|success)["']/g, type: 'variant', skip: true },
];

// 应该跳过的模式（代码/变量名等）
const SKIP_PATTERNS = [
  /^[A-Z_]+$/, // 全大写常量
  /^[A-Z][a-z]+[A-Z]/, // 驼峰命名
  /^(true|false|null|undefined)$/i,
  /^\$\{/, // 模板变量
  /^[a-z]+\.[a-z]/i, // 属性访问
  /^https?:\/\//,
  /^\d+/, // 数字开头
  /^#[0-9a-fA-F]+$/, // 颜色值
];

/**
 * 检查文本是否应该跳过
 */
function shouldSkip(text) {
  if (!text || text.length < 3) return true;
  return SKIP_PATTERNS.some(p => p.test(text.trim()));
}

/**
 * 扫描单个文件中的可翻译字符串
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const found = [];

  for (const pattern of TRANSLATION_PATTERNS) {
    if (pattern.skip) continue;

    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const text = match[1]?.trim();

      if (!text) continue;
      if (shouldSkip(text)) continue;
      if (pattern.minLength && text.length < pattern.minLength) continue;

      // 检查是否包含中文（已翻译）
      if (/[\u4e00-\u9fa5]/.test(text)) continue;

      // 获取行号
      const lineNumber = content.substring(0, match.index).split('\n').length;

      found.push({
        type: pattern.type,
        text,
        full: match[0],
        line: lineNumber,
      });
    }
  }

  return found;
}

/**
 * 获取已配置的翻译规则
 */
function getConfiguredTranslations() {
  const i18n = new I18n();
  const configs = i18n.loadConfig();
  const translations = new Map();

  for (const config of configs) {
    if (!config.file || !config.replacements) continue;

    const file = config.file;
    if (!translations.has(file)) {
      translations.set(file, new Set());
    }

    const rules = translations.get(file);
    for (const key of Object.keys(config.replacements)) {
      rules.add(key);
    }
  }

  return translations;
}

/**
 * 检查翻译是否已配置
 */
function isTranslationConfigured(file, text, full, configuredTranslations) {
  const rules = configuredTranslations.get(file);
  if (!rules) return false;

  // 检查完整匹配
  if (rules.has(full)) return true;

  // 检查部分匹配（文本可能在更大的替换规则中）
  for (const rule of rules) {
    if (rule.includes(text)) return true;
  }

  return false;
}

/**
 * 运行检查
 */
async function run(options = {}) {
  const { verbose = false, output = null, tuiOnly = true, quality = false } = options;

  // 翻译质量检查模式
  if (quality) {
    return await runQualityCheck(options);
  }

  step('扫描未翻译的文本');

  const opencodeDir = getOpencodeDir();
  const sourceBase = path.join(opencodeDir, 'packages', 'opencode');

  if (!fs.existsSync(sourceBase)) {
    error('OpenCode 源码目录不存在，请先运行 opencodenpm update');
    return false;
  }

  // 获取已配置的翻译
  const configuredTranslations = getConfiguredTranslations();
  log(`已加载 ${configuredTranslations.size} 个文件的翻译配置`);

  // 确定要扫描的目录
  const scanDir = tuiOnly
    ? path.join(sourceBase, 'src/cli/cmd/tui')
    : path.join(sourceBase, 'src');

  if (!fs.existsSync(scanDir)) {
    error(`扫描目录不存在: ${scanDir}`);
    return false;
  }

  // 扫描所有 TSX 文件
  const files = glob.sync('**/*.tsx', { cwd: scanDir });
  log(`扫描 ${files.length} 个 TSX 文件...`);

  const missing = [];
  let scannedCount = 0;

  for (const file of files) {
    const fullPath = path.join(scanDir, file);
    const relativePath = tuiOnly
      ? `src/cli/cmd/tui/${file}`
      : `src/${file}`;

    const found = scanFile(fullPath);
    scannedCount++;

    for (const item of found) {
      if (!isTranslationConfigured(relativePath, item.text, item.full, configuredTranslations)) {
        missing.push({
          file: relativePath,
          ...item,
        });
      }
    }
  }

  console.log('');

  // 按文件分组输出结果
  if (missing.length === 0) {
    success('太棒了！没有发现遗漏的翻译');
    return true;
  }

  warn(`发现 ${missing.length} 处可能遗漏的翻译:`);
  console.log('');

  // 按文件分组
  const byFile = {};
  for (const item of missing) {
    if (!byFile[item.file]) {
      byFile[item.file] = [];
    }
    byFile[item.file].push(item);
  }

  // 输出每个文件的遗漏
  const fileCount = Object.keys(byFile).length;
  let shown = 0;

  for (const [file, items] of Object.entries(byFile)) {
    if (!verbose && shown >= 5) {
      log(`... 还有 ${fileCount - shown} 个文件有遗漏`);
      break;
    }

    console.log(`  📄 ${file} (${items.length} 处):`);

    const showItems = verbose ? items : items.slice(0, 3);
    for (const item of showItems) {
      indent(`[${item.type}] L${item.line}: "${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}"`, 4);
    }

    if (!verbose && items.length > 3) {
      indent(`... 还有 ${items.length - 3} 处`, 4);
    }

    console.log('');
    shown++;
  }

  // 生成报告文件
  if (output) {
    const report = {
      date: new Date().toISOString(),
      summary: {
        totalMissing: missing.length,
        filesAffected: fileCount,
        filesScanned: scannedCount,
      },
      missing: byFile,
    };

    const outputPath = path.resolve(output);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    success(`报告已保存到: ${outputPath}`);
  }

  // 提示
  console.log('');
  log('提示: 使用 -v 参数查看详细信息');
  log('提示: 使用 -o report.json 导出完整报告');

  return true;
}

/**
 * 翻译质量检查
 */
async function runQualityCheck(options = {}) {
  const { limit = 50, fix = false } = options;
  
  const translator = new Translator();
  
  // 显示质量报告
  const result = await translator.showQualityReport();
  
  return result.success;
}

module.exports = { run, scanFile, getConfiguredTranslations, runQualityCheck };
