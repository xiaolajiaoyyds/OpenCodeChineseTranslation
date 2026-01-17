/**
 * apply 命令
 * 完整流程：扫描源码 → AI翻译 → 写入语言包 → 验证 → 应用替换
 * 
 * 支持增量翻译模式：只翻译 git 变更的文件
 */

const path = require('path');
const I18n = require('../core/i18n.js');
const Translator = require('../core/translator.js');
const { step, success, warn, error, indent, log } = require('../core/colors.js');

async function run(options = {}) {
  const { 
    silent = false, 
    skipTranslate = false, 
    autoTranslate = false,
    skipVerify = false,
    dryRun = false,
    incremental = false,  // 增量翻译模式
    since = null          // git commit 起点
  } = options;

  const i18n = new I18n();
  const translator = new Translator();
  
  // 记录本次新翻译的内容
  let newTranslations = null;

  // ========================================
  // 步骤 1: 扫描源码，检测未翻译文本
  // ========================================
  if (!skipTranslate && !silent) {
    
    // 增量翻译模式
    if (incremental) {
      step('步骤 1/4: 增量扫描（仅变更文件）');
      
      const result = await translator.incrementalTranslate({
        since,
        uncommitted: true,
        dryRun
      });
      
      if (result.files && result.files.length > 0) {
        newTranslations = result;
      }
      
      if (dryRun) {
        log('(dry-run 模式，仅扫描不翻译)');
        return true;
      }
      
      console.log('');
      
    } else {
      // 全量扫描模式
      step('步骤 1/4: 扫描源码');
      
      const untranslated = translator.scanAllFiles();
      
      if (untranslated.size > 0) {
        // 统计未翻译数量
        let totalTexts = 0;
        for (const texts of untranslated.values()) {
          totalTexts += texts.length;
        }

        warn(`发现 ${untranslated.size} 个文件共 ${totalTexts} 处未翻译文本:`);
        
        let shown = 0;
        for (const [file, texts] of untranslated) {
          if (shown >= 5) {
            indent(`... 还有 ${untranslated.size - 5} 个文件`, 2);
            break;
          }
          indent(`+ ${file} (${texts.length} 处)`, 2);
          shown++;
        }
        console.log('');

        // dry-run 模式只显示，不翻译
        if (dryRun) {
          log('(dry-run 模式，仅扫描不翻译)');
          return true;
        }

        // ========================================
        // 步骤 2: AI 翻译并写入语言包
        // ========================================
        let shouldTranslate = autoTranslate;

        if (!autoTranslate && !silent) {
          const inquirer = require('inquirer');
          const { translate } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'translate',
              message: '是否使用 AI 自动翻译这些文本？',
              default: true
            }
          ]);
          shouldTranslate = translate;
        }

        if (shouldTranslate) {
          step('步骤 2/4: AI 翻译并写入语言包');
          
          const result = await translator.scanAndTranslate({});
          
          // 记录新翻译的内容
          if (result.files && result.files.length > 0) {
            newTranslations = result;
          }

          if (!result.success) {
            warn('部分翻译失败，但会继续处理已成功的翻译');
          }
          console.log('');
        } else {
          log('跳过 AI 翻译');
          console.log('');
        }
      } else {
        success('所有文本已有翻译，无需 AI 处理');
        console.log('');
      }
    }
  }

  // ========================================
  // 步骤 3: 验证语言包完整性
  // ========================================
  if (!skipVerify && !silent) {
    step('步骤 3/4: 验证语言包');
    
    const errors = i18n.validate();
    if (errors.length > 0) {
      error('发现配置错误:');
      errors.forEach(err => indent(`- ${err}`, 2));
      return false;
    }

    const stats = i18n.getStats();
    success('配置验证通过');
    log(`配置文件: ${stats.totalConfigs} 个`);
    log(`翻译条目: ${stats.totalReplacements} 条`);

    // 再次检查是否有遗漏
    const verification = translator.verifyTranslations();
    
    if (!verification.complete) {
      warn('仍有未翻译的文本:');
      verification.missing.slice(0, 3).forEach(m => {
        indent(`${m.file}: ${m.count} 处`, 2);
      });
      if (verification.missing.length > 3) {
        indent(`... 还有 ${verification.missing.length - 3} 个文件`, 2);
      }
      log('\n提示: 再次运行 apply 可继续翻译剩余文本');
    }

    console.log('');
  }

  // ========================================
  // 步骤 4: 应用翻译到源码
  // ========================================
  step('步骤 4/4: 应用翻译到源码');
  
  const result = await i18n.apply({ silent: true });
  
  if (!silent) {
    success(`汉化应用完成: ${result.files} 个文件, ${result.replacements} 处替换`);
    
    // 显示汉化覆盖率（带 AI 总结，包含新翻译信息）
    console.log('');
    await i18n.showCoverageReportWithAI(newTranslations);
  }

  return true;
}

module.exports = { run };
