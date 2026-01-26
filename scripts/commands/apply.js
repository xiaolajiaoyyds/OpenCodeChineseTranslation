/**
 * apply 命令
 * 完整流程：扫描源码 → AI翻译 → 验证 → 质量检查 → 应用替换
 */

const I18n = require("../core/i18n.js");
const {
  runPipeline,
  confirmIfNeeded,
  printPipelineSummary,
} = require("../core/pipeline.js");
const {
  step,
  success,
  warn,
  error,
  indent,
  blank,
  kv,
  nestedStep,
  nestedContent,
  nestedSuccess,
  nestedKv,
  nestedFinal,
} = require("../core/colors.js");

async function run(options = {}) {
  const {
    silent = false,
    skipTranslate = false,
    autoTranslate = false,
    skipVerify = false,
    skipQualityCheck = false,
    dryRun = false,
    incremental = false,
    since = null,
    nested = false, // 从 full.js 调用时为 true，不输出独立步骤编号
  } = options;

  // nested 模式下使用 clack 风格嵌套输出
  const outputStep = nested
    ? (msg) => nestedStep(msg.replace(/^步骤 \d+\/\d+: /, ""))
    : step;
  const outputContent = nested ? nestedContent : indent;
  const outputSuccess = nested ? nestedSuccess : success;
  const outputKv = nested ? nestedKv : kv;
  const outputFinal = nested ? (text) => nestedFinal(text, "success") : success;

  let effectiveSkipTranslate = skipTranslate;
  if (!skipTranslate && !autoTranslate && !silent && !dryRun) {
    const confirm = await confirmIfNeeded("是否使用 AI 自动翻译？", true);
    if (confirm === null) return false;
    effectiveSkipTranslate = !confirm;
  }

  outputStep("应用汉化（整合流水线）");
  const res = await runPipeline("apply", {
    dryRun,
    skipPackTranslate: effectiveSkipTranslate,
    skipPackVerify: skipVerify,
    skipPackQuality: false,
    skipQualitySource: skipQualityCheck,
    incremental,
    since,
    skipBuild: true,
    skipDeploy: true,
    skipUpdate: true,
  });

  if (!res.ok) {
    error("应用失败");
    const failed = res.steps.find((s) => !s.ok);
    if (failed) outputContent(`失败步骤: ${failed.name} - ${failed.summary}`);
    return false;
  }

  await printPipelineSummary("apply", res);

  if (!silent) {
    const i18n = res.ctx.i18n || new I18n();
    blank();
    await i18n.showCoverageReportWithAI(res.ctx.newTranslations || null);
  }

  outputFinal("应用完成");
  return true;
}

module.exports = { run };
