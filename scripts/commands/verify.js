/**
 * verify 命令
 * 验证汉化配置、覆盖率和缺失的翻译
 */

const I18n = require("../core/i18n.js");
const Translator = require("../core/translator.js");
const { runPipeline } = require("../core/pipeline.js");
const { printPipelineSummary } = require("../core/pipeline.js");
const {
  step,
  success,
  error,
  warn,
  indent,
  blank,
  log,
  kv,
  groupStart,
  groupEnd,
  nestedStep,
  nestedContent,
  nestedSuccess,
  nestedWarn,
  nestedKv,
  nestedFinal,
  l1,
  l3Success,
  l3Warn,
  l3Info,
} = require("../core/colors.js");
const { getOpencodeDir } = require("../core/utils.js");
const fs = require("fs");
const path = require("path");

async function run(options = {}) {
  const {
    detailed = false,
    translate = false,
    dryRun = false,
    nested = false,
  } = options;

  // nested 模式下使用 clack 风格嵌套输出
  const outputStep = nested ? nestedStep : step;
  const outputContent = nested ? nestedContent : (msg) => indent(msg, 1);
  const outputSuccess = nested ? nestedSuccess : success;
  const outputWarn = nested ? nestedWarn : warn;
  const outputKv = nested ? nestedKv : kv;
  const outputFinal = nested
    ? (text, type) => nestedFinal(text, type || "success")
    : (text, type) => (type === "warn" ? warn(text) : success(text));

  const i18n = new I18n();
  let hasIssues = false;

  // 1. 验证配置完整性
  outputStep("验证配置文件");
  const verifyRes = await runPipeline("verify", {
    skipUpdate: true,
    skipBuild: true,
    skipDeploy: true,
  });
  printPipelineSummary("verify", verifyRes);
  const errors = verifyRes.steps[0]?.details || [];

  if (errors.length > 0) {
    error("发现配置错误:");
    errors.forEach((err) => outputContent(`- ${err}`));
    hasIssues = true;
  } else {
    outputSuccess("配置验证通过");
  }

  // 2. 获取统计信息
  const stats = i18n.getStats();
  outputKv("配置文件", `${stats.totalConfigs} 个`);
  outputKv("翻译条目", `${stats.totalReplacements} 条`);

  if (detailed) {
    blank();
    groupStart("分类统计");
    for (const [category, data] of Object.entries(stats.categories)) {
      kv(category, `${data.count} 个文件, ${data.replacements} 条翻译`);
    }
    groupEnd();
  }

  // 3. 检测新增未汉化文件
  outputStep("检测新增文件");
  const newFiles = i18n.detectNewFiles();

  if (newFiles.length > 0) {
    warn(`发现 ${newFiles.length} 个新文件需要添加汉化配置:`);
    hasIssues = true;

    const showCount = detailed
      ? newFiles.length
      : Math.min(newFiles.length, 10);
    for (let i = 0; i < showCount; i++) {
      outputContent(`+ ${newFiles[i]}`);
    }
    if (!detailed && newFiles.length > 10) {
      outputContent(`... 还有 ${newFiles.length - 10} 个文件`);
      outputContent(`使用 -d 参数查看全部`);
    }
  } else {
    outputSuccess("没有新增需要汉化的文件");
  }

  // 4. 检测缺失的翻译
  outputStep("检测缺失翻译");
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
      outputContent(`${file}:`);

      const showItems = detailed ? items.length : Math.min(items.length, 3);
      for (let j = 0; j < showItems; j++) {
        outputContent(`  - ${items[j].full}`);
      }
      if (!detailed && items.length > 3) {
        outputContent(`  ... 还有 ${items.length - 3} 处`);
      }
    }

    if (!detailed && files.length > 5) {
      outputContent(`... 还有 ${files.length - 5} 个文件有缺失`);
      outputContent(`使用 -d 参数查看全部`);
    }
  } else {
    outputSuccess("未发现明显缺失的翻译");
  }

  // 5. AI 自动翻译（如果启用）
  if (translate && newFiles.length > 0) {
    blank();
    outputStep("AI 自动翻译");

    const translator = new Translator();
    const sourceBase = path.join(getOpencodeDir(), "packages", "opencode");

    const result = await translator.translateNewFiles(newFiles, sourceBase, {
      dryRun,
    });

    if (result.success) {
      outputSuccess(`成功翻译 ${result.stats.successCount} 个文件`);

      if (!dryRun) {
        outputContent("提示: 请运行 opencodenpm apply 应用新的翻译配置");
      } else {
        outputContent("(dry-run 模式，未保存配置文件)");
      }
    } else {
      warn(`翻译完成，但有 ${result.stats.failCount} 个文件失败`);
    }
  } else if (translate && newFiles.length === 0) {
    outputContent("没有需要翻译的新文件");
  }

  // 6. 汇总
  blank();
  if (hasIssues && !translate) {
    outputFinal("验证完成，存在需要处理的问题", "warn");
    outputContent("提示: 使用 --translate 参数自动翻译新文件");
  } else if (hasIssues) {
    outputFinal("验证完成，存在需要处理的问题", "warn");
  } else {
    outputFinal("验证完成，汉化配置完整", "success");
  }

  return !hasIssues;
}

module.exports = { run };
