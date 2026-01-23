/**
 * 翻译报告生成器
 * 生成详细的翻译应用报告（控制台和文件）
 */

const fs = require('fs');
const path = require('path');
const { success, error, warn, indent } = require('./colors.js');

/**
 * 报告生成器类
 */
class Reporter {
  constructor(result) {
    this.result = result;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 生成控制台报告（彩色）
   */
  printConsole() {
    const { stats, errors, warnings, dryRun } = this.result;

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log(`║              翻译${dryRun ? '模拟' : '应用'}报告                              ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');

    // 统计摘要
    console.log('║ 📊 统计摘要                                              ║');
    console.log(`║    文件: ${stats.files.success} 成功, ${stats.files.skipped} 跳过, ${stats.files.failed} 失败`.padEnd(59) + '║');
    console.log(`║    替换: ${stats.replacements.success}/${stats.replacements.total} 成功`.padEnd(59) + '║');

    if (stats.variableIssues > 0) {
      console.log(`║    ⚠️ 变量问题: ${stats.variableIssues} 处`.padEnd(58) + '║');
    }

    // 错误详情
    if (errors && errors.length > 0) {
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║ ❌ 错误详情                                              ║');
      for (const err of errors.slice(0, 5)) {
        const line = `║    ${err.file}: ${err.message}`;
        console.log(line.slice(0, 59).padEnd(59) + '║');
      }
      if (errors.length > 5) {
        console.log(`║    ... 还有 ${errors.length - 5} 个错误`.padEnd(59) + '║');
      }
    }

    // 警告详情
    if (warnings && warnings.length > 0) {
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║ ⚠️ 警告详情                                              ║');
      for (const w of warnings.slice(0, 5)) {
        const line = `║    ${w.file}: ${w.message}`;
        console.log(line.slice(0, 59).padEnd(59) + '║');
      }
      if (warnings.length > 5) {
        console.log(`║    ... 还有 ${warnings.length - 5} 个警告`.padEnd(59) + '║');
      }
    }

    console.log('╚══════════════════════════════════════════════════════════╝');
  }

  /**
   * 生成 Markdown 报告
   */
  toMarkdown() {
    const { stats, results, errors, warnings, dryRun } = this.result;

    const lines = [
      `# 翻译${dryRun ? '模拟' : '应用'}报告`,
      '',
      `> 生成时间: ${this.timestamp}`,
      '',
      '## 📊 统计摘要',
      '',
      '| 指标 | 数值 |',
      '|------|------|',
      `| 文件总数 | ${stats.files.total} |`,
      `| 成功 | ${stats.files.success} |`,
      `| 跳过 | ${stats.files.skipped} |`,
      `| 失败 | ${stats.files.failed} |`,
      `| 替换总数 | ${stats.replacements.total} |`,
      `| 替换成功 | ${stats.replacements.success} |`,
      `| 替换失败 | ${stats.replacements.failed} |`,
      `| 变量问题 | ${stats.variableIssues} |`,
      '',
    ];

    // 成功的文件
    const successResults = results.filter(r => r.success);
    if (successResults.length > 0) {
      lines.push('## ✅ 成功的文件');
      lines.push('');
      lines.push('| 文件 | 替换数 |');
      lines.push('|------|--------|');
      for (const r of successResults) {
        lines.push(`| ${r.file} | ${r.replacements.success}/${r.replacements.total} |`);
      }
      lines.push('');
    }

    // 跳过的文件
    const skippedResults = results.filter(r => r.skipped);
    if (skippedResults.length > 0) {
      lines.push('## ⏭️ 跳过的文件');
      lines.push('');
      lines.push('| 文件 | 原因 |');
      lines.push('|------|------|');
      for (const r of skippedResults) {
        lines.push(`| ${r.file || r.configFile} | ${r.skipReason} |`);
      }
      lines.push('');
    }

    // 错误详情
    if (errors && errors.length > 0) {
      lines.push('## ❌ 错误详情');
      lines.push('');
      for (const err of errors) {
        lines.push(`### ${err.file}`);
        lines.push('');
        lines.push(`- **类型**: ${err.type}`);
        lines.push(`- **消息**: ${err.message}`);
        if (err.details.pattern) {
          lines.push(`- **原文**: \`${err.details.pattern}\``);
        }
        lines.push('');
      }
    }

    // 警告详情
    if (warnings && warnings.length > 0) {
      lines.push('## ⚠️ 警告详情');
      lines.push('');
      for (const w of warnings) {
        lines.push(`### ${w.file}`);
        lines.push('');
        lines.push(`- **类型**: ${w.type}`);
        lines.push(`- **消息**: ${w.message}`);
        if (w.details.pattern) {
          lines.push(`- **原文**: \`${w.details.pattern}\``);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 保存报告到文件
   */
  saveToFile(filePath) {
    const markdown = this.toMarkdown();
    fs.writeFileSync(filePath, markdown, 'utf-8');
    success(`报告已保存到: ${filePath}`);
    return filePath;
  }

  /**
   * 生成 JSON 报告
   */
  toJSON() {
    return {
      timestamp: this.timestamp,
      ...this.result,
    };
  }

  /**
   * 保存 JSON 报告
   */
  saveJSON(filePath) {
    const json = JSON.stringify(this.toJSON(), null, 2);
    fs.writeFileSync(filePath, json, 'utf-8');
    success(`JSON 报告已保存到: ${filePath}`);
    return filePath;
  }
}

/**
 * 创建报告生成器
 */
function createReporter(result) {
  return new Reporter(result);
}

module.exports = {
  Reporter,
  createReporter,
};
