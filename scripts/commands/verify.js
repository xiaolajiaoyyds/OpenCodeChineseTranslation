/**
 * verify 命令
 * 验证汉化配置、覆盖率和缺失的翻译
 */

const I18n = require('../core/i18n.js');
const Translator = require('../core/translator.js');
const { step, success, error, warn, indent, log } = require('../core/colors.js');
const { getOpencodeDir } = require('../core/utils.js');
const fs = require('fs');
const path = require('path');

async function run(options = {}) {
  const { detailed = false, translate = false, dryRun = false } = options;

  const i18n = new I18n();
  let hasIssues = false;

  // 1. 验证配置完整性
  step('验证配置文件');
  const errors = i18n.validate();

  if (errors.length > 0) {
    error('发现配置错误:');
    errors.forEach((err) => indent(`- ${err}`, 2));
    hasIssues = true;
  } else {
    success('配置验证通过');
  }

  // 2. 获取统计信息
  const stats = i18n.getStats();
  success(`配置文件: ${stats.totalConfigs} 个`);
  success(`翻译条目: ${stats.totalReplacements} 条`);

  if (detailed) {
    indent('分类统计:', 2);
    for (const [category, data] of Object.entries(stats.categories)) {
      indent(`  ${category}: ${data.count} 个文件, ${data.replacements} 条翻译`, 2);
    }
  }

  // 3. 检测新增未汉化文件
  step('检测新增文件');
  const newFiles = i18n.detectNewFiles();

  if (newFiles.length > 0) {
    warn(`发现 ${newFiles.length} 个新文件需要添加汉化配置:`);
    hasIssues = true;
    
    const showCount = detailed ? newFiles.length : Math.min(newFiles.length, 10);
    for (let i = 0; i < showCount; i++) {
      indent(`+ ${newFiles[i]}`, 2);
    }
    if (!detailed && newFiles.length > 10) {
      indent(`... 还有 ${newFiles.length - 10} 个文件`, 2);
      indent(`使用 -d 参数查看全部`, 2);
    }
  } else {
    success('没有新增需要汉化的文件');
  }

  // 4. 检测缺失的翻译
  step('检测缺失翻译');
  const missing = i18n.detectMissingTranslations();

  if (missing.length > 0) {
    warn(`发现 ${missing.length} 处可能缺失的翻译:`);
    hasIssues = true;

    // 按文件分组
    const byFile = {};
    for (const item of missing) {
      if (!byFile[item.file]) {
        byFile[item.file] = [];
      }
      byFile[item.file].push(item);
    }

    const files = Object.keys(byFile);
    const showFiles = detailed ? files.length : Math.min(files.length, 5);
    
    for (let i = 0; i < showFiles; i++) {
      const file = files[i];
      const items = byFile[file];
      indent(`${file}:`, 2);
      
      const showItems = detailed ? items.length : Math.min(items.length, 3);
      for (let j = 0; j < showItems; j++) {
        indent(`  - ${items[j].full}`, 2);
      }
      if (!detailed && items.length > 3) {
        indent(`  ... 还有 ${items.length - 3} 处`, 2);
      }
    }

    if (!detailed && files.length > 5) {
      indent(`... 还有 ${files.length - 5} 个文件有缺失`, 2);
      indent(`使用 -d 参数查看全部`, 2);
    }
  } else {
    success('未发现明显缺失的翻译');
  }

  // 5. AI 自动翻译（如果启用）
  if (translate && newFiles.length > 0) {
    console.log('');
    step('AI 自动翻译');
    
    const translator = new Translator();
    const sourceBase = path.join(getOpencodeDir(), 'packages', 'opencode');
    
    const result = await translator.translateNewFiles(newFiles, sourceBase, { dryRun });
    
    if (result.success) {
      success(`成功翻译 ${result.stats.successCount} 个文件`);
      
      if (!dryRun) {
        log('\n提示: 请运行 opencodenpm apply 应用新的翻译配置');
      } else {
        log('\n(dry-run 模式，未保存配置文件)');
      }
    } else {
      warn(`翻译完成，但有 ${result.stats.failCount} 个文件失败`);
    }
  } else if (translate && newFiles.length === 0) {
    log('\n没有需要翻译的新文件');
  }

  // 6. 汇总
  console.log('');
  if (hasIssues && !translate) {
    warn('验证完成，存在需要处理的问题');
    log('\n提示: 使用 --translate 参数自动翻译新文件');
  } else if (hasIssues) {
    warn('验证完成，存在需要处理的问题');
  } else {
    success('验证完成，汉化配置完整');
  }

  return !hasIssues;
}

module.exports = { run };
